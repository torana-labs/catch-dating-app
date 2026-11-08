import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {followOrganizerByPhoneHandler} from "./followOrganizerByPhone";
import {effectiveFollowerWhatsappStatus} from "./organizerFollowerWhatsapp";
import {organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";

type Data = Record<string, unknown>;

/** The smallest document store the handler's transaction needs. */
class MemoryStore {
  readonly docs = new Map<string, Data>();
  collection(name: string) {
    return {doc: (id: string) => new MemoryRef(this, `${name}/${id}`)};
  }
  async runTransaction<T>(work: (tx: MemoryTransaction) => Promise<T>) {
    const tx = new MemoryTransaction(this);
    const result = await work(tx);
    tx.commit();
    return result;
  }
}

class MemoryRef {
  constructor(readonly store: MemoryStore, readonly path: string) {}
  get id() {
    return this.path.split("/").at(-1)!;
  }
  snapshot() {
    const value = this.store.docs.get(this.path);
    return {exists: value !== undefined, id: this.id,
      data: () => value && structuredClone(value),
      get: (field: string) => value?.[field]};
  }
}

class MemoryTransaction {
  private readonly writes: Array<() => void> = [];
  constructor(private readonly store: MemoryStore) {}
  async get(ref: MemoryRef) {
    if (this.writes.length) throw new Error("read after write");
    return ref.snapshot();
  }
  set(ref: MemoryRef, value: Data, options?: {merge?: boolean}) {
    this.writes.push(() => this.store.docs.set(ref.path, options?.merge ?
      {...(this.store.docs.get(ref.path) ?? {}), ...value} : value));
  }
  create(ref: MemoryRef, value: Data) {
    this.writes.push(() => {
      if (this.store.docs.has(ref.path)) throw new Error("exists");
      this.store.docs.set(ref.path, value);
    });
  }
  update(ref: MemoryRef, value: Data) {
    this.writes.push(() => this.store.docs.set(ref.path,
      {...this.store.docs.get(ref.path)!, ...value}));
  }
  commit() {
    this.writes.forEach((write) => write());
  }
}

const phone = "+919812345678";

function setup() {
  const store = new MemoryStore();
  store.docs.set("organizers/org-1", {name: "Sunrise Runners",
    followerCount: 4});
  const deps = {
    firestore: () => store as unknown as FirebaseFirestore.Firestore,
    now: () => Timestamp.fromMillis(10_000),
  };
  return {store, deps};
}

function request(data: Data, token: Data = {phone_number: phone}) {
  return {data, auth: {uid: "uid-1", token}} as unknown as
    CallableRequest<unknown>;
}

test("a verified phone follows and the tick grants follower WhatsApp", async () => {
  const {store, deps} = setup();
  const result = await followOrganizerByPhoneHandler(request({
    organizerId: "org-1", requestId: "req-1", whatsappUpdates: true,
    termsVersion: "follower-whatsapp-v1"}), deps);
  assert.equal(result.whatsappUpdates, "optedIn");
  assert.equal(result.idempotentReplay, false);
  assert.equal(store.docs.get("organizers/org-1")?.followerCount, 5);
  const follow = [...store.docs.entries()]
    .find(([path]) => path.startsWith("organizerFollows/"))?.[1];
  assert.equal(follow?.status, "active");
  const preference = store.docs.get("organizerCommunicationPreferences/" +
    organizerCommunicationPreferenceId("org-1", "uid-1"));
  assert.equal(effectiveFollowerWhatsappStatus(preference as never, phone),
    "optedIn");
  const receipt = store.docs.get(
    `organizerCommunicationPermissionReceipts/${result.receiptId}`);
  assert.equal(receipt?.purpose, "followerUpdates");
  assert.equal(receipt?.endpointE164, phone);

  const replay = await followOrganizerByPhoneHandler(request({
    organizerId: "org-1", requestId: "req-1", whatsappUpdates: true,
    termsVersion: "follower-whatsapp-v1"}), deps);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(store.docs.get("organizers/org-1")?.followerCount, 5);
});

test("without the tick the follow carries no WhatsApp permission", async () => {
  const {store, deps} = setup();
  const result = await followOrganizerByPhoneHandler(request({
    organizerId: "org-1", requestId: "req-2", whatsappUpdates: false}), deps);
  assert.equal(result.whatsappUpdates, "notRequested");
  assert.equal(result.receiptId, null);
  assert.equal([...store.docs.keys()].some((path) =>
    path.startsWith("organizerCommunication")), false);
});

test("an account without a verified phone cannot follow by phone", async () => {
  const {deps} = setup();
  await assert.rejects(followOrganizerByPhoneHandler(request({
    organizerId: "org-1", requestId: "req-3", whatsappUpdates: true,
    termsVersion: "follower-whatsapp-v1"}, {}), deps),
  /Confirm your phone number/u);
});

test("the tick needs the reviewed terms", async () => {
  const {deps} = setup();
  await assert.rejects(followOrganizerByPhoneHandler(request({
    organizerId: "org-1", requestId: "req-4", whatsappUpdates: true}), deps),
  /Review the WhatsApp permission/u);
});
