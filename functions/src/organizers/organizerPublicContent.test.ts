import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {
  assertOrganizerPublicContent,
  operatorWordingIn,
  organizerPublicContentIssues,
} from "./organizerPublicContent";

type Data = Record<string, unknown>;

const repoRoot = path.resolve(__dirname, "../../..");

// A contract-valid organizer, so "clean" means clean under the contract too.
function baseOrganizer(): Data {
  const schema = JSON.parse(readFileSync(
    path.join(repoRoot, "contracts/firestore/organizers.schema.json"),
    "utf8"
  ));
  const organizer = JSON.parse(readFileSync(
    path.join(repoRoot, "contracts/fixtures/valid/organizer_doc.json"),
    "utf8"
  ));
  return {
    ...Object.fromEntries(Object.entries(organizer)
      .filter(([key]) => key in schema.properties)),
    followerCount: 0,
    organizerPhotos: [],
    organizerType: "club",
  };
}

// Shape of the stored MOON MOTH seed listing whose intake text leaked onto
// the public organizer page, including the retired operator-only lists.
function leakedListing(): Data {
  return {
    ...baseOrganizer(),
    name: "MOON MOTH",
    description: "MOON MOTH is an Indore run-and-rave organizer discovered " +
      "through a public Luma event page. This unclaimed profile summarizes " +
      "owner-safe public facts while claim, cadence, and contact details " +
      "remain unverified.",
    publicPage: {
      slug: "moonmoth",
      citySlug: "indore",
      canonicalPath: "/organizers/moonmoth/",
      publishStatus: "published",
      indexStatus: "noindex",
      robots: "noindex, follow",
      seoTitle: "MOON MOTH | Indore organizer profile | Catch",
      seoDescription: "Source-backed, unclaimed Catch profile for MOON MOTH.",
      lastRenderedAt: null,
    },
    publicProfile: {
      headline: "MOON MOTH run club in Indore",
      summary: "MOON MOTH is an Indore run-and-rave organizer discovered " +
        "through a public Luma event page. This unclaimed profile " +
        "summarizes verified public facts for owner review and stays out " +
        "of search until cadence, contact, and claim details are confirmed.",
      sourceSummary: "A public Luma event page confirms MOON MOTH hosted " +
        "MOONMOTH NIGHTFALL RUN & RAVE and the embedded event data lists " +
        "Instagram handle moonmoth.example.",
      formats: ["Social runs", "Run-and-rave"],
      facts: [
        {label: "Location", value: "Indore, Madhya Pradesh"},
        {label: "Claim state", value: "Unclaimed seed listing"},
        {label: "Indexing", value: "Noindex until verified"},
      ],
      fitNotes: ["Indore gives the first test outside the largest metros."],
      missingEvidence: ["Owner verification or claim"],
      eventEvidence: [],
    },
    publicSources: [
      {
        type: "user_supplied",
        label: "User seed input",
        detail: "User requested an initial listing for Moonmoth.",
        href: null,
        confidence: "medium",
        lastCheckedAt: null,
      },
      {
        type: "public_event_page",
        label: "Luma event page",
        detail: "Public Luma page for MOONMOTH NIGHTFALL RUN & RAVE.",
        href: "https://luma.com/mmoth26x",
        confidence: "high",
        lastCheckedAt: null,
      },
      {
        type: "embedded_event_data",
        label: "Luma event listing",
        detail: "Event timing and location for the same Luma page.",
        href: "https://luma.com/mmoth26x/",
        confidence: "high",
        lastCheckedAt: null,
      },
    ],
  };
}

function cleanListing(): Data {
  return {
    ...baseOrganizer(),
    name: "Courtside",
    description: "Racket sports and socials in Mumbai.",
    publicProfile: {
      headline: null,
      summary: "Courtside runs weekly racket sessions with a calorie " +
        "intake-friendly post-game brunch. This profile is built from " +
        "public sources and hasn’t been confirmed by the organiser yet.",
      sourceSummary: null,
      formats: ["Racket sports"],
      facts: [{label: "Location", value: "Mumbai"}],
      eventEvidence: [],
    },
    publicSources: [{
      type: "officialWebsite",
      label: "Official website",
      detail: "Public source page for Courtside.",
      href: "https://courtside.example/",
      confidence: "medium",
      lastCheckedAt: null,
    }],
  };
}

test("flags every operator leak found on the MOON MOTH page", () => {
  const issues = organizerPublicContentIssues(leakedListing());
  const byField = new Map(issues.map((issue) => [issue.field, issue.rule]));

  assert.deepEqual(Object.fromEntries(byField), {
    "description": "operator_wording",
    "publicPage.seoDescription": "operator_wording",
    "publicProfile.summary": "operator_wording",
    "publicProfile.sourceSummary": "operator_wording",
    "publicProfile.facts[1]": "authority_fact",
    "publicProfile.facts[2]": "authority_fact",
    "publicSources[0].href": "source_without_public_link",
    "publicSources[0].label": "operator_wording",
    "publicSources[2].href": "duplicate_source_link",
  });
});

test("accepts visitor-facing copy, including ordinary uses of shared words",
  () => {
    assert.deepEqual(organizerPublicContentIssues(cleanListing()), []);
    assert.equal(operatorWordingIn("Track your calorie intake."), null);
    assert.equal(operatorWordingIn("Reviewed by runners every week."), null);
    assert.equal(operatorWordingIn("Stays out of search until verified."),
      "out of search");
    assert.equal(operatorWordingIn("Pending an admin reviews identity."),
      "admin reviews");
  });

test("checks only the fields present in a partial patch", () => {
  assert.deepEqual(organizerPublicContentIssues({
    publicProfile: {headline: "MOON MOTH in Indore"},
  }), []);
  assert.deepEqual(
    organizerPublicContentIssues({
      publicPage: {seoDescription: "Noindex until verified."},
    }).map((issue) => issue.field),
    ["publicPage.seoDescription"]
  );
});

test("assert raises failed-precondition naming fields, not the copy", () => {
  assert.throws(
    () => assertOrganizerPublicContent(
      {publicProfile: {summary: "This unclaimed profile is a seed listing."}},
      "This organizer edit"
    ),
    (error: unknown) => {
      assert.ok(error instanceof HttpsError);
      assert.equal(error.code, "failed-precondition");
      assert.match(error.message, /^This organizer edit would put operator/u);
      assert.match(error.message, /publicProfile\.summary \(intake wording/u);
      return true;
    }
  );
  assert.doesNotThrow(() =>
    assertOrganizerPublicContent(cleanListing(), "This organizer edit"));
});
