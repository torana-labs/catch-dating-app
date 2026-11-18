import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {
  reconcileAlertResolution,
  reconcileStaffAttentionAlert,
  reconcileTravelAlerts,
  reconcileTravelCounts,
} from "./programLiveBoardViews";

const options = {retry: true};

type Data = FirebaseFirestore.DocumentData | undefined;

/** A staff attention send firing: the alert for its run and duty. */
export const onProgramAlertSendChanged = onDocumentWritten({
  ...options, document: "organizerMomentSends/{sendId}",
}, async (event) => {
  const ids = new Set<string>();
  for (const data of [event.data?.before.data(), event.data?.after.data()]) {
    if (data?.actionKind === "staffAttention" &&
        data.scopeKind === "program" && typeof data.scopeId === "string" &&
        typeof data.runId === "string" && typeof data.duty === "string") {
      ids.add(JSON.stringify([data.scopeId, data.runId, data.duty]));
    }
  }
  for (const id of ids) {
    const [programId, runId, duty] = JSON.parse(id) as string[];
    await reconcileStaffAttentionAlert(admin.firestore(), programId, runId,
      duty);
  }
});

/** A journey's flight status or readiness: its alerts and the counts. */
export const onProgramAlertLegChanged = onDocumentWritten({
  ...options, document: "programTravelLegs/{legId}",
}, async (event) => {
  const db = admin.firestore();
  const before: Data = event.data?.before.data();
  const after: Data = event.data?.after.data();
  const programId = after?.programId ?? before?.programId;
  if (typeof programId !== "string" || !programId) return;
  const watched = (data: Data) => [data?.kind, data?.flightStatus,
    data?.readiness, data?.flightNumber];
  if (before && after &&
      JSON.stringify(watched(before)) === JSON.stringify(watched(after))) {
    return;
  }
  await reconcileTravelAlerts(db, programId, event.params.legId);
  await reconcileTravelCounts(db, programId);
});

/** Someone taking, finishing or reopening an alert, or the retention delete. */
export const onProgramAlertResolutionChanged = onDocumentWritten({
  ...options, document: "programAlerts/{resolutionId}",
}, async (event) => {
  const data = event.data?.after.data() ?? event.data?.before.data();
  if (typeof data?.programId !== "string" ||
      typeof data?.alertId !== "string") return;
  await reconcileAlertResolution(admin.firestore(), data.programId,
    data.alertId);
});
