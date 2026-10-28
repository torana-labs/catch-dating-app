import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {adminDecideOrganizerClaimHandler,
  requestOrganizerClaimHandler} from "./organizerClaims";

type Data = Record<string, unknown>;
class Ref {
  constructor(readonly path: string) {}
  collection(name: string) {
    return {doc: (id: string) => new Ref(`${this.path}/${name}/${id}`)};
  }
}

function fixture(visibility: "hidden" | "discoverable" | undefined) {
  const publicPage = {publishStatus: "draft", indexStatus: "noindex",
    canonicalPath: "/organizers/example-host/", robots: "noindex, follow"};
  const docs = new Map<string, Data>([
    ["organizers/example-host", {name: "Example Host",
      ...(visibility ? {appVisibility: visibility} : {}), publicPage,
      ownership: {state: "unclaimed"},
      claim: {state: "claimPending", lastClaimRequestId: "claim-one"}}],
    ["organizerClaimRequests/claim-one", {requestId: "claim-one",
      organizerId: "example-host", requesterUid: "host-one",
      status: "pending"}],
    ["users/host-one", {name: "Example Owner", phoneNumber: "+919800000003",
      profileComplete: false}],
  ]);
  let id = 0;
  const db = {
    collection: (path: string) => ({doc: (key = `auto-${++id}`) =>
      new Ref(`${path}/${key}`)}),
    runTransaction: async <T>(run: (tx: unknown) => Promise<T>) => {
      const pending: Array<() => void> = [];
      const set = (ref: Ref, value: Data, options?: {merge?: boolean}) => {
        pending.push(() => docs.set(ref.path, structuredClone(options?.merge ?
          {...docs.get(ref.path), ...value} : value)));
      };
      const result = await run({
        get: async (ref: Ref) => {
          assert.equal(pending.length, 0,
            "Firestore reads must precede writes");
          return {exists: docs.has(ref.path), data: () =>
            structuredClone(docs.get(ref.path))};
        },
        set,
        create: (ref: Ref, value: Data) => {
          assert.equal(docs.has(ref.path), false);
          set(ref, value);
        },
        update: (ref: Ref, value: Data) => set(ref, value, {merge: true}),
      });
      pending.forEach((write) => write());
      return result;
    },
  };
  const deps = {firestore: () => db as unknown as FirebaseFirestore.Firestore,
    serverTimestamp: () => ({kind: "serverTimestamp"}) as unknown as
      FirebaseFirestore.FieldValue};
  const request = {auth: {uid: "reviewer", token: {admin: true}},
    data: {requestId: "claim-one", decision: "approve"},
    rawRequest: {headers: {}}} as unknown as CallableRequest<unknown>;
  return {docs, deps, request, publicPage};
}

for (const visibility of ["hidden", "discoverable", undefined] as const) {
  test(`claim approval preserves ${visibility ?? "missing"} publication state`,
    async () => {
      const {docs, deps, request, publicPage} = fixture(visibility);
      const result = await adminDecideOrganizerClaimHandler(request, deps);
      assert.equal(result.status, "approved");
      const organizer = docs.get("organizers/example-host");
      assert.equal(organizer?.ownerUserId, "host-one");
      assert.equal((organizer?.ownership as Data).state, "claimed");
      assert.equal(organizer?.appVisibility, visibility);
      assert.deepEqual(organizer?.publicPage, publicPage);
      assert.equal([...docs.keys()].filter((path) =>
        path.startsWith("organizerTeamMemberships/")).length, 1);
      assert.equal([...docs.keys()].some((path) =>
        path.startsWith("publicRouteReservations/")), false);
    });
}

test("claim approval still requires an authorized reviewer", async () => {
  const {docs, deps, request} = fixture("hidden");
  request.auth = {uid: "host-one", token: {}} as CallableRequest["auth"];
  const before = structuredClone([...docs]);
  await assert.rejects(adminDecideOrganizerClaimHandler(request, deps),
    {code: "permission-denied"});
  assert.deepEqual([...docs], before);
});

test("claim retries and approval project one private follow-up", async () => {
  const {docs, deps, request} = fixture("hidden");
  const organizer = docs.get("organizers/example-host")!;
  organizer.claim = {state: "unclaimed"};
  docs.set("organizerSalesAccounts/example-host", {
    classification: "sales_private", organizerId: "example-host",
    assignedOwnerUid: "sales-employee", suppressionStatus: "suppressed",
    privateNote: "Never copied to the claim or public organizer",
  });
  const claim = {auth: {uid: "host-one", token: {}}, data: {
    organizerId: "example-host", requesterName: "Example Owner",
    requesterRole: "owner",
  }} as unknown as CallableRequest<unknown>;
  const first = await requestOrganizerClaimHandler(claim, deps);
  assert.deepEqual(await requestOrganizerClaimHandler(claim, deps), first);
  const salesRows = (prefix: string) => [...docs.entries()]
    .filter(([key]) => key.startsWith(prefix)).map(([, value]) => value);
  assert.equal(salesRows("salesActivities/").length, 1);
  assert.equal(salesRows("salesTasks/").length, 1);
  assert.equal(docs.get("organizers/example-host")?.ownerUserId, undefined);
  request.data = {requestId: first.requestId, decision: "approve"};
  await adminDecideOrganizerClaimHandler(request, deps);
  assert.deepEqual(salesRows("salesActivities/").map((row) => row.type),
    ["claim_requested", "claim_approved"]);
  const [task] = salesRows("salesTasks/");
  assert.equal(salesRows("salesTasks/").length, 1);
  assert.equal(task.revision, 2);
  assert.equal(task.ownerUid, "sales-employee");
  assert.equal(task.kind, "service_commitment");
  assert.equal(docs.get("organizers/example-host")?.appVisibility,
    "hidden");
  assert.equal(JSON.stringify(docs.get("organizers/example-host"))
    .includes("privateNote"), false);
  const claimRecord = docs.get(`organizerClaimRequests/${first.requestId}`);
  assert.equal(JSON.stringify(claimRecord).includes("privateNote"), false);
  await assert.rejects(adminDecideOrganizerClaimHandler(request, deps),
    {code: "failed-precondition"});
  assert.equal(salesRows("salesActivities/").length, 2);
  assert.equal(salesRows("salesTasks/")[0].revision, 2);
});

test("claim rejection records outcome without ownership", async () => {
  const {docs, deps, request} = fixture("hidden");
  docs.set("organizerSalesAccounts/example-host", {
    classification: "sales_private", organizerId: "example-host",
    assignedOwnerUid: null,
  });
  request.data = {requestId: "claim-one", decision: "reject"};
  await adminDecideOrganizerClaimHandler(request, deps);
  const activities = [...docs].filter(([path]) =>
    path.startsWith("salesActivities/"));
  assert.equal(activities.length, 1);
  assert.equal(activities[0][1].type, "claim_rejected");
  assert.equal(docs.get("organizers/example-host")?.ownerUserId, undefined);
  assert.equal([...docs.keys()].some((path) =>
    path.startsWith("salesTasks/")), false);
});
