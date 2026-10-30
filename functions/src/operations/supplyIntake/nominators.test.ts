/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {catchEndpointHash} from "../../catchMessaging/whatsappReply";
import {PARTNER_TERMS_VERSION} from "../../partners/model";
import {validateSupplyNominatorDocument} from "../../shared/generated/validators/supplyNominatorDocument";
import {FakeFirestore} from "../testFirestore";
import {
  adminListSupplyNominatorsHandler,
  adminSetSupplyNominatorHandler,
  instagramNominatorId,
  resolveInstagramNominator,
  resolveWhatsappNominator,
  whatsappNominatorId,
  type NominatorDeps,
} from "./nominators";

const NOW = new Date("2026-10-29T08:00:00.000Z");
const PHONE = "+919800012345";

type User = {disabled: boolean; customClaims?: Record<string, unknown>};

function nominatorDeps(db: FakeFirestore, users: Record<string, User>): NominatorDeps {
  return {
    firestore: () => db as unknown as Firestore,
    now: () => NOW,
    getUser: async (uid) => {
      const user = users[uid];
      if (!user) throw Object.assign(new Error("missing"), {code: "auth/user-not-found"});
      return user;
    },
    serverTimestamp: () => "SERVER_TIMESTAMP" as unknown as FirebaseFirestore.FieldValue,
  };
}

function writePartnerMembership(db: FakeFirestore, uid: string, overrides: Record<string, unknown> = {}): void {
  db.write(`salesPartnerMemberships/${uid}`, {schemaVersion: 1, classification: "sales_private", uid, revision: 1,
    status: "active", termsVersion: PARTNER_TERMS_VERSION, acceptedAt: "2026-10-01T00:00:00.000Z",
    expiresAt: "2027-10-01T00:00:00.000Z", displayName: "Partner", createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z", marketingGrants: [], ...overrides});
}

function adminRequest(data: Record<string, unknown>, token: Record<string, unknown> = {admin: true}): CallableRequest<unknown> {
  return {auth: {uid: "admin-1", token} as CallableRequest["auth"], data,
    rawRequest: {headers: {}} as CallableRequest["rawRequest"]} as CallableRequest<unknown>;
}

const payload = (overrides: Record<string, unknown> = {}) => ({phoneE164: "+91 98000 12345", uid: "associate-1",
  role: "associate", displayName: "Asha", defaultMarket: "Mumbai", active: true, ...overrides});

const users = {"associate-1": {disabled: false, customClaims: {salesStaff: true}},
  "member-1": {disabled: false, customClaims: {}}, "partner-1": {disabled: false, customClaims: {}}};

test("staff register a WhatsApp nominator without storing the number", async () => {
  const db = new FakeFirestore();
  const response = await adminSetSupplyNominatorHandler(adminRequest(payload()), nominatorDeps(db, users));
  const endpointHash = catchEndpointHash(PHONE);
  assert.deepEqual(response, {nominatorId: whatsappNominatorId(endpointHash), created: true, phoneLast4: "2345", instagramHandle: null,
    defaultMarket: "mumbai", active: true});
  const stored = db.read(`supplyNominators/${response.nominatorId}`);
  assert.equal(validateSupplyNominatorDocument(stored), true, JSON.stringify(validateSupplyNominatorDocument.errors));
  assert.equal(JSON.stringify(db.entries()).includes("9800012345"), false);
  const audit = db.entries().filter(([path]) => path.startsWith("adminAuditLogs/"));
  assert.equal(audit.length, 1);
  assert.equal(JSON.stringify(audit).includes("9800012345"), false);

  // Updating keeps the creation time and records the change.
  const update = await adminSetSupplyNominatorHandler(adminRequest(payload({active: false})), nominatorDeps(db, users));
  assert.deepEqual([update.created, update.active], [false, false]);
  assert.equal((db.read(`supplyNominators/${response.nominatorId}`) as {createdAt: string}).createdAt, NOW.toISOString());

  const listed = await adminListSupplyNominatorsHandler(adminRequest({}, {salesStaff: true}), nominatorDeps(db, users));
  assert.deepEqual(listed.nominators.map((row) => [row.phoneLast4, row.uid, row.active]), [["2345", "associate-1", false]]);
});

test("only admins register nominators, and only for accounts that hold the role", async () => {
  const db = new FakeFirestore();
  const deps = nominatorDeps(db, users);
  await assert.rejects(adminSetSupplyNominatorHandler(adminRequest(payload(), {salesStaff: true}), deps));
  await assert.rejects(adminSetSupplyNominatorHandler(adminRequest(payload({uid: "member-1"})), deps), /no sales role/u);
  await assert.rejects(adminSetSupplyNominatorHandler(adminRequest(payload({uid: "nobody"})), deps), /no sales role/u);
  await assert.rejects(adminSetSupplyNominatorHandler(adminRequest(payload({uid: "partner-1", role: "partner"})), deps),
    /partner membership/u);
  await assert.rejects(adminSetSupplyNominatorHandler(adminRequest(payload({defaultMarket: "Atlantis"})), deps),
    /not a market/u);
  await assert.rejects(adminSetSupplyNominatorHandler(adminRequest(payload({phoneE164: "98000"})), deps));
  writePartnerMembership(db, "partner-1");
  const partner = await adminSetSupplyNominatorHandler(adminRequest(payload({uid: "partner-1", role: "partner",
    defaultMarket: null})), deps);
  assert.equal(partner.created, true);
});

test("a nominator counts only while active and while their account keeps its role", async () => {
  const db = new FakeFirestore();
  const roster: Record<string, User> = {...users};
  const deps = nominatorDeps(db, roster);
  await adminSetSupplyNominatorHandler(adminRequest(payload()), deps);
  const endpointHash = catchEndpointHash(PHONE);
  const resolve = () => (db as unknown as Firestore).runTransaction((tx) =>
    resolveWhatsappNominator(tx, db as unknown as Firestore, deps, endpointHash, NOW));
  assert.deepEqual(await resolve(), {nominatorId: whatsappNominatorId(endpointHash), role: "associate",
    uid: "associate-1", partnerId: null, defaultMarket: "mumbai"});
  assert.equal(await (db as unknown as Firestore).runTransaction((tx) =>
    resolveWhatsappNominator(tx, db as unknown as Firestore, deps, catchEndpointHash("+919800099999"), NOW)), null);

  roster["associate-1"] = {disabled: false, customClaims: {}};
  assert.equal(await resolve(), null);
  roster["associate-1"] = {disabled: true, customClaims: {salesStaff: true}};
  assert.equal(await resolve(), null);
  roster["associate-1"] = {disabled: false, customClaims: {salesStaff: true}};
  await adminSetSupplyNominatorHandler(adminRequest(payload({active: false})), deps);
  assert.equal(await resolve(), null);
});

test("a partner nominator stops counting when their membership lapses", async () => {
  const db = new FakeFirestore();
  const deps = nominatorDeps(db, users);
  writePartnerMembership(db, "partner-1");
  await adminSetSupplyNominatorHandler(adminRequest(payload({uid: "partner-1", role: "partner"})), deps);
  const resolve = () => (db as unknown as Firestore).runTransaction((tx) =>
    resolveWhatsappNominator(tx, db as unknown as Firestore, deps, catchEndpointHash(PHONE), NOW));
  assert.deepEqual(await resolve().then((row) => row && [row.role, row.partnerId]), ["partner", "partner-1"]);
  writePartnerMembership(db, "partner-1", {status: "revoked"});
  assert.equal(await resolve(), null);
});

test("staff register an Instagram nominator by username, however they paste it", async () => {
  const db = new FakeFirestore();
  const deps = nominatorDeps(db, users);
  const response = await adminSetSupplyNominatorHandler(adminRequest(payload({phoneE164: undefined,
    instagramHandle: " https://www.instagram.com/Asha.Runs/ "})), deps);
  assert.deepEqual(response, {nominatorId: instagramNominatorId("asha.runs"), created: true, phoneLast4: null,
    instagramHandle: "asha.runs", defaultMarket: "mumbai", active: true});
  const stored = db.read(`supplyNominators/${response.nominatorId}`);
  assert.equal(validateSupplyNominatorDocument(stored), true);
  const firestore = db as unknown as Firestore;
  const resolved = await firestore.runTransaction((tx) => resolveInstagramNominator(tx, firestore, deps, "asha.runs", NOW));
  assert.equal(resolved?.uid, "associate-1");
  assert.equal(await firestore.runTransaction((tx) => resolveInstagramNominator(tx, firestore, deps, "someone", NOW)), null);
  assert.equal((await adminSetSupplyNominatorHandler(adminRequest(payload({phoneE164: undefined, instagramHandle: "@asha.runs"})),
    deps)).created, false);
});

test("a nominator is named by exactly one of a number and a username", async () => {
  const db = new FakeFirestore();
  for (const data of [payload({instagramHandle: "asha.runs"}), payload({phoneE164: undefined})]) {
    await assert.rejects(adminSetSupplyNominatorHandler(adminRequest(data), nominatorDeps(db, users)),
      {code: "invalid-argument"});
  }
  assert.equal(validateSupplyNominatorDocument({schemaVersion: 1, nominatorId: "instagram-asha.runs", channel: "instagram",
    endpointHash: "a".repeat(64), phoneLast4: "2345", instagramHandle: "asha.runs", role: "associate", uid: "u",
    displayName: "A", defaultMarket: null, active: true, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
    updatedByUid: "admin-1"}), false);
});
