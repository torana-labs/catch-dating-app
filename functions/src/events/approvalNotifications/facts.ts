import type {Firestore, Transaction} from "firebase-admin/firestore";
import type {DeliveryCoreFacts} from "../../delivery/deliveryCore";
import {operationContentHash as hash} from "../../operations/durableActions";
import {validateEventApprovalNotificationSettingsDocument as validSettings} from
  "../../shared/generated/validators/eventApprovalNotificationSettingsDocument";
import type {EventApprovalPreferenceDocument as Preference} from
  "../../shared/generated/eventApprovalPreferenceDocument";
import type {EventApprovalNotificationSettingsDocument as Settings} from
  "../../shared/generated/eventApprovalNotificationSettingsDocument";
import type {
  OrganizerSenderConnectionDocument as Connection,
  OrganizerMessageTemplateDocument as Template,
} from "../../shared/generated/firestoreAdminTypes";
import {validateOrganizerSenderConnectionDocument} from
  "../../shared/generated/validators/organizerSenderConnectionDocument";
import {validateOrganizerMessageTemplateDocument} from
  "../../shared/generated/validators/organizerMessageTemplateDocument";
import {requireDoc} from "../../shared/validation";
import {metaTemplateFromDocument} from
  "../../platform/delivery/organizerWhatsappProvider";
import {
  WHATSAPP_ENDPOINT_STOPS,
  whatsappStopId,
  parseWhatsappStop,
} from "../../shared/organizerWhatsappStops";
import {contactPermissionRef, readContactPermission} from
  "../../shared/contactPermissions";
import {hashEndpoint} from "../../platform/delivery/endpointHash";
import {settings} from "./preferences";
import {readBookingUpdatesPreference} from "./contactGrants";
import {readApplication, type LoadIdentity} from "./source";
import {
  timestampMillis,
  type Binding,
  type Intent,
} from "./model";
export interface Snapshot {
  preference: Preference;
  settings: Settings;
  connection: Connection | null;
  template: Template | null;
  email: string | null;
  phone: string | null;
}
export const templateHash = (template: Template) =>
  hash(JSON.parse(JSON.stringify(metaTemplateFromDocument(template))));
export const snapshotHash = (s: Snapshot) =>
  hash({
    settings: s.settings,
    // Firestore timestamps have a custom prototype; freeze only provider
    // inputs.
    connection: s.connection ?
      {
        revision: s.connection.revision,
        phoneNumberId: s.connection.phoneNumberId,
        wabaId: s.connection.wabaId,
        secretVersionResource: s.connection.secretVersionResource,
        status: s.connection.status,
      } :
      null,
    template: s.template ? templateHash(s.template) : null,
  });
export async function readFacts(
  db: Firestore,
  tx: Transaction,
  intent: Intent,
  now: number,
  identity: LoadIdentity,
): Promise<{
  facts: DeliveryCoreFacts<Binding>;
  snapshot: Snapshot | null;
}> {
  const c = intent.context;
  const stop = (reason: string) => ({
    facts: {gate: {kind: "stop" as const, reason}, routes: []},
    snapshot: null,
  });
  const source = await readApplication(
    db,
    tx,
    c.applicationId,
    c.uid,
    c.eventId,
    now,
  );
  if (
    !source ||
    source.application.approvalNotificationBasis?.revision !==
      c.approvalRevision ||
    source.application.reviewStatus !== "approved" ||
    source.application.organizerId !== c.organizerId ||
    source.application.latestResponseId !== c.sourceResponseId ||
    source.application.approvalNotificationBasis?.approvedAtMillis !==
      c.approvedAtMillis
  ) {
    return stop("superseded");
  }
  const sender = {kind: "organizer" as const, organizerId: c.organizerId};
  // The choice is the two bookingUpdates grants in the guest's event
  // document, each proven by its receipt (issue #2494).
  const [preference, configSnap, user, permissionSnap] = await Promise.all([
    readBookingUpdatesPreference(db, tx, c.uid, c.eventId),
    tx.get(db.collection(settings).doc(c.organizerId)),
    identity(c.uid),
    tx.get(contactPermissionRef(db, c.uid, sender)),
  ]);
  const config = configSnap.data();
  if (
    !preference ||
    preference.uid !== c.uid ||
    preference.eventId !== c.eventId ||
    preference.organizerId !== c.organizerId ||
    preference.updatedAtMillis > now ||
    !user ||
    user.disabled ||
    user.uid !== c.uid
  ) {
    return stop("permissionUnavailable");
  }
  if (!validSettings(config) || !config.enabled || config.revision < 1) {
    return stop("senderUnavailable");
  }
  const phone =
    preference.choices.phoneUpdates &&
    preference.phoneE164 &&
    user.phoneNumber === preference.phoneE164 ?
      preference.phoneE164 :
      null;
  const email =
    preference.choices.emailUpdates &&
    preference.email &&
    user.emailVerified &&
    user.email === preference.email ?
      preference.email :
      null;
  const [connSnap, templateSnap] = await Promise.all([
    config.whatsapp ?
      tx.get(
        db
          .collection("organizerSenderConnections")
          .doc(config.whatsapp.connectionId),
      ) :
      null,
    config.whatsapp ?
      tx.get(
        db
          .collection("organizerMessageTemplates")
          .doc(config.whatsapp.templateId),
      ) :
      null,
  ]);
  const connection =
    connSnap && validateOrganizerSenderConnectionDocument(connSnap.data()) ?
      requireDoc<Connection>(
        connSnap,
        "OrganizerSenderConnectionDocument",
      ) :
      null;
  const template =
    templateSnap &&
    validateOrganizerMessageTemplateDocument(templateSnap.data()) ?
      requireDoc<Template>(
        templateSnap,
        "OrganizerMessageTemplateDocument",
      ) :
      null;
  const snapshot: Snapshot = {
    preference,
    settings: config,
    connection: connection ?? null,
    template: template ?? null,
    phone,
    email,
  };
  const grants = readContactPermission(permissionSnap.data(), sender)
    ?.grants ?? {};
  // A new event-specific choice can supersede an older withdrawal, but
  // missing withdrawal evidence must never reopen a route.
  const withdrawn = (grant?: {status?: string; updatedAt?: unknown}) => {
    if (grant?.status !== "optedOut") return false;
    const value = grant.updatedAt as {toMillis?: () => number;
      _seconds?: number; _nanoseconds?: number} | undefined;
    const at = typeof value?.toMillis === "function" ? value.toMillis() :
      typeof value?._seconds === "number" &&
        typeof value._nanoseconds === "number" ?
        timestampMillis({_seconds: value._seconds,
          _nanoseconds: value._nanoseconds}) : NaN;
    return !Number.isFinite(at) || at >= preference.updatedAtMillis;
  };
  const endpointStop = phone ?
    await tx.get(
      db
        .collection(WHATSAPP_ENDPOINT_STOPS)
        .doc(whatsappStopId(c.organizerId, hashEndpoint(phone))),
    ) :
    null;
  const endpointStopRecord = endpointStop?.exists ?
    parseWhatsappStop(endpointStop.data()) :
    null;
  const whatsappAllowed =
    (!endpointStopRecord ||
      endpointStopRecord.stoppedAt < preference.updatedAtMillis) &&
    !withdrawn(grants["whatsapp:eventOperations"]);
  const smsAllowed = whatsappAllowed && !withdrawn(grants["sms:marketing"]);
  const readyWhatsapp = Boolean(
    phone &&
      whatsappAllowed &&
      config.whatsapp &&
      connection?.organizerId === c.organizerId &&
      connection.status === "active" &&
      connection.phoneNumberId &&
      connection.wabaId &&
      connection.secretVersionResource &&
      template?.organizerId === c.organizerId &&
      template.connectionId === config.whatsapp.connectionId &&
      template.status === "APPROVED" &&
      template.category === "UTILITY" &&
      template.variableNames?.length === 1 &&
      template.variableNames[0] === "eventUrl",
  );
  const validUntil = Math.min(now + 30_000, intent.expiresAt);
  const permissionRevision = hash([
    preference,
    snapshotHash(snapshot),
    whatsappAllowed,
    smsAllowed,
    user.emailVerified,
    user.email ?? null,
    user.phoneNumber ?? null,
  ]);
  const routes = intent.permittedRoutes.map((routeId) => {
    const eligible =
      routeId === "approvalEmail" ?
        email && config.email :
        routeId === "approvalWhatsapp" ?
          readyWhatsapp :
          phone &&
            smsAllowed &&
            /^\+91[6-9][0-9]{9}$/.test(phone) &&
            config.sms;
    const senderId =
      routeId === "approvalEmail" ?
        config.email?.accountId :
        routeId === "approvalWhatsapp" ?
          config.whatsapp?.connectionId :
          config.sms?.senderId;
    const endpoint = routeId === "approvalEmail" ? email : phone;
    return {
      routeId,
      state:
        eligible && senderId && endpoint ?
          {
            kind: "eligible" as const,
            checkedAt: now,
            validUntil,
            permissionRevision,
            candidate: {
              mode: "live" as const,
              binding: {
                routeId,
                senderId,
                bindingRevision: config.revision,
                recipientEndpointId:
                    (routeId === "approvalEmail" ?
                      "email:" :
                      routeId === "approvalWhatsapp" ?
                        "whatsapp:" :
                        "sms:") + hashEndpoint(endpoint),
                fallbackOwner: "catch" as const,
              },
            },
          } :
          {kind: "blocked" as const, reason: "channelUnavailable"},
    };
  });
  return {
    facts: {
      gate: {
        kind: "allow",
        checkedAt: now,
        validUntil,
        instructionRevision: 1,
      },
      routes,
    },
    snapshot,
  };
}
