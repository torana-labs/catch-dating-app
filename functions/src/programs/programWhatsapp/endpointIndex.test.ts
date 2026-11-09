import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../../shared/testing/programFirestore";
import {contractValidator} from "../../shared/contractTestValidators";
import {hashEndpoint} from "../../organizers/organizerCampaignModel";
import {
  applyEndpointClaimChange,
  guestEndpointClaim,
  householdEndpointClaim,
  mergeClaimants,
} from "./endpointIndex";

const validate = contractValidator("ProgramWhatsappEndpointIndexDocument");
const db = () => new FakeFirestore({});
const asDb = (fake: FakeFirestore) =>
  fake as unknown as FirebaseFirestore.Firestore;
const phone = "+919876501234";
const hash = hashEndpoint(phone);
const household = (id: string, primaryPhoneE164: string | null) =>
  householdEndpointClaim(id, {programId: "program-1", organizerId: "org-1",
    primaryPhoneE164});

test("a household's primary phone indexes to that household", async () => {
  const fake = db();
  await applyEndpointClaimChange(asDb(fake),
    {before: null, after: household("household-1", phone)}, 1000);
  const doc = fake.getDoc(`programWhatsappEndpointIndex/program-1_${hash}`)!;
  assert.equal(validate(doc), true, JSON.stringify(validate.errors));
  assert.equal(doc.householdId, "household-1");
  assert.equal(doc.guestId, null);
  assert.equal(doc.ambiguous, false);
});

test("a guest's own phone reaches their household; no household, no claim",
  async () => {
    assert.equal(guestEndpointClaim("guest-1", {programId: "program-1",
      organizerId: "org-1", householdId: null, phoneE164: phone}), null);
    const fake = db();
    await applyEndpointClaimChange(asDb(fake), {before: null,
      after: guestEndpointClaim("guest-1", {programId: "program-1",
        organizerId: "org-1", householdId: "household-1",
        phoneE164: phone})}, 1000);
    const doc = fake.getDoc(`programWhatsappEndpointIndex/program-1_${hash}`)!;
    assert.equal(doc.guestId, "guest-1");
    assert.equal(doc.source, "guest");
  });

test("two households on one number are ambiguous; a change keeps the other",
  async () => {
    const fake = db();
    await applyEndpointClaimChange(asDb(fake),
      {before: null, after: household("household-1", phone)}, 1000);
    await applyEndpointClaimChange(asDb(fake),
      {before: null, after: household("household-2", phone)}, 2000);
    const path = `programWhatsappEndpointIndex/program-1_${hash}`;
    assert.equal(fake.getDoc(path)!.ambiguous, true);
    // household-1 changes number: the index keeps household-2 alone.
    await applyEndpointClaimChange(asDb(fake), {
      before: household("household-1", phone),
      after: household("household-1", "+919876509999")}, 3000);
    const doc = fake.getDoc(path)!;
    assert.equal(doc.ambiguous, false);
    assert.equal(doc.householdId, "household-2");
    assert.equal(doc.revision, 3);
    // household-2 clears its phone: the derived entry goes.
    await applyEndpointClaimChange(asDb(fake), {
      before: household("household-2", phone), after: null}, 4000);
    assert.equal(fake.getDoc(path), undefined);
  });

test("households sort before guests and replays replace the same claimant",
  () => {
    const merged = mergeClaimants(mergeClaimants([],
      {kind: "guest", id: "g", householdId: "h1"}, "claim"),
    {kind: "household", id: "h1", householdId: "h1"}, "claim");
    assert.deepEqual(merged.map((entry) => entry.kind),
      ["household", "guest"]);
    assert.equal(mergeClaimants(merged,
      {kind: "guest", id: "g", householdId: "h1"}, "claim").length, 2);
  });

test("an anonymised household claims nothing", () => {
  assert.equal(householdEndpointClaim("h", {programId: "p",
    organizerId: "o", primaryPhoneE164: phone, anonymizedAt: 1}), null);
});
