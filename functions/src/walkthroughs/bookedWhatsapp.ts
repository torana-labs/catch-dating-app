import {getFirestore, type Firestore} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {defineBoolean, defineString} from "firebase-functions/params";
import type {WalkthroughBookingDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  defaultSupportInboxDeps,
  type SupportInboxDeps,
} from "../supportInbox/conversations";
import {
  catchReplyTemplateSender,
  type CatchTemplateSender,
} from "../catchMessaging/catchSender";
import {leadFirstName} from "../catchMessaging/catchTemplates";
import {
  sendAutomaticTemplate,
  type AutomaticTemplateScope,
  type TemplateDeliveryOutcome,
} from "../catchMessaging/templateDelivery";
import {catchReplyHash} from "../catchMessaging/whatsappReply";
import {isInternalTestLead} from "../waitlist/internalTestLead";
import {INDIA_UTC_OFFSET_MINUTES} from "./calendar";
import {WALKTHROUGH_COLLECTIONS} from "./model";

// When someone books a walkthrough on the website, or moves their booking,
// Catch's WhatsApp number sends the approved host_walkthrough_booked
// template to the number they verified with a one-time code: "Hi {{1}}, your
// Catch Host walkthrough is booked for {{2}} (India time)...". It runs right
// after bookWalkthrough or manageWalkthroughBooking saves the slot, and never
// throws, so the booking stands whatever happens to the message.
//
// One message per booking and slot: its Support message id is made from
// both, and it is claimed before WhatsApp is called together with the
// booking's record of it (bookedWhatsapp), so a repeated call never sends
// twice. A move to a new time sends again with that time; moving back to a
// time already sent does not. A failed or unconfirmed send is logged and
// left for staff, never retried. Nothing is sent after STOP, for an internal
// test booking (an internal_qa_ request id or a "[QA]" name), a cancelled or
// started booking, a booking or move older than six hours, or while
// CATCH_WHATSAPP_WALKTHROUGH_BOOKED_ENABLED (or
// CATCH_WHATSAPP_REPLIES_ENABLED) is off. Staff still confirm the time in
// the Admin Inbox as before.

/** A booking or move older than this when the send runs is stale. */
export const WALKTHROUGH_BOOKED_MAX_AGE_MILLIS = 6 * 60 * 60 * 1000;

export interface WalkthroughBookedConfig {
  /** CATCH_WHATSAPP_WALKTHROUGH_BOOKED_ENABLED and _REPLIES_ENABLED. */
  enabled: boolean;
  wabaId: string;
  phoneNumberId: string;
}

export interface WalkthroughBookedDeps {
  config: () => WalkthroughBookedConfig;
  db: () => Firestore;
  nowMillis: () => number;
  /** Null when this environment has no sender credential. */
  sender: (scope: AutomaticTemplateScope) =>
    Promise<CatchTemplateSender | null>;
  findUidByPhone: SupportInboxDeps["findUidByPhone"];
  warn: (message: string, fields: Record<string, unknown>) => void;
}

export type WalkthroughBookedOutcome = "disabled" | "notApplicable" |
  "stale" | "replayed" | "stopped" | "unavailable" | "accepted" | "failed" |
  "unknown";

type BookedRecord = NonNullable<WalkthroughBookingDocument["bookedWhatsapp"]>;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
  "Sep", "Oct", "Nov", "Dec"];

/**
 * The template's {{2}}: a slot start in India time, "Tue 25 Nov, 11:00 AM".
 * @param {string} startAt The slot start, a UTC instant.
 * @return {string} The time as the message says it.
 */
export function walkthroughSlotTime(startAt: string): string {
  const local = new Date(Date.parse(startAt) +
    INDIA_UTC_OFFSET_MINUTES * 60_000);
  const hour = local.getUTCHours();
  const minute = String(local.getUTCMinutes()).padStart(2, "0");
  return `${WEEKDAYS[local.getUTCDay()]} ${local.getUTCDate()} ` +
    `${MONTHS[local.getUTCMonth()]}, ${hour % 12 || 12}:${minute} ` +
    (hour < 12 ? "AM" : "PM");
}

/**
 * The Support message id of one booking's message for one slot.
 * @param {object} scope Catch's WhatsApp account and number.
 * @param {string} bookingId The booking.
 * @param {string} slotStartAt The slot it was sent for.
 * @return {string} Message id.
 */
export function walkthroughBookedMessageId(
  scope: {wabaId: string; phoneNumberId: string}, bookingId: string,
  slotStartAt: string): string {
  return "cwbooked_" + catchReplyHash([scope.wabaId, scope.phoneNumberId,
    "host_walkthrough_booked", bookingId, slotStartAt]);
}

/** When the booking last changed slot: its creation or its latest move. */
function slotChangedAt(booking: WalkthroughBookingDocument): number {
  return Date.parse(booking.reschedules.at(-1)?.at ?? booking.createdAt);
}

/**
 * Sends the booking's message for its current slot, at most once per slot.
 * Never throws.
 * @param {WalkthroughBookedDeps} deps Dependencies.
 * @param {string} bookingId The walkthroughBookings document id.
 * @return {Promise<WalkthroughBookedOutcome>} What happened.
 */
export async function sendWalkthroughBooked(deps: WalkthroughBookedDeps,
  bookingId: string): Promise<WalkthroughBookedOutcome> {
  try {
    return await sendOnce(deps, bookingId);
  } catch (error) {
    deps.warn("Walkthrough booked message not sent: unexpected error.",
      {bookingId, error: error instanceof Error ? error.name : "unknown"});
    return "unknown";
  }
}

async function sendOnce(deps: WalkthroughBookedDeps, bookingId: string):
  Promise<WalkthroughBookedOutcome> {
  const config = {...deps.config()};
  if (!config.enabled || !/^wt-[a-f0-9]{40}$/u.test(bookingId)) {
    return "disabled";
  }
  const db = deps.db();
  const ref = db.collection(WALKTHROUGH_COLLECTIONS.bookings).doc(bookingId);
  const booking = (await ref.get()).data() as
    WalkthroughBookingDocument | undefined;
  const nowMillis = deps.nowMillis();
  if (!booking || booking.status !== "booked" ||
      Date.parse(booking.slot.startAt) <= nowMillis ||
      !/^\+[1-9][0-9]{6,14}$/u.test(booking.phone) ||
      isInternalTestLead({submissionId: booking.requestId,
        fullName: booking.name, email: null})) return "notApplicable";
  const slotStartAt = booking.slot.startAt;
  if (booking.bookedWhatsapp?.slotStartAt === slotStartAt) return "replayed";
  if (nowMillis - slotChangedAt(booking) > WALKTHROUGH_BOOKED_MAX_AGE_MILLIS) {
    return "stale";
  }
  const at = () => new Date(deps.nowMillis()).toISOString();
  const skip = async (reason: "stopped" | "unavailable") => {
    const skipped: BookedRecord = {templateName: "host_walkthrough_booked",
      slotStartAt, state: "skipped", skipReason: reason,
      conversationId: null, messageId: null, providerMessageId: null,
      deliveryErrorCode: null, attemptedAt: at()};
    await ref.update({bookedWhatsapp: skipped});
    if (reason === "unavailable") {
      deps.warn("Walkthrough booked message not sent: no WhatsApp sender " +
        "here.", {bookingId});
    }
    return reason;
  };

  const scope = {enabled: true, wabaId: config.wabaId,
    phoneNumberId: config.phoneNumberId};
  const messageId = walkthroughBookedMessageId(scope, bookingId, slotStartAt);
  const result = await sendAutomaticTemplate({
    db, scope, nowMillis: deps.nowMillis, sender: deps.sender,
    findUidByPhone: deps.findUidByPhone, toE164: booking.phone,
    displayName: booking.name, template: "host_walkthrough_booked",
    variables: {first_name: leadFirstName(booking.name),
      slot_time: walkthroughSlotTime(slotStartAt)},
    messageId,
    onClaim: (tx, {conversationId}) => tx.update(ref, {
      bookedWhatsapp: {templateName: "host_walkthrough_booked", slotStartAt,
        state: "sending", skipReason: null, conversationId, messageId,
        providerMessageId: null, deliveryErrorCode: null,
        attemptedAt: at()} satisfies BookedRecord,
    }),
  });
  if (result.kind === "unavailable" || result.kind === "stopped") {
    return skip(result.kind);
  }
  if (result.kind === "replayed") return "replayed";
  const {outcome} = result;
  await settle(db, ref, messageId, outcome)
    .catch(() => deps.warn("Walkthrough booked record not settled.",
      {bookingId}));
  if (outcome.state !== "accepted") {
    deps.warn(outcome.state === "failed" ?
      "Walkthrough booked message refused by WhatsApp." :
      "Walkthrough booked message outcome unknown.", {bookingId,
      deliveryErrorCode: outcome.deliveryErrorCode});
  }
  return outcome.state;
}

/**
 * Settles the booking's record, unless a later move already replaced it
 * with the message for the new slot.
 * @param {Firestore} db Firestore.
 * @param {FirebaseFirestore.DocumentReference} ref The booking.
 * @param {string} messageId The message this outcome is for.
 * @param {TemplateDeliveryOutcome} outcome What happened.
 */
async function settle(db: Firestore,
  ref: FirebaseFirestore.DocumentReference, messageId: string,
  outcome: TemplateDeliveryOutcome): Promise<void> {
  await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as
      WalkthroughBookingDocument | undefined;
    if (current?.bookedWhatsapp?.messageId !== messageId) return;
    tx.update(ref, {
      "bookedWhatsapp.state": outcome.state,
      "bookedWhatsapp.providerMessageId": outcome.providerMessageId,
      "bookedWhatsapp.deliveryErrorCode": outcome.deliveryErrorCode,
    });
  });
}

const bookedEnabled = defineBoolean(
  "CATCH_WHATSAPP_WALKTHROUGH_BOOKED_ENABLED", {default: false});
const repliesEnabled = defineBoolean("CATCH_WHATSAPP_REPLIES_ENABLED",
  {default: false});
const wabaId = defineString("CATCH_WHATSAPP_WABA_ID", {default: ""});
const phoneNumberId = defineString("CATCH_WHATSAPP_PHONE_NUMBER_ID",
  {default: ""});
export const defaultWalkthroughBookedDeps: WalkthroughBookedDeps = {
  config: () => ({enabled: bookedEnabled.value() && repliesEnabled.value(),
    wabaId: wabaId.value().trim(),
    phoneNumberId: phoneNumberId.value().trim()}),
  db: getFirestore,
  nowMillis: Date.now,
  sender: catchReplyTemplateSender,
  findUidByPhone: defaultSupportInboxDeps.findUidByPhone,
  warn: (message, fields) => logger.warn(message, fields),
};
