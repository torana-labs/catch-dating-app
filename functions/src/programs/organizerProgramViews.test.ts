import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {baseSeed} from "../shared/testing/programFixtures";
import {contractValidator} from "../shared/contractTestValidators";
import {reconcileOrganizerProgramView} from "./organizerProgramViews";

const validate = contractValidator("OrganizerProgramViewDocument");
const at = (millis: number) => Timestamp.fromMillis(millis);

const fn = (overrides: Record<string, unknown> = {}) => ({
  programId: "program-1", organizerId: "org-1", name: "Sangeet",
  startsAt: at(1_800_100_000_000), endsAt: at(1_800_110_000_000),
  venueName: "The Lawns", status: "scheduled", checkInEnabled: true,
  venueNotes: "gate code 4411", dressCode: "Pastels", instructions: null,
  expectedCount: 120, checkedInCount: 3, revision: 4, ...overrides});

test("the setup view is the callable's programme with no secrets", async () => {
  const store = new FakeFirestore({...baseSeed(),
    "organizerPrograms/program-1": {...baseSeed()["organizerPrograms/program-1"]!,
      whatsappSenderConnectionId: "conn-secret",
      branding: {color: "rani", coverImagePath: null, creditLine: "Planned by A"}},
    "programFunctions/sangeet": fn(),
    "programFunctions/other": fn({programId: "program-2", name: "Not ours"})});
  const db = store as unknown as FirebaseFirestore.Firestore;
  await reconcileOrganizerProgramView(db, "program-1");
  const view = store.getDoc("organizerProgramViews/program-1")!;
  assert.equal(validate(view), true, JSON.stringify(validate.errors));
  assert.equal(view.createdBy, "manager-1");
  assert.equal(view.functionCount, 1);
  const functions = view.functions as Record<string, unknown>[];
  assert.equal(functions[0].functionId, "sangeet");
  assert.equal(functions[0].invitationMode, "allGuests");
  assert.equal(functions[0].dressCode, "Pastels");
  assert.equal("expectedCount" in functions[0], false);
  assert.equal("checkedInCount" in functions[0], false);
  assert.equal((view.pickupPoints as unknown[]).length, 2);
  assert.equal((view.hotels as unknown[]).length >= 1, true);
  assert.deepEqual(view.branding, {color: "rani", coverImagePath: null,
    creditLine: "Planned by A"});
  const text = JSON.stringify(view);
  for (const secret of ["conn-secret", "gate code 4411", "Not ours",
    "latitude"]) {
    assert.equal(text.includes(secret), false, secret);
  }
});

test("reconcile writes on change only and follows the sources", async () => {
  const store = new FakeFirestore({...baseSeed(),
    "programFunctions/sangeet": fn()});
  const db = store as unknown as FirebaseFirestore.Firestore;
  await reconcileOrganizerProgramView(db, "program-1");
  let writes = 0;
  const setDoc = store.setDoc.bind(store);
  store.setDoc = (...args: Parameters<typeof setDoc>) => {
    writes++;
    return setDoc(...args);
  };
  await reconcileOrganizerProgramView(db, "program-1");
  assert.equal(writes, 0, "a no-op writes nothing");

  store.updateDoc("programFunctions/sangeet", {name: "Sangeet night",
    revision: 5});
  await reconcileOrganizerProgramView(db, "program-1");
  assert.equal((store.getDoc("organizerProgramViews/program-1")!
    .functions as {name: string}[])[0].name, "Sangeet night");

  store.updateDoc("organizerPrograms/program-1", {status: "archived",
    archivedAt: at(5_000), anonymizeAt: at(9_000), revision: 4});
  await reconcileOrganizerProgramView(db, "program-1");
  const archived = store.getDoc("organizerProgramViews/program-1")!;
  assert.equal(archived.status, "archived");
  assert.equal(archived.archivedAtMillis, 5_000);
  assert.equal(archived.anonymizedAtMillis, null);
  assert.equal(validate(archived), true, JSON.stringify(validate.errors));

  // The anonymiser clears a hotel's reception contact; the view follows.
  store.updateDoc("programHotels/hotel-1", {receptionContact: null,
    revision: 9});
  await reconcileOrganizerProgramView(db, "program-1");
  assert.equal((store.getDoc("organizerProgramViews/program-1")!
    .hotels as {receptionContact: unknown}[])[0].receptionContact, null);

  store.deleteDoc("organizerPrograms/program-1");
  await reconcileOrganizerProgramView(db, "program-1");
  assert.equal(store.getDoc("organizerProgramViews/program-1"), undefined);
});
