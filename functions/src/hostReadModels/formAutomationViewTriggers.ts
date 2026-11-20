import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {
  reconcileFormAutomationRuleView,
  reconcileFormAutomationRunView,
  refreshRenamedRuleRunViews,
} from "./formAutomationViewStore";

const options = {retry: true};

/** A rule's view follows the rule; a rename reaches its runs' views. */
export const onHostFormAutomationRuleChanged = onDocumentWritten({
  ...options, document: "organizerFormAutomationRules/{ruleId}",
}, async (event) => {
  const db = admin.firestore();
  await reconcileFormAutomationRuleView(db, event.params.ruleId);
  await refreshRenamedRuleRunViews(db, event.params.ruleId,
    event.data?.before.data(), event.data?.after.data());
});

/** A run's view follows the run: queued, running, finished, removed. */
export const onHostFormAutomationRunChanged = onDocumentWritten({
  ...options, document: "organizerFormAutomationRuns/{runId}",
}, (event) => reconcileFormAutomationRunView(admin.firestore(),
  event.params.runId));
