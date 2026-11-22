import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {AdmissionPolicyError} from "./admissionPolicy";
import {previewOrganizerFormAdmissionHandler as handle,
  FormAdmissionPreviewDependencies} from "./previewCallable";

const payload = {organizerId: "org", eventId: "event", responseId: "response",
  contactId: "contact", offerId: "offer"};
const request = (data: unknown = payload, uid = "manager") => ({data,
  ...(uid ? {auth: {uid, token: {}}} : {})}) as CallableRequest<unknown>;
const code = (expected: string) => (error: unknown) =>
  error instanceof HttpsError && error.code === expected;
const ready = {...payload, canCommit: true, expectedOfferRevision: 2,
  expectedOfferGeneration: 1, expectedLedgerRevision: 3,
  seatAlreadyOccupied: false, paymentAuthority: "explicitFree" as const,
  blocker: null};
function fixture() {
  const calls: string[] = [];
  const db = {} as FirebaseFirestore.Firestore;
  const deps: FormAdmissionPreviewDependencies = {
    firestore: () => {
      calls.push("database"); return db;
    },
    checkRateLimit: async (actual, uid, action) => {
      assert.equal(actual, db);
      assert.equal(uid, "manager");
      assert.equal(action, "previewOrganizerFormAdmission");
      calls.push("rate");
    },
    preview: async (input) => {
      assert.equal(input.db, db);
      assert.equal(input.actorUid, "manager");
      assert.deepEqual(input.payload, payload);
      calls.push("preview");
      return ready;
    },
  };
  return {deps, calls};
}

test("preview rejects anonymous and client-supplied readiness before reads",
  async () => {
    const {deps, calls} = fixture();
    await assert.rejects(handle(request(payload, ""), deps),
      code("unauthenticated"));
    for (const patch of [{expectedLedgerRevision: 3}, {providerPaid: true},
      {canCommit: true}, {actorUid: "other"}]) {
      await assert.rejects(handle(request({...payload, ...patch}), deps),
        code("invalid-argument"));
    }
    assert.deepEqual(calls, []);
  });

test("preview rate limits before reading current admission facts", async () => {
  const {deps, calls} = fixture();
  assert.deepEqual(await handle(request(), deps), ready);
  assert.deepEqual(calls, ["database", "rate", "preview"]);
  deps.checkRateLimit = async () => {
    throw new HttpsError("resource-exhausted", "Slow down.");
  };
  await assert.rejects(handle(request(), deps), code("resource-exhausted"));
  assert.equal(calls.filter((value) => value === "preview").length, 1);
});

test("preview returns a blocker with no commit revisions but preserves denial",
  async () => {
    const {deps} = fixture();
    deps.preview = async () => {
      throw new AdmissionPolicyError("unavailable",
        "Event seat ledger is not ready.");
    };
    assert.deepEqual(await handle(request(), deps), {...payload,
      canCommit: false, expectedOfferRevision: null,
      expectedOfferGeneration: null, expectedLedgerRevision: null,
      seatAlreadyOccupied: null, paymentAuthority: null,
      blocker: {code: "unavailable",
        message: "Event seat ledger is not ready."}});
    deps.preview = async () => {
      throw new AdmissionPolicyError("denied", "Manager revoked.");
    };
    await assert.rejects(handle(request(), deps), code("permission-denied"));
  });

test("preview rejects private or malformed output", async () => {
  const {deps} = fixture();
  deps.preview = async () => ({...ready, privatePhone: "must-not-escape"});
  await assert.rejects(handle(request(), deps), code("internal"));
});
