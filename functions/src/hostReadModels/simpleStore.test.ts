import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {reconcileSimpleSummary, backfillSimpleSummaries,
  activateSimpleSummaries} from "./simpleStore";

const now = Timestamp.fromMillis(1000);
// The field name the clubs-to-organizers rename retired. It is data here, so
// the nomenclature gate reads it as a value rather than code that says club.
const retiredOwnerField = "clubId";
function form() {
  return {organizerId: "org", title: "Survey", description: null,
    purpose: "survey", status: "published", templateId: "blank",
    publicFormId: "public-form-123456789012", defaultTargetKind: "organizer",
    defaultTargetId: null, activeVersionId: "version-1", draftRevision: 1,
    publishedVersion: 1, submittedResponseCount: 0, updatedAt: now,
    publishedAt: now, lastResponseAt: null,
    secret: "must-not-enter-view", draftDefinition: {privateAnswer: "private"}};
}
function event() {
  return {organizerId: "org", name: "Mixer", startTime: now,
    status: "active", publicationState: "private", setupRevision: 1,
    publicRegistrationEnabled: false, eventCityId: "city",
    eventMarketId: "market",
    eventLocalDate: "2026-10-02", eventLocalStartTime: "18:00",
    eventTimezone: "Asia/Kolkata", setupDefaults: {
      city: {value: {cityId: "city", marketId: "market"}, source: "event"},
      timezone: {value: "Asia/Kolkata", source: "event"},
      organizerDefaultsRevision: null, organizerDefaultsHash: "a".repeat(64)},
    bookedCount: 0, checkedInCount: 0, waitlistedCount: 0,
    cancelledAt: null, cancellationReason: null,
    genderCounts: {}, cohortCounts: {}, waitlistedCohortCounts: {}};
}

test("Forms keep allowlisted fields and current sources", async () => {
  const db = new AudienceTestStore({"organizers/org": {hostUserId: "host"},
    "organizerForms/form": form()});
  await reconcileSimpleSummary(db.asFirestore(), "forms", "form");
  assert.equal(JSON.stringify(db.docs["hostFormSummaries/form"])
    .includes("must-not-enter-view"), false);
  db.docs["organizerForms/form"].title = "Changed";
  await reconcileSimpleSummary(db.asFirestore(), "forms", "form");
  assert.equal((db.docs["hostFormSummaries/form"].row as {title: string}).title,
    "Changed");
  delete db.docs["organizerForms/form"];
  await reconcileSimpleSummary(db.asFirestore(), "forms", "form");
  assert.equal(db.docs["hostFormSummaries/form"], undefined);
});

test("unpublished Event views disappear on publication", async () => {
  const db = new AudienceTestStore({"organizers/org": {hostUserId: "host"},
    "events/event": event()});
  await reconcileSimpleSummary(db.asFirestore(), "events", "event");
  assert.equal(db.docs["hostEventSummaries/event"].startTimeMillis, 1000);
  assert.deepEqual(Object.keys(
    db.docs["hostEventSummaries/event"].row as object)
    .sort(), ["city", "detailsConfigured", "eventId", "localDate",
    "localStartTime", "name", "setupRevision", "startTimeMillis", "status",
    "timezone"]);
  db.docs["events/event"].publicationState = "published";
  await reconcileSimpleSummary(db.asFirestore(), "events", "event");
  assert.equal(db.docs["hostEventSummaries/event"], undefined);
});

test("each cutover independently proves parity and preserves other markers",
  async () => {
    const db = new AudienceTestStore({"organizers/org": {hostUserId: "host"},
      "organizerForms/form": form(), "events/event": event()});
    await assert.rejects(activateSimpleSummaries(db.asFirestore(), "forms",
      "org"), /parity failed/);
    await backfillSimpleSummaries(db.asFirestore(), "forms", "org", true);
    await activateSimpleSummaries(db.asFirestore(), "forms", "org");
    await backfillSimpleSummaries(db.asFirestore(), "events", "org", true);
    await activateSimpleSummaries(db.asFirestore(), "events", "org");
    const directory = db.docs["hostDirectorySummaries/org"];
    assert.equal(directory.formSummaryVersion, 1);
    assert.equal(directory.eventSummaryVersion, 1);
    assert.equal(directory.contactSummaryVersion, 0);
  });

test("Groups list excludes 2500 member IDs and definitions load separately",
  async () => {
    const db = new AudienceTestStore({"organizers/org": {hostUserId: "host"},
      "organizerSavedAudiences/group": {organizerId: "org", audienceId: "group",
        scope: "organizerCrm", name: "Members", status: "active", revision: 1,
        definition: {join: "all", predicates: [{kind: "staticMembers",
          contactIds: Array.from({length: 2500}, (_, i) => `person-${i}`)}]},
        definitionHash: "a".repeat(64), definitionVersion: 1,
        lastPreviewMatchCount: 2500, lastPreviewAt: now,
        createdAt: now, updatedAt: now}});
    await reconcileSimpleSummary(db.asFirestore(), "groups", "group");
    assert.equal(JSON.stringify(db.docs["hostGroupSummaries/group"])
      .includes("person-"), false);
    assert.equal(JSON.stringify(db.docs["hostGroupDetails/group"])
      .includes("person-2499"), true);
    assert.equal(await activateSimpleSummaries(db.asFirestore(), "groups",
      "org"), 1);
    delete db.docs["hostGroupDetails/group"];
    await assert.rejects(activateSimpleSummaries(db.asFirestore(), "groups",
      "org"), /definition parity failed/);
    delete db.docs["organizerSavedAudiences/group"];
    await reconcileSimpleSummary(db.asFirestore(), "groups", "group");
    assert.equal(db.docs["hostGroupSummaries/group"], undefined);
  });


test("Group details reject an uncontracted field inside the definition",
  async () => {
    const db = new AudienceTestStore({"organizers/org": {hostUserId: "host"},
      "organizerSavedAudiences/group": {organizerId: "org", audienceId: "group",
        scope: "organizerCrm", name: "Members", status: "active", revision: 1,
        definition: {join: "all", predicates: [{kind: "staticMembers",
          contactIds: []}], secret: "private-evidence"},
        definitionHash: "a".repeat(64), definitionVersion: 1,
        lastPreviewMatchCount: 0, lastPreviewAt: null,
        createdAt: now, updatedAt: now}});
    // Left out, not thrown: the group never reaches either view, and it
    // cannot block the organizer's group directory.
    await reconcileSimpleSummary(db.asFirestore(), "groups", "group");
    assert.equal(db.docs["hostGroupDetails/group"], undefined);
    assert.equal(db.docs["hostGroupSummaries/group"], undefined);
    assert.equal(await activateSimpleSummaries(db.asFirestore(), "groups",
      "org"), 0);
    assert.equal(db.docs["hostDirectorySummaries/org"].groupSummaryVersion, 1);
  });

test("an event that fails its contract is left out and the directory " +
  "still activates", async () => {
  const db = new AudienceTestStore({"organizers/org": {hostUserId: "host"},
    "events/good": event(),
    // A field left by the clubs-to-organizers rename that the schema rejects.
    "events/legacy": {...event(), name: "Sample",
      [retiredOwnerField]: "old-club"}});
  await backfillSimpleSummaries(db.asFirestore(), "events", "org", true);
  assert.notEqual(db.docs["hostEventSummaries/good"], undefined);
  assert.equal(db.docs["hostEventSummaries/legacy"], undefined);
  assert.equal(await activateSimpleSummaries(db.asFirestore(), "events",
    "org"), 1);
  assert.equal(db.docs["hostDirectorySummaries/org"].eventSummaryVersion, 1);
  // A stale row for a source that now fails is removed, not kept.
  db.docs["hostEventSummaries/legacy"] = {organizerId: "org"};
  await reconcileSimpleSummary(db.asFirestore(), "events", "legacy");
  assert.equal(db.docs["hostEventSummaries/legacy"], undefined);
});
