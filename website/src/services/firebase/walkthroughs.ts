import type {BookWalkthroughCallablePayload} from "../../../../functions/src/shared/generated/bookWalkthroughCallablePayload";
import type {BookWalkthroughCallableResponse} from "../../../../functions/src/shared/generated/bookWalkthroughCallableResponse";
import type {GetWalkthroughSlotsCallablePayload} from "../../../../functions/src/shared/generated/getWalkthroughSlotsCallablePayload";
import type {GetWalkthroughSlotsCallableResponse} from "../../../../functions/src/shared/generated/getWalkthroughSlotsCallableResponse";
import type {ManageWalkthroughBookingCallablePayload} from "../../../../functions/src/shared/generated/manageWalkthroughBookingCallablePayload";
import type {ManageWalkthroughBookingCallableResponse} from "../../../../functions/src/shared/generated/manageWalkthroughBookingCallableResponse";
import {claimFirebaseConfigured} from "../../firebaseConfig";
import {invokeWebsiteCallable} from "./runtime";
import {readTryItCaller} from "./tryIt";

/**
 * The walkthrough booking callables (functions/src/walkthroughs/publicCallables.ts):
 * the open slots, booking one with a code-verified WhatsApp number, and
 * reading, moving or cancelling a booking. Payloads and responses are
 * generated from contracts/callables/*walkthrough* and
 * contracts/callable_responses/*walkthrough*. A refusal arrives as a
 * FunctionsError whose details.reason names it (model.ts WalkthroughRefusal).
 */
export type {
  BookWalkthroughCallablePayload,
  BookWalkthroughCallableResponse,
  GetWalkthroughSlotsCallablePayload,
  GetWalkthroughSlotsCallableResponse,
  ManageWalkthroughBookingCallablePayload,
  ManageWalkthroughBookingCallableResponse,
};

const capability = "Walkthrough bookings";

/** The open slots of the next days, times only. Public: App Check, no sign-in, so it uses the runtime without Auth. */
export async function getWalkthroughSlots(payload: GetWalkthroughSlotsCallablePayload = {}): Promise<GetWalkthroughSlotsCallableResponse> {
  return invokeWebsiteCallable<GetWalkthroughSlotsCallablePayload, GetWalkthroughSlotsCallableResponse>(
    "getWalkthroughSlots", payload, claimFirebaseConfigured, capability, "public");
}

/** Books one open slot for the signed-in account's code-verified phone. A retry with the same request id and token finds the same booking. */
export async function bookWalkthrough(payload: BookWalkthroughCallablePayload): Promise<BookWalkthroughCallableResponse> {
  return invokeWebsiteCallable<BookWalkthroughCallablePayload, BookWalkthroughCallableResponse>(
    "bookWalkthrough", payload, claimFirebaseConfigured, capability);
}

/** Reads, cancels or moves a booking, proven by its manage token or by signing in with the booking's verified phone. */
export async function manageWalkthroughBooking(payload: ManageWalkthroughBookingCallablePayload): Promise<ManageWalkthroughBookingCallableResponse> {
  return invokeWebsiteCallable<ManageWalkthroughBookingCallablePayload, ManageWalkthroughBookingCallableResponse>(
    "manageWalkthroughBooking", payload, claimFirebaseConfigured, capability);
}

/** Who a booking would be made as: the signed-in account and its code-verified phone, as the try-it tools read it. */
export const readWalkthroughCaller: typeof readTryItCaller = () => readTryItCaller();
