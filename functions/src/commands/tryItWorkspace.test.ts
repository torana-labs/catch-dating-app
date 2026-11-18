/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../operations/testFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {organizerRelationshipId} from "../shared/relationshipDocuments";
import {ensureTryItWorkspaceHandler} from "./ensureTryItWorkspace";
import {tryItWorkspaceOrganizerId} from "./workspace";
import {expireDueTryItWorkspaces, reasonToKeep} from "./workspaceExpiry";

// The do-not-list probe loads the packaged Operations runtime from lib.
execFileSync(process.execPath, [path.join(__dirname, "../../scripts/copy-operations-runtime.cjs")]);

const NOW = "2026-11-18T08:00:00.000Z";
const LATER = "2026-12-19T08:00:00.000Z";
const SERVER_TIME = {_seconds: 1795075200, _nanoseconds: 0};
const UID = "visitor-1";
const PHONE = "+919000000002";
const KEY = "try-it-request-0001";
const INPUT = {organizerName: "Sunrise Social Club", marketId: "in-mh-mumbai"};

const validate = {
  response: contractValidator("EnsureTryItWorkspaceCallableResponse"),
  pointer: contractValidator("TryItWorkspaceDocument"),
  organizer: contractValidator("OrganizerDocument"),
};

function valid(validator: ((value: unknown) => boolean) & {errors?: unknown}, value: unknown, label: string) {
  assert.equal(validator(value), true, `${label}: ${schemaErrorMessages(validator as never).join("; ")}`);
}

function harness(now = NOW) {
  const db = new FakeFirestore();
  let clock = new Date(now);
  const limits: string[] = [];
  const deps = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    now: () => clock,
    serverTimestamp: () => SERVER_TIME as unknown as FirebaseFirestore.FieldValue,
    checkRateLimit: (async (_db: unknown, _key: string, action: string) => {
      limits.push(action);
    }) as never,
  };
  return {db, deps, limits, setNow: (value: string) => {
    clock = new Date(value);
  }};
}

function call(data: unknown, auth: unknown = {uid: UID, token: {phone_number: PHONE}}) {
  return {data, auth, rawRequest: {headers: {}, ip: "198.51.100.7"}} as unknown as CallableRequest<unknown>;
}

const envelope = (mode: "preview" | "apply", extra: Record<string, unknown> = {}) =>
  ({mode, idempotencyKey: KEY, surface: "website", input: INPUT, ...extra});

test("a caller without a verified phone is refused before anything is read", async () => {
  const {deps} = harness();
  await assert.rejects(ensureTryItWorkspaceHandler(call(envelope("preview"), null), deps), {code: "unauthenticated"});
  await assert.rejects(ensureTryItWorkspaceHandler(call(envelope("preview"), {uid: UID, token: {}}), deps),
    {code: "failed-precondition"});
});

test("preview describes a new private workspace and writes nothing", async () => {
  const {db, deps} = harness();
  const response = await ensureTryItWorkspaceHandler(call(envelope("preview")), deps);
  valid(validate.response, response, "preview response");
  assert.equal(response.status, "previewed");
  assert.equal(response.receiptId, null);
  assert.equal(response.result.exists, false);
  assert.equal(response.result.created, false);
  assert.match(response.summary.headline, /private organizer profile "Sunrise Social Club" in Mumbai/u);
  assert.deepEqual(db.entries(), []);
});

test("apply creates one owned, private organizer, its workspace and a receipt; a retry replays", async () => {
  const {db, deps} = harness();
  const response = await ensureTryItWorkspaceHandler(call(envelope("apply")), deps);
  valid(validate.response, response, "apply response");
  const organizerId = tryItWorkspaceOrganizerId(UID, 1);
  assert.equal(response.status, "applied");
  assert.equal(response.result.organizerId, organizerId);
  assert.equal(response.result.created, true);
  assert.equal(response.result.expiresAt, "2026-12-18T08:00:00.000Z");
  assert.match(String(response.receiptId), /^workspaceEnsure_[a-f0-9]{64}$/u);

  const organizer = db.read(`organizers/${organizerId}`)!;
  valid(validate.organizer, organizer, "organizer");
  assert.equal(organizer.ownerUserId, UID);
  assert.equal((organizer.publicPage as {publishStatus: string}).publishStatus, "draft");
  assert.equal(organizer.appVisibility, "hidden");
  assert.ok(db.read(`organizerTeamMemberships/${organizerRelationshipId(organizerId, UID)}`));
  const pointer = db.read(`tryItWorkspaces/${UID}`)!;
  valid(validate.pointer, pointer, "workspace pointer");
  assert.equal(pointer.state, "active");
  assert.ok(db.read(`commandReceipts/${response.receiptId}`));

  const replay = await ensureTryItWorkspaceHandler(call(envelope("apply")), deps);
  assert.equal(replay.status, "replayed");
  assert.equal(replay.result.organizerId, organizerId);
  assert.equal(db.entries().filter(([key]) => key.startsWith("organizers/")).length, 1);

  await assert.rejects(ensureTryItWorkspaceHandler(call(envelope("apply", {input: {...INPUT, organizerName: "Other"}})), deps),
    {code: "already-exists"});
});

test("a later command reuses the workspace, keeps its name and pushes expiry out", async () => {
  const {deps, setNow} = harness();
  const first = await ensureTryItWorkspaceHandler(call(envelope("apply")), deps);
  setNow("2026-11-25T08:00:00.000Z");
  const second = await ensureTryItWorkspaceHandler(call(envelope("apply", {idempotencyKey: "try-it-request-0002",
    input: {...INPUT, organizerName: "Renamed"}})), deps);
  assert.equal(second.status, "applied");
  assert.equal(second.result.organizerId, first.result.organizerId);
  assert.equal(second.result.organizerName, "Sunrise Social Club");
  assert.equal(second.result.created, false);
  assert.equal(second.result.expiresAt, "2026-12-25T08:00:00.000Z");
  assert.deepEqual(second.effects, []);
});

test("a confirm must match the reviewed preview", async () => {
  const {deps} = harness();
  const preview = await ensureTryItWorkspaceHandler(call(envelope("preview")), deps);
  await assert.rejects(ensureTryItWorkspaceHandler(call(envelope("apply", {confirm: {commandId: "workspace.ensure",
    previewHash: "0".repeat(64)}})), deps), {code: "aborted"});
  await assert.rejects(ensureTryItWorkspaceHandler(call(envelope("apply", {idempotencyKey: "try-it-request-0003",
    confirm: {commandId: "organizer.import-from-link", previewHash: preview.previewHash}})), deps),
  {code: "invalid-argument"});
  const applied = await ensureTryItWorkspaceHandler(call(envelope("apply", {idempotencyKey: "try-it-request-0004",
    confirm: {commandId: "workspace.ensure", previewHash: preview.previewHash}})), deps);
  assert.equal(applied.previewHash, preview.previewHash);
  assert.equal(applied.result.created, true);
});

test("a closed city is refused with a typed reason", async () => {
  const {deps} = harness();
  await assert.rejects(ensureTryItWorkspaceHandler(call(envelope("apply", {input: {...INPUT, marketId: "in-mh-pune"}})), deps),
    (error: {code?: string; details?: {reason?: string}}) => error.code === "failed-precondition" &&
      error.details?.reason === "market_not_open");
});

test("a caller who already runs one organizer gets it as their workspace, kept", async () => {
  const {db, deps} = harness();
  db.write("organizers/ExistingOrganizer0001", {name: "Existing Club", ownerUserId: UID,
    locationMarketId: "in-mh-mumbai", publicPage: {publishStatus: "published"}});
  const response = await ensureTryItWorkspaceHandler(call(envelope("apply")), deps);
  assert.equal(response.result.organizerId, "ExistingOrganizer0001");
  assert.equal(response.result.organizerName, "Existing Club");
  assert.equal(response.result.created, false);
  assert.equal(response.result.expiresAt, null);
  assert.equal(db.read(`tryItWorkspaces/${UID}`)?.keptReason, "existing_organizer");
});

test("an untouched workspace expires after 30 days; the next one gets a new organizer", async () => {
  const {db, deps, setNow} = harness();
  const first = await ensureTryItWorkspaceHandler(call(envelope("apply")), deps);
  const organizerId = first.result.organizerId;
  const page = db.read(`organizers/${organizerId}`)!.publicPage as {canonicalPath: string};
  setNow(LATER);
  assert.deepEqual(await expireDueTryItWorkspaces(deps), {expired: 1});
  assert.equal(db.read(`organizers/${organizerId}`), undefined);
  assert.equal(db.read(`organizerTeamMemberships/${organizerRelationshipId(organizerId, UID)}`), undefined);
  const routes = db.entries().filter(([key, value]) => key.startsWith("publicRouteReservations/") &&
    value.targetPath === `organizers/${organizerId}`);
  assert.ok(routes.length === 1 && routes[0][1].status === "released", page.canonicalPath);
  const pointer = db.read(`tryItWorkspaces/${UID}`)!;
  valid(validate.pointer, pointer, "expired pointer");
  assert.equal(pointer.state, "expired");
  assert.deepEqual(await expireDueTryItWorkspaces(deps), {});

  const again = await ensureTryItWorkspaceHandler(call(envelope("apply", {idempotencyKey: "try-it-request-0005"})), deps);
  assert.equal(again.result.created, true);
  assert.equal(again.result.organizerId, tryItWorkspaceOrganizerId(UID, 2));
  assert.notEqual(again.result.organizerId, organizerId);
});

test("a workspace with an event of its own is kept, not removed", async () => {
  const {db, deps, setNow} = harness();
  const first = await ensureTryItWorkspaceHandler(call(envelope("apply")), deps);
  db.write("events/event-1", {organizerId: first.result.organizerId});
  setNow(LATER);
  assert.deepEqual(await expireDueTryItWorkspaces(deps), {has_events: 1});
  assert.ok(db.read(`organizers/${first.result.organizerId}`));
  assert.equal(db.read(`tryItWorkspaces/${UID}`)?.expiresAt, null);
});

test("reasons to keep a due workspace", () => {
  const base = {ownerUserId: UID, publicPage: {publishStatus: "draft"}, hostUserIds: [UID]};
  assert.equal(reasonToKeep(base, UID, false), null);
  assert.equal(reasonToKeep({...base, ownerUserId: "other"}, UID, false), "not_owner");
  assert.equal(reasonToKeep({...base, publicPage: {publishStatus: "published"}}, UID, false), "published");
  assert.equal(reasonToKeep({...base, hostUserIds: [UID, "cohost"]}, UID, false), "team_member");
  assert.equal(reasonToKeep(base, UID, true), "has_events");
});

test("workspace organizer ids are auto-id shaped and differ by account and generation", () => {
  const id = tryItWorkspaceOrganizerId(UID, 1);
  assert.match(id, /^[A-Za-z0-9]{20}$/u);
  assert.equal(id, tryItWorkspaceOrganizerId(UID, 1));
  assert.notEqual(id, tryItWorkspaceOrganizerId(UID, 2));
  assert.notEqual(id, tryItWorkspaceOrganizerId("visitor-2", 1));
});
