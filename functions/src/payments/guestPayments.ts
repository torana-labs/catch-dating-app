/**
 * One ledger for every guest checkout: public event registration, paid form
 * submissions and event offers. Each document's `purpose` names the flow that
 * owns it, and each flow keeps its own contract and parser over the shared
 * money core (amount, provider ids, refunds, routing, status). Ids carry a
 * per-flow prefix (pp_, fp_, ep_), so flows never share an id. Native Catch
 * booking payments stay in `payments`.
 */
export const GUEST_PAYMENTS = "guestPayments";

export type GuestPaymentPurpose = "publicEvent" | "form" | "offer";

export const GUEST_PAYMENT_PURPOSES: readonly GuestPaymentPurpose[] =
  ["publicEvent", "form", "offer"];
