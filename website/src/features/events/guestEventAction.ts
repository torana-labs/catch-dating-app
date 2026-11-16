import {guestEventCopy as copy} from "../../content/events";
import type {GuestEventState} from "./guestEventState";
export type {GuestEventState};

/** Presentation only. The server chooses admission; destinations remain with their existing owners. */
export function guestEventAction(guest: GuestEventState, eventId: string): {
  label: string; status: string; href?: string;
} {
  const status = guest.action === "registerFree" ? copy.registrationReady :
    guest.action === "bookPaid" ? copy.bookingReady : copy.status[guest.action];
  switch (guest.action) {
    case "registerFree": return {label: copy.register, status};
    case "bookPaid": return {label: copy.book, status};
    case "apply": return {label: guest.publicFormId ? copy.apply : copy.details, status,
      href: guest.publicFormId ? `/f/${encodeURIComponent(guest.publicFormId)}/` : undefined};
    case "offer": return {label: guest.offerGrantId ? copy.offer : copy.details, status,
      href: guest.offerGrantId ? `/offer/?grant=${encodeURIComponent(guest.offerGrantId)}` : undefined};
    case "registered": return {label: guest.runtimeId ? copy.runtime : copy.details, status,
      href: guest.runtimeId ? `/join/${encodeURIComponent(guest.runtimeId)}` : undefined};
    case "recoverPayment": {
      const href = guest.offerPaymentId ? `/offer/?payment=${encodeURIComponent(guest.offerPaymentId)}` :
        guest.publicPaymentId ? `/booking/${encodeURIComponent(eventId)}/?payment=${encodeURIComponent(guest.publicPaymentId)}` : undefined;
      return {label: href ? copy.payment : copy.details, status, href};
    }
    default: return {label: copy.details, status};
  }
}
