import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {
  reconcileFormAutomationRuleView,
  reconcileFormAutomationRunView,
  refreshRenamedRuleRunViews,
} from "./formAutomationViewStore";

const at = (millis: number) => Timestamp.fromMillis(millis);

function rule(overrides: Record<string, unknown> = {}) {
  return {organizerId: "org", formId: "form-1", name: "Welcome note",
    enabled: true, revision: 3, trigger: "responseSubmitted",
    triggerEventId: null, delayMinutes: 0, condition: null,
    actions: [{actionId: "a1", kind: "signedWebhook", tagId: null,
      eventId: null, webhookUrl: "https://hooks.example.com/catch",
      webhookSecret: "whsec-very-private", channel: null}],
    updatedAt: at(5_000), createdAt: at(1_000), ...overrides};
}

function run(overrides: Record<string, unknown> = {}) {
  return {organizerId: "org", formId: "form-1", ruleId: "rule-1",
    ruleRevision: 3, responseId: "response-1", eventKind: "submitted",
    status: "succeeded", attemptCount: 1,
    actionResults: [{actionId: "a1", kind: "signedWebhook",
      status: "succeeded", resultId: null, errorCode: null}],
    errorCode: "lease-held", errorMessage: null, createdAt: at(2_000),
    updatedAt: at(3_000), completedAt: at(3_000), sourceId: "response-1",
    sourceOccurredAt: at(1_500), dueAt: null, leaseOwner: "worker-7",
    leaseExpiresAt: null, ...overrides};
}

function seed() {
  return new AudienceTestStore({
    "organizerFormAutomationRules/rule-1": rule(),
    "organizerFormAutomationRuns/run-1": run(),
  });
}

test("a rule view is the callable's row without the webhook secret",
  async () => {
    const db = seed();
    await reconcileFormAutomationRuleView(db.asFirestore(), "rule-1");
    assert.deepEqual(db.docs["hostFormAutomationRuleViews/rule-1"], {
      organizerId: "org", ruleId: "rule-1", formId: "form-1", version: 1,
      row: {ruleId: "rule-1", organizerId: "org", formId: "form-1",
        name: "Welcome note", enabled: true, revision: 3,
        trigger: "responseSubmitted", triggerEventId: null, delayMinutes: 0,
        condition: null, actions: [{actionId: "a1", kind: "signedWebhook",
          tagId: null, eventId: null,
          webhookUrl: "https://hooks.example.com/catch",
          webhookSecretConfigured: true, channel: null, campaignId: null,
          campaignRevision: null}],
        updatedAtMillis: 5_000}});
    assert.equal(JSON.stringify(db.docs["hostFormAutomationRuleViews/rule-1"])
      .includes("whsec"), false);
  });

test("a run view joins its rule's name and leaves the lease out",
  async () => {
    const db = seed();
    await reconcileFormAutomationRunView(db.asFirestore(), "run-1");
    assert.deepEqual(db.docs["hostFormAutomationRunViews/run-1"], {
      organizerId: "org", runId: "run-1", ruleId: "rule-1",
      formId: "form-1", createdAtMillis: 2_000, ruleName: "Welcome note",
      version: 1,
      row: {runId: "run-1", ruleId: "rule-1", ruleRevision: 3,
        responseId: "response-1", sourceId: "response-1", dueAtMillis: null,
        eventKind: "submitted", status: "succeeded", attemptCount: 1,
        actionResults: [{actionId: "a1", kind: "signedWebhook",
          status: "succeeded", resultId: null, errorCode: null}],
        errorMessage: null, createdAtMillis: 2_000,
        completedAtMillis: 3_000}});
    const view = JSON.stringify(db.docs["hostFormAutomationRunViews/run-1"]);
    assert.equal(view.includes("worker-7"), false);
    assert.equal(view.includes("lease-held"), false);
  });

test("a rule from another organizer lends no name", async () => {
  const db = seed();
  db.docs["organizerFormAutomationRules/rule-1"] =
    rule({organizerId: "other"});
  await reconcileFormAutomationRunView(db.asFirestore(), "run-1");
  assert.equal(db.docs["hostFormAutomationRunViews/run-1"].ruleName, null);
});

test("reconcile writes only on change and removes deleted sources",
  async () => {
    const db = seed();
    await reconcileFormAutomationRunView(db.asFirestore(), "run-1");
    const first = db.docs["hostFormAutomationRunViews/run-1"];
    // A lease change the row does not show writes nothing.
    db.docs["organizerFormAutomationRuns/run-1"] =
      run({leaseOwner: "worker-8", updatedAt: at(4_000)});
    await reconcileFormAutomationRunView(db.asFirestore(), "run-1");
    assert.equal(db.docs["hostFormAutomationRunViews/run-1"], first);
    delete db.docs["organizerFormAutomationRuns/run-1"];
    await reconcileFormAutomationRunView(db.asFirestore(), "run-1");
    assert.equal(db.docs["hostFormAutomationRunViews/run-1"], undefined);
    await reconcileFormAutomationRuleView(db.asFirestore(), "rule-1");
    delete db.docs["organizerFormAutomationRules/rule-1"];
    await reconcileFormAutomationRuleView(db.asFirestore(), "rule-1");
    assert.equal(db.docs["hostFormAutomationRuleViews/rule-1"], undefined);
  });

test("a renamed rule reaches every one of its runs", async () => {
  const db = seed();
  db.docs["organizerFormAutomationRuns/run-2"] = run({createdAt: at(2_500)});
  db.docs["organizerFormAutomationRuns/run-3"] = run({ruleId: "rule-2"});
  const before = rule();
  const after = rule({name: "Warm welcome", revision: 4});
  db.docs["organizerFormAutomationRules/rule-1"] = after;
  assert.equal(await refreshRenamedRuleRunViews(db.asFirestore(), "rule-1",
    before, rule({enabled: false})), 0);
  assert.equal(await refreshRenamedRuleRunViews(db.asFirestore(), "rule-1",
    before, after), 2);
  for (const id of ["run-1", "run-2"]) {
    assert.equal(db.docs[`hostFormAutomationRunViews/${id}`].ruleName,
      "Warm welcome");
  }
  assert.equal(db.docs["hostFormAutomationRunViews/run-3"], undefined);
});
