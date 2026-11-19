/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../operations/testFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {TRY_IT_WORKSPACES, type StoredTryItWorkspace} from "./workspace";
import {ORGANIZER_SCOPED, deleteTryItDrafts, isTryItDraft, isTryItFormDraft} from "./workspaceDisposal";
import {expireDueTryItWorkspaces} from "./workspaceExpiry";

// Every name and number below is fictional.

const UID = "visitor-1";
const ORGANIZER = "AbCdEfGhIjKlMnOpQrSt";
const DUE = "2026-12-19T08:00:00.000Z";
const SERVER_TIME = {_seconds: 1795075200, _nanoseconds: 0};
const validatePointer = contractValidator("TryItWorkspaceDocument");

function harness() {
  const db = new FakeFirestore();
  const deps = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    now: () => new Date(DUE),
    serverTimestamp: () => SERVER_TIME as unknown as FirebaseFirestore.FieldValue,
  };
  db.write(`organizers/${ORGANIZER}`, {ownerUserId: UID, hostUserIds: [UID],
    publicPage: {publishStatus: "draft"}});
  return {db, deps};
}

function seedPointer(db: FakeFirestore, tryItEventIds: string[], tryItFormIds?: string[]) {
  const pointer: StoredTryItWorkspace = {schemaVersion: 1, uid: UID, organizerId: ORGANIZER, generation: 1,
    state: "active", createdVia: {commandId: "workspace.ensure", surface: "website"},
    createdAt: "2026-11-18T08:00:00.000Z", lastCommandAt: "2026-11-18T08:00:00.000Z",
    expiresAt: "2026-12-18T08:00:00.000Z", keptAt: null, keptReason: null, expiredAt: null, tryItEventIds,
    ...(tryItFormIds ? {tryItFormIds} : {})};
  db.write(`${TRY_IT_WORKSPACES}/${UID}`, pointer as never);
}

const draft = {organizerId: ORGANIZER, publicationState: "private", status: "active"};

/** A try-it draft with [guests] imported guests and what an import leaves. */
function seedDraft(db: FakeFirestore, eventId: string, guests: number) {
  db.write(`events/${eventId}`, draft);
  db.write(`eventSetupPreferences/${eventId}`, {organizerId: ORGANIZER});
  for (let index = 0; index < guests; index += 1) {
    db.write(`eventAttendees/att_${eventId}_${index}`, {eventId, organizerId: ORGANIZER, displayName: `Guest ${index}`});
  }
  db.write(`eventAttendeeImports/imp_${eventId}`, {eventId, organizerId: ORGANIZER});
  db.write(`hostRosterIntakeSessions/hri_${eventId}`, {draft: {eventId, organizerId: ORGANIZER}});
  db.write(`hostRosterIntakeSessions/hri_${eventId}/receipts/apply`, {importId: `imp_${eventId}`});
}

/** What the audience projection leaves for the organizer. */
function seedContacts(db: FakeFirestore, count: number) {
  for (let index = 0; index < count; index += 1) {
    db.write(`organizerContacts/oc_${index}`, {organizerId: ORGANIZER});
    db.write(`organizerContactTraits/oc_${index}`, {organizerId: ORGANIZER});
    db.write(`organizerContactOrigins/oco_${index}`, {organizerId: ORGANIZER});
  }
  db.write(`organizerAudienceSummaries/${ORGANIZER}`, {organizerId: ORGANIZER});
  db.write("organizerContacts/oc_other", {organizerId: "OtherOrganizerId0001"});
}

const left = (db: FakeFirestore, prefix: string) => db.entries().filter(([key]) => key.startsWith(prefix)).length;

test("a workspace whose only events are try-it drafts goes with its guests, then its contacts", async () => {
  const {db, deps} = harness();
  seedPointer(db, ["draft-1", "placeholder-1"]);
  seedDraft(db, "draft-1", 3);
  seedDraft(db, "placeholder-1", 2);
  seedContacts(db, 4);

  // Run 1: drafts and guests go; contacts wait while the projection settles.
  assert.deepEqual(await expireDueTryItWorkspaces(deps), {disposing: 1});
  for (const prefix of ["events/", "eventAttendees/", "eventAttendeeImports/", "hostRosterIntakeSessions/", "eventSetupPreferences/"]) {
    assert.equal(left(db, prefix), 0, prefix);
  }
  assert.equal(left(db, "organizerContacts/"), 5);
  assert.ok(db.read(`organizers/${ORGANIZER}`));

  // Run 2: contacts go, then the organizer, as an untouched workspace does.
  assert.deepEqual(await expireDueTryItWorkspaces(deps), {expired: 1});
  for (const collection of ORGANIZER_SCOPED) {
    const mine = db.entries().filter(([key, value]) => key.startsWith(`${collection}/`) && value.organizerId === ORGANIZER);
    assert.equal(mine.length, 0, collection);
  }
  assert.ok(db.read("organizerContacts/oc_other"), "another organizer's contact stays");
  assert.equal(db.read(`organizers/${ORGANIZER}`), undefined);
  const pointer = db.read(`${TRY_IT_WORKSPACES}/${UID}`);
  assert.equal(validatePointer(pointer), true, schemaErrorMessages(validatePointer as never).join("; "));
  assert.equal(pointer?.state, "expired");
});

test("drafts with no guests go in the same run as the organizer", async () => {
  const {db, deps} = harness();
  seedPointer(db, ["placeholder-1"]);
  db.write("events/placeholder-1", draft);
  assert.deepEqual(await expireDueTryItWorkspaces(deps), {expired: 1});
  assert.equal(db.read("events/placeholder-1"), undefined);
});

test("an event the host made, or a try-it draft they published, keeps the workspace and every guest", async () => {
  for (const extra of [
    {id: "host-event", data: draft, recorded: false},
    {id: "draft-1", data: {...draft, publicationState: "published"}, recorded: true},
  ]) {
    const {db, deps} = harness();
    seedPointer(db, extra.recorded ? [extra.id] : ["placeholder-1"]);
    seedDraft(db, "placeholder-1", 2);
    db.write(`events/${extra.id}`, extra.data);
    assert.deepEqual(await expireDueTryItWorkspaces(deps), {has_events: 1}, extra.id);
    assert.equal(left(db, "eventAttendees/"), 2, extra.id);
    assert.equal(db.read(`${TRY_IT_WORKSPACES}/${UID}`)?.state, "kept");
  }
});

test("a published workspace keeps its drafts", async () => {
  const {db, deps} = harness();
  seedPointer(db, ["placeholder-1"]);
  seedDraft(db, "placeholder-1", 1);
  db.write(`organizers/${ORGANIZER}`, {ownerUserId: UID, hostUserIds: [UID], publicPage: {publishStatus: "published"}});
  assert.deepEqual(await expireDueTryItWorkspaces(deps), {published: 1});
  assert.equal(left(db, "eventAttendees/"), 1);
});

test("deletion stops at its budget and carries on in a later run", async () => {
  const {db} = harness();
  seedDraft(db, "draft-1", 30);
  const first = await deleteTryItDrafts(db as unknown as FirebaseFirestore.Firestore, ["draft-1"], 10);
  assert.deepEqual(first, {deleted: 10, guestsDeleted: true, incomplete: true});
  assert.equal(left(db, "eventAttendees/"), 20);
  assert.ok(db.read("events/draft-1"), "the draft stays until its guests are gone");
  const rest = await deleteTryItDrafts(db as unknown as FirebaseFirestore.Firestore, ["draft-1"]);
  assert.equal(rest.incomplete, false);
  assert.equal(left(db, "eventAttendees/"), 0);
  assert.equal(db.read("events/draft-1"), undefined);
});

test("only private, active drafts without a seat ledger are disposable", () => {
  assert.equal(isTryItDraft(draft), true);
  assert.equal(isTryItDraft({...draft, publicationState: "published"}), false);
  assert.equal(isTryItDraft({...draft, status: "cancelled"}), false);
  assert.equal(isTryItDraft({...draft, seatMode: "ready"}), false);
});

// Try-it draft forms (tryItFormIds, from form.import-from-link).

function seedForm(db: FakeFirestore, formId: string, status = "draft", organizerId = ORGANIZER) {
  db.write(`organizerForms/${formId}`, {organizerId, status, title: "Run club sign-up"});
  db.write(`organizerFormDrafts/${formId}`, {organizerId, formId, revision: 1});
}

test("try-it draft forms go with the workspace", async () => {
  const {db, deps} = harness();
  seedPointer(db, [], ["form-1"]);
  seedForm(db, "form-1");
  assert.deepEqual(await expireDueTryItWorkspaces(deps), {expired: 1});
  assert.equal(db.read("organizerForms/form-1"), undefined);
  assert.equal(db.read("organizerFormDrafts/form-1"), undefined);
  assert.equal(db.read(`organizers/${ORGANIZER}`), undefined);
});

test("a published try-it form, or a form the host made, keeps the workspace as has_forms", async () => {
  for (const extra of [
    {recorded: ["form-1"], seed: (db: FakeFirestore) => seedForm(db, "form-1", "published")},
    {recorded: [], seed: (db: FakeFirestore) => seedForm(db, "host-form")},
  ]) {
    const {db, deps} = harness();
    seedPointer(db, ["placeholder-1"], extra.recorded);
    seedDraft(db, "placeholder-1", 1);
    extra.seed(db);
    assert.deepEqual(await expireDueTryItWorkspaces(deps), {has_forms: 1});
    const pointer = db.read(`${TRY_IT_WORKSPACES}/${UID}`);
    assert.equal(validatePointer(pointer), true, schemaErrorMessages(validatePointer as never).join("; "));
    assert.equal(pointer?.keptReason, "has_forms");
    assert.equal(left(db, "eventAttendees/"), 1, "guests stay");
    assert.equal(left(db, "organizerForms/"), 1, "the form stays");
  }
});

test("only unpublished forms of the workspace's own organizer are disposable", () => {
  assert.equal(isTryItFormDraft({status: "draft", organizerId: ORGANIZER}, ORGANIZER), true);
  assert.equal(isTryItFormDraft({status: "published", organizerId: ORGANIZER}, ORGANIZER), false);
  assert.equal(isTryItFormDraft({status: "draft", organizerId: "OtherOrganizerId0001"}, ORGANIZER), false);
});
