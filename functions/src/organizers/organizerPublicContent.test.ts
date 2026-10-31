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
import {
  organizerPublicContentPlanSetHash,
  planOrganizerPublicContentRepair,
} from "./organizerPublicContentRepair";

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

// Shape of the stored AFTER FLY seed listing whose intake text leaked onto
// the public organizer page, including the retired operator-only lists.
function leakedListing(): Data {
  return {
    ...baseOrganizer(),
    name: "AFTER FLY",
    description: "AFTER FLY is an Indore run-and-rave organizer discovered " +
      "through a public Luma event page. This unclaimed profile summarizes " +
      "owner-safe public facts while claim, cadence, and contact details " +
      "remain unverified.",
    publicPage: {
      slug: "afterfly",
      citySlug: "indore",
      canonicalPath: "/organizers/afterfly/",
      publishStatus: "published",
      indexStatus: "noindex",
      robots: "noindex, follow",
      seoTitle: "AFTER FLY | Indore organizer profile | Catch",
      seoDescription: "Source-backed, unclaimed Catch profile for AFTER FLY.",
      lastRenderedAt: null,
    },
    publicProfile: {
      headline: "AFTER FLY run club in Indore",
      summary: "AFTER FLY is an Indore run-and-rave organizer discovered " +
        "through a public Luma event page. This unclaimed profile " +
        "summarizes verified public facts for owner review and stays out " +
        "of search until cadence, contact, and claim details are confirmed.",
      sourceSummary: "A public Luma event page confirms AFTER FLY hosted " +
        "AFTERFLY TAKEOFF RUN & RAVE and the embedded event data lists " +
        "Instagram handle afterfly.in.",
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
        detail: "User requested an initial listing for Afterfly.",
        href: null,
        confidence: "medium",
        lastCheckedAt: null,
      },
      {
        type: "public_event_page",
        label: "Luma event page",
        detail: "Public Luma page for AFTERFLY TAKEOFF RUN & RAVE.",
        href: "https://luma.com/pxgmph3b",
        confidence: "high",
        lastCheckedAt: null,
      },
      {
        type: "embedded_event_data",
        label: "Luma event listing",
        detail: "Event timing and location for the same Luma page.",
        href: "https://luma.com/pxgmph3b/",
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

const afterflyCopy = {
  "description": "AFTER FLY pairs social runs with post-run music in Indore.",
  "publicPage.seoDescription":
    "AFTER FLY pairs social runs with post-run music in Indore.",
  "publicProfile.summary":
    "AFTER FLY pairs social runs with post-run music in Indore.",
  "publicProfile.sourceSummary": null,
};

test("flags every operator leak found on the AFTER FLY page", () => {
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
    publicProfile: {headline: "AFTER FLY in Indore"},
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

test("repair deletes retired lists and removes mechanical leaks", () => {
  const plan = planOrganizerPublicContentRepair(
    "organizers/afterfly",
    leakedListing()
  );

  assert.deepEqual(plan.deletes, [
    "publicProfile.fitNotes",
    "publicProfile.missingEvidence",
  ]);
  assert.deepEqual(Object.keys(plan.patch).sort(), [
    "publicProfile.facts",
    "publicSources",
  ]);
  assert.deepEqual(plan.patch["publicProfile.facts"], [
    {label: "Location", value: "Indore, Madhya Pradesh"},
  ]);
  assert.deepEqual(
    (plan.patch.publicSources as Data[]).map((source) => source.label),
    ["Luma event page"]
  );
  assert.deepEqual(plan.before["publicProfile.missingEvidence"], [
    "Owner verification or claim",
  ]);
  assert.deepEqual(plan.remainingIssues.map((issue) => issue.field), [
    "description",
    "publicPage.seoDescription",
    "publicProfile.summary",
    "publicProfile.sourceSummary",
  ]);
  assert.deepEqual(plan.schemaErrors, [],
    "deleting the retired lists restores the organizer contract");
  assert.deepEqual(plan.schemaRegressions, []);
});

test("an empty retired list is still deleted so the contract validates",
  () => {
    const stale = cleanListing();
    (stale.publicProfile as Data).fitNotes = [];
    (stale.publicProfile as Data).missingEvidence = [];
    const plan = planOrganizerPublicContentRepair("organizers/x", stale);

    assert.deepEqual(plan.deletes, [
      "publicProfile.fitNotes",
      "publicProfile.missingEvidence",
    ]);
    assert.deepEqual(plan.patch, {});
    assert.deepEqual(plan.schemaErrors, []);
    assert.deepEqual(
      planOrganizerPublicContentRepair("organizers/x", cleanListing()).deletes,
      []
    );
  });

test("reviewed replacements clear the remaining wording issues", () => {
  const plan = planOrganizerPublicContentRepair(
    "organizers/afterfly",
    leakedListing(),
    afterflyCopy
  );
  assert.deepEqual(plan.remainingIssues, []);
  assert.equal(plan.patch["publicProfile.sourceSummary"], null);

  const repaired = applyRepair(leakedListing(), plan.patch, plan.deletes);
  const rerun = planOrganizerPublicContentRepair(
    "organizers/afterfly",
    repaired,
    afterflyCopy
  );
  assert.deepEqual(rerun.patch, {}, "a repaired document plans no writes");
  assert.deepEqual(rerun.deletes, []);
  assert.deepEqual(rerun.remainingIssues, []);
  assert.deepEqual(rerun.schemaErrors, []);
});

test("plan hashes bind the reviewed before-state", () => {
  const first = planOrganizerPublicContentRepair(
    "organizers/afterfly",
    leakedListing()
  );
  const same = planOrganizerPublicContentRepair(
    "organizers/afterfly",
    leakedListing()
  );
  const drifted = leakedListing();
  ((drifted.publicProfile as Data).fitNotes as string[]).push("Another note");
  const changed = planOrganizerPublicContentRepair(
    "organizers/afterfly",
    drifted
  );
  assert.equal(first.hash, same.hash);
  assert.notEqual(first.hash, changed.hash);
  assert.equal(
    organizerPublicContentPlanSetHash([first, changed]),
    organizerPublicContentPlanSetHash([changed, first])
  );
});

test("repair refuses fields outside the public replacement allowlist", () => {
  assert.throws(
    () => planOrganizerPublicContentRepair(
      "organizers/afterfly",
      leakedListing(),
      {"ownership.state": "claimed"}
    ),
    /ownership\.state is not a replaceable public field/u
  );
});

function applyRepair(value: Data, patch: Data, deletes: string[]): Data {
  const next = structuredClone(value);
  const parent = (field: string) => {
    const segments = field.split(".");
    let cursor = next;
    for (const segment of segments.slice(0, -1)) {
      cursor = cursor[segment] as Data;
    }
    return {cursor, key: segments[segments.length - 1]};
  };
  for (const [field, fieldValue] of Object.entries(patch)) {
    const {cursor, key} = parent(field);
    cursor[key] = fieldValue;
  }
  for (const field of deletes) {
    const {cursor, key} = parent(field);
    delete cursor[key];
  }
  return next;
}
