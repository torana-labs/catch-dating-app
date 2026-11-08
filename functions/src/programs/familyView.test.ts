import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {baseSeed, deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {getProgramFamilyViewHandler} from "./familyView";
import {issueProgramWebLinkHandler, mintWebLinkToken} from
  "./programWebLinks";

const SECRET = "test-secret";
const linkDeps = (db: FakeFirestore) =>
  deps(db, {secret: () => SECRET}) as never;
const code = (expected: string) => (err: unknown) =>
  (err as {code?: string}).code === expected;

const fn = (name: string, startsAtMillis: number,
  patch: Record<string, unknown> = {}): FakeData => ({
  programId: "program-1", organizerId: "org-1", name,
  status: "scheduled", invitationMode: "allGuests", checkInEnabled: true,
  startsAt: admin.firestore.Timestamp.fromMillis(startsAtMillis),
  endsAt: admin.firestore.Timestamp.fromMillis(startsAtMillis + 3_600_000),
  venueName: "Durbar hall", venueNotes: null, dressCode: null,
  instructions: null, expectedCount: 0, checkedInCount: 0,
  createdAt: now, updatedAt: now, revision: 1, ...patch,
});

const household = (label: string, memberGuestIds: string[]): FakeData => ({
  programId: "program-1", organizerId: "org-1", label,
  primaryContactName: "Meher Kapoor", primaryPhoneE164: "+919900000000",
  primaryEmail: null, memberGuestIds, deliveryPreference: "whatsapp",
  createdAt: now, updatedAt: now, revision: 1,
});

const seed = (): Record<string, FakeData> => {
  const base = baseSeed();
  return {
    ...base,
    "organizerPrograms/program-1": {
      ...base["organizerPrograms/program-1"],
      branding: {color: "marigold", coverImagePath: null,
        creditLine: "Planned by Meher"},
    },
    "programGuests/guest-1": {...base["programGuests/guest-1"],
      householdId: "hh-1", invitationStatus: "responded"},
    "programGuests/guest-2": {...base["programGuests/guest-2"],
      householdId: "hh-2", invitationStatus: "delivered"},
    "programHouseholds/hh-1": household("Mehra family", ["guest-1"]),
    "programHouseholds/hh-2": household("Kapoor family", ["guest-2"]),
    "programFunctions/wedding": fn("Wedding", 1_800_200_000_000),
    "programFunctions/sangeet": fn("Sangeet", 1_800_100_000_000),
    "programFunctions/haldi": fn("Haldi", 1_800_150_000_000,
      {status: "cancelled"}),
    "programFunctionGuests/sangeet_guest-1": {
      programId: "program-1", organizerId: "org-1", functionId: "sangeet",
      guestId: "guest-1", invited: true, rsvpStatus: "attending",
      attendanceStatus: "expected", partySize: 3, respondedAt: now,
      responseNote: "Jain food please", responseSource: "householdLink",
      recordedByUid: null, createdAt: now, updatedAt: now, revision: 1,
    },
  };
};

test("a manager mints the family link; the view is counts and function names",
  async () => {
    const db = new FakeFirestore(seed());
    const link = await issueProgramWebLinkHandler(request({
      programId: "program-1", kind: "family", subjectId: "program-1",
    }, "manager-1"), linkDeps(db));
    assert.equal(link.kind, "family");
    // The programme ends at 1_800_300_000_000; the link lasts a day past it.
    assert.equal(link.expiresAtMillis, 1_800_300_000_000 + 86_400_000);

    const view = await getProgramFamilyViewHandler(
      request({token: link.token}, "anyone"), linkDeps(db));
    assert.equal(view.programTitle, "Sharma–Rao Wedding");
    assert.equal(view.householdCount, 2);
    assert.equal(view.householdsRepliedCount, 1);
    assert.deepEqual(view.functions.map((row) => row.name),
      ["Sangeet", "Wedding"]);
    const sangeet = view.functions[0];
    assert.equal(sangeet.rsvpAttending, 1);
    assert.equal(sangeet.expectedHeads, 3);
    assert.equal(sangeet.rsvpPending, view.guestCount - 1);
    assert.deepEqual(view.branding, {color: "marigold",
      coverImagePath: null, creditLine: "Planned by Meher"});
    // No names, phones or notes cross.
    const json = JSON.stringify(view);
    for (const secret of ["Mehra", "Kapoor", "Rohan", "+91", "Jain"]) {
      assert.equal(json.includes(secret), false, secret);
    }
  });

test("the family link is the manager's, for the programme itself",
  async () => {
    const db = new FakeFirestore(seed());
    await assert.rejects(issueProgramWebLinkHandler(request({
      programId: "program-1", kind: "family", subjectId: "program-1",
    }, "dispatcher-1"), linkDeps(db)), code("permission-denied"));
    await assert.rejects(issueProgramWebLinkHandler(request({
      programId: "program-1", kind: "family", subjectId: "other",
    }, "manager-1"), linkDeps(db)), code("invalid-argument"));
  });

test("the family view refuses other link kinds and archived programmes",
  async () => {
    const db = new FakeFirestore(seed());
    const driver = mintWebLinkToken({kind: "driverTrip",
      programId: "program-1", subjectId: "program-1",
      expiresAtMillis: now.toMillis() + 1000}, SECRET);
    await assert.rejects(getProgramFamilyViewHandler(
      request({token: driver}, "anyone"), linkDeps(db)),
    code("permission-denied"));
    const family = mintWebLinkToken({kind: "family",
      programId: "program-1", subjectId: "program-1",
      expiresAtMillis: now.toMillis() + 1000}, SECRET);
    await db.doc("organizerPrograms/program-1").update({status: "archived"});
    await assert.rejects(getProgramFamilyViewHandler(
      request({token: family}, "anyone"), linkDeps(db)),
    code("not-found"));
  });

test("a programme without branding reads without it", async () => {
  const data = seed();
  delete (data["organizerPrograms/program-1"] as Record<string, unknown>)
    .branding;
  const db = new FakeFirestore(data);
  const family = mintWebLinkToken({kind: "family", programId: "program-1",
    subjectId: "program-1", expiresAtMillis: now.toMillis() + 1000}, SECRET);
  const view = await getProgramFamilyViewHandler(
    request({token: family}, "anyone"), linkDeps(db));
  assert.equal("branding" in view, false);
});
