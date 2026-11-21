import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {BRAND} from "../shared/generated/brand";
import {
  PREVIEW_LIMIT,
  alertWindowId,
  classifySupportMessage,
  isFresh,
  istTime,
  operatorAlertEmail,
  overflowSummaryEmail,
  salesLeadAlert,
  supportAlert,
  withoutContactDetails,
} from "./alerts";

// 21 Nov 2026, 08:35 UTC = 14:05 IST.
const at = Date.UTC(2026, 10, 21, 8, 35);
const conversationId = `whatsapp-${"b".repeat(64)}`;
const intentId = "c".repeat(64);
const conversation = {channel: "whatsapp", displayName: "Sample Person",
  audience: "unknown", createdAt: Timestamp.fromMillis(at)};
const message = {direction: "inbound", authorUid: null,
  text: "Hi, can I bring a friend to the Saturday run?",
  at: Timestamp.fromMillis(at)};

test("support routing: only messages the person sent, new or existing", () => {
  assert.equal(classifySupportMessage(conversation, message), "new");
  assert.equal(classifySupportMessage(conversation,
    {...message, at: Timestamp.fromMillis(at + 1)}), "existing");
  for (const patch of [{direction: "outbound"}, {direction: "note"},
    {authorUid: "staff-uid"}, {at: null}]) {
    assert.equal(classifySupportMessage(conversation,
      {...message, ...patch}), null);
  }
  assert.equal(classifySupportMessage({...conversation, channel: "sms"},
    message), null);
  assert.equal(classifySupportMessage(undefined, message), null);
});

test("support alert names the sender and links to the conversation", () => {
  const alert = supportAlert({conversationId, messageId: "src-" +
    "d".repeat(64), conversation, message, kind: "new"});
  assert.ok(alert);
  assert.equal(alert.kind, "supportConversation");
  assert.match(alert.alertId, /^support_[a-f0-9]{64}$/u);
  assert.equal(alert.adminPath, `/support/${conversationId}`);
  assert.equal(alert.headline, "WhatsApp message");
  assert.equal(alert.sender, "Sample Person");
  assert.equal(alert.preview, message.text);
  const later = supportAlert({conversationId, messageId: "src-" +
    "e".repeat(64), conversation: {...conversation, displayName: null,
    audience: "organizer"}, message: {...message, text: "x ".repeat(200)},
  kind: "existing"});
  assert.equal(later?.kind, "supportReturn");
  assert.notEqual(later?.alertId, alert.alertId);
  assert.equal(later?.sender, "A Catch host (no name on file)");
  assert.equal([...later!.preview].length, PREVIEW_LIMIT);
  assert.ok(later?.preview.endsWith("…"));
  assert.equal(supportAlert({conversationId: "bad", messageId: "src-x",
    conversation, message, kind: "new"}), null);
});

const intent = {status: "needs_identity_review", source: "meta_lead_ad",
  submissionId: "meta-123", fullName: "Sample Person",
  email: "sample.person@organizer.in", phone: "+919800000000", city: "Pune",
  createdAt: Timestamp.fromMillis(at),
  hostApplication: {organizationName: "Lantern Run Club",
    formats: ["Runs", "Dinners"], operatingCity: "Pune",
    eventCadence: "Weekly"}};

test("lead routing by source, skipping partner, city alerts, QA and closed",
  () => {
    const meta = salesLeadAlert(intentId, intent);
    assert.equal(meta?.kind, "metaLead");
    assert.equal(meta?.headline, "Meta lead");
    assert.equal(meta?.sender, "Sample Person, Lantern Run Club");
    assert.equal(meta?.preview, "Runs, Dinners · Pune · Weekly");
    assert.equal(meta?.adminPath, `/inbox/enquiry-${intentId}`);
    assert.equal(meta?.alertId, `lead_${intentId}`);
    const host = salesLeadAlert(intentId, {...intent, source: "website"});
    assert.equal(host?.kind, "websiteHostApplication");
    assert.equal(host?.detail, "Host application");
    const weddings = salesLeadAlert(intentId, {...intent, source: "website",
      programme: "weddings", hostApplication: null,
      programmeApplication: {planningCompany: "Driftwood Weddings",
        weddingDate: "12 Dec"}});
    assert.equal(weddings?.detail, "Weddings pilot application");
    assert.equal(weddings?.sender, "Sample Person, Driftwood Weddings");
    const venue = salesLeadAlert(intentId, {...intent, source: "website",
      hostApplication: null, fullName: null, leadKind: "venue",
      lead: {venue: {spaceName: "Sandbar Studio", area: "Baner",
        capacity: "40"}}});
    assert.equal(venue?.kind, "websiteLead");
    assert.equal(venue?.detail, "Space to list");
    assert.equal(venue?.sender, "Sandbar Studio");
    assert.equal(venue?.preview, "Baner · 40 · Pune");
    for (const patch of [{source: "partner"}, {status: "dismissed"},
      {status: "linked"}, {source: "website", leadKind: "city_alerts"},
      {submissionId: "internal_qa_delivery"}, {fullName: "[QA] Synthetic"},
      {email: "qa@example.test"}, {email: "qa@demo.example.com"},
      {createdAt: null}]) {
      assert.equal(salesLeadAlert(intentId, {...intent, ...patch}), null);
    }
    assert.equal(salesLeadAlert("not-an-id", intent), null);
  });

test("the email: what, who, channel, preview, time and an Admin link; " +
  "no contact details in the subject", () => {
  const alert = salesLeadAlert(intentId, {...intent,
    fullName: "Reach me +91 98000 00000 or sample@organizer.in"});
  assert.ok(alert);
  const mail = operatorAlertEmail(alert, {
    from: `alerts@${BRAND.senders.emailDomain}`,
    to: ["staff@catch.example"], nowMillis: at});
  assert.doesNotMatch(mail.subject, /\d{5}|@/u);
  assert.match(mail.subject, /^Meta lead: Reach me \[number\] or \[email\]/u);
  assert.deepEqual(mail.to, ["staff@catch.example"]);
  for (const line of ["Meta lead (Facebook or Instagram lead form)",
    "Channel: Meta lead form", "Time: 21 Nov 2026, 14:05 IST",
    "Preview: Runs, Dinners · Pune · Weekly",
    `${BRAND.web.adminOrigin}/inbox/enquiry-${intentId}`]) {
    assert.ok(mail.text.includes(line), line);
  }
  // Contact fields stored on the lead never enter the email.
  assert.equal(mail.text.includes("+919800000000"), false);
  assert.equal(mail.text.includes("sample.person@organizer.in"), false);
  assert.equal(mail.idempotencyKey, `operator-alert-lead_${intentId}`);
  assert.equal(mail.html, undefined);
});

test("helpers: windows, freshness, IST time and contact scrubbing", () => {
  assert.equal(alertWindowId(at), "2026112108");
  assert.equal(istTime(at), "21 Nov 2026, 14:05 IST");
  assert.ok(isFresh(at, at + 60_000));
  assert.equal(isFresh(at, at + 6 * 3_600_000), false);
  assert.equal(isFresh(at + 120_000, at), false);
  assert.equal(withoutContactDetails("Call 98000-00000, a@b.in, 2 kids"),
    "Call [number], [email] 2 kids");
});

test("the overflow summary lists links by kind, not names", () => {
  const mail = overflowSummaryEmail({windowId: "2026112108",
    overflowCount: 3, held: [
      {kind: "metaLead", adminPath: `/inbox/enquiry-${intentId}`,
        occurredAtMillis: at},
      {kind: "supportConversation", adminPath: `/support/${conversationId}`,
        occurredAtMillis: at + 1000},
    ], from: "alerts@catch.example", to: ["staff@catch.example"],
    nowMillis: at});
  assert.equal(mail.subject, `3 more ${BRAND.name} alerts in one hour`);
  for (const line of ["1 Meta leads", "1 new support conversations",
    "and 1 more", "between 21 Nov 2026, 13:30 IST and 21 Nov 2026, " +
    "14:30 IST", `${BRAND.web.adminOrigin}/support/${conversationId}`]) {
    assert.ok(mail.text.includes(line), line);
  }
  assert.equal(mail.idempotencyKey, "operator-alert-summary-2026112108");
});
