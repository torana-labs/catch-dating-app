import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import test from "node:test";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeInstagramProvider} from "./instagramMessagingProvider";
import {organizerClaimRequestId} from "./organizerClaimApproval";
import {
  CLAIM_CODE_LIFETIME_MILLIS,
  getOrganizerClaimVerificationOptionsHandler,
  organizerClaimAttemptId,
  processInstagramClaimMessages,
  startOrganizerClaimVerificationHandler,
} from "./organizerClaimVerification";
import type {InstagramClaimMessageDeps} from "./organizerClaimVerification";
import {BRAND} from "../shared/generated/brand";

type Data = Record<string, unknown>;

class Ref {
  constructor(readonly path: string,
    private readonly docs: Map<string, Data>) {}
  get id() {
    return this.path.split("/").pop()!;
  }
  get ref() {
    return this;
  }
  collection(name: string) {
    return {doc: (id: string) => new Ref(`${this.path}/${name}/${id}`,
      this.docs)};
  }
  async get() {
    return snapshot(this, this.docs);
  }
}

function snapshot(ref: Ref, docs: Map<string, Data>) {
  const data = docs.get(ref.path);
  return {id: ref.id, ref, exists: data !== undefined,
    data: () => data ? {...data} : undefined};
}

/** Transactions buffer writes and apply them only after the callback. */
function fakeFirestore() {
  const docs = new Map<string, Data>();
  const db = {
    collection: (name: string) => ({doc: (id: string) =>
      new Ref(`${name}/${id}`, docs)}),
    runTransaction: async <T>(run: (tx: unknown) => Promise<T>) => {
      const pending: Array<() => void> = [];
      const write = (ref: Ref, value: Data, merge: boolean) =>
        pending.push(() => docs.set(ref.path, merge ?
          {...docs.get(ref.path), ...value} : {...value}));
      const result = await run({
        get: async (ref: Ref) => {
          assert.equal(pending.length, 0,
            "Firestore reads must precede writes");
          return snapshot(ref, docs);
        },
        set: (ref: Ref, value: Data, options?: {merge?: boolean}) =>
          write(ref, value, options?.merge === true),
        update: (ref: Ref, value: Data) => {
          assert.ok(docs.has(ref.path), `update of missing ${ref.path}`);
          write(ref, value, true);
        },
        create: (ref: Ref, value: Data) => {
          assert.equal(docs.has(ref.path), false, `create of ${ref.path}`);
          write(ref, value, false);
        },
      });
      pending.forEach((apply) => apply());
      return result;
    },
  };
  return {docs, db: db as unknown as FirebaseFirestore.Firestore};
}

const handle = "carterroadrunners";
const organizerId = "carter-road-runners";
const requesterUid = "organiser-one";
const startMillis = Date.UTC(2026, 9, 26, 9, 0, 0);

function fixture(options: {enabled?: boolean} = {}) {
  const {docs, db} = fakeFirestore();
  docs.set(`organizers/${organizerId}`, {
    name: "Carter Road Runners", instagramHandle: null,
    ownership: {state: "programmatic"},
    claim: {state: "unclaimed", claimHref: null, lastClaimRequestId: null},
    provenance: {origin: "import"},
    publicSources: [{type: "instagram", label: "instagram page",
      detail: "Public instagram page.",
      href: `https://www.instagram.com/${handle}/`, confidence: "medium",
      lastCheckedAt: null}],
  });
  docs.set(`users/${requesterUid}`, {name: "Asha Rao",
    displayName: "Asha Rao", phoneNumber: "+919800000001",
    profileComplete: false});
  const provider = new FakeInstagramProvider(senderUsernames);
  const limited = new Set<string>();
  const clock = {now: startMillis};
  const codes = ["482173", "551209", "730611", "118834"];
  let codeIndex = 0;
  const deps: InstagramClaimMessageDeps = {
    firestore: () => db,
    serverTimestamp: () => ({kind: "serverTimestamp"}) as unknown as
      FirebaseFirestore.FieldValue,
    now: () => clock.now,
    config: () => ({instagramEnabled: options.enabled ?? true,
      catchInstagramHandle: BRAND.social.instagramHandle}),
    randomCode: () => codes[codeIndex++ % codes.length],
    checkRateLimit: async (_db, key) => {
      if (limited.has(key)) {
        throw new HttpsError("resource-exhausted", "Rate limit exceeded.");
      }
    },
    provider: () => provider,
  };
  return {docs, deps, provider, clock, limited};
}

function callable(data: unknown, uid = requesterUid) {
  return {auth: {uid, token: {}}, data, rawRequest: {headers: {}}} as
    unknown as CallableRequest<unknown>;
}

const senderIds: Record<string, string> = {
  [handle]: "9001", someoneelse: "9002",
};
const senderUsernames = Object.fromEntries(
  Object.entries(senderIds).map(([username, id]) => [id, username]));

function message(mid: string, username: string, text: string) {
  return {messageKey: createHash("sha256").update(mid).digest("hex"),
    senderId: senderIds[username] ?? "9999", text};
}

async function startCode(deps: InstagramClaimMessageDeps) {
  return startOrganizerClaimVerificationHandler(callable({organizerId,
    method: "instagramMessage"}), deps);
}

const attemptPath = `organizerClaimVerifications/${
  organizerClaimAttemptId(organizerId, requesterUid, "instagramMessage")}`;
const requestPath = `organizerClaimRequests/${
  organizerClaimRequestId(organizerId, requesterUid)}`;

test("options offer Instagram with the listing's handle once switched on",
  async () => {
    const on = fixture();
    const options = await getOrganizerClaimVerificationOptionsHandler(
      callable({organizerId}), on.deps);
    assert.deepEqual(options.methods[0], {method: "instagramMessage",
      available: true, proofTarget: handle, unavailableReason: null});
    assert.equal(options.catchInstagramHandle, BRAND.social.instagramHandle);
    const off = fixture({enabled: false});
    const hidden = await getOrganizerClaimVerificationOptionsHandler(
      callable({organizerId}), off.deps);
    assert.equal(hidden.methods[0].available, false);
    assert.equal(hidden.methods[0].unavailableReason, "turnedOff");
    assert.equal(hidden.catchInstagramHandle, null);
    await assert.rejects(startCode(off.deps), {code: "failed-precondition"});
  });

test("starting shows a 30-minute code bound to this account and listing",
  async () => {
    const {docs, deps, clock} = fixture();
    const started = await startCode(deps);
    assert.equal(started.code, "482173");
    assert.equal(started.proofTarget, handle);
    assert.equal(started.catchInstagramHandle, BRAND.social.instagramHandle);
    assert.equal(Date.parse(started.expiresAt),
      startMillis + CLAIM_CODE_LIFETIME_MILLIS);
    const attempt = docs.get(attemptPath)!;
    assert.equal(attempt.requesterUid, requesterUid);
    assert.equal(attempt.status, "awaitingProof");
    assert.equal(docs.get("organizerClaimInstagramCodes/482173")?.attemptId,
      attempt.attemptId);
    // Starting again keeps the live code instead of minting codes.
    clock.now += 10 * 60 * 1000;
    assert.equal((await startCode(deps)).code, "482173");
    // Near expiry a fresh code replaces it and the old one is retired.
    clock.now += 17 * 60 * 1000;
    assert.equal((await startCode(deps)).code, "551209");
    assert.notEqual(
      docs.get("organizerClaimInstagramCodes/482173")?.consumedAt, null);
  });

test("a live code held by someone else is never handed out twice",
  async () => {
    const {docs, deps} = fixture();
    docs.set("organizerClaimInstagramCodes/482173", {code: "482173",
      attemptId: "someone-else", organizerId: "other",
      expiresAt: admin.firestore.Timestamp.fromMillis(startMillis + 60000),
      consumedAt: null});
    assert.equal((await startCode(deps)).code, "551209");
  });

test("starting needs a listing with Instagram and a finished account",
  async () => {
    const noHandle = fixture();
    noHandle.docs.get(`organizers/${organizerId}`)!.publicSources = [];
    await assert.rejects(startCode(noHandle.deps),
      {code: "failed-precondition"});
    const noPhone = fixture();
    noPhone.docs.get(`users/${requesterUid}`)!.phoneNumber = "";
    await assert.rejects(startCode(noPhone.deps),
      {code: "failed-precondition"});
    await assert.rejects(startOrganizerClaimVerificationHandler(
      {data: {organizerId, method: "instagramMessage"}} as
        CallableRequest<unknown>, noPhone.deps), {code: "unauthenticated"});
  });

test("the code from the listing's own account claims the page", async () => {
  const {docs, deps, provider} = fixture();
  await startCode(deps);
  await processInstagramClaimMessages(
    [message("m1", handle, "482 173")], deps);
  const organizer = docs.get(`organizers/${organizerId}`)!;
  assert.equal(organizer.ownerUserId, requesterUid);
  assert.equal((organizer.ownership as Data).state, "claimed");
  assert.equal((organizer.provenance as Data).verificationStatus,
    "ownerVerified");
  assert.equal(docs.get(
    `organizerTeamMemberships/${organizerId}_${requesterUid}`)?.role, "owner");
  const request = docs.get(requestPath)!;
  assert.equal(request.status, "approved");
  assert.equal(request.decidedByUid, null);
  assert.equal(request.requesterName, "Asha Rao");
  assert.deepEqual(request.proofUrls,
    [`https://www.instagram.com/${handle}/`]);
  const attempt = docs.get(attemptPath)!;
  assert.equal(attempt.status, "verified");
  assert.equal(attempt.claimRequestId, request.requestId);
  assert.deepEqual({...attempt.evidence as Data, observedAt: null}, {
    source: "instagramMessage", observedIdentity: handle,
    messageKey: message("m1", handle, "").messageKey, observedAt: null});
  assert.equal(provider.replies.length, 1);
  assert.match(provider.replies[0].text, /now yours/);
  assert.equal(docs.get(
    `organizerClaimInstagramMessages/${message("m1", "", "").messageKey}`)
    ?.outcome, "verified");
});

test("a code sent from another account does not claim the page",
  async () => {
    const {docs, deps, provider} = fixture();
    await startCode(deps);
    await processInstagramClaimMessages(
      [message("m1", "someoneelse", "482173")], deps);
    assert.equal(docs.get(`organizers/${organizerId}`)?.ownerUserId,
      undefined);
    const attempt = docs.get(attemptPath)!;
    assert.equal(attempt.status, "awaitingProof");
    assert.equal((attempt.lastRejection as Data).reason, "wrongSender");
    assert.match(provider.replies[0].text, new RegExp(`@${handle}`));
    // The right account can still use the same code afterwards.
    await processInstagramClaimMessages(
      [message("m2", handle, "482173")], deps);
    assert.equal(docs.get(attemptPath)?.status, "verified");
  });

test("an expired code is refused with a way forward", async () => {
  const {docs, deps, provider, clock} = fixture();
  await startCode(deps);
  clock.now += CLAIM_CODE_LIFETIME_MILLIS + 1;
  await processInstagramClaimMessages(
    [message("m1", handle, "482173")], deps);
  assert.equal(docs.get(`organizers/${organizerId}`)?.ownerUserId, undefined);
  assert.equal(docs.get(attemptPath)?.status, "awaitingProof");
  assert.match(provider.replies[0].text, /expired/);
});

test("a used code cannot be replayed and a message counts once",
  async () => {
    const {docs, deps, provider} = fixture();
    await startCode(deps);
    const first = message("m1", handle, "482173");
    await processInstagramClaimMessages([first], deps);
    // Meta redelivers the same message: nothing happens twice.
    await processInstagramClaimMessages([first], deps);
    assert.equal(provider.replies.length, 1);
    // The same code in a new message is a replay.
    await processInstagramClaimMessages(
      [message("m2", handle, "482173")], deps);
    assert.equal(provider.replies.length, 2);
    assert.match(provider.replies[1].text, /used or replaced/);
    assert.equal(docs.get(
      `organizerClaimInstagramMessages/${message("m2", "", "").messageKey}`)
      ?.outcome, "codeAlreadyUsed");
  });

test("an unknown code and ordinary messages are handled apart", async () => {
  const {docs, deps, provider} = fixture();
  await processInstagramClaimMessages([
    message("m1", handle, "999999"),
    message("m2", handle, "Hi! Do you host events in Bandra?"),
  ], deps);
  assert.equal(provider.replies.length, 1);
  assert.match(provider.replies[0].text, /don't recognise/);
  assert.equal(docs.has(
    `organizerClaimInstagramMessages/${message("m2", "", "").messageKey}`),
  false);
});

test("a sender over the limit gets no reply", async () => {
  const {deps, provider, limited} = fixture();
  await startCode(deps);
  limited.add(`instagram_${createHash("sha256")
    .update(senderIds[handle]).digest("hex").slice(0, 32)}`);
  await processInstagramClaimMessages(
    [message("m1", handle, "482173")], deps);
  assert.equal(provider.replies.length, 0);
});

test("verified proof supersedes another account's waiting staff claim",
  async () => {
    const {docs, deps} = fixture();
    await startCode(deps);
    const organizer = docs.get(`organizers/${organizerId}`)!;
    organizer.claim = {state: "claimPending", claimHref: null,
      lastClaimRequestId: "someone-elses-request"};
    docs.set("organizerClaimRequests/someone-elses-request", {
      requestId: "someone-elses-request", organizerId,
      requesterUid: "someone-else", status: "pending"});
    await processInstagramClaimMessages(
      [message("m1", handle, "482173")], deps);
    assert.equal(docs.get(`organizers/${organizerId}`)?.ownerUserId,
      requesterUid);
    assert.equal(
      docs.get("organizerClaimRequests/someone-elses-request")?.status,
      "superseded");
  });

test("a page claimed meanwhile is not taken over", async () => {
  const {docs, deps, provider} = fixture();
  await startCode(deps);
  docs.get(`organizers/${organizerId}`)!.ownerUserId = "earlier-owner";
  await processInstagramClaimMessages(
    [message("m1", handle, "482173")], deps);
  assert.equal(docs.get(`organizers/${organizerId}`)?.ownerUserId,
    "earlier-owner");
  assert.equal(docs.get(attemptPath)?.status, "awaitingProof");
  assert.match(provider.replies[0].text, /our team/);
});
