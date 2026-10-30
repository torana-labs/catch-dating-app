import {brand} from "./brand.ts";

// Private event invitation copy, shared by the page and payment controller.
export const eventOfferCopy = {
  acceptFree: "Accept invitation",
  freeAmount: "Free admission",
  freeInvitationBody: "You’ve been offered a free place. Accept your invitation to confirm it, subject to current availability.",
  eventAccess: "View your booking and event access",
  "brandLabel": "Your invitation",
  "brandWord": brand.name,
  "invitationTitle": "Your event invitation",
  "invitationBody": "You’ve been offered a place. Start checkout when you’re ready; an invitation alone doesn’t reserve a seat.",
  "loading": "Opening your invitation",
  "phoneKicker": "A place for you",
  "phoneTitle": "Let’s verify your phone",
  "phoneBody": "Use the number you shared with the host to see your private invitation.",
  "phoneLabel": "Phone number",
  "phonePlaceholder": "+91 98765 43210",
  "sending": "Sending code",
  "send": "Send verification code",
  "otpKicker": "Check your messages",
  "otpTitle": "Enter your code",
  "codeLabel": "Verification code",
  "verifying": "Verifying",
  "verify": "Verify and continue",
  "changeNumber": "Change number or resend code",
  "privateKicker": "Private invitation",
  "unavailableTitle": "We couldn’t open this invitation",
  "unavailableBody": "Reopen the original link from your host. If it still won’t open, check that you’re using the phone number you gave them.",
  "checking": "Checking",
  "retry": "Try again",
  "verifyAnother": "Verify another number",
  "help": "Get help",
  "confirmed": "Confirmed",
  "admission": "Event admission",
  "refund": "Refund",
  "bookingAmount": "Booking amount",
  "testMode": "Test payment — no real money will be collected.",
  "checkingPayment": "Checking payment",
  "continueCheckout": "Continue secure checkout",
  "reservePay": "Reserve a seat and pay",
  "refresh": "Refresh payment status",
  "claimError": "We couldn’t open this invitation. Verify the phone number you gave the host, or ask them for a current link.",
  "statusError": "Payment status is temporarily unavailable. Please check again; don’t pay again.",
  "checkoutError": "Checkout needs another check. Use the same payment below to retry or check its status.",
  "phoneError": "Include your country code, for example +91.",
  "sendError": "We couldn’t send the code. Check your number and try again.",
  "codeError": "That code couldn’t be verified. Check it and try again.",
  "cancellationTerms": "Cancellation policy",
  "cancelAdmission": "Cancel my place",
  "cancellation": "Cancellation",
  "cancelTitle": "Cancel your place?",
  "confirmCancellation": "Confirm cancellation",
  "keepAdmission": "Keep my place",
  "cancelling": "Cancelling",
  "noRefund": "No refund applies. Cancelling releases your place and cannot be undone.",
  "cancelUnavailable": "This admission cannot be cancelled online now. Contact your host for help.",
  "cancelError": "We couldn’t confirm cancellation. Refresh your status, then review the current refund before trying again.",
  "responseError": "We couldn’t verify the invitation response. Please retry."
} as const;

export const offerCodeSent = (phone: string) => `We sent a six-digit code to ${phone}.`;
export const offerHoldEnds = (time: string) => `Your seat hold ends at ${time}.`;

export const offerRefundDeadline = (time: string) => `Full cash refund if you cancel by ${time}. After that, no refund. Online cancellation closes when the event starts.`;
export const offerCancellationRefund = (amount: string) => `Your place will be released and ${amount} refunded to your original payment method. Your bank may take a few days to show it.`;

export function offerPaymentCopy(status: string, hasCheckout: boolean, cancellationReason: "eventCancelled" | "guestCancelled" | null = null) {
  if (cancellationReason === "guestCancelled" && status === "cancelled") return {
    title: "Your place is cancelled", body: "Your place was released. No refund applies under the cancellation terms you confirmed."};
  if (cancellationReason === "guestCancelled" && status === "refundPending") return {
    title: "Your place is cancelled", body: "Your refund is underway. Don’t pay again."};
  if (cancellationReason === "guestCancelled" && status === "refunded") return {
    title: "Your refund is processed", body: "Your place was cancelled. Your bank may take a few days to show the refund."};
  if (cancellationReason === "eventCancelled" && status === "refundPending") return {
    title: "The event was cancelled",
    body: "Your admission is cancelled and your refund is underway. Don’t pay again."};
  if (cancellationReason === "eventCancelled" && status === "refunded") return {
    title: "Your refund is processed",
    body: "The event was cancelled. Your bank may take a few days to show the refund."};
  if (status === "admitted") return {title: "You’re on the guest list",
    body: "Your payment is confirmed and your place is reserved."};
  if (status === "refunded") return {title: "Your refund is processed",
    body: "Your place was not confirmed. Your bank may take a few days to show the refund."};
  if (status === "refundPending") return {title: "Your refund is underway",
    body: "We couldn’t confirm your place. We’re returning your payment. Don’t pay again."};
  if (status === "expired") return {title: "Your seat hold has ended",
    body: "Your place isn’t reserved. If money was collected, we’ll check it and arrange a refund. Contact the host before trying again."};
  if (status === "reviewRequired") return {title: "We’re reviewing your payment",
    body: "Please contact the host for help. Don’t start another payment while this is being checked."};
  if (hasCheckout) return {title: "Complete your booking",
    body: `Your seat is held for 15 minutes from checkout start. Admission is confirmed once ${brand.name} verifies payment.`};
  return {title: "Checking your payment",
    body: "We’re checking with the payment provider. You can refresh this status; please don’t start another payment."};
}
