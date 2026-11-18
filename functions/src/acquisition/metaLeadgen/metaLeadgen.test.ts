import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {
  allowedPages,
  leadgenChanges,
  metaLeadIntent,
  metaLeadIntentId,
  parseMetaLead,
} from "./protocol";
import {fileLeadgenReceipt, processLeadgenReceipt} from "./worker";
import {matchingMetaLead, hostDeliveryRecords} from
  "../adConversions/deliveries";
import {metaEvent} from "../adConversions/platforms";
import {hashedPhone} from "../adConversions/hostConversions";

const now = Date.parse("2026-11-18T10:00:00Z");
const change = {leadgenId: "1234567890123456", pageId: "123456789",
  formId: "987654321", adId: "555555555"};
const graphLead = {
  created_time: "2026-11-18T09:58:00+0000",
  form_id: "987654321", ad_id: "555555555", campaign_id: "444444444",
  field_data: [
    {name: "full_name", values: ["Asha Rao"]},
    {name: "phone_number", values: ["98765 43210"]},
    {name: "email", values: [" Asha@Example.com "]},
    {name: "city", values: ["Bengaluru"]},
    {name: "Club Name", values: ["Sunrise Runners"]},
    {name: "instagram_handle", values: ["@sunrise.runners"]},
  ],
};

test("only well-formed leadgen changes are read from a webhook", () => {
  const body = {object: "page", entry: [{changes: [
    {field: "leadgen", value: {leadgen_id: change.leadgenId,
      page_id: Number(change.pageId), form_id: change.formId,
      ad_id: change.adId, created_time: 1795600000}},
    {field: "feed", value: {}},
    {field: "leadgen", value: {leadgen_id: "12", page_id: "1", form_id: "x"}},
  ]}]};
  assert.deepEqual(leadgenChanges(body), [change]);
  assert.deepEqual(leadgenChanges({object: "user", entry: []}), []);
  assert.deepEqual(leadgenChanges(null), []);
  assert.deepEqual([...allowedPages(" 123456789, bad,987654321 ")],
    ["123456789", "987654321"]);
});

test("a lead becomes a meta_lead_ad intent with normalised contact", () => {
  const lead = parseMetaLead(graphLead)!;
  const intent = metaLeadIntent({change, lead, nowMillis: now,
    timestamp: (millis) => Timestamp.fromMillis(millis)})!;
  assert.equal(intent.source, "meta_lead_ad");
  assert.equal(intent.intentId, metaLeadIntentId(change.leadgenId));
  assert.equal(intent.status, "needs_identity_review");
  assert.equal(intent.phone, "+919876543210");
  assert.equal(intent.email, "asha@example.com");
  assert.equal(intent.fullName, "Asha Rao");
  assert.deepEqual(intent.hostApplication, {organizationName: "Sunrise Runners",
    operatingCity: "Bengaluru",
    communityLink: "https://instagram.com/sunrise.runners"});
  assert.equal(intent.metaLead.leadgenId, change.leadgenId);
  assert.equal(intent.metaLead.campaignId, "444444444");
  // A lead with no usable phone or email is not filed.
  const empty = parseMetaLead({...graphLead, field_data: [
    {name: "full_name", values: ["No Contact"]}]})!;
  assert.equal(metaLeadIntent({change, lead: empty, nowMillis: now,
    timestamp: (millis) => Timestamp.fromMillis(millis)}), null);
  assert.equal(parseMetaLead({field_data: []}), null);
});

function fakeDb(seed: Record<string, Record<string, unknown>> = {}) {
  const docs = new Map(Object.entries(seed));
  const ref = (path: string) => ({
    get: async () => ({data: () => docs.get(path)}),
    create: async (data: Record<string, unknown>) => {
      if (docs.has(path)) throw Object.assign(new Error("exists"), {code: 6});
      docs.set(path, data);
    },
    update: async (patch: Record<string, unknown>) => {
      docs.set(path, {...docs.get(path), ...patch});
    },
  });
  const db = {collection: (name: string) => ({
    doc: (id: string) => ref(`${name}/${id}`),
    where: (field: string, _op: string, value: unknown) => ({limit: () => ({
      get: async () => ({docs: [...docs.entries()]
        .filter(([path, data]) => path.startsWith(`${name}/`) &&
          data[field] === value)
        .map(([, data]) => ({data: () => data}))}),
    })}),
  })} as unknown as FirebaseFirestore.Firestore;
  return {db, docs};
}

const response = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {status});

test("receipts are filed once and processed into one intent", async () => {
  const {db, docs} = fakeDb();
  assert.equal(await fileLeadgenReceipt(db, change, now), true);
  assert.equal(await fileLeadgenReceipt(db, change, now), false);
  const deps = {db, pages: new Set([change.pageId]),
    token: async () => "synthetic-token", now: () => now,
    fetch: async () => response(200, graphLead)};
  assert.equal(await processLeadgenReceipt(deps, change, 0), "intent_created");
  const receipt = docs.get(`metaLeadgenEvents/${change.leadgenId}`)!;
  assert.equal(receipt.status, "processed");
  assert.equal(receipt.phoneSha256, hashedPhone("+919876543210"));
  const intentPath =
    `salesInboundIntents/${metaLeadIntentId(change.leadgenId)}`;
  assert.ok(docs.get(intentPath));
  // Processing again keeps the one intent.
  assert.equal(await processLeadgenReceipt(deps, change, 1), "intent_created");
});

test("other pages are ignored; throttling retries; 4xx fails", async () => {
  const {db, docs} = fakeDb();
  await fileLeadgenReceipt(db, change, now);
  const base = {db, token: async () => "synthetic-token", now: () => now};
  assert.equal(await processLeadgenReceipt({...base, pages: new Set(),
    fetch: async () => response(200, graphLead)}, change, 0),
  "page_not_allowed");
  const pages = new Set([change.pageId]);
  await assert.rejects(processLeadgenReceipt({...base, pages,
    fetch: async () => response(429, {})}, change, 0), /retried/);
  assert.equal(docs.get(`metaLeadgenEvents/${change.leadgenId}`)!.status,
    "pending");
  assert.equal(await processLeadgenReceipt({...base, pages,
    fetch: async () => response(429, {})}, change, 9), "fetch_uncertain");
  assert.equal(docs.get(`metaLeadgenEvents/${change.leadgenId}`)!.status,
    "failed");
  assert.equal(await processLeadgenReceipt({...base, pages,
    fetch: async () => response(403, {error: {code: 10}})}, change, 0),
  "fetch_403");
});

test("a qualified host carries its Meta lead as a CRM stage", async () => {
  const {db} = fakeDb({
    "metaLeadgenEvents/1234567890123456": {leadgenId: "1234567890123456",
      status: "processed", phoneSha256: hashedPhone("+919876543210"),
      emailSha256: null},
  });
  const owner = {phoneNumber: "+919876543210", email: ""};
  assert.equal(await matchingMetaLead(db, owner, undefined),
    "1234567890123456");
  assert.equal(await matchingMetaLead(db, {phoneNumber: "+910000000000"},
    undefined), null);
  const [meta] = hostDeliveryRecords({organizerId: "org-1",
    conversion: "organizer_qualified",
    organizer: {ownership: {state: "claimed", ownerUserId: "host-1"}},
    owner, nowMillis: now, metaLeadId: "1234567890123456"});
  const event = metaEvent(meta);
  assert.equal(event.user_data.lead_id, "1234567890123456");
  assert.equal(event.custom_data.event_source, "crm");
  assert.equal(event.custom_data.lead_event_source, "Catch");
  assert.equal(event.action_source, "system_generated");
  const [plain] = hostDeliveryRecords({organizerId: "org-1",
    conversion: "organizer_qualified",
    organizer: {ownership: {state: "claimed", ownerUserId: "host-1"}},
    owner, nowMillis: now});
  assert.equal("lead_id" in metaEvent(plain).user_data, false);
  assert.equal("event_source" in metaEvent(plain).custom_data, false);
});
