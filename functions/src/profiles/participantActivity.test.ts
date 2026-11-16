import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {createFormPaymentFixture} from
  "../payments/formPayments/formPaymentTestStore";
import {submitOrganizerFormResponseHandler} from
  "../organizers/organizerFormResponses";
import {listParticipantActivityHandler as list} from "./participantActivity";
import type {ListParticipantActivityCallableResponse} from
  "../shared/generated/listParticipantActivityCallableResponse";
import {contractValidator} from "../shared/contractTestValidators";

const validateListParticipantActivityCallableResponse =
  contractValidator<ListParticipantActivityCallableResponse>(
    "ListParticipantActivityCallableResponse"
  );

const request = (data: unknown, uid = "person") => ({data,
  auth: {uid, token: {}}}) as unknown as CallableRequest<unknown>;
const page = {sourceKind: "formResponse", limit: 1, cursor: null};
const code = (expected: string) => (error: unknown) =>
  error instanceof HttpsError && error.code === expected;

async function fixture() {
  const h = createFormPaymentFixture();
  h.version.definition.identityPolicy = "catchAccount";
  h.version.definition.payment = null;
  h.draft.identityKind = "catchAccount";
  h.store.records.set("organizerFormResponseDrafts/draft", {...h.draft});
  await submitOrganizerFormResponseHandler({...h.request,
    auth: {uid: "person", token: {}}} as unknown as CallableRequest<unknown>, {
    firestore: () => h.db, timestamp: () => Timestamp.fromMillis(1000),
    checkRateLimit: async () => undefined,
    storageBucket: () => {
      throw new Error("No upload");
    },
  });
  const sourceId = [...h.store.records.keys()].find((path) =>
    path.startsWith("organizerFormResponses/"))!.split("/")[1];
  const response = h.store.records.get(`organizerFormResponses/${sourceId}`)!;
  const db = {collection: (name: string) => h.store.collection(name),
    runTransaction: async <T>(work: (
      tx: FirebaseFirestore.Transaction) => Promise<T>) =>
      h.store.runTransaction(async (tx) => work({...tx,
        get: async (target: {path?: string; get?: () => Promise<unknown>}) =>
          target.path ? tx.get({path: target.path}) : target.get!(),
      } as unknown as FirebaseFirestore.Transaction)),
  } as unknown as FirebaseFirestore.Firestore;
  const rates: Array<[string, string]> = [];
  const deps = {db: () => db, nowMillis: () => 2000,
    rateLimit: async (_db: FirebaseFirestore.Firestore, uid: string,
      operation: string) => {
      rates.push([uid, operation]);
    }};
  return {...h, sourceId, response, deps, rates};
}

test("account-only sources need no profile or phone", async () => {
  const h = await fixture();
  const before = JSON.stringify([...h.store.records]);
  const result = await list(request(page), h.deps);
  assert.ok(validateListParticipantActivityCallableResponse(result));
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].sourceId, h.sourceId);
  assert.equal(result.items[0].eventId, null);
  assert.equal(h.store.records.has("users/person"), false);
  assert.equal(JSON.stringify([...h.store.records]), before);
  assert.deepEqual(h.rates, [["person", "listParticipantActivity"]]);
});

test("Auth and caller-supplied ownership are enforced", async () => {
  const h = await fixture();
  await assert.rejects(list({data: page} as CallableRequest<unknown>, h.deps),
    code("unauthenticated"));
  for (const data of [{...page, uid: "other"}, {...page, organizerId: "org"},
    {...page, sourceKind: "payment"}, {...page, limit: 31}]) {
    await assert.rejects(list(request(data), h.deps), code("invalid-argument"));
  }
  assert.deepEqual(h.rates, []);
});

test("foreign, withdrawn and deleted sources reject", async () => {
  const h = await fixture();
  assert.deepEqual((await list(request(page, "other"), h.deps)).items, []);
  h.store.records.set(`organizerFormResponses/${h.sourceId}`, {...h.response,
    status: "withdrawn", withdrawnAt: Timestamp.fromMillis(1500)});
  assert.deepEqual((await list(request(page), h.deps)).items, []);
  h.store.records.set("deletedUsers/person", {status: "processing"});
  await assert.rejects(list(request(page), h.deps), code("not-found"));
});

test("cursor errors stay distinct from backend errors", async () => {
  const h = await fixture();
  await assert.rejects(list(request({...page, cursor: "invalid"}), h.deps),
    code("invalid-argument"));
  const failure = new RangeError("synthetic infrastructure failure");
  const deps = {...h.deps, db: () => ({runTransaction: async () => {
    throw failure;
  }}) as unknown as FirebaseFirestore.Firestore};
  await assert.rejects(list(request(page), deps), (error) => error === failure);
});

test("only DTO timestamps are integer-normalized", async () => {
  const h = await fixture();
  h.store.records.set(`organizerFormResponses/${h.sourceId}`, {...h.response,
    submittedAt: new Timestamp(1, 123456789)});
  const result = await list(request(page), h.deps);
  assert.equal(result.items[0].submittedAtMillis, 1123);
  assert.ok(validateListParticipantActivityCallableResponse(result));
  assert.equal((h.store.records.get(`organizerFormResponses/${h.sourceId}`)!
    .submittedAt as Timestamp).nanoseconds, 123456789);
});
