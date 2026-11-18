import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {baseSeed} from "../shared/testing/programFixtures";
import type {OrganizerProgramDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  programResourceView,
  programResourceViewId,
  programWorkSummary,
  reconcileProgramResourceView,
  reconcileProgramWorkSummary,
} from "./programWorkViews";

const at = (millis: number) => Timestamp.fromMillis(millis);

test("the summary is the callable's programme header and nothing more", () => {
  const program = {organizerId: "org-1", kind: "wedding",
    title: "Sharma Rao", timezone: "Asia/Kolkata", status: "active",
    capabilities: ["arrivalsTransport"], createdBy: "owner-1",
    whatsappSenderConnectionId: "conn", createRequestHash: "h",
    entitlement: {sku: "x"}, branding: {color: "#fff"},
    transportSettings: {vehicleClasses: [{id: "sedan", label: "Sedan",
      passengerCapacity: 3, luggageCapacity: 2, capabilities: [],
      sortOrder: 1}], bandWindowMillis: 1}} as unknown as
    OrganizerProgramDocument;
  assert.deepEqual(programWorkSummary("p1", program), {programId: "p1",
    organizerId: "org-1", title: "Sharma Rao", kind: "wedding",
    timezone: "Asia/Kolkata", status: "active",
    capabilities: ["arrivalsTransport"], vehicleClasses: [{id: "sedan",
      label: "Sedan", passengerCapacity: 3, luggageCapacity: 2,
      capabilities: [], sortOrder: 1}], version: 1});
  assert.equal(programWorkSummary("p1", undefined), null);
});

test("resource views copy labels only, never contacts or notes", () => {
  const hotel = programResourceView("hotel", "h1", {programId: "p1",
    organizerId: "o1", name: "The Grand", address: "1 Road",
    receptionContact: "+919900000000", notes: "side door", active: true});
  assert.deepEqual(hotel, {programId: "p1", organizerId: "o1", kind: "hotel",
    resourceId: "h1", active: true, label: "The Grand", pickupKind: null,
    iataCode: null, terminal: null, venueName: null, startsAtMillis: null,
    endsAtMillis: null, checkInEnabled: null, status: null,
    expectedCount: null, checkedInCount: null, version: 1});
  assert.equal(JSON.stringify(hotel).includes("9900000000"), false);

  const pickup = programResourceView("pickupPoint", "pp1", {programId: "p1",
    organizerId: "o1", kind: "airport", label: "DEL T3", iataCode: "DEL",
    terminal: "T3", latitude: 1, longitude: 2, instructions: "gate 4",
    active: false});
  assert.equal(pickup!.pickupKind, "airport");
  assert.equal(pickup!.active, false);
  assert.equal(JSON.stringify(pickup).includes("gate 4"), false);

  const fn = programResourceView("function", "f1", {programId: "p1",
    organizerId: "o1", name: "Sangeet", venueName: "Lawn",
    venueNotes: "ring Ravi", instructions: "shoes off", dressCode: "gold",
    startsAt: at(1000), endsAt: at(5000), status: "scheduled"});
  assert.equal(fn!.active, true);
  assert.equal(fn!.checkInEnabled, true);
  assert.equal(fn!.expectedCount, 0);
  assert.equal(fn!.startsAtMillis, 1000);
  assert.equal(JSON.stringify(fn).includes("ring Ravi"), false);
  assert.equal(JSON.stringify(fn).includes("shoes off"), false);
  assert.equal(programResourceView("hotel", "h1", undefined), null);
});

test("reconcile writes on change only and deletes with the source",
  async () => {
    const store = new FakeFirestore(baseSeed());
    const db = store as unknown as FirebaseFirestore.Firestore;
    await reconcileProgramWorkSummary(db, "program-1");
    assert.equal((store.getDoc("programWorkSummaries/program-1") as
      {title: string}).title, "Sharma–Rao Wedding");
    await reconcileProgramResourceView(db, "pickupPoint", "pp-t3",
      "program-1");
    const viewPath = "programResourceViews/" +
      programResourceViewId("program-1", "pickupPoint", "pp-t3");
    assert.equal((store.getDoc(viewPath) as {label: string}).label,
      "DEL T3 arrivals");

    let writes = 0;
    const setDoc = store.setDoc.bind(store);
    store.setDoc = (...args: Parameters<typeof setDoc>) => {
      writes++;
      return setDoc(...args);
    };
    await reconcileProgramWorkSummary(db, "program-1");
    await reconcileProgramResourceView(db, "pickupPoint", "pp-t3",
      "program-1");
    assert.equal(writes, 0, "a no-op writes nothing");

    store.updateDoc("programPickupPoints/pp-t3", {label: "DEL T3 east"});
    await reconcileProgramResourceView(db, "pickupPoint", "pp-t3",
      "program-1");
    assert.equal((store.getDoc(viewPath) as {label: string}).label,
      "DEL T3 east");

    store.deleteDoc("programPickupPoints/pp-t3");
    await reconcileProgramResourceView(db, "pickupPoint", "pp-t3",
      "program-1");
    assert.equal(store.getDoc(viewPath), undefined);
  });
