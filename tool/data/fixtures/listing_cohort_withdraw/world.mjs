// A fictional listing cohort. Every organiser, handle and domain here is made
// up; domains use the reserved .example TLD. Cohort pilot-indore-1 holds three
// public, unclaimed pages (one with a slug-style id that carries its name and
// one with a claim pending), two claimed pages, two pages already off the
// site and one draft. Two more organisers sit outside the cohort and must
// never be touched.

export const COHORT_ID = "pilot-indore-1";
export const OTHER_COHORT_ID = "pilot-pune-1";

export const PUBLIC_INDORE = "org-brindle-1";
export const PUBLIC_BHOPAL_PENDING = "org-brindle-2";
export const SLUG_ID_INDORE = "driftwood-bay-run-club-indore";
export const CLAIMED_OWNER = "org-moonmoth-1";
export const CLAIMED_VERIFIED = "org-sandbar-1";
export const SUPPRESSED = "org-lantern-off";
export const REMOVED = "org-lantern-removed";
export const DRAFT = "org-lantern-draft";
export const OTHER_COHORT = "org-brindle-pune";
export const NO_COHORT = "org-driftwood-solo";

export const WITHDRAWABLE = [PUBLIC_BHOPAL_PENDING, PUBLIC_INDORE, SLUG_ID_INDORE].sort();

/** Strings that must never appear in tool output. */
export const IDENTIFYING = [
  "Brindle", "brindle", "Driftwood", "driftwood", "Moonmoth", "moonmoth", "Sandbar", "sandbar", "Lantern", "lantern",
  "org-", "organizers/", ".example", "@",
];

const approvedAt = "2026-11-19T06:00:00.000Z";

function page(slug, citySlug, overrides = {}) {
  return {slug, citySlug, canonicalPath: `/organizers/${slug}/`, legacyPaths: [], publishStatus: "published",
    indexStatus: "indexed", robots: "index, follow", seoTitle: null, seoDescription: null, lastRenderedAt: null,
    ...overrides};
}

const unclaimed = {
  claim: {state: "unclaimed", claimHref: null, lastClaimRequestId: null},
  ownership: {state: "programmatic", ownerUserId: null, primaryHostUserId: null, hostUserIds: [], claimedAt: null,
    claimedByUid: null},
  ownerUserId: null,
  hostUserId: null,
};

function organizer(name, handle, cohortId, publicPage, overrides = {}) {
  return {
    name,
    instagramHandle: handle,
    publicSources: [{href: `https://${handle}.example`}],
    ...unclaimed,
    ...(cohortId ? {listingProgram: {cohortId, approvedAt}} : {}),
    publicPage,
    ...overrides,
  };
}

export function cohortWorld() {
  return {
    [`organizers/${PUBLIC_INDORE}`]: organizer("Brindle Run Club", "brindlerunclub", COHORT_ID,
      page("brindle-run-club", "indore")),
    [`organizers/${PUBLIC_BHOPAL_PENDING}`]: organizer("Brindle Quiz Nights", "brindlequiz", COHORT_ID,
      page("brindle-quiz-nights", "bhopal", {indexStatus: "noindex", robots: "noindex, follow"}),
      {claim: {state: "claimPending", claimHref: null, lastClaimRequestId: "organizer_claim_fixture"}}),
    [`organizers/${SLUG_ID_INDORE}`]: organizer("Driftwood Bay Run Club", "driftwoodbayrun", COHORT_ID,
      page("driftwood-bay-run-club", "indore", {indexStatus: "indexReady"})),
    [`organizers/${CLAIMED_OWNER}`]: organizer("Moonmoth Supper Club", "moonmothsupper", COHORT_ID,
      page("moonmoth-supper-club", "indore"), {
        ownership: {...unclaimed.ownership, state: "claimed", ownerUserId: "uid-owner-1", claimedByUid: "uid-owner-1"},
        ownerUserId: "uid-owner-1",
        claim: {state: "claimed", claimHref: null, lastClaimRequestId: null},
      }),
    [`organizers/${CLAIMED_VERIFIED}`]: organizer("Sandbar Padel", "sandbarpadel", COHORT_ID,
      page("sandbar-padel", "bhopal"), {claim: {state: "verified", claimHref: null, lastClaimRequestId: null}}),
    [`organizers/${SUPPRESSED}`]: organizer("Lantern Books", "lanternbooks", COHORT_ID,
      page("lantern-books", "indore", {publishStatus: "suppressed", indexStatus: "noindex", robots: "noindex, follow"})),
    [`organizers/${REMOVED}`]: organizer("Lantern Studio", "lanternstudio", COHORT_ID,
      page("lantern-studio", "indore", {publishStatus: "removed", indexStatus: "noindex", robots: "noindex, follow"})),
    [`organizers/${DRAFT}`]: organizer("Lantern Workshops", "lanternworkshops", COHORT_ID,
      page("lantern-workshops", "indore", {publishStatus: "draft", indexStatus: "noindex", robots: "noindex, follow"})),
    [`organizers/${OTHER_COHORT}`]: organizer("Brindle Pune Runners", "brindlepune", OTHER_COHORT_ID,
      page("brindle-pune-runners", "pune")),
    [`organizers/${NO_COHORT}`]: organizer("Driftwood Solo Walks", "driftwoodsolo", null,
      page("driftwood-solo-walks", "indore")),
    // An unrelated audit row that must not count as an earlier withdrawal.
    "adminAuditLogs/log-approval": {actorUid: "admin-1", roles: ["admin"], action: "adminApproveOrganizerListing",
      targetPath: `organizers/${PUBLIC_INDORE}`, createdAt: approvedAt, after: {cohortId: COHORT_ID}},
  };
}
