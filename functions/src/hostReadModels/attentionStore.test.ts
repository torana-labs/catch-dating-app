import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {contractValidator} from "../shared/contractTestValidators";
import {
  backfillOrganizerAttention,
  maxSweepOrganizers,
  reconcileOrganizerAttention,
  sweepDueOrganizerAttention,
} from "./attentionStore";

const hourMillis = 60 * 60 * 1000;
const nowMillis = Date.parse("2026-09-01T10:00:00.000Z");
const at = (millis: number) => Timestamp.fromMillis(millis);
const clock = (millis: number) => ({now: () => at(millis)});
const validateSchedule =
  contractValidator("OrganizerAttentionScheduleDocument");
const validateItem = contractValidator("OrganizerAttentionItemDocument");

type Data = Record<string, unknown>;

/** Source documents carry Firestore update metadata, as in production. */
function attentionStore(docs: Record<string, Data>): AudienceTestStore {
  const updateTimes: Record<string, FirebaseFirestore.Timestamp> = {};
  for (const path of Object.keys(docs)) {
    updateTimes[path] = at(nowMillis - hourMillis);
  }
  return new AudienceTestStore(docs, updateTimes);
}

function organizer(): Data {
  return {name: "Saket Run Club", hostUserId: "owner-1",
    ownerUserId: "owner-1", hostUserIds: ["owner-1", "manager-1"],
    hostProfiles: []};
}

function liveEvent(): Data {
  return {name: "Sunday Social Run", organizerId: "org",
    startTime: at(nowMillis - hourMillis),
    endTime: at(nowMillis + 3 * hourMillis),
    meetingPoint: "Bandra promenade", capacityLimit: 40, constraints: {},
    priceInPaise: 0, currency: "INR", waitlistedCount: 0, status: "active"};
}

function application(index: number): Data {
  return {organizerId: "org", formId: "form-1", formVersionId: "form-1-v1",
    targetKind: "organizer", targetId: null,
    applicantDisplayName: `Applicant ${index}`,
    applicantDisplayNameNormalized: `applicant ${index}`,
    reviewStatus: "submitted", latestResponseId: `response-${index}`,
    assignedReviewerUid: null, revision: 1,
    submittedAt: at(nowMillis - 30 * hourMillis),
    updatedAt: at(nowMillis - 2 * hourMillis)};
}

function openRow(id: string): Data {
  return {organizerId: "org", attentionId: id, status: "open",
    resolutionVersion: 1, dueAt: at(nowMillis), purgeAt: null};
}

function rowsOf(store: AudienceTestStore, status?: string): Data[] {
  return Object.entries(store.docs)
    .filter(([path, data]) => path.startsWith("organizerAttentionItems/") &&
      (status === undefined || data.status === status))
    .map(([, data]) => data);
}

test("evaluates ahead of time, records the schedule and skips no-op writes",
  async () => {
    const store = attentionStore({
      "organizers/org": organizer(),
      "events/live": liveEvent(),
      "organizerApplications/application-1": application(1),
    });
    const first = await reconcileOrganizerAttention(store.asFirestore(), "org",
      clock(nowMillis));
    assert.equal(first.kind, "complete");
    const open = rowsOf(store, "open");
    assert.deepEqual(open.map((row) => row.kind).sort(),
      ["applicationReview", "eventLiveOperations"]);
    for (const row of open) {
      assert.equal(validateItem(row), true,
        JSON.stringify(validateItem.errors));
      assert.equal(row.purgeAt, null);
    }
    const schedule = store.docs["organizerAttentionSchedules/org"];
    assert.equal(validateSchedule(schedule), true,
      JSON.stringify(validateSchedule.errors));
    assert.equal(schedule.revision, 1);
    assert.equal(schedule.sourceCoverage, "complete");
    assert.equal(schedule.overCapSource, null);
    assert.equal(schedule.openItemCount, 2);
    assert.equal((schedule.evaluatedAt as Timestamp).toMillis(), nowMillis);
    // The live event ends in three hours; nothing changes earlier.
    assert.equal((schedule.nextEvaluationAt as Timestamp).toMillis(),
      nowMillis + 3 * hourMillis);

    const again = await reconcileOrganizerAttention(store.asFirestore(), "org",
      clock(nowMillis + 60 * 1000));
    assert.deepEqual(again, {kind: "complete", sets: 0, resolutions: 0,
      openItemCount: 2, nextEvaluationAtMillis: nowMillis + 3 * hourMillis,
      revision: 2});
    assert.equal(store.docs["organizerAttentionSchedules/org"].revision, 2);
  });

test("a source that stops qualifying resolves its row with retention",
  async () => {
    const store = attentionStore({
      "organizers/org": organizer(),
      "organizerApplications/application-1": application(1),
    });
    await reconcileOrganizerAttention(store.asFirestore(), "org",
      clock(nowMillis));
    store.docs["organizerApplications/application-1"].reviewStatus = "accepted";
    const outcome = await reconcileOrganizerAttention(store.asFirestore(),
      "org", clock(nowMillis + hourMillis));
    assert.equal(outcome.kind, "complete");
    const [row] = rowsOf(store);
    assert.equal(row.status, "resolved");
    assert.equal(row.resolutionVersion, 2);
    assert.equal((row.purgeAt as Timestamp).toMillis(),
      nowMillis + hourMillis + 30 * 24 * hourMillis);
    const schedule = store.docs["organizerAttentionSchedules/org"];
    assert.equal(schedule.openItemCount, 0);
    assert.equal(schedule.nextEvaluationAt, null,
      "nothing loaded can change with time");
  });

test("a source over the cap records only the schedule and keeps the rows",
  async () => {
    const docs: Record<string, Data> = {"organizers/org": organizer(),
      "organizerAttentionItems/attention-kept": openRow("attention-kept")};
    for (let index = 0; index <= 400; index++) {
      docs[`organizerApplications/application-${index}`] = application(index);
    }
    const store = attentionStore(docs);
    const outcome = await reconcileOrganizerAttention(store.asFirestore(),
      "org", clock(nowMillis));
    assert.deepEqual(outcome, {kind: "overCap",
      overCapSource: "organizerApplications", revision: 1});
    assert.deepEqual(rowsOf(store), [openRow("attention-kept")]);
    const schedule = store.docs["organizerAttentionSchedules/org"];
    assert.equal(validateSchedule(schedule), true,
      JSON.stringify(validateSchedule.errors));
    assert.equal(schedule.sourceCoverage, "overCap");
    assert.equal(schedule.overCapSource, "organizerApplications");
    assert.equal(schedule.openItemCount, 1);
    assert.equal((schedule.nextEvaluationAt as Timestamp).toMillis(),
      nowMillis + hourMillis);
  });

test("more than 450 row writes is over cap rather than split", async () => {
  const docs: Record<string, Data> = {"organizers/org": organizer()};
  for (let index = 0; index < 300; index++) {
    docs[`organizerAttentionItems/stale-${index}`] = openRow(`stale-${index}`);
  }
  for (let index = 0; index < 200; index++) {
    docs[`organizerApplications/application-${index}`] = application(index);
  }
  const store = attentionStore(docs);
  const outcome = await reconcileOrganizerAttention(store.asFirestore(), "org",
    clock(nowMillis));
  assert.deepEqual(outcome, {kind: "overCap", overCapSource: "mutations",
    revision: 1});
  assert.equal(rowsOf(store, "open").length, 300);
  assert.equal(rowsOf(store).length, 300, "no attention row was written");
});

test("a deleted organizer resolves its open rows and drops its schedule",
  async () => {
    const store = attentionStore({
      "organizers/org": organizer(),
      "organizerApplications/application-1": application(1),
    });
    await reconcileOrganizerAttention(store.asFirestore(), "org",
      clock(nowMillis));
    delete store.docs["organizers/org"];
    const outcome = await reconcileOrganizerAttention(store.asFirestore(),
      "org", clock(nowMillis + hourMillis));
    assert.deepEqual(outcome, {kind: "organizerMissing", resolved: 1});
    assert.equal(rowsOf(store, "open").length, 0);
    assert.equal(store.docs["organizerAttentionSchedules/org"], undefined);
  });

test("a failed source read aborts the evaluation without a write",
  async () => {
    const store = attentionStore({
      "organizers/org": organizer(),
      "organizerFormAutomationRules/rule-1": {organizerId: "org",
        formId: "form-1", name: "Add to CRM", enabled: true, revision: 2},
    });
    const queryError = new Error("Required Firestore index is unavailable.");
    const failing: Record<string, unknown> = {
      where: () => failing, orderBy: () => failing, limit: () => failing,
      get: async () => {
        throw queryError;
      },
    };
    const collection = store.collection.bind(store);
    Object.assign(store, {collection: (path: string) =>
      path === "organizerFormAutomationRuns" ? failing : collection(path)});
    await assert.rejects(reconcileOrganizerAttention(store.asFirestore(), "org",
      clock(nowMillis)), (error: unknown) => error === queryError);
    assert.equal(rowsOf(store).length, 0);
    assert.equal(store.docs["organizerAttentionSchedules/org"], undefined);
  });

test("backfill reports without writing unless applied", async () => {
  const store = attentionStore({
    "organizers/org": organizer(),
    "organizerApplications/application-1": application(1),
  });
  assert.deepEqual(await backfillOrganizerAttention(store.asFirestore(), "org",
    false), {openItemCount: 0, scheduleExists: false, outcome: null});
  assert.equal(rowsOf(store).length, 0);
  const applied = await backfillOrganizerAttention(store.asFirestore(), "org",
    true);
  assert.equal(applied.openItemCount, 1);
  assert.equal(applied.scheduleExists, true);
  assert.equal(applied.outcome?.kind, "complete");
});

test("the sweep evaluates only due schedules, each once, within its cap",
  async () => {
    const docs: Record<string, Data> = {
      "organizerAttentionSchedules/later": {
        nextEvaluationAt: at(nowMillis + hourMillis)},
      "organizerAttentionSchedules/never": {nextEvaluationAt: null},
      "organizerAttentionSchedules/broken": {
        nextEvaluationAt: at(nowMillis - 2 * hourMillis)},
    };
    for (let index = 0; index < maxSweepOrganizers + 5; index++) {
      const id = `due-${String(index).padStart(3, "0")}`;
      docs[`organizerAttentionSchedules/${id}`] =
        {nextEvaluationAt: at(nowMillis - hourMillis + index)};
    }
    const store = new AudienceTestStore(docs);
    const attempts: string[] = [];
    const report = await sweepDueOrganizerAttention(store.asFirestore(), {
      now: () => at(nowMillis),
      reconcile: async (_db, organizerId) => {
        attempts.push(organizerId);
        if (organizerId === "broken") throw new Error("source contract");
        // A real evaluation always moves nextEvaluationAt past now.
        store.docs[`organizerAttentionSchedules/${organizerId}`]
          .nextEvaluationAt = at(nowMillis + hourMillis);
      },
    });
    assert.equal(attempts.length, maxSweepOrganizers);
    assert.equal(new Set(attempts).size, attempts.length,
      "a failing organizer is not retried within one run");
    assert.equal(attempts[0], "broken", "the most overdue goes first");
    assert.equal(attempts.includes("later"), false);
    assert.equal(attempts.includes("never"), false);
    assert.deepEqual(report, {evaluated: maxSweepOrganizers - 1, failed: 1,
      remaining: true});

    const rest = await sweepDueOrganizerAttention(store.asFirestore(), {
      now: () => at(nowMillis),
      reconcile: async (_db, organizerId) => {
        store.docs[`organizerAttentionSchedules/${organizerId}`]
          .nextEvaluationAt = at(nowMillis + hourMillis);
      },
    });
    // The previous run's failure is due again, plus the six it left.
    assert.deepEqual(rest, {evaluated: 7, failed: 0, remaining: false});
  });
