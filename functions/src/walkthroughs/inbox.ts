/* eslint-disable max-len */
import type {InboxProjection, InboxState, JourneyStep} from "../admin/inbox/model";
import {marketForIdOrAlias} from "../locations/marketConfig";
import type {WalkthroughBookingDocument} from "../shared/generated/firestoreAdminTypes";
import {slotLabel} from "./calendar";
import {WALKTHROUGH_COLLECTIONS} from "./model";
import {isConfirmed, walkthroughInboxItemId} from "./store";

// A walkthrough booking is a staff task in the Admin Inbox: reply on WhatsApp
// to confirm the slot (decision 28: nothing is sent automatically), then
// record it with adminUpdateWalkthroughBooking confirm, which closes the task.
// A move reopens it for the new time; a cancellation closes it.
//
// The Admin Inbox projects each source kind from functions/src/admin/inbox/
// model.ts. This file is the projection for the walkthroughBooking kind; the
// kind itself is registered there (INBOX_SOURCE_KINDS, sourceCollections,
// itemPrefixes "walkthrough", projectInboxSource) together with
// contracts/firestore/admin_inbox_items.schema.json, by the edit this branch's
// hand-off lists. Until then the type below is the projection with its kind
// spelled out, and it is assignable to InboxProjection once the kind is added.

export const WALKTHROUGH_INBOX_SOURCE_KIND = "walkthroughBooking";

export type WalkthroughInboxProjection = Omit<InboxProjection, "sourceKind"> & {
  sourceKind: typeof WALKTHROUGH_INBOX_SOURCE_KIND;
};

const confirmState: InboxState = {code: "confirm_on_whatsapp", label: "Confirm on WhatsApp", tone: "warning"};
const movedState: InboxState = {code: "confirm_on_whatsapp", label: "Moved, confirm the new time on WhatsApp", tone: "warning"};

/** One booking as its Admin Inbox item; null for a document that is not a booking. */
export function projectWalkthroughBooking(bookingId: string, data: Record<string, unknown>): WalkthroughInboxProjection | null {
  if (data.schemaVersion !== 1 || data.bookingId !== bookingId) return null;
  const booking = data as unknown as WalkthroughBookingDocument;
  const journey: JourneyStep[] = [{
    stepId: "booked",
    occurredAt: booking.createdAt,
    title: `Booked a walkthrough for ${slotLabel(booking.requestedSlotStartAt)}`,
    detail: `Reply on WhatsApp to ${booking.phone}`,
    actorUid: null,
    tone: "ink",
  }];
  booking.reschedules.forEach((move, index) => journey.push({
    stepId: `moved-${index + 1}`,
    occurredAt: move.at,
    title: `Moved to ${slotLabel(move.toStartAt)}`,
    detail: `${move.by === "staff" ? "By staff" : "By the host"}, from ${slotLabel(move.fromStartAt)}`,
    actorUid: null,
    tone: "warning",
  }));
  if (booking.staffConfirmation) {
    journey.push({
      stepId: `confirmed-${booking.staffConfirmation.slotStartAt.slice(0, 16).replace(/[-:]/gu, "")}`,
      occurredAt: booking.staffConfirmation.at,
      title: `Confirmed ${slotLabel(booking.staffConfirmation.slotStartAt)} on WhatsApp`,
      detail: booking.staffConfirmation.note,
      actorUid: booking.staffConfirmation.byUid,
      tone: "success",
    });
  }
  if (booking.cancellation) {
    journey.push({
      stepId: "cancelled",
      occurredAt: booking.cancellation.at,
      title: booking.cancellation.by === "staff" ? "Cancelled by staff" : "Cancelled by the host",
      detail: booking.cancellation.reason,
      actorUid: booking.cancellation.by === "staff" ? booking.cancellation.byUid : null,
      tone: "muted",
    });
  }
  const lastMove = booking.reschedules.at(-1);
  const confirmed = isConfirmed(booking);
  const cancelled = booking.status === "cancelled";
  const state: InboxState = cancelled ? {code: "cancelled", label: "Cancelled", tone: "neutral"} :
    confirmed ? {code: "confirmed", label: "Confirmed on WhatsApp", tone: "success"} :
      lastMove ? movedState : confirmState;
  return {
    itemId: walkthroughInboxItemId(bookingId),
    type: "enquiry",
    sourceKind: WALKTHROUGH_INBOX_SOURCE_KIND,
    sourceId: bookingId,
    sourcePath: `${WALKTHROUGH_COLLECTIONS.bookings}/${bookingId}`,
    title: booking.name ?? booking.details.organisation ?? "Walkthrough booking",
    subtitle: `Walkthrough ${booking.slot.label}`,
    cameFrom: "Host website",
    nominatorUid: null,
    city: booking.cityId ? marketForIdOrAlias(booking.cityId)?.slug ?? booking.cityId : null,
    state,
    lifecycle: cancelled || confirmed ? "closed" : "open",
    // A move asks for a new confirmation, so the task waits from the move.
    waitingSince: !confirmed && lastMove ? lastMove.at : booking.createdAt,
    closedAt: cancelled ? booking.cancellation!.at : confirmed ? booking.staffConfirmation!.at : null,
    recommendation: null,
    journey,
  };
}
