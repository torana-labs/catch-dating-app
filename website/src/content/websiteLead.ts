/**
 * What a website lead form says when a send does not go through: one line
 * per state of the lead client (src/shared/api/websiteLead.ts). Keep the
 * keys; change the words. Each form owns its own labels, consent wording and
 * confirmation.
 */
export const websiteLeadCopy = {
  problems: {
    /** The number is not a mobile number, so nothing was sent. */
    invalid_phone: "Check your WhatsApp number. Include the country code if it isn’t a local number.",
    /** 400: an answer was refused. */
    invalid: "Something in the form needs another look. Check your answers and send it again.",
    /** 401: the page could not prove it is the real site (no App Check token, or an expired one). */
    refresh: "We couldn’t confirm this page. Refresh it, then send the form again.",
    /** 409: this request was already sent with different answers. */
    changed: "This request changed since you first sent it. Check your answers and send it again.",
    /** 429: too many sends from this number or network in the last hour. */
    busy: "We’ve had a lot of requests from you in the last hour. Please try again later.",
    /** No answer, or one the site could not read. */
    failed: "That didn’t go through. Check your connection and try again.",
  },
} as const;
