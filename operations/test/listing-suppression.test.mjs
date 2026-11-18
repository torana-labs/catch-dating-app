import assert from "node:assert/strict";
import test from "node:test";
import {
  SUPPRESSION_REASONS,
  isSuppressionCaseId,
  suppressionHashes,
  suppressionKeyHash,
  suppressionKeysForIdentity,
  suppressionKeysForIntakeRequest,
  usableSuppressionSecret,
} from "../src/workflows/supply-intake/organizer-matching/suppression.mjs";

// Fictional organisers on reserved domains only (RFC 2606 .example).
const SECRET = "test-only-listing-suppression-key-0123456789abcdef";

const caseIdentity = {
  names: ["The Lantern Trail Runners", "Lantern Trail"],
  handles: ["@lanterntrailrunners"],
  urls: ["https://www.instagram.com/lanterntrailrunners/", "https://lu.ma/lantern-trail"],
  domains: ["lantern-trail.example"],
  organizerIds: ["org-lantern-1"],
  slugs: ["lantern-trail-runners"],
};

test("a case identity derives label, link, domain, organiser and slug keys", () => {
  const keys = suppressionKeysForIdentity(caseIdentity);
  for (const key of ["label:lanterntrailrunners", "label:thelanterntrailrunners", "label:lanterntrail",
    "instagram:lanterntrailrunners", "luma:calendar:lantern-trail", "domain:lantern-trail.example",
    "organizer:org-lantern-1", "slug:lantern-trail-runners"]) {
    assert.ok(keys.includes(key), key);
  }
  assert.deepEqual(keys, [...new Set(keys)].sort(), "sorted and unique");
});

test("a nomination by name, handle, link or domain meets the same keys", () => {
  const suppressed = new Set(suppressionKeysForIdentity(caseIdentity));
  const meets = (request) => suppressionKeysForIntakeRequest(request).some((key) => suppressed.has(key));
  const seed = (overrides) => ({seed: {name: null, urls: [], notes: null, categories: [], ...overrides}});
  assert.ok(meets(seed({name: "Lantern Trail Runners"})), "name without the article");
  assert.ok(meets(seed({name: "LANTERN-TRAIL runners!"})), "case and punctuation");
  assert.ok(meets(seed({urls: ["https://instagram.com/LanternTrailRunners?igsh=abc"]})), "instagram link");
  assert.ok(meets(seed({urls: ["https://lantern-trail.example/join"]})), "own domain");
  assert.ok(meets(seed({name: "A new club", notes: "They post as @lantern.trail.runners every week"})), "handle in notes");
  assert.ok(meets(seed({notes: "see https://lu.ma/lantern-trail for dates"})), "link in notes");
  assert.ok(meets({...seed({name: "Anything"}), target: {organizerId: "org-lantern-1"}}), "refresh target");
  assert.equal(meets(seed({name: "Harbour Swim Collective", urls: ["https://harbour-swim.example"]})), false);
  assert.equal(meets(seed({name: "Run"})), false, "short words never match");
});

test("hashes are keyed: the same key hashes differently under another secret", () => {
  const hash = suppressionKeyHash(SECRET, "label:lanterntrail");
  assert.match(hash, /^[0-9a-f]{64}$/u);
  assert.equal(hash, suppressionKeyHash(`  ${SECRET}\n`, "label:lanterntrail"), "surrounding whitespace is ignored");
  assert.notEqual(hash, suppressionKeyHash(`${SECRET}-other`, "label:lanterntrail"));
  assert.deepEqual(suppressionHashes(SECRET, ["b", "a", "a"]), [suppressionKeyHash(SECRET, "a"),
    suppressionKeyHash(SECRET, "b")].sort());
  assert.throws(() => suppressionKeyHash("short", "label:lanterntrail"), /unavailable/u);
  assert.equal(usableSuppressionSecret(""), false);
  assert.equal(usableSuppressionSecret(undefined), false);
});

test("case ids are opaque and reasons are the takedown request types", () => {
  assert.deepEqual(["TD-0001", "TD-12345", "td-0001", "TD-001", "TD-0001 ", "lantern"].map(isSuppressionCaseId),
    [true, false, false, false, false, false]);
  assert.deepEqual(SUPPRESSION_REASONS, ["removeAndDoNotList", "trademark", "copyright", "privacy", "courtOrder",
    "impersonation"]);
});
