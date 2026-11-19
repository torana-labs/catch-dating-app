/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../operations/testFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {BRAND} from "../shared/generated/brand";
import {inviteLinkTokenHash} from "../events/inviteLinks";
import {createPromotionKitHandler} from "./createPromotionKit";

const NOW_MILLIS = Date.UTC(2026, 10, 18, 8, 0, 0);
const KEY = "promotion-kit-0001";
const validate = contractValidator("CreatePromotionKitCallableResponse");
function valid(value: unknown, label: string) {
  assert.equal(validate(value), true, `${label}: ${schemaErrorMessages(validate as never).join("; ")}`);
}

function harness() {
  const db = new FakeFirestore();
  db.write("organizers/org-1", {name: "Driftwood Bay Runners", ownerUserId: "host-1", hostUserId: "host-1",
    hostUserIds: ["host-1"], status: "active"});
  db.write("events/event-1", {organizerId: "org-1", name: "Sunday sea-face run"});
  const deps = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    now: () => new Date(NOW_MILLIS),
    timestamp: () => ({toMillis: () => NOW_MILLIS}) as unknown as FirebaseFirestore.Timestamp,
    serverTimestamp: () => "SERVER_TIME" as unknown as FirebaseFirestore.FieldValue,
    checkRateLimit: (async () => undefined) as never,
  };
  return {db, deps};
}

function call(data: unknown, uid = "host-1", phone = "+919000000003") {
  return {data, auth: {uid, token: phone ? {phone_number: phone} : {}}, rawRequest: {headers: {}}} as unknown as
    CallableRequest<unknown>;
}

const LINKS = [{label: " Instagram bio ", source: "instagram"}, {label: "Run club WhatsApp", source: "whatsapp"},
  {label: "Asha (promoter)", kind: "promoter"}];
const envelope = (mode: "preview" | "apply", extra: Record<string, unknown> = {}, links: unknown[] = LINKS) =>
  ({mode, idempotencyKey: KEY, surface: "catch_host", input: {eventId: "event-1", links, attributionWindowDays: 14}, ...extra});

const inviteLinks = (db: FakeFirestore) => db.entries().filter(([key]) => /^eventInviteLinks\/[^/]+$/u.test(key));

test("preview lists the kit's links and writes nothing", async () => {
  const {db, deps} = harness();
  const preview = await createPromotionKitHandler(call(envelope("preview")), deps);
  valid(preview, "preview");
  assert.equal(preview.status, "previewed");
  assert.deepEqual(preview.result.links.map((link) => [link.label, link.kind, link.url]), [
    ["Instagram bio", "channel", null], ["Run club WhatsApp", "channel", null], ["Asha (promoter)", "promoter", null]]);
  assert.match(preview.result.campaignId, /^kit_[a-f0-9]{24}$/u);
  assert.equal(inviteLinks(db).length, 0);
});

test("apply creates one tracked link per entry, through the invite link documents, and replays", async () => {
  const {db, deps} = harness();
  const preview = await createPromotionKitHandler(call(envelope("preview")), deps);
  const confirm = {commandId: "promotion.create-kit", previewHash: preview.previewHash};
  const applied = await createPromotionKitHandler(call(envelope("apply", {confirm})), deps);
  valid(applied, "applied");
  assert.equal(applied.status, "applied");
  assert.equal(inviteLinks(db).length, 3);
  for (const link of applied.result.links) {
    const stored = db.read(`eventInviteLinks/${link.inviteLinkId}`)!;
    const token = link.url!.slice(`${BRAND.web.origin}/invite/`.length);
    assert.ok(link.url!.startsWith(`${BRAND.web.origin}/invite/v2_${link.inviteLinkId}_`));
    assert.equal(stored.tokenHash, inviteLinkTokenHash(token));
    assert.equal(db.read(`eventInviteLinkSecrets/${link.inviteLinkId}`)?.token, token);
    assert.deepEqual([stored.eventId, stored.organizerId, stored.hostUid, stored.label, stored.campaignId,
      stored.destinationKind, stored.openCount], ["event-1", "org-1", "host-1", link.label, applied.result.campaignId,
      "catchEvent", 0]);
    assert.equal(stored.linkKind, link.kind === "promoter" ? "promoter" : "hostChannel");
  }
  assert.equal((db.read(`eventInviteLinks/${applied.result.links[0].inviteLinkId}`)!.attributionWindowEndsAt as
    {_seconds: number})._seconds * 1000, NOW_MILLIS + 14 * 24 * 60 * 60 * 1000);

  const replay = await createPromotionKitHandler(call(envelope("apply", {confirm})), deps);
  assert.equal(replay.status, "replayed");
  assert.deepEqual(replay.result.links, applied.result.links);
  assert.equal(inviteLinks(db).length, 3, "a replay creates nothing");
});

test("only a phone-verified manager can make a kit; duplicate labels and changed previews are refused", async () => {
  const {db, deps} = harness();
  await assert.rejects(createPromotionKitHandler(call(envelope("preview"), "guest-1"), deps), {code: "permission-denied"});
  await assert.rejects(createPromotionKitHandler(call(envelope("apply"), "host-1", ""), deps));
  const duplicate = await createPromotionKitHandler(call(envelope("preview", {}, [{label: "Flyer"}, {label: " flyer"}])), deps);
  valid(duplicate, "duplicate");
  assert.deepEqual([duplicate.status, duplicate.result.reasons], ["refused", ["duplicate_label"]]);
  await assert.rejects(createPromotionKitHandler(call(envelope("apply",
    {confirm: {commandId: "promotion.create-kit", previewHash: "f".repeat(64)}})), deps), {code: "aborted"});
  assert.equal(inviteLinks(db).length, 0);
});
