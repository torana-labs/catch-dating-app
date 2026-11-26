import {brand} from "./brand.ts";

export const eventInviteCopy = {
  brand: `${brand.name} invitation`,
  loading: "Opening your invitation",
  kicker: "Private event invitation",
  title: "You are invited",
  unavailableTitle: "This invitation is unavailable",
  unavailableBody: "The event may have ended, the link may have expired, or the host may have disabled it. Ask the host for a fresh invitation.",
  helpAction: "Open help",
  unreachableTitle: "We could not open this invitation",
  unreachableBody: `Something between this page and ${brand.name} stopped it from checking the invitation, such as a weak connection or a browser extension that blocks scripts. Try again, or open the link in another browser.`,
  retryAction: "Try again",
} as const;
