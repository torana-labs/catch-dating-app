import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {householdRsvpSecret} from "../programRsvp/householdRsvp";
import {requireValid} from "./programAssets";
import {programGuestBrandingField} from "./programBranding";
import {computeStakeholderCounts} from "./programStakeholderCounts";
import {loadStakeholderRows} from "./stakeholderCountsView";
import {defaultWebLinkDeps, verifyWebLinkOrThrow, type WebLinkDeps} from
  "./programWebLinks";
import type {GetProgramFamilyViewCallablePayload} from
  "../shared/generated/getProgramFamilyViewCallablePayload";
import type {ProgramFamilyViewCallableResponse} from
  "../shared/generated/programFamilyViewCallableResponse";
import {validateGetProgramFamilyViewCallablePayload} from
  "../shared/generated/validators/getProgramFamilyViewInput";
import {validateProgramFamilyViewCallableResponse} from
  "../shared/generated/validators/programFamilyViewOutput";

// The family's view-only page (RbHostProgramShare on the web) through a
// family link the planner shares. It is the in-app stakeholder view's
// counts (`getProgramStakeholderCounts`) with the function names and the
// programme's branding: who is coming to what, heads per function for the
// caterer and how many households have still to reply. No guest or
// household names, phone numbers, rooms or notes leave the server.

/** The family's counts through their link; no sign-in. */
export async function getProgramFamilyViewHandler(
  request: CallableRequest<unknown>,
  deps: WebLinkDeps = defaultWebLinkDeps,
): Promise<ProgramFamilyViewCallableResponse> {
  const data = validateCallableWithAjv<GetProgramFamilyViewCallablePayload>(
    request, validateGetProgramFamilyViewCallablePayload);
  const link = verifyWebLinkOrThrow(data.token, "family", deps);
  const db = deps.firestore();
  await deps.checkRateLimit(db, `family:${link.programId}`,
    "getProgramFamilyView", {maxRequests: 120, windowMs: 60 * 1000});
  const program = (await db.collection("organizerPrograms")
    .doc(link.programId).get()).data() as Record<string, unknown> |
    undefined;
  if (!program || program.status === "archived" || program.anonymizedAt ||
      link.subjectId !== link.programId) {
    throw new HttpsError("not-found", "This page is no longer available.");
  }
  const rows = await loadStakeholderRows(db, link.programId);
  const counts = computeStakeholderCounts(rows);
  const replied = new Set(rows.guests.flatMap((guest) =>
    guest.householdId !== null && guest.invitationStatus === "responded" ?
      [guest.householdId] : []));
  const households = new Set(rows.households.map((row) => row.householdId));
  const functions = counts.functions.flatMap((fn) => {
    const doc = rows.functionDocs.get(fn.functionId);
    if (!doc || fn.status === "cancelled" ||
        doc.organizerId !== program.organizerId) {
      return [];
    }
    return [{
      functionId: fn.functionId,
      name: doc.name,
      startsAtMillis: staffTimestampMillis(doc.startsAt),
      venueName: doc.venueName ?? null,
      invitedCount: fn.invitedCount,
      rsvpAttending: fn.rsvpAttending,
      rsvpMaybe: fn.rsvpMaybe,
      rsvpPending: fn.rsvpPending,
      expectedHeads: fn.expectedHeads,
    }];
  }).sort((a, b) => a.startsAtMillis - b.startsAtMillis ||
    a.functionId.localeCompare(b.functionId));
  return requireValid(validateProgramFamilyViewCallableResponse, {
    programId: link.programId,
    programTitle: String(program.title ?? ""),
    timezone: String(program.timezone ?? "UTC"),
    startsAtMillis: staffTimestampMillis(program.startsAt),
    endsAtMillis: staffTimestampMillis(program.endsAt),
    serverTimeMillis: deps.now().toMillis(),
    guestCount: counts.guestCount,
    householdCount: counts.householdCount,
    householdsRepliedCount:
      [...replied].filter((id) => households.has(id)).length,
    functions,
    ...programGuestBrandingField(program),
    expiresAtMillis: link.expiresAtMillis,
  }, "family view");
}

export const getProgramFamilyView = onCall(
  appCheckCallableOptionsWithSecrets([householdRsvpSecret],
    {timeoutSeconds: 60, maxInstances: 20}),
  (request) => getProgramFamilyViewHandler(request),
);
