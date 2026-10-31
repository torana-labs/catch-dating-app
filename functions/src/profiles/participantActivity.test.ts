import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {createFormPaymentFixture} from
  "../payments/formPayments/formPaymentTestStore";
import {submitOrganizerFormResponseHandler} from
  "../organizers/organizerFormResponses";
import {getParticipantActivityHandler as detail,
  listParticipantActivityHandler as list} from "./participantActivity";
import type {ListParticipantActivityCallableResponse} from
  "../shared/generated/listParticipantActivityCallableResponse";
import type {GetParticipantActivityCallableResponse} from
  "../shared/generated/getParticipantActivityCallableResponse";
import {contractValidator} from "../shared/contractTestValidators";

const validateListParticipantActivityCallableResponse =
  contractValidator<ListParticipantActivityCallableResponse>(
    "ListParticipantActivityCallableResponse"
  );
const validateGetParticipantActivityCallableResponse =
  contractValidator<GetParticipantActivityCallableResponse>(
    "GetParticipantActivityCallableResponse"
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
  const item = await detail(request({sourceKind: "formResponse",
    sourceId: h.sourceId}), h.deps);
  assert.ok(validateListParticipantActivityCallableResponse(result));
  assert.ok(validateGetParticipantActivityCallableResponse(item));
  assert.deepEqual(result.items, [item.item]);
  assert.equal(item.item.sourceId, h.sourceId);
  assert.equal(item.item.eventId, null);
  assert.equal(h.store.records.has("users/person"), false);
  assert.equal(JSON.stringify([...h.store.records]), before);
  assert.deepEqual(h.rates, [["person", "listParticipantActivity"],
    ["person", "getParticipantActivity"]]);
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
  const data = {sourceKind: "formResponse", sourceId: h.sourceId};
  await assert.rejects(detail(request(data, "other"), h.deps),
    code("not-found"));
  h.store.records.set(`organizerFormResponses/${h.sourceId}`, {...h.response,
    status: "withdrawn", withdrawnAt: Timestamp.fromMillis(1500)});
  await assert.rejects(detail(request(data), h.deps), code("not-found"));
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
  const result = await detail(request({sourceKind: "formResponse",
    sourceId: h.sourceId}), h.deps);
  assert.equal(result.item.submittedAtMillis, 1123);
  assert.ok(validateGetParticipantActivityCallableResponse(result));
  assert.equal((h.store.records.get(`organizerFormResponses/${h.sourceId}`)!
    .submittedAt as Timestamp).nanoseconds, 123456789);
});
