import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {
  OrganizerCampaignDocument,
  OrganizerFollowDocument,
  OrganizerPostDeliveryOperationDocument,
} from "../shared/generated/firestoreAdminTypes";
import {organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";
import {whatsappStopId} from "../shared/organizerWhatsappStops";
import {organizerRelationshipId} from "../shared/relationshipDocuments";
import {hashEndpoint} from "./organizerCampaignModel";
import {followerWhatsappGrant} from "./organizerFollowerWhatsapp";
import {
  findFollowerWhatsappSender,
  followerRecipientSuppression,
  followerWhatsappCampaign,
  followerWhatsappCampaignId,
  initialFollowerWhatsappLeg,
  prepareFollowerWhatsappPage,
  syncFollowerWhatsappLeg,
} from "./organizerFollowerWhatsappLeg";

type Data = Record<string, unknown>;
type Filter = [string, unknown];

class Store {
  readonly docs = new Map<string, Data>();
  collection(name: string) {
    return new Query(this, name, []);
  }
  async runTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    const tx = new Tx(this);
    const result = await work(tx);
    tx.writes.forEach((write) => write());
    return result;
  }
}

class Ref {
  constructor(readonly store: Store, readonly path: string) {}
  get id() {
    return this.path.split("/")[1];
  }
  async get() {
    const value = this.store.docs.get(this.path);
    return {exists: value !== undefined, id: this.id,
      data: () => value};
  }
}

class Query {
  constructor(readonly store: Store, readonly name: string,
    readonly filters: Filter[]) {}
  doc(id: string) {
    return new Ref(this.store, `${this.name}/${id}`);
  }
  where(field: string, _op: string, value: unknown) {
    return new Query(this.store, this.name, [...this.filters, [field, value]]);
  }
  limit() {
    return this;
  }
  async get() {
    const docs = [...this.store.docs.entries()]
      .filter(([path, data]) => path.startsWith(`${this.name}/`) &&
        this.filters.every(([field, value]) => data[field] === value))
      .map(([path, data]) => ({id: path.split("/")[1],
        data: () => data}));
    return {docs};
  }
}

class Tx {
  readonly writes: Array<() => void> = [];
  constructor(private readonly store: Store) {}
  async get(ref: Ref) {
    return ref.get();
  }
  update(ref: Ref, value: Data) {
    this.writes.push(() => this.store.docs.set(ref.path,
      {...this.store.docs.get(ref.path)!, ...value}));
  }
}

const phone = "+919812345678";
const now = Timestamp.fromMillis(50_000);
const db = (store: Store) => store as unknown as FirebaseFirestore.Firestore;

function seed() {
  const store = new Store();
  store.docs.set("organizerSenderConnections/conn-1", {organizerId: "org-1",
    channel: "whatsapp", status: "active", phoneNumberId: "pn-1",
    secretVersionResource: "projects/p/secrets/s/versions/1"});
  store.docs.set("organizerMessageTemplates/tpl-1", {organizerId: "org-1",
    connectionId: "pn-1", name: "organizer_follower_update",
    status: "APPROVED", hasMediaHeader: false, variableNames: ["update_text"],
    parameterBindings: [{variableName: "update_text", component: "body",
      position: 0, buttonIndex: null}]});
  return store;
}

function grantFor(store: Store, uid: string, endpoint = phone) {
  const unknown = {status: "unknown", evidenceStatus: "notApplicable",
    currentReceiptId: null, termsVersion: null, source: null,
    sourceEventId: null, updatedAt: null};
  store.docs.set("organizerCommunicationPreferences/" +
    organizerCommunicationPreferenceId("org-1", uid), {organizerId: "org-1",
    uid, whatsapp: unknown, sms: unknown, whatsappPurposes: {followerUpdates:
      followerWhatsappGrant({receiptId: `ocpr_${uid}`, endpointE164: endpoint,
        now: Timestamp.fromMillis(10_000)})},
    createdAt: Timestamp.fromMillis(10_000),
    updatedAt: Timestamp.fromMillis(10_000)});
}

test("the sender is the active connection with the approved template",
  async () => {
    const store = seed();
    const sender = await findFollowerWhatsappSender(db(store), "org-1");
    assert.equal(sender?.connectionId, "conn-1");
    assert.equal(sender?.templateId, "tpl-1");
    store.docs.set("organizerMessageTemplates/tpl-1", {
      ...store.docs.get("organizerMessageTemplates/tpl-1")!,
      status: "PENDING"});
    assert.equal(await findFollowerWhatsappSender(db(store), "org-1"), null);
  });

test("a page queues only consented followers on their verified phone",
  async () => {
    const store = seed();
    const sender = (await findFollowerWhatsappSender(db(store), "org-1"))!;
    const campaignId = followerWhatsappCampaignId("post-1");
    const campaign = followerWhatsappCampaign({organizerId: "org-1",
      authorUid: "author", postId: "post-1", text: "Sunday\nrun", sender, now});
    assert.deepEqual(campaign.templateVariables, {update_text: "Sunday run"});
    assert.equal(campaign.status, "approved");
    store.docs.set(`organizerCampaigns/${campaignId}`, campaign as never);
    grantFor(store, "fan");
    grantFor(store, "moved", "+919800000000");
    grantFor(store, "stopped");
    store.docs.set("organizerWhatsappEndpointStops/" +
    whatsappStopId("org-1", hashEndpoint("+919811111111")),
    {stoppedAt: 20_000});
    grantFor(store, "stopped", "+919811111111");
    const operation = {organizerId: "org-1", postId: "post-1",
      authorUid: "author", whatsapp: initialFollowerWhatsappLeg(campaignId)} as
    unknown as OrganizerPostDeliveryOperationDocument;
    const decide = (await prepareFollowerWhatsappPage({db: db(store), now,
      operation, follows: [], deps: {
        verifiedPhones: async () => new Map([["fan", phone],
          ["moved", phone], ["stopped", "+919811111111"], ["silent", phone],
          ["nophone", null]]),
        hasBlockingRelationship: async () => false,
      }}))!;
    const follow = (uid: string) => ({uid} as OrganizerFollowDocument);
    const fan = await decide(follow("fan"));
    assert.equal(fan.kind, "queued");
    if (fan.kind === "queued") {
      assert.equal(fan.recipient.endpointE164, phone);
      assert.equal(fan.recipient.contactId, null);
      assert.equal(fan.recipient.followerRecipient?.uid, "fan");
      assert.equal(fan.recipient.status, "pending");
    }
    for (const uid of ["moved", "stopped", "silent", "nophone", "author"]) {
      assert.equal((await decide(follow(uid))).kind, "skipped", uid);
    }
  });

test("send time withholds unfollowed, withdrawn or stopped followers",
  async () => {
    const store = seed();
    grantFor(store, "fan");
    const recipient = {followerRecipient: {uid: "fan", postId: "post-1",
      permissionReceiptId: "ocpr_fan"}, endpointE164: phone,
    endpointHash: hashEndpoint(phone)} as never;
    const check = () => store.runTransaction((tx) =>
      followerRecipientSuppression({tx: tx as never, db: db(store),
        organizerId: "org-1", recipient}));
    assert.equal(await check(), "optedOut");
    store.docs.set(
      "organizerFollows/" + organizerRelationshipId("org-1", "fan"),
      {status: "active"});
    assert.equal(await check(), null);
    store.docs.set("organizerWhatsappEndpointStops/" +
    whatsappStopId("org-1", hashEndpoint(phone)), {stoppedAt: 90_000});
    assert.equal(await check(), "optedOut");
  });

test("the leg mirrors campaign delivery counts and settles", async () => {
  const store = seed();
  const campaignId = followerWhatsappCampaignId("post-1");
  store.docs.set("organizerPostDeliveryOperations/post-1", {whatsapp: {
    ...initialFollowerWhatsappLeg(campaignId), status: "sending",
    queuedCount: 3, skippedCount: 2}});
  store.docs.set(`organizerCampaigns/${campaignId}`, {status: "sending",
    deliveryCounts: {pending: 0, suppressed: 1, accepted: 0, sent: 0,
      delivered: 1, read: 1, failed: 0, replied: 0, optedOut: 0}} as
    Partial<OrganizerCampaignDocument> as never);
  const sending = await syncFollowerWhatsappLeg(db(store), "post-1", now);
  assert.deepEqual([sending?.status, sending?.sentCount,
    sending?.deliveredCount, sending?.suppressedCount],
  ["sending", 2, 2, 1]);
  store.docs.set(`organizerCampaigns/${campaignId}`, {
    ...store.docs.get(`organizerCampaigns/${campaignId}`)!,
    status: "completed"});
  assert.equal((await syncFollowerWhatsappLeg(db(store), "post-1", now))
    ?.status, "completed");
});
