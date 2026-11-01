/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../operations/testFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import type {AdminListActivityLogCallableResponse} from "../shared/generated/adminListActivityLogCallableResponse";
import {adminListActivityLogHandler} from "./activityLog";

const validate = contractValidator<AdminListActivityLogCallableResponse>("AdminListActivityLogCallableResponse");
const stamp = (iso: string) => ({_seconds: Date.parse(iso) / 1000, _nanoseconds: 0});

function harness() {
  const db = new FakeFirestore();
  db.write("adminAuditLogs/a1", {actorUid: "suvrat", roles: ["adminOwner"], action: "adminApproveOrganizerListing",
    targetPath: "organizers/afterfly", createdAt: stamp("2026-10-31T10:00:00.000Z"), note: "Real organizer."});
  db.write("adminAuditLogs/a2", {actorUid: "dev", roles: ["support"], action: "adminSearchPeople",
    targetPath: "users", createdAt: stamp("2026-10-31T08:00:00.000Z")});
  db.write("adminActionExecutions/e1", {actionId: "organizer-intake.list-listing-reviews", callable: "adminListOrganizerListingReviews",
    actorUid: "agent", actorRoles: ["admin"], status: "succeeded", target: null, errorCode: null, errorMessage: null,
    startedAt: "2026-10-31T09:00:00.000Z"});
  db.write("adminActionExecutions/e2", {actionId: "inbox.update", callable: "adminUpdateInboxItem", actorUid: "agent",
    actorRoles: ["admin"], status: "failed", target: "supply-req-1", errorCode: "failed-precondition",
    errorMessage: "This item is already done.", startedAt: "2026-10-31T07:00:00.000Z"});
  const deps = {firestore: () => db as unknown as FirebaseFirestore.Firestore, now: () => new Date("2026-10-31T12:00:00.000Z"),
    timestamp: (seconds: number, nanoseconds: number) => ({_seconds: seconds, _nanoseconds: nanoseconds})};
  const list = (data: Record<string, unknown>, token: Record<string, unknown> = {adminOwner: true}) =>
    adminListActivityLogHandler(({auth: {uid: "suvrat", token}, data: {filter: "all", limit: 50, cursor: null, ...data},
      rawRequest: {headers: {}}}) as unknown as CallableRequest<unknown>, deps);
  return {list};
}

test("decisions and agent receipts merge newest first, paged without gaps or repeats", async () => {
  const h = harness();
  const all = await h.list({});
  assert.equal(validate(all), true);
  assert.deepEqual(all.entries.map((entry) => entry.entryId), ["decision-a1", "agent-e1", "decision-a2", "agent-e2"]);
  assert.equal(all.nextCursor, null);
  const seen: string[] = [];
  let cursor: string | null = null;
  do {
    const page: AdminListActivityLogCallableResponse = await h.list({limit: 1, cursor});
    seen.push(...page.entries.map((entry) => entry.entryId));
    cursor = page.nextCursor;
  } while (cursor);
  assert.deepEqual(seen, ["decision-a1", "agent-e1", "decision-a2", "agent-e2"]);
});

test("problems keeps failed agent receipts; decisions and agents filter by source", async () => {
  const h = harness();
  const problems = await h.list({filter: "problems"});
  assert.deepEqual(problems.entries.map((entry) => [entry.entryId, entry.outcome, entry.problem, entry.detail]),
    [["agent-e2", "failed", true, "failed-precondition: This item is already done."]]);
  assert.deepEqual((await h.list({filter: "decisions"})).entries.map((entry) => entry.kind), ["decision", "decision"]);
  assert.deepEqual((await h.list({filter: "agents"})).entries.map((entry) => entry.kind), ["agent", "agent"]);
  await assert.rejects(h.list({}, {support: true}), /not authorized/);
  await assert.rejects(h.list({cursor: "bad-cursor"}), /cursor is invalid/);
});
