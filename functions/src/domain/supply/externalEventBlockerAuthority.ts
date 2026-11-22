import {HttpsError} from "firebase-functions/v2/https";

export const policyDecisionIdByExternalEventBlocker = {
  missing_exact_coordinates:
    "policy-external-event-location-provider-policy",
  missing_end_time: "policy-external-event-defaults-policy",
  missing_location_detail:
    "policy-external-event-location-provider-policy",
  requires_event_defaults_policy:
    "policy-external-event-defaults-policy",
  requires_owner_safe_copy_review:
    "policy-external-event-import-write-policy",
  duplicate_normalized_event_key:
    "policy-external-event-import-write-policy",
} as const;

type ExternalEventBlockerCode =
  keyof typeof policyDecisionIdByExternalEventBlocker;

interface ExternalEventBlockerResolution {
  blockerCode: ExternalEventBlockerCode;
  outcome: "resolved" | "waived";
  policyGapDecisionId: string | null;
  note: string;
}

export function assertExternalEventBlockerResolutions(
  value: unknown
): ExternalEventBlockerResolution[] {
  if (!Array.isArray(value)) {
    throw new HttpsError(
      "failed-precondition",
      "The preflight action is missing event-scoped blocker resolutions."
    );
  }
  const resolutions: ExternalEventBlockerResolution[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new HttpsError(
        "failed-precondition",
        "An external-event blocker resolution is malformed."
      );
    }
    const resolution = raw as Record<string, unknown>;
    const blockerCode = resolution.blockerCode;
    if (
      typeof blockerCode !== "string" ||
      !(blockerCode in policyDecisionIdByExternalEventBlocker) ||
      seen.has(blockerCode)
    ) {
      throw new HttpsError(
        "failed-precondition",
        "External-event blocker resolutions must use unique governed codes."
      );
    }
    seen.add(blockerCode);
    const outcome = resolution.outcome;
    const policyGapDecisionId = resolution.policyGapDecisionId;
    const note = resolution.note;
    if (
      (outcome !== "resolved" && outcome !== "waived") ||
      typeof note !== "string" ||
      !note.trim()
    ) {
      throw new HttpsError(
        "failed-precondition",
        `External-event blocker ${blockerCode} lacks a reviewed outcome.`
      );
    }
    const expectedPolicyDecisionId =
      policyDecisionIdByExternalEventBlocker[
        blockerCode as ExternalEventBlockerCode
      ];
    if (
      (outcome === "resolved" && policyGapDecisionId !== null) ||
      (outcome === "waived" &&
        policyGapDecisionId !== expectedPolicyDecisionId)
    ) {
      throw new HttpsError(
        "failed-precondition",
        `${blockerCode} has invalid policy waiver authority.`
      );
    }
    resolutions.push({
      blockerCode: blockerCode as ExternalEventBlockerCode,
      outcome,
      policyGapDecisionId:
        typeof policyGapDecisionId === "string" ?
          policyGapDecisionId :
          null,
      note: note.trim(),
    });
  }
  return resolutions;
}

export async function assertAcceptedExternalEventWaivers(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  value: unknown
): Promise<ExternalEventBlockerResolution[]> {
  const resolutions = assertExternalEventBlockerResolutions(value);
  for (const resolution of resolutions) {
    if (
      resolution.outcome !== "waived" ||
      !resolution.policyGapDecisionId
    ) {
      continue;
    }
    const decisionRef = db.collection("organizerPolicyGapReviewDecisions")
      .doc(resolution.policyGapDecisionId);
    const decisionSnap = await tx.get(decisionRef);
    const decision = decisionSnap.data() ?? {};
    if (
      !decisionSnap.exists ||
      decision.decisionId !== resolution.policyGapDecisionId ||
      decision.decisionStatus !== "accepted"
    ) {
      throw new HttpsError(
        "failed-precondition",
        `Waiver ${resolution.policyGapDecisionId} is not an accepted policy ` +
          "decision."
      );
    }
  }
  return resolutions;
}
