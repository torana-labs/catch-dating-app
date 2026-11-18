import {brand} from "./brand.ts";

export const eventInviteCopy = {
  registrationClosed: "Registration is closed for this event.",
  brand: `${brand.name} invitation`,
  brandWord: brand.name,
  loading: "Opening your invitation",
  kicker: "Private event invitation",
  title: "You are invited",
  externalBody: (source: string) =>
    `${brand.name} will take you to ${source} to finish registration. ${brand.name} records this invitation open; the booking remains with ${source}.`,
  catchBody: `Register here with your verified phone number. You do not need the ${brand.name} app.`,
  runtimeBody: "Continue to the no-download event page to verify your number and open the live event tools.",
  externalAction: (source: string) => `Continue to ${source}`,
  catchAction: "Continue to registration",
  runtimeAction: "Open event mode",
  unavailableTitle: "This invitation is unavailable",
  unavailableBody: "The event may have ended, the link may have expired, or the host may have disabled it. Ask the host for a fresh invitation.",
  helpAction: "Open help",
  unreachableTitle: "We could not open this invitation",
  unreachableBody: `Something between this page and ${brand.name} stopped it from checking the invitation, such as a weak connection or a browser extension that blocks scripts. Try again, or open the link in another browser.`,
  retryAction: "Try again",
} as const;
