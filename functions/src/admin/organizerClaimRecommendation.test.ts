/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../operations/testFirestore";
import {adminDecideOrganizerClaimHandler} from "../organizers/organizerClaims";
import {adminRecommendOrganizerClaimHandler} from "./organizerClaimRecommendation";

function harness(status = "pending") {
  const db = new FakeFirestore();
  db.write("organizerClaimRequests/claim-1", {requestId: "claim-1", organizerId: "bhag", requesterUid: "arjun", status});
  const deps = {firestore: () => db as unknown as FirebaseFirestore.Firestore,
    serverTimestamp: () => "SERVER_TIMESTAMP" as never, now: () => new Date("2026-10-30T09:00:00.000Z")};
  const request = (data: Record<string, unknown>, token: Record<string, unknown> = {support: true}) =>
    ({auth: {uid: "dev", token}, data: {requestId: "claim-1", decision: "approve", note: " Phone verified. ", ...data},
      rawRequest: {headers: {}}}) as unknown as CallableRequest<unknown>;
  return {db, deps, request};
}

test("ops recommend a pending claim; it stays pending and the recommendation is audited", async () => {
  const h = harness();
  const result = await adminRecommendOrganizerClaimHandler(h.request({}), h.deps);
  assert.deepEqual(result, {requestId: "claim-1", status: "pending",
    recommendation: {decision: "approve", byUid: "dev", at: "2026-10-30T09:00:00.000Z", note: "Phone verified."}});
  const stored = h.db.read("organizerClaimRequests/claim-1") as Record<string, unknown>;
  assert.equal(stored.status, "pending");
  assert.deepEqual(stored.recommendation, result.recommendation);
  const audits = h.db.entries().filter(([path]) => path.startsWith("adminAuditLogs/"));
  assert.equal(audits.length, 1);
  assert.equal(audits[0][1].action, "adminRecommendOrganizerClaim");
});

test("a recommendation needs a note, a pending claim and an ops or owner role", async () => {
  const h = harness();
  await assert.rejects(adminRecommendOrganizerClaimHandler(h.request({note: "  "}), h.deps));
  await assert.rejects(adminRecommendOrganizerClaimHandler(h.request({}, {salesStaff: true}), h.deps), /not authorized/);
  const decided = harness("approved");
  await assert.rejects(adminRecommendOrganizerClaimHandler(decided.request({}), decided.deps), /already been decided/);
});

test("ops cannot decide a claim; only the owner does", async () => {
  const h = harness();
  await assert.rejects(adminDecideOrganizerClaimHandler(
    ({auth: {uid: "dev", token: {support: true}}, data: {requestId: "claim-1", decision: "approve"},
      rawRequest: {headers: {}}}) as unknown as CallableRequest<unknown>, h.deps as never), /not authorized/);
});
