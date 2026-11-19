/* eslint-disable max-len */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../../operations/testFirestore";
import {contractValidator} from "../../shared/contractTestValidators";
import {discoveryFormats, discoveryFormatsForText} from "../../cityPlans/discoveryFormats";
import {adminManageListingProgramHandler, defaultListingCohortId} from "./settings";
import {
  categoriesForFormats,
  excludedProgrammaticFormats,
  formatsForListingCategories,
  labelsForFormats,
  programmaticListingFormatOrder,
  programmaticListingFormats,
} from "./formats";

// lib/admin/listingProgram and src/admin/listingProgram both sit four levels below the repository root.
const contract = (file: string) => JSON.parse(readFileSync(path.join(__dirname, "../../../../contracts", file), "utf8"));
const approvalPayload = contract("callables/admin_approve_organizer_listing_payload.schema.json");
const common = contract("shared/listing_program_common.schema.json");

const validateSettings = contractValidator("ListingProgramSettingsDocument");
const validateResponse = contractValidator("AdminManageListingProgramCallableResponse");
const NOW = 1792828800000;

function harness() {
  const db = new FakeFirestore();
  const call = (data: Record<string, unknown>, token: Record<string, unknown> = {adminOwner: true}, uid = "owner-1") =>
    adminManageListingProgramHandler({auth: {uid, token}, data, rawRequest: {headers: {}}} as unknown as CallableRequest<unknown>,
      {firestore: () => db as unknown as FirebaseFirestore.Firestore, now: () => NOW});
  return {db, call};
}

test("the programmatic formats are every city-page format except nightlife, and each label counts as its format", () => {
  assert.deepEqual(common.definitions.format.enum, [...programmaticListingFormatOrder]);
  assert.deepEqual([...programmaticListingFormatOrder, ...excludedProgrammaticFormats].sort(), [...discoveryFormats].sort());
  assert.equal(approvalPayload.properties.formats.$ref, "../shared/listing_program_common.schema.json#/definitions/formats");
  for (const format of programmaticListingFormatOrder) {
    const counted = discoveryFormatsForText([programmaticListingFormats[format].label]);
    assert.ok(counted.includes(format), `${format} label counts toward ${format}`);
    assert.ok(!counted.includes("nightlife"), `${format} label never counts as nightlife`);
    assert.match(programmaticListingFormats[format].category, /^[a-z][a-z0-9_]{0,59}$/u);
  }
  // A nomination's categories carry its formats back to the reviewer.
  assert.deepEqual(formatsForListingCategories(categoriesForFormats(["quizNights", "runClubs"])), ["runClubs", "quizNights"]);
  assert.deepEqual(formatsForListingCategories(["social", "pickleball"]), ["pickleball"]);
  assert.deepEqual(formatsForListingCategories(["bar crawls", "singles mixers"]), [], "nightlife and singles name no programmatic format");
  assert.deepEqual(labelsForFormats(["books", "runClubs"]), ["Run clubs", "Book clubs"]);
});

test("the owner reads the switch, pauses with a reason against a revision, and resumes", async () => {
  const h = harness();
  const initial = await h.call({action: "read"});
  assert.equal(validateResponse(initial), true, JSON.stringify(validateResponse.errors));
  assert.deepEqual([initial.revision, initial.paused, initial.reason, initial.defaultCohortId, initial.formatReport],
    [0, false, null, defaultListingCohortId, null]);

  const paused = await h.call({action: "set_pause", paused: true, reason: "  Legal notice received today.  ", expectedRevision: 0});
  assert.deepEqual([paused.revision, paused.paused, paused.reason, paused.updatedByUid], [1, true, "Legal notice received today.", "owner-1"]);
  const stored = h.db.read("listingProgramSettings/platform");
  assert.equal(validateSettings(stored), true, JSON.stringify(validateSettings.errors));
  assert.equal(h.db.entries().filter(([key]) => key.startsWith("adminAuditLogs/")).length, 1);

  await assert.rejects(h.call({action: "set_pause", paused: false, reason: "Resuming after review.", expectedRevision: 0}), /changed/);
  const resumed = await h.call({action: "set_pause", paused: false, reason: "Resuming after review.", expectedRevision: 1});
  assert.deepEqual([resumed.revision, resumed.paused], [2, false]);
});

test("ops may pause but not resume; other roles and malformed calls are refused", async () => {
  const h = harness();
  const paused = await h.call({action: "set_pause", paused: true, reason: "Impersonation claim received.", expectedRevision: 0},
    {support: true}, "ops-1");
  assert.equal(paused.paused, true);
  await assert.rejects(h.call({action: "set_pause", paused: false, reason: "Resuming after review.", expectedRevision: 1},
    {support: true}, "ops-1"), /Only the owner/);
  for (const token of [{salesStaff: true}, {}]) await assert.rejects(h.call({action: "read"}, token), /permission|role|admin/i);
  await assert.rejects(h.call({action: "set_pause", paused: true, expectedRevision: 1}));
  await assert.rejects(h.call({action: "set_pause", paused: true, reason: "short", expectedRevision: 1}));
  await assert.rejects(h.call({action: "read", paused: true}));
});

test("the format report counts live organizers by city, with and without a format, and names none", async () => {
  const h = harness();
  const organizer = (citySlug: string, fields: Record<string, unknown>, publishStatus = "published") => ({
    name: "Lantern Trail Runners", organizerType: "community", publicCategoryLabel: null, tags: [],
    publicPage: {citySlug, publishStatus}, publicProfile: {formats: []}, ...fields});
  h.db.write("organizers/a", organizer("indore", {publicProfile: {formats: ["Run clubs"]}}));
  h.db.write("organizers/b", organizer("indore", {tags: ["social"]}));
  h.db.write("organizers/c", organizer("indore", {publicCategoryLabel: "Quiz nights"}));
  h.db.write("organizers/d", organizer("mumbai", {tags: ["pickleball"]}));
  h.db.write("organizers/e", organizer("mumbai", {tags: ["running"]}, "draft"));
  const result = await h.call({action: "format_report"});
  assert.equal(validateResponse(result), true, JSON.stringify(validateResponse.errors));
  assert.deepEqual(result.formatReport, {generatedAtMillis: NOW, live: 4, withFormat: 3, withoutFormat: 1, truncated: false,
    cities: [{citySlug: "indore", live: 3, withFormat: 2, withoutFormat: 1}, {citySlug: "mumbai", live: 1, withFormat: 1, withoutFormat: 0}]});
  assert.doesNotMatch(JSON.stringify(result), /Lantern/);
  assert.equal(h.db.read("listingProgramSettings/platform"), undefined, "a report writes nothing");
});
