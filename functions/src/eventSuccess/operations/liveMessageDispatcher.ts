import type {Firestore} from "firebase-admin/firestore";
import {MetaWhatsappProvider} from
  "../../organizers/organizerWhatsappProvider";
import {GuestAssistanceStore} from "./guestAssistanceStore";
import {GuestLinkKeyStore} from "./guestLinkKeyStore";
import type {GuestLinkSigningKeys} from
  "../../platform/guestLinkSigningKeys";
import {threadIdentity} from "./guestRecords";
import {hasAutomaticDelivery} from "./deliveryWorkRecords";
import type {MessageRecord} from "./messageOutbox";
import {EventMessageWorker} from "./messageWorker";
import {EventSmsWorker} from "./smsWorker";
import {SmsDispatchStore} from "./smsDispatchStore";
import {EventWhatsappWorker} from "./whatsappWorker";
import {WhatsappDispatchStore} from "./whatsappDispatchStore";
import {EventRcsWorker} from "./rcsWorker";
import {RcsDispatchStore} from "./rcsDispatchStore";
import {RcsCredentialStore} from "./rcsCredentialStore";
import {GoogleRbmProvider} from "./googleRbmProvider";
import {eventRcsEnabled} from "./rcsLiveConfig";

interface ChannelDependencies {
  rcsEnabled: () => boolean;
  whatsappEnabled: () => boolean;
  rcsCredentials: Pick<RcsCredentialStore, "access">;
  rcsProvider?: Pick<GoogleRbmProvider, "getCapabilities" | "sendText">;
}
let rcsCredentialStore: RcsCredentialStore | undefined;
const channelDefaults: ChannelDependencies = {
  rcsEnabled: () => eventRcsEnabled.value(),
  whatsappEnabled: () => process.env.META_WHATSAPP_ENABLED === "true",
  rcsCredentials: {access: (config) =>
    (rcsCredentialStore ??= new RcsCredentialStore()).access(config)},
};

/** Stable per-message grant across retries, workers and fallback channels. */
export const deliveryGrantOperation = (messageId: string) =>
  "delivery:" + messageId;

type WorkerFactory = (message: MessageRecord, keys: GuestLinkSigningKeys) =>
  Pick<EventMessageWorker, "dispatch">;

export class LiveMessageDispatcher {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now,
    private readonly keyStore: Pick<GuestLinkKeyStore, "access"> =
    new GuestLinkKeyStore(),
    private readonly factory?: WorkerFactory) {}

  async dispatch(message: MessageRecord, deadline: number) {
    if (!hasAutomaticDelivery(message)) {
      throw new Error("Automatic delivery authority unavailable");
    }
    const keys = await this.keyStore.access();
    if (this.clock() >= deadline) throw new Error("Delivery execution expired");
    const link = await new GuestAssistanceStore(this.db, this.clock).issueLink(
      threadIdentity(message.intent), deliveryGrantOperation(message.messageId),
      keys);
    // The secret only passes through the signing/rendering boundary in memory.
    const worker = this.factory ? this.factory(message, keys) :
      createLiveMessageWorker(this.db, message, keys, this.clock);
    if (this.clock() >= deadline) throw new Error("Delivery execution expired");
    return worker.dispatch(message.messageId, link.linkId, deadline);
  }
}

/** Shared production composition; provider enablement grants no send. */
export function createLiveMessageWorker(db: Firestore, message: MessageRecord,
  keys: GuestLinkSigningKeys, clock: () => number = Date.now,
  deps: ChannelDependencies = channelDefaults) {
  const automation = message.intent.automation;
  if (!automation || (message.intent.kind === "joiningUpdate" &&
      !message.intent.automation?.runtimeBinding)) {
    throw new Error("Automatic sender selection unavailable");
  }
  const workers: ConstructorParameters<typeof EventMessageWorker>[1] = {};
  for (const route of automation.routes) {
    if (route.routeId === "catchEventSms") {
      workers.sms = new EventSmsWorker(new SmsDispatchStore(db,
        route.senderId, keys, clock), undefined, undefined, clock);
    } else if (route.routeId === "catchEventRcs" && deps.rcsEnabled()) {
      workers.rcs = new EventRcsWorker(new RcsDispatchStore(db,
        route.senderId, keys, clock), deps.rcsCredentials,
      deps.rcsProvider ?? new GoogleRbmProvider(fetch, clock), clock);
    } else if (route.routeId === "organizerEventWhatsapp" &&
          deps.whatsappEnabled()) {
      // Template sends use the organizer's bound token. App credentials are
      // needed by onboarding, not by this restricted sendTemplate port.
      const provider = new MetaWhatsappProvider({appId: "", appSecret: "",
        configId: "", graphVersion:
            process.env.META_WHATSAPP_GRAPH_VERSION ?? "v23.0"},
      fetch, clock);
      workers.whatsapp = new EventWhatsappWorker(new WhatsappDispatchStore(
        db, route.senderId, keys, clock), provider, undefined,
      clock);
    }
  }
  return new EventMessageWorker(db, workers, clock);
}
