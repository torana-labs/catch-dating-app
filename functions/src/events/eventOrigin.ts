import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import {isEventPubliclyAccessible} from "./eventPublicationAccess";

/** Prevents Catch booking flows from acting on companion-only events. */
export function requireCatchBookingAuthority(event: EventDocument): void {
  if (!isEventPubliclyAccessible(event)) {
    throw new HttpsError("failed-precondition",
      "This event is not open for public booking.");
  }
  // Tickets sold elsewhere keep Catch booking closed, as on the website.
  if (event.eventOrigin?.bookingAuthority !== "catch" ||
      event.externalBooking !== undefined) {
    throw new HttpsError(
      "failed-precondition",
      "Booking for this event stays with the Host's original platform."
    );
  }
}
