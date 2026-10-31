import * as admin from "firebase-admin";
import type {Firestore} from "firebase-admin/firestore";
import {
  metaWhatsappAppId,
  metaWhatsappAppSecret,
  metaWhatsappConfigId,
  metaWhatsappGraphVersion,
} from "../organizers/organizerMessagingSetup";
import {
  MetaWhatsappProvider,
  OrganizerTokenStore,
} from "../organizers/organizerWhatsappProvider";
import {
  activityNotificationId,
  allowsPushPreference,
  createActivityNotificationIfAbsent,
  eventActivityNotificationCopy,
  sendFcmNotification,
  type ActivityNotificationType,
  type NotificationPreference,
} from "../shared/notifications";
import type {
  OrganizerCommunicationPreferenceDocument,
  OrganizerContactChannelStateDocument,
  OrganizerContactDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {
  MomentDefinition,
  MomentScope,
} from "./momentModel";
import type {ResolvedRecipient} from "./momentDocuments";
import type {ConsentFacts, QuietHours} from "./momentPolicy";
import type {MomentRunnerDeps} from "./momentRunner";
import {deliverProgramActivity} from "../programs/programActivityDelivery";
import type {ProgramFcmSender} from "../programs/programActivityChannel";
import {deliverProgramReminder} from "../programs/programReminderDelivery";
import {deliverAutomationMessage} from
  "../organizers/automationMomentDelivery";
import {
  effectiveOrganizerWhatsappPurposeStatus,
  organizerCommunicationPreferenceId,
} from "../shared/organizerCommunicationPreferences";
import {organizerContactChannelStateId} from
  "../organizers/organizerCampaignModel";

/**
 * Production seams for the moment runner. The runner decides who/whether;
 * this module owns how: Meta WhatsApp template sends produce durable
 * intents dispatched by the shared delivery core, FCM + activity items
 * go through shared/notifications, and consent facts come from household
 * consent or user notification preferences.
 *
 * Quiet hours default to 21:00-08:00 local in the scope's timezone; a scope
 * doc may override with `messagingQuietHours {startMinute,endMinute}` and
 * `messagingDailyCap` (per-endpoint sends per local day; default 4).
 */

const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_QUIET_HOURS: QuietHours = {startMinute: 21 * 60, endMinute: 480};
const DEFAULT_DAILY_CAP = 4;

const ACTIVITY_TYPES: ReadonlySet<string> = new Set([
  "message", "match", "eventReminder", "eventSignup", "waitlistPromotion",
  "waitlistOffer", "waitlistOfferExpiring", "waitlistOfferExpired",
  "eventCancelled", "eventUpdated", "organizerUpdate", "organizerUpdate",
  "formResponse", "crossPathsInvitation", "crossPathsInvitationAccepted",
  "crossPathsInvitationDeclined", "crossPathsPlanCancelled",
]);

const PREFERENCE_KEYS: ReadonlySet<string> = new Set([
  "matches", "messages", "eventReminders", "eventStatusUpdates",
  "organizerUpdates", "crossPathsInvitations",
]);

export function buildMomentRunnerDeps(
  overrides?: Partial<MomentRunnerDeps> & {
    sendNotification?: typeof sendFcmNotification;
    sendProgramFcm?: ProgramFcmSender;
  },
): MomentRunnerDeps {
  const firestore = overrides?.firestore ?? (() => admin.firestore());
  const sendNotification = overrides?.sendNotification ?? sendFcmNotification;
  const tokenStore = new OrganizerTokenStore();
  const provider = () => new MetaWhatsappProvider({
    appId: metaWhatsappAppId.value(),
    appSecret: metaWhatsappAppSecret.value(),
    configId: metaWhatsappConfigId.value(),
    graphVersion: metaWhatsappGraphVersion.value(),
  });
  const timezoneCache = new Map<string, Promise<string>>();
  const timezoneFor = (scope: MomentScope): Promise<string> => {
    const key = `${scope.kind}:${scopeIdOf(scope)}`;
    if (!timezoneCache.has(key)) {
      timezoneCache.set(key, loadScopeTimezone(firestore(), scope));
    }
    return timezoneCache.get(key)!;
  };

  const deps: MomentRunnerDeps = {
    firestore,
    nowMillis: () => Date.now(),
    quietEndMillis: async (scope, nowMillis) => {
      const tz = await timezoneFor(scope);
      const quiet = await loadQuietHours(firestore(), scope);
      return quietEndWith(quiet, tz, nowMillis);
    },
    localDayKey: async (scope, nowMillis) =>
      localDayKeyAt(nowMillis, await timezoneFor(scope)),
    localMinuteOfDay: async (scope, nowMillis) =>
      localMinuteAt(nowMillis, await timezoneFor(scope)),
    quietHoursFor: (scope) => loadQuietHours(firestore(), scope),
    dailyCapFor: (scope) => loadDailyCap(firestore(), scope),
    pushCopyFor: (moment) => pushCopy(firestore(), moment),
    deliverProgramReminder: (params) => deliverProgramReminder({
      db: firestore(),
      provider: provider(),
      credentials: tokenStore,
      now: () => Date.now(),
      ...params,
    }),
    deliverProgramActivity: (params) => deliverProgramActivity({
      db: firestore(), now: overrides?.nowMillis ?? Date.now,
      send: overrides?.sendProgramFcm ??
        ((message) => admin.messaging().send(message)), ...params,
    }),
    deliverAutomationMessage: (params) => deliverAutomationMessage({
      db: firestore(),
      provider: provider(),
      credentials: tokenStore,
      now: () => Date.now(),
      ...params,
    }),
    sendPushToUid: (params) => sendPush(firestore(), params, sendNotification),
    writeStaffAttention: (params) =>
      staffAttention(firestore(), params, sendNotification),
    loadConsentFacts: (recipient) =>
      consentFacts(firestore(), recipient),
    ...overrides,
  };
  return deps;
}

// --- Scope facts -----------------------------------------------------------

function scopeIdOf(scope: MomentScope): string {
  return scope.kind === "event" ? scope.eventId :
    scope.kind === "program" ? scope.programId : scope.organizerId;
}

function scopeDocRef(db: Firestore, scope: MomentScope) {
  return scope.kind === "event" ?
    db.collection("events").doc(scope.eventId) :
    scope.kind === "program" ?
      db.collection("organizerPrograms").doc(scope.programId) :
      db.collection("organizers").doc(scope.organizerId);
}

async function loadScopeTimezone(
  db: Firestore,
  scope: MomentScope,
): Promise<string> {
  const snap = await scopeDocRef(db, scope).get();
  const tz = (snap.data() as Record<string, unknown> | undefined)?.timezone;
  return typeof tz === "string" && tz.length > 0 ? tz : DEFAULT_TIMEZONE;
}

async function loadQuietHours(
  db: Firestore,
  scope: MomentScope,
): Promise<QuietHours | null> {
  const snap = await scopeDocRef(db, scope).get();
  const raw = (snap.data() as Record<string, unknown> | undefined)
    ?.messagingQuietHours;
  if (typeof raw === "object" && raw !== null) {
    const row = raw as Record<string, unknown>;
    if (Number.isSafeInteger(row.startMinute) &&
        Number.isSafeInteger(row.endMinute)) {
      return {
        startMinute: row.startMinute as number,
        endMinute: row.endMinute as number,
      };
    }
  }
  return DEFAULT_QUIET_HOURS;
}

async function loadDailyCap(
  db: Firestore,
  scope: MomentScope,
): Promise<number> {
  const snap = await scopeDocRef(db, scope).get();
  const raw = (snap.data() as Record<string, unknown> | undefined)
    ?.messagingDailyCap;
  return Number.isSafeInteger(raw) && (raw as number) >= 0 ?
    raw as number : DEFAULT_DAILY_CAP;
}

// --- Local-time helpers ------------------------------------------------------

function localMinuteAt(nowMillis: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false, hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(nowMillis));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function localDayKeyAt(nowMillis: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(nowMillis));
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Ms timestamp when the quiet window ends, or null when now is sendable.
 *  Exported for tests; walks forward in bounded 15-minute steps so a
 *  malformed window can never loop. */
export function quietEndWith(
  quiet: QuietHours | null,
  timeZone: string,
  nowMillis: number,
): number | null {
  if (quiet === null) return null;
  if (quiet.startMinute === quiet.endMinute) return null;
  const inQuiet = (ms: number) => {
    const minute = localMinuteAt(ms, timeZone);
    if (quiet.startMinute < quiet.endMinute) {
      return minute >= quiet.startMinute && minute < quiet.endMinute;
    }
    return minute >= quiet.startMinute || minute < quiet.endMinute;
  };
  if (!inQuiet(nowMillis)) return null;
  // Walk forward in 15-minute steps until outside quiet hours; bounded to
  // 97 steps (>24h) so a malformed window can never loop forever.
  let candidate = nowMillis;
  for (let i = 0; i < 97; i += 1) {
    candidate += 15 * 60_000;
    if (!inQuiet(candidate)) return candidate;
  }
  return nowMillis + 24 * 60 * 60_000;
}

// --- Delivery seams ----------------------------------------------------------

async function pushCopy(
  db: Firestore,
  moment: MomentDefinition,
): Promise<{title: string; body: string}> {
  if (moment.scope.kind === "event" &&
      moment.action.kind === "push" &&
      ACTIVITY_TYPES.has(moment.action.notificationType)) {
    const eventSnap = await db.collection("events")
      .doc(moment.scope.eventId).get();
    const event = eventSnap.data() as
      Parameters<typeof eventActivityNotificationCopy>[1] | undefined;
    if (event) {
      return eventActivityNotificationCopy(
        moment.action.notificationType as ActivityNotificationType, event);
    }
  }
  return {title: moment.name, body: ""};
}

/** IDs are interpolated by the native route parser; preserve exact safe
 *  segments and withhold malformed/encoded routing rather than normalize. */
function routeSafeId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 180 &&
    !/[^A-Za-z0-9_.~-]/.test(value) &&
    value !== "." && value !== "..";
}

async function sendPush(
  db: Firestore,
  params: {
    uid: string;
    appRole: "consumer" | "host";
    title: string;
    body: string;
    notificationType: string;
    preferenceKey: string;
    scope: MomentScope;
    runId: string;
    recipientKey: string;
  },
  sendNotification: typeof sendFcmNotification,
): Promise<void> {
  const type = ACTIVITY_TYPES.has(params.notificationType) ?
    params.notificationType as ActivityNotificationType : "organizerUpdate";
  const consumerEvent = params.appRole === "consumer" &&
    params.scope.kind === "event";
  let organizerId: string | undefined;
  if (consumerEvent && params.scope.kind === "event" &&
      routeSafeId(params.scope.eventId)) {
    const event = (await db.collection("events").doc(params.scope.eventId)
      .get()).data();
    const candidate = event &&
      Object.prototype.hasOwnProperty.call(event, "organizerId") ?
      event.organizerId : event?.organizerId;
    if (routeSafeId(candidate)) organizerId = candidate;
  }
  const eventContext = params.scope.kind === "event" &&
      (!consumerEvent || organizerId !== undefined) ?
    {eventId: params.scope.eventId, ...(organizerId ? {organizerId} : {})} : {};
  // The durable send is the activity item; the user's push preference
  // gates only the FCM leg, matching the shipped reminder behavior.
  await createActivityNotificationIfAbsent(db, {
    id: activityNotificationId(type, `${params.runId}`),
    uid: params.uid,
    type,
    title: params.title,
    body: params.body,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...eventContext,
  });
  if (consumerEvent && organizerId === undefined) return;
  const userSnap = await db.collection("users").doc(params.uid).get();
  const user = userSnap.data() as UserProfileDocument | undefined;
  const preferenceKey = PREFERENCE_KEYS.has(params.preferenceKey) ?
    params.preferenceKey as NotificationPreference : null;
  if (!user?.fcmToken || preferenceKey === null ||
      !allowsPushPreference(user, preferenceKey)) {
    return;
  }
  await sendNotification({
    token: user.fcmToken,
    title: params.title,
    body: params.body,
    type: params.notificationType,
    notificationId: activityNotificationId(type, `${params.runId}`),
    recipientUid: params.uid,
    appRole: params.appRole,
    ...eventContext,
  });
}

async function staffAttention(
  db: Firestore,
  params: {
    uid: string;
    duty: string;
    scopeIds: ReadonlyArray<string> | null;
    severity: "info" | "warning" | "urgent";
    title: string;
    scope: MomentScope;
    runId: string;
  },
  sendNotification: typeof sendFcmNotification,
): Promise<void> {
  // Attention-item projection ownership lives in organizerAttention; the
  // durable signal to the staff member is an activity item + push.
  const id = activityNotificationId(
    "organizerUpdate", `${params.runId}_${params.uid}`);
  await createActivityNotificationIfAbsent(db, {
    id,
    uid: params.uid,
    type: "organizerUpdate",
    title: params.title,
    body: params.title,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(params.scope.kind === "event" ?
      {eventId: params.scope.eventId} : {}),
  });
  const userSnap = await db.collection("users").doc(params.uid).get();
  const user = userSnap.data() as UserProfileDocument | undefined;
  if (!user?.fcmToken) return;
  await sendNotification({
    token: user.fcmToken,
    title: params.title,
    body: params.title,
    type: "organizerUpdate",
    notificationId: id,
    recipientUid: params.uid,
    appRole: "host",
  });
}

// --- Consent facts ---------------------------------------------------------

async function consentFacts(
  db: Firestore,
  recipient: ResolvedRecipient,
): Promise<ConsentFacts> {
  const facts: ConsentFacts = {};
  // CRM contacts carry permission + suppression state on organizer docs —
  // the same facts the delivery claim re-reads transactionally.
  if (recipient.recipientKey.startsWith("contact:")) {
    const contactId = recipient.recipientKey.slice("contact:".length);
    const contactSnap = await db.collection("organizerContacts")
      .doc(contactId).get();
    const contact = contactSnap.data() as
      | OrganizerContactDocument
      | undefined;
    if (!contact) return {communicationPermission: "unknown"};
    const [preferenceSnap, channelSnap] = await Promise.all([
      contact.linkedUid ?
        db.collection("organizerCommunicationPreferences")
          .doc(organizerCommunicationPreferenceId(
            contact.organizerId, contact.linkedUid)).get() :
        Promise.resolve(null),
      db.collection("organizerContactChannelStates")
        .doc(organizerContactChannelStateId(
          contact.organizerId, contactId)).get(),
    ]);
    const preference = preferenceSnap?.data() as
      | OrganizerCommunicationPreferenceDocument
      | undefined;
    const channel = channelSnap.data() as
      | OrganizerContactChannelStateDocument
      | undefined;
    facts.communicationPermission = !contact.phoneE164 || !preference ?
      "unknown" :
      effectiveOrganizerWhatsappPurposeStatus(
        preference, "marketing", contact.phoneE164);
    facts.endpointSuppressed = channel?.adminSuppressed === true ||
      (channel?.suppressionStatus !== undefined &&
        channel.suppressionStatus !== "none");
    return facts;
  }
  if (recipient.householdId !== null) {
    const snap = await db.collection("programHouseholds")
      .doc(recipient.householdId).get();
    const consent = (snap.data() as Record<string, unknown> | undefined)
      ?.messagingConsent;
    if (typeof consent === "object" && consent !== null &&
        typeof (consent as {granted?: unknown}).granted === "boolean") {
      facts.householdConsentGranted =
        (consent as {granted: boolean}).granted;
    }
  }
  return facts;
}
