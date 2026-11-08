import type {EventDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {isEventPolicyTerms} from "../configuredEvent";
import {eventPolicyFromEvent, normalizePolicy} from "../eventPolicy";
import {canonicalJson} from "../eventSetupPreferences/resolve";
import type {BookingMode} from "../eventSetupPreferences/types";

/** The admission choices an event's saved preferences carry. Null leaves the
 * event's current policy as it is.
 */
export interface EventAdmissionChoices {
  bookingMode: BookingMode | null;
  waitlistEnabled: boolean | null;
}

const bookingModes = new Set(["anyone", "followersFirst", "askFirst"]);

/** Reads the resolved choices from `eventSetupPreferences/{eventId}`. The
 * preferences command already validated the document; anything unexpected
 * reads as "no choice", never as a policy change.
 */
export function admissionChoicesFromPreferences(
  raw: FirebaseFirestore.DocumentData | undefined
): EventAdmissionChoices {
  const preferences = raw?.preferences as Record<string, unknown> | undefined;
  const booking = (preferences?.bookingMode as {value?: unknown} | undefined)
    ?.value;
  const waitlist = (preferences?.waitlistEnabled as
    {value?: unknown} | undefined)?.value;
  return {
    bookingMode: typeof booking === "string" && bookingModes.has(booking) ?
      booking as BookingMode : null,
    waitlistEnabled: typeof waitlist === "boolean" ? waitlist : null,
  };
}

/** The eventPolicy patch that makes the event's admission match the choices,
 * or null when nothing changes. askFirst is the existing host-approval path:
 * sign-ups become join requests the host lets in, and an approved guest then
 * books (and pays) as usual. A disabled waitlist stops new waitlist joins;
 * join requests on an askFirst event still go through.
 */
export function admissionChoicesPatch(event: EventDocument,
  choices: EventAdmissionChoices): Pick<EventDocument, "eventPolicy"> | null {
  if (choices.bookingMode === null && choices.waitlistEnabled === null) {
    return null;
  }
  if (!isEventPolicyTerms(event)) return null;
  const previous = eventPolicyFromEvent(event);
  const admission = {...previous.admission};
  if (choices.bookingMode !== null) {
    admission.manualApprovalRequired = choices.bookingMode === "askFirst";
  }
  if (choices.waitlistEnabled !== null) {
    const current = admission.waitlistPolicy ??
      {mode: "rankedOffer" as const, offerWindowMinutes: 20};
    admission.waitlistPolicy = choices.waitlistEnabled ?
      {...current, mode: current.mode === "disabled" ?
        "rankedOffer" : current.mode} :
      {...current, mode: "disabled"};
  }
  const next = normalizePolicy({...previous, admission});
  const before = (event as {eventPolicy?: unknown}).eventPolicy;
  if (before !== undefined && canonicalJson(before) === canonicalJson(next)) {
    return null;
  }
  return {eventPolicy: next as EventDocument["eventPolicy"]};
}
