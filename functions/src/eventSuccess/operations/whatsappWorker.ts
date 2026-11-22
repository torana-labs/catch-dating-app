import {operationContentHash} from "../../operations/durableActions";
import {MetaProviderError, MetaWhatsappProvider, OrganizerTokenStore} from
  "../../organizers/organizerWhatsappProvider";
import type {PermitResult} from "./messageOutbox";
import type {PreparedMessageChannel, ChannelDispatchResult} from
  "./messageChannel";
import type {FirestoreMessageOutbox} from "./firestoreMessageOutbox";
import type {DeliveryDecision} from "./messagingPolicy";
import {WhatsappDispatchStore, WhatsappSenderConfig} from
  "./whatsappDispatchStore";
import {whatsappStatusCorrelation} from
  "../../platform/delivery/whatsappDeliveryProtocol";

export type WhatsappSubmissionOutcome =
  {kind: "accepted"; providerMessageId: string} | {kind: "unknown"};

export type WhatsappWorkerResult =
  | {kind: "withheld"; reason: "senderUnavailable" | "credentialUnavailable" |
      "permitExpired" | "routeCompositionUnavailable" |
      Extract<PermitResult, {kind: "withheld"}>["reason"]}
  | {kind: "waiting"; decision: DeliveryDecision}
  | {kind: "submitted"; outcome: WhatsappSubmissionOutcome};

/** Trusted Operations port. Construction does not register a live executor. */
export class EventWhatsappWorker {
  constructor(private readonly store: WhatsappDispatchStore,
    private readonly provider: Pick<MetaWhatsappProvider, "sendTemplate">,
    private readonly credentials: Pick<OrganizerTokenStore, "accessBound"> =
    new OrganizerTokenStore(),
    private readonly clock: () => number = Date.now) {}

  async dispatch(messageId: string, linkId: string):
    Promise<WhatsappWorkerResult> {
    const outbox = this.store.outbox(linkId);
    const message = await outbox.get(messageId);
    if (!message) throw new Error("WhatsApp message unavailable");
    if (message.intent.permittedRoutes.some((r) =>
      r !== "organizerEventWhatsapp")) {
      return {kind: "withheld", reason: "routeCompositionUnavailable"};
    }
    const channel = await this.prepareChannel(linkId);
    if (channel.kind === "unavailable") {
      return {kind: "withheld", reason: channel.reason};
    }
    const reservation = await outbox.reserve(messageId);
    const attempt = reservation.record.attempts.at(-1);
    if (!attempt || attempt.state.kind !== "reserved") {
      return {kind: "waiting", decision: reservation.decision};
    }
    return channel.dispatchReserved(outbox, messageId, attempt.attemptId);
  }

  /** All slow secret I/O finishes before the shared route reservation. */
  async prepareChannel(linkId: string):
    Promise<PreparedMessageChannel<WhatsappSubmissionOutcome>> {
    const config = await this.store.sender();
    if (!config) return {kind: "unavailable", reason: "senderUnavailable"};
    if (!await this.store.spendingAvailable(linkId, config, this.clock())) {
      return {kind: "ready", routeId: "organizerEventWhatsapp",
        readFacts: (tx, intent, now) =>
          this.store.readFacts(tx, intent, linkId, now, config),
        dispatchReserved: async () =>
          ({kind: "withheld", reason: "resourceUnavailable"})};
    }
    // Secret I/O precedes the short reservation window. The claim rechecks
    // the complete sender/policy snapshot, including this pinned version.
    let accessToken: string;
    try {
      accessToken = await this.credentials.accessBound({
        versionResource: config.connection.secretVersionResource!,
        organizerId: config.connection.organizerId,
        connectionId: config.policy.senderId,
      });
    } catch {
      return {kind: "unavailable", reason: "credentialUnavailable"};
    }
    return {kind: "ready", routeId: "organizerEventWhatsapp",
      readFacts: (tx, intent, now) =>
        this.store.readFacts(tx, intent, linkId, now, config),
      dispatchReserved: (outbox, messageId, attemptId) =>
        this.dispatchReserved(outbox, messageId, attemptId, linkId, config,
          accessToken)};
  }

  private async dispatchReserved(outbox: FirestoreMessageOutbox,
    messageId: string, attemptId: string, linkId: string,
    config: WhatsappSenderConfig, accessToken: string):
    Promise<ChannelDispatchResult<WhatsappSubmissionOutcome>> {
    const record = await outbox.get(messageId);
    const reserved = record?.attempts.find((a) => a.attemptId === attemptId);
    if (!reserved || reserved.mode !== "live" ||
        reserved.binding.routeId !== "organizerEventWhatsapp" ||
        reserved.binding.provider !== "meta" ||
        reserved.state.kind !== "reserved") {
      return {kind: "withheld", reason: "notReserved"};
    }
    const claim = await outbox.claimLiveDispatch(messageId, attemptId,
      this.store.prepare(linkId, config));
    if (claim.kind === "withheld") {
      return {kind: "withheld", reason: claim.reason};
    }
    const attempt = claim.permit.attempt;
    const {connection, permission, rendered, replies} = claim.resource;
    let providerMessageId: string;
    try {
      ({providerMessageId} = await this.provider.sendTemplate({accessToken,
        phoneNumberId: connection.phoneNumberId!,
        toE164: permission.phoneE164, template: rendered.template,
        variables: rendered.variables, quickReplyPayloads: replies,
        callbackData: whatsappStatusCorrelation(attempt.attemptId,
          rendered.payloadHash), deadline: claim.permit.validUntil}));
    } catch (error) {
      // Only an adapter's proof of no request plus actual permit expiry can
      // mark this unsent. Timeouts, HTTP errors and parse failures stay held.
      if (error instanceof MetaProviderError &&
          error.disposition === "requestNotSent" &&
          this.clock() >= claim.permit.validUntil) {
        await outbox.recordExpiredBeforeSend(claim.permit);
        return {kind: "withheld", reason: "permitExpired"};
      }
      return {kind: "submitted", outcome: {kind: "unknown"}};
    }
    const now = this.clock();
    // Keep persistence errors outside the provider catch. A retry observes
    // the claimed unknown attempt and cannot repeat provider I/O.
    await outbox.recordReceipt(messageId, {
      attemptId: attempt.attemptId, ...attempt.binding,
      providerEventId: "wa-submission:" + operationContentHash([
        attempt.attemptId, providerMessageId,
      ]), receivedAt: now,
      state: {kind: "accepted", at: now, providerMessageId},
    });
    return {kind: "submitted", outcome: {kind: "accepted", providerMessageId}};
  }
}
