import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {JoinWaitlistHTTPRequest} from
  "../shared/generated/joinWaitlistHttpRequest";
import type {JoinWaitlistHTTPResponse} from
  "../shared/generated/joinWaitlistHttpResponse";
import type {
  OrganizerBillDocument,
} from "../shared/generated/firestoreAdminTypes";
import {contractValidator} from "../shared/contractTestValidators";
import {createJoinWaitlistHandler} from "./joinWaitlist";
import {
  LEAD_KINDS, LEAD_PAYLOAD_KEYS, type LeadKind, type WebsiteLeadDeps,
  handleWebsiteLead, leadIntentId, leadNetworkKey, leadNumberKey,
  normalizeReferralLink,
} from "./websiteLead";
import {projectInboxSource} from "../admin/inbox/model";
import {requestFromSalesInboundIntent} from
  "../operations/supplyIntake/requests";
import {listingChannel, newGrowthFacts} from "../growth/organizerGrowthFacts";
import {creditForPaidBill} from "../money/nominatorCredits";
import {defaultMoneySettings} from "../money/billComputation";

const validateRequest =
  contractValidator<JoinWaitlistHTTPRequest>("JoinWaitlistHTTPRequest");
const validateResponse =
  contractValidator<JoinWaitlistHTTPResponse>("JoinWaitlistHTTPResponse");
const validateIntent = contractValidator("SalesInboundIntentsDocument");

const phone = "+919812345678";

/** One valid request per kind, as the redesign's forms send them. */
const validLeads: Record<LeadKind, Record<string, unknown>> = {
  guide: lead("guide", {guide: {format: "run_club"}}, {city: "Mumbai"},
    "/run-clubs/", "rc-wa"),
  walkthrough: lead("walkthrough", {walkthrough: {
    preferredTime: "Tue 18 · 16:00 IST", organisation: "Tiny Court Co",
    whatYouRun: "Padel courts in Bandra"}}, {fullName: "Kabir Rao"},
  "/start/", "walkthrough"),
  demo: lead("demo", {demo: {whatYouHost: "A monthly supper club for 24",
    currentQuestions: "Dietary needs, plus one?"}},
  {fullName: "Ira Desai"}, "/demo/", "get"),
  venue: lead("venue", {venue: {spaceName: "The Loft", area: "Lower Parel",
    capacity: "60 standing, 30 seated", nights: "Tuesdays and Wednesdays"}},
  {}, "/venues/", "list"),
  story: lead("story", {story: {communityName: "Lantern Lane Social",
    cadence: "A monthly supper club for 24"}}, {}, "/stories/", "founding"),
  referral: lead("referral", {referral: {hostName: "Lantern Lane Social",
    hostLink: "@lanternlanesocial", relationship: "I go to their dinners"}},
  {fullName: "Neha Shah"}, "/refer/", "nominate"),
  org_contact: lead("org_contact", {orgContact: {orgType: "college",
    orgName: "Film Society, St Xavier's"}}, {}, "/colleges/", "contact"),
  city_alerts: lead("city_alerts",
    {cityAlerts: {interests: ["runs", "dinners"]}},
    {city: "Pune", cityId: "in-mh-pune", citySource: "network_guess"},
    "/explore/", "ex-wa", "cityNewPlans"),
};

function lead(kind: LeadKind, payload: Record<string, unknown>,
  top: Record<string, unknown>, sourcePage: string, entry: string,
  purpose = "leadFollowUp"): Record<string, unknown> {
  return {requestKind: kind, ...top, lead: {
    requestId: `req_${kind}_0123456789abcdef`, phone,
    consent: {purpose, version: "lead-2026-11"}, sourcePage, entry,
    ...payload,
  }};
}

function withLead(body: Record<string, unknown>,
  change: Record<string, unknown>): Record<string, unknown> {
  return {...body, lead: {...body.lead as object, ...change}};
}

function without(body: Record<string, unknown>, key: string) {
  const copy = {...body};
  delete copy[key];
  return copy;
}

/** One invalid request per kind, plus the shared refusals. */
const invalidLeads: Array<[string, Record<string, unknown>]> = [
  ["guide under the city new-plans purpose", withLead(validLeads.guide,
    {consent: {purpose: "cityNewPlans", version: "lead-2026-11"}})],
  ["walkthrough without a preferred time", withLead(validLeads.walkthrough,
    {walkthrough: {organisation: "Tiny Court Co"}})],
  ["demo without a name", without(validLeads.demo, "fullName")],
  ["venue without its name", withLead(validLeads.venue, {venue: {
    capacity: "60", nights: "Tuesdays"}})],
  ["story without its cadence", withLead(validLeads.story, {story: {
    communityName: "Lantern Lane Social"}})],
  ["referral without the referrer's name",
    without(validLeads.referral, "fullName")],
  ["org contact with an unknown type", withLead(validLeads.org_contact, {
    orgContact: {orgType: "agency", orgName: "Acme"}})],
  ["city alerts without a city", without(validLeads.city_alerts, "city")],
  ["city alerts under the follow-up purpose", withLead(
    validLeads.city_alerts, {consent: {purpose: "leadFollowUp",
      version: "lead-2026-11"}})],
  ["a lead with a role", {...validLeads.guide, role: "host"}],
  ["a lead with an email", {...validLeads.guide, email: "a@b.co"}],
  ["a lead with another kind's payload", withLead(validLeads.guide,
    {venue: {spaceName: "Loft", capacity: "60", nights: "Tue"}})],
  ["a lead without its request id", {...validLeads.guide, lead: (() => {
    const copy = {...validLeads.guide.lead as Record<string, unknown>};
    delete copy.requestId;
    return copy;
  })()}],
  ["a lead without a number", {...validLeads.demo, lead: (() => {
    const copy = {...validLeads.demo.lead as Record<string, unknown>};
    delete copy.phone;
    return copy;
  })()}],
  ["an unknown kind", {...validLeads.guide, requestKind: "newsletter"}],
  ["a lead block without a kind", without(validLeads.guide, "requestKind")],
  ["a source page with a query", withLead(validLeads.guide,
    {sourcePage: "/run-clubs/?utm_source=x"})],
];

test("the lead contract accepts each kind and refuses what it must", () => {
  for (const kind of LEAD_KINDS) {
    assert.equal(validateRequest(validLeads[kind]), true, kind);
  }
  for (const [name, body] of invalidLeads) {
    assert.equal(validateRequest(body), false, name);
  }
  const receipt = {ok: true, alreadyJoined: false, lead: {
    leadId: "a".repeat(64), requestKind: "guide", isNew: true}};
  assert.equal(validateResponse(receipt), true);
  assert.equal(validateResponse({...receipt, lead: {...receipt.lead,
    leadId: "lead-1"}}), false);
});

test("waitlist, Host and launch-notice payloads validate as before", () => {
  const member = {fullName: "Asha Rao", email: "asha@example.com",
    city: "Pune", role: "member"};
  assert.equal(validateRequest(member), true);
  assert.equal(validateRequest(without(member, "city")), false);
  assert.equal(validateRequest(without(member, "role")), false);
  assert.equal(validateRequest(without(member, "fullName")), false);
  assert.equal(validateRequest({city: "Pune", role: "member", whatsapp: {
    phone, launchNotice: true, marketing: false, consentVersion: "v1"}}),
  true);
  // The lead block belongs to requestKind requests only.
  assert.equal(validateRequest({...member, lead: validLeads.guide.lead}),
    false);
});

interface FakeStore {
  db: FirebaseFirestore.Firestore;
  records: Map<string, Record<string, unknown>>;
}

function fakeStore(): FakeStore {
  const records = new Map<string, Record<string, unknown>>();
  const snapshot = (path: string) => ({exists: records.has(path),
    data: () => records.get(path)});
  const ref = (path: string) => ({path, id: path.split("/").pop(),
    get: async () => snapshot(path)});
  const db = {
    collection: (name: string) => ({doc: (id: string) => ref(`${name}/${id}`)}),
    runTransaction: async (run: (tx: unknown) => Promise<unknown>) => {
      const writes: Array<[string, Record<string, unknown>]> = [];
      const result = await run({
        get: async (target: {path: string}) => snapshot(target.path),
        create: (target: {path: string}, value: Record<string, unknown>) => {
          assert.equal(records.has(target.path), false, target.path);
          writes.push([target.path, value]);
        },
      });
      for (const [path, value] of writes) records.set(path, value);
      return result;
    },
  };
  return {db: db as unknown as FirebaseFirestore.Firestore, records};
}

interface Harness {
  store: FakeStore;
  deps: WebsiteLeadDeps;
  limits: Array<{key: string; action: string}>;
  exhausted: Set<string>;
  partners: Set<string>;
}

function harness(): Harness {
  const store = fakeStore();
  const limits: Harness["limits"] = [];
  const exhausted = new Set<string>();
  const partners = new Set<string>();
  const deps: WebsiteLeadDeps = {
    db: () => store.db,
    now: () => new Date("2026-11-16T09:00:00.000Z"),
    enforceAppCheck: true,
    verifyAppCheck: async (token) => {
      if (token !== "app-check-ok") throw new Error("invalid App Check");
    },
    verifyIdToken: async (token) => {
      if (token === "anonymous-token") return {uid: "anon", anonymous: true};
      if (!token.startsWith("id-")) throw new Error("invalid ID token");
      return {uid: token.slice(3), anonymous: false};
    },
    checkRateLimit: (async (_db: unknown, key: string, action: string) => {
      limits.push({key, action});
      if (exhausted.has(action)) {
        throw new HttpsError("resource-exhausted", "Rate limit exceeded.");
      }
    }) as WebsiteLeadDeps["checkRateLimit"],
    isCurrentPartner: async (_db, _tx, uid) => partners.has(uid),
  };
  return {store, deps, limits, exhausted, partners};
}

function request(headers: Record<string, string> = {}, ip = "203.0.113.7") {
  const lower = Object.fromEntries(Object.entries(headers).map(
    ([key, value]) => [key.toLowerCase(), value]));
  return {method: "POST", ip, socket: {},
    get: (name: string) => lower[name.toLowerCase()]} as never;
}

const appCheck = {"X-Firebase-AppCheck": "app-check-ok"};

function storedIntent(store: FakeStore, kind: LeadKind) {
  const body = validLeads[kind].lead as {requestId: string};
  return store.records.get(
    `salesInboundIntents/${leadIntentId(phone, body.requestId)}`);
}

/** The stored row as Firestore would serialize it, timestamps filled in. */
function serialized(row: Record<string, unknown>): unknown {
  const stamp = Timestamp.fromDate(new Date("2026-11-16T09:00:00.000Z"));
  return JSON.parse(JSON.stringify({...row, createdAt: stamp,
    updatedAt: stamp}));
}

test("each kind lands as a typed intent the Admin inbox picks up",
  async () => {
    const {store, deps} = harness();
    for (const kind of LEAD_KINDS) {
      const result = await handleWebsiteLead(request(appCheck),
        validLeads[kind], deps);
      assert.equal(result.status, 200, kind);
      assert.equal(validateResponse(result.body), true, kind);
      const row = storedIntent(store, kind)!;
      assert.ok(row, kind);
      assert.equal(validateIntent(serialized(row)), true,
        `${kind}: ${JSON.stringify(validateIntent.errors)}`);
      assert.equal(row.leadKind, kind);
      assert.equal(row.source, "website");
      assert.equal(row.status, "needs_identity_review");
      assert.equal(row.phone, phone);
      assert.equal(row.email, null);
      const stored = row.lead as Record<string, unknown>;
      assert.deepEqual(stored[LEAD_PAYLOAD_KEYS[kind]],
        (validLeads[kind].lead as Record<string, unknown>)[
          LEAD_PAYLOAD_KEYS[kind]]);
      assert.equal((stored.consent as {purpose: string}).purpose,
        kind === "city_alerts" ? "cityNewPlans" : "leadFollowUp");
      assert.ok((stored.consent as {decidedAt: unknown}).decidedAt instanceof
        Timestamp);
      // The inbox trigger projects the row; it waits on a person.
      const item = projectInboxSource("salesInboundIntent", row.intentId as
        string, {...row, createdAt: Timestamp.fromMillis(Date.parse(
        "2026-11-16T09:00:00.000Z"))});
      assert.equal(item?.lifecycle, "open", kind);
      assert.equal(item?.sourcePath, `salesInboundIntents/${row.intentId}`);
    }
    assert.equal(store.records.size, LEAD_KINDS.length);
  });

test("city alerts record the standalone purpose, interests and city",
  async () => {
    const {store, deps} = harness();
    await handleWebsiteLead(request(appCheck), validLeads.city_alerts, deps);
    const row = storedIntent(store, "city_alerts")!;
    const stored = row.lead as Record<string, unknown>;
    assert.equal(row.city, "Pune");
    assert.equal(stored.cityId, "in-mh-pune");
    assert.equal(stored.countryIsoCode, "IN");
    assert.deepEqual(stored.cityAlerts, {interests: ["runs", "dinners"]});
    assert.deepEqual({...stored.consent as object, decidedAt: null},
      {purpose: "cityNewPlans", version: "lead-2026-11", decidedAt: null});
    // No Host application, so no intake request and no Host alert.
    assert.equal(row.hostApplication, null);
    assert.equal(requestFromSalesInboundIntent(String(row.intentId), row as
      never, new Date()), null);
  });

test("a ticked new-plans box is stored as its own consent beside the lead's",
  async () => {
    const {store, deps} = harness();
    const newPlansConsent = {purpose: "cityNewPlans",
      version: "host-referral-new-plans-v1"};
    const result = await handleWebsiteLead(request(appCheck),
      withLead(validLeads.referral, {newPlansConsent}), deps);
    assert.equal(result.status, 200);
    const row = storedIntent(store, "referral")!;
    assert.equal(validateIntent(serialized(row)), true);
    const stored = row.lead as Record<string, Record<string, unknown>>;
    assert.equal(stored.consent.purpose, "leadFollowUp");
    assert.deepEqual({...stored.newPlansConsent, decidedAt: null},
      {...newPlansConsent, decidedAt: null});
    assert.ok(stored.newPlansConsent.decidedAt);
    // Left unticked, nothing is recorded for it.
    const plain = harness();
    await handleWebsiteLead(request(appCheck), validLeads.referral, plain.deps);
    assert.equal("newPlansConsent" in
      (storedIntent(plain.store, "referral")!.lead as object), false);
  });

test("city alerts and other purposes cannot carry the new-plans box",
  async () => {
    for (const body of [
      withLead(validLeads.city_alerts, {newPlansConsent: {
        purpose: "cityNewPlans", version: "host-referral-new-plans-v1"}}),
      withLead(validLeads.referral, {newPlansConsent: {
        purpose: "leadFollowUp", version: "host-referral-new-plans-v1"}}),
    ]) {
      const {store, deps} = harness();
      const result = await handleWebsiteLead(request(appCheck), body, deps);
      assert.equal(result.status, 400);
      assert.equal(store.records.size, 0);
    }
  });

test("blank optional answers are dropped and the number is compacted",
  async () => {
    const {store, deps} = harness();
    const body = withLead(validLeads.walkthrough, {phone: "+91 98123-45678",
      walkthrough: {preferredTime: "  Tue 18 ·  16:00 IST ",
        organisation: "  ", whatYouRun: ""}});
    const result = await handleWebsiteLead(request(appCheck), body, deps);
    assert.equal(result.status, 200);
    const row = storedIntent(store, "walkthrough")!;
    assert.equal(row.phone, phone);
    assert.deepEqual((row.lead as Record<string, unknown>).walkthrough,
      {preferredTime: "Tue 18 · 16:00 IST"});
    const refused = await handleWebsiteLead(request(appCheck),
      withLead(validLeads.guide, {phone: "98123"}), deps);
    assert.deepEqual(refused, {status: 400,
      body: {error: "Please enter a valid WhatsApp number."}});
  });

test("a retry returns the same lead and a changed answer is refused",
  async () => {
    const {store, deps, limits} = harness();
    const first = await handleWebsiteLead(request(appCheck),
      validLeads.demo, deps);
    const again = await handleWebsiteLead(request(appCheck),
      validLeads.demo, deps);
    assert.equal(first.status, 200);
    assert.equal(again.status, 200);
    const firstLead = (first.body as {lead: {leadId: string}}).lead;
    assert.deepEqual(again.body, {ok: true, alreadyJoined: true,
      lead: {leadId: firstLead.leadId, requestKind: "demo", isNew: false}});
    assert.deepEqual((first.body as {lead: {isNew: boolean}}).lead.isNew,
      true);
    assert.equal(store.records.size, 1);
    // The retry spent network quota but not the number's.
    assert.equal(limits.filter((entry) =>
      entry.action === "joinWaitlistLeadNumber").length, 1);
    const changed = await handleWebsiteLead(request(appCheck), withLead(
      validLeads.demo, {demo: {whatYouHost: "A quiz night"}}), deps);
    assert.equal(changed.status, 409);
    assert.equal(store.records.size, 1);
    // A new request id is a new lead.
    const next = await handleWebsiteLead(request(appCheck), withLead(
      validLeads.demo, {requestId: "req_demo_second_attempt_1"}), deps);
    assert.equal(next.status, 200);
    assert.equal(store.records.size, 2);
  });

test("App Check is required unless the runtime exempts it", async () => {
  const {store, deps} = harness();
  assert.equal((await handleWebsiteLead(request(), validLeads.guide, deps))
    .status, 401);
  assert.equal((await handleWebsiteLead(request({
    "X-Firebase-AppCheck": "forged"}), validLeads.guide, deps)).status, 401);
  assert.equal(store.records.size, 0);
  const exempt = await handleWebsiteLead(request(), validLeads.guide,
    {...deps, enforceAppCheck: false});
  assert.equal(exempt.status, 200);
});

test("rate limits use hashed network and number keys", async () => {
  const {store, deps, limits, exhausted} = harness();
  await handleWebsiteLead(request(appCheck, "198.51.100.4"),
    validLeads.story, deps);
  assert.deepEqual(limits, [
    {key: leadNetworkKey("198.51.100.4"), action: "joinWaitlistLeadNetwork"},
    {key: leadNumberKey(phone), action: "joinWaitlistLeadNumber"},
  ]);
  for (const {key} of limits) {
    assert.match(key, /^lead_(ip|phone)_[a-f0-9]{40}$/u);
    assert.equal(key.includes("198.51.100.4"), false);
    assert.equal(key.includes("9812345678"), false);
  }
  exhausted.add("joinWaitlistLeadNumber");
  const perNumber = await handleWebsiteLead(request(appCheck), withLead(
    validLeads.story, {requestId: "req_story_another_one_1"}), deps);
  assert.equal(perNumber.status, 429);
  exhausted.add("joinWaitlistLeadNetwork");
  const perNetwork = await handleWebsiteLead(request(appCheck),
    validLeads.venue, deps);
  assert.equal(perNetwork.status, 429);
  assert.equal(store.records.size, 1);
});

test("the honeypot answers without storing a lead", async () => {
  const {store, deps} = harness();
  const result = await handleWebsiteLead(request(appCheck),
    {...validLeads.guide, website: "https://spam.example"}, deps);
  assert.deepEqual(result, {status: 200,
    body: {ok: true, alreadyJoined: false}});
  assert.equal(store.records.size, 0);
});

test("referral links read as https URLs where they can", () => {
  assert.equal(normalizeReferralLink("@lanternlanesocial"),
    "https://www.instagram.com/lanternlanesocial/");
  assert.equal(normalizeReferralLink("lanternlanesocial"),
    "https://www.instagram.com/lanternlanesocial/");
  assert.equal(normalizeReferralLink("lanternlane.in/dinners"),
    "https://lanternlane.in/dinners");
  assert.equal(normalizeReferralLink("https://lu.ma/lantern"),
    "https://lu.ma/lantern");
  assert.equal(normalizeReferralLink("their supper club"), null);
});

const day = 86_400_000;

/** The listing a referral's intake request becomes, and its credit. */
function creditAfterClaim(row: Record<string, unknown>, claimedAfterDays:
  number) {
  const nominatedAt = Date.parse("2026-11-16T09:00:00.000Z");
  const channel = listingChannel({requestId: "intake-1",
    kind: "self_submission", submittedBy: {role: "organizer", uid: null},
    submittedAt: new Date(nominatedAt), originKind: "sales_inbound_intent",
    intent: row});
  const facts = newGrowthFacts("org-1", "in-mh-mumbai", channel,
    Timestamp.fromMillis(nominatedAt));
  facts.milestones.claimedAt =
    Timestamp.fromMillis(nominatedAt + claimedAfterDays * day);
  const bill = {billId: "org-1_2027-01", organizerId: "org-1",
    organizerName: "Lantern Lane Social", month: "2027-01",
    totalMinor: 20_000, gst: {amountMinor: 0}, paidMinor: 20_000,
  } as unknown as OrganizerBillDocument;
  return {channel, credit: creditForPaidBill({bill, facts,
    firstPaidMonth: "2027-01", rule: defaultMoneySettings.nominatorCredit,
    nowMillis: nominatedAt})};
}

test("a signed-in referrer is credited when the host claims within 90 days",
  async () => {
    const {store, deps} = harness();
    const result = await handleWebsiteLead(request({...appCheck,
      Authorization: "Bearer id-neha"}), validLeads.referral, deps);
    assert.equal(result.status, 200);
    const row = storedIntent(store, "referral")!;
    assert.deepEqual((row.lead as Record<string, unknown>).referralCredit, {
      status: "referrer_account", referrerUid: "neha", referrerRole: "guest"});
    assert.deepEqual(row.hostApplication, {
      organizationName: "Lantern Lane Social",
      communityLink: "https://www.instagram.com/lanternlanesocial/",
      operatingCity: null, operatingNotes: "I go to their dinners"});
    // The referral seeds an intake request, as a partner nomination does.
    const intake = requestFromSalesInboundIntent(String(row.intentId), row as
      never, new Date("2026-11-16T09:00:00.000Z"));
    assert.equal(intake?.seed.name, "Lantern Lane Social");
    assert.deepEqual(intake?.seed.urls,
      ["https://www.instagram.com/lanternlanesocial/"]);
    assert.deepEqual(intake?.origin, {kind: "sales_inbound_intent",
      id: row.intentId});
    const inTime = creditAfterClaim(row, 89);
    assert.equal(inTime.channel.channel, "guest");
    assert.equal(inTime.channel.nominator?.uid, "neha");
    assert.equal(inTime.credit?.nominatorUid, "neha");
    assert.equal(inTime.credit?.nominatorRole, "guest");
    assert.equal(creditAfterClaim(row, 91).credit, null);
  });

test("a partner referrer is credited as a partner", async () => {
  const {store, deps, partners} = harness();
  partners.add("meera");
  await handleWebsiteLead(request({...appCheck,
    Authorization: "Bearer id-meera"}), validLeads.referral, deps);
  const row = storedIntent(store, "referral")!;
  assert.deepEqual((row.lead as Record<string, unknown>).referralCredit, {
    status: "referrer_account", referrerUid: "meera",
    referrerRole: "partner"});
  const {channel, credit} = creditAfterClaim(row, 30);
  assert.equal(channel.channel, "partner");
  assert.equal(credit?.nominatorRole, "partner");
});

test("a signed-out referral is kept and records the missing account",
  async () => {
    for (const headers of [appCheck, {...appCheck,
      Authorization: "Bearer anonymous-token"}]) {
      const {store, deps} = harness();
      const result = await handleWebsiteLead(request(headers),
        validLeads.referral, deps);
      assert.equal(result.status, 200);
      const row = storedIntent(store, "referral")!;
      assert.equal(validateIntent(serialized(row)), true);
      assert.deepEqual((row.lead as Record<string, unknown>).referralCredit, {
        status: "missing_referrer_account", referrerUid: null,
        referrerRole: null});
      const {channel, credit} = creditAfterClaim(row, 10);
      assert.equal(channel.channel, "guest");
      assert.equal(channel.nominator, null);
      assert.equal(credit, null);
    }
    // A token that does not verify is refused, so credit is never lost
    // silently.
    const {store, deps} = harness();
    const refused = await handleWebsiteLead(request({...appCheck,
      Authorization: "Bearer forged"}), validLeads.referral, deps);
    assert.equal(refused.status, 401);
    assert.equal(store.records.size, 0);
  });

test("a deleted account cannot be credited", async () => {
  const {store, deps} = harness();
  store.records.set("deletedUsers/gone", {});
  await handleWebsiteLead(request({...appCheck,
    Authorization: "Bearer id-gone"}), validLeads.referral, deps);
  const row = storedIntent(store, "referral")!;
  assert.equal((row.lead as {referralCredit: {status: string}})
    .referralCredit.status, "missing_referrer_account");
});

test("joinWaitlist routes only requestKind requests to the lead path",
  async () => {
    const {store, deps} = harness();
    const handler = createJoinWaitlistHandler({
      lead: deps});
    const respond = () => {
      const sent: {status?: number; body?: unknown;
        headers: Record<string, string>} = {headers: {}};
      const response = {
        set: (key: string, value: string) => {
          sent.headers[key] = value;
        },
        status: (value: number) => {
          sent.status = value;
          return response;
        },
        json: (value: unknown) => {
          sent.body = value;
          return response;
        },
        send: () => response,
      };
      return {sent, response};
    };
    const leadCall = respond();
    await handler({...request(appCheck) as object, body: validLeads.venue,
      method: "POST"} as never, leadCall.response as never);
    assert.equal(leadCall.sent.status, 200);
    assert.equal((leadCall.sent.body as {lead: {requestKind: string}})
      .lead.requestKind, "venue");
    assert.equal(leadCall.sent.headers["Access-Control-Allow-Headers"],
      "Content-Type, X-Firebase-AppCheck, Authorization");
    assert.equal(store.records.size, 1);
    // A Host application never reaches the lead path or its App Check.
    const failing = {...deps, verifyAppCheck: async () => {
      throw new Error("lead path used");
    }, db: () => {
      throw new Error("lead path used");
    }};
    const hostHandler = createJoinWaitlistHandler({
      lead: failing});
    const hostCall = respond();
    await hostHandler({...request({}, "synthetic-lead-routing") as object,
      method: "POST", body: {fullName: "Asha Rao", city: "Pune",
        role: "member", website: "bot"}} as never, hostCall.response as never);
    assert.deepEqual(hostCall.sent.body, {ok: true, alreadyJoined: false});
  });
