import assert from "node:assert/strict";
import test from "node:test";
import type {ValidateFunction} from "ajv";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../../shared/testing/fakeFirestore";
import {runCallable, type CallableSpec} from "./callable";
import {
  adminRoles,
  customPolicy,
  organizerManager,
  publicCallable,
  signedIn,
} from "./policies";

type Payload = {organizerId: string};

const validate = Object.assign(
  (data: unknown): data is Payload => typeof data === "object" &&
    data !== null && typeof (data as Payload).organizerId === "string",
  {errors: [{instancePath: "/organizerId", message: "must be string"}]},
) as unknown as ValidateFunction<Payload>;

const request = (auth: {uid: string; token?: Record<string, unknown>} | null,
  data: unknown = {organizerId: "org-1"}) =>
  ({auth: auth ? {uid: auth.uid, token: auth.token ?? {}} : undefined, data,
    rawRequest: {headers: {}}}) as unknown as CallableRequest<unknown>;

function spec<A>(policy: CallableSpec<Payload, A, unknown>["policy"],
  seen: unknown[] = []): CallableSpec<Payload, A, string> {
  return {name: "testCallable", policy, input: validate,
    handle: async ({actor, data}) => {
      seen.push({actor, data});
      return "done";
    }};
}

const code = (expected: string) => (error: unknown) =>
  (error as {code?: string}).code === expected;

test("signedIn refuses the signed-out before reading the payload", async () => {
  await assert.rejects(runCallable(spec(signedIn), request(null, 42)),
    code("unauthenticated"));
  await assert.rejects(runCallable(spec(signedIn), request({uid: "u1"}, 42)),
    code("invalid-argument"));
  const seen: unknown[] = [];
  assert.equal(await runCallable(spec(signedIn, seen), request({uid: "u1"})),
    "done");
  assert.deepEqual(seen, [{actor: {uid: "u1"}, data: {organizerId: "org-1"}}]);
});

test("adminRoles admits only the listed role claims", async () => {
  const policy = adminRoles(["adminOwner"]);
  await assert.rejects(runCallable(spec(policy), request({uid: "u1"})),
    code("permission-denied"));
  await assert.rejects(runCallable(spec(policy),
    request({uid: "u1", token: {support: true}})), code("permission-denied"));
  const seen: unknown[] = [];
  await runCallable(spec(policy, seen),
    request({uid: "u1", token: {adminOwner: true}}));
  assert.deepEqual((seen[0] as {actor: {uid: string}}).actor.uid, "u1");
  assert.throws(() => adminRoles([]), /at least one role/u);
});

test("organizerManager reads the organiser the payload names", async () => {
  const fake = new FakeFirestore({"organizers/org-1": {ownerUserId: "owner",
    hostUserIds: ["owner", "manager"], name: "Lantern Lane"}});
  const policy = organizerManager<Payload>((data) => data.organizerId,
    () => fake as unknown as FirebaseFirestore.Firestore);
  const seen: unknown[] = [];
  await runCallable(spec(policy, seen), request({uid: "manager"}));
  const actor = (seen[0] as {actor: {uid: string; organizerId: string}})
    .actor;
  assert.equal(actor.uid, "manager");
  assert.equal(actor.organizerId, "org-1");
  await assert.rejects(runCallable(spec(policy), request({uid: "visitor"})),
    code("permission-denied"));
  await assert.rejects(runCallable(spec(policy),
    request({uid: "manager"}, {organizerId: "missing"})), code("not-found"));
  await assert.rejects(runCallable(spec(policy), request(null)),
    code("unauthenticated"));
});

test("publicCallable needs a reason and admits the signed-out", async () => {
  assert.throws(() => publicCallable("open"), /reason/u);
  const seen: unknown[] = [];
  await runCallable(spec(publicCallable("guests submit before sign-up"),
    seen), request(null));
  assert.deepEqual((seen[0] as {actor: unknown}).actor, {uid: null});
});

test("customPolicy states sign-in and decides with the payload", async () => {
  const policy = customPolicy<Payload, {uid: string | null; ok: true}>(
    "matching guest secret", {
      requiresSignIn: true,
      authorize: (_request, data, uid) => {
        if (data.organizerId !== "org-1") throw new Error("denied");
        return {uid, ok: true};
      },
    });
  await assert.rejects(runCallable(spec(policy), request(null)),
    code("unauthenticated"));
  await assert.rejects(runCallable(spec(policy),
    request({uid: "u1"}, {organizerId: "org-2"})), /denied/u);
  const seen: unknown[] = [];
  await runCallable(spec(policy, seen), request({uid: "u1"}));
  assert.deepEqual((seen[0] as {actor: unknown}).actor, {uid: "u1", ok: true});
  assert.equal(policy.name, "custom(matching guest secret)");
});
