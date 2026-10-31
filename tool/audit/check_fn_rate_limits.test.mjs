import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  FROZEN_LEGACY_ACTIONS,
  extractCheckRateLimitActions,
  findLimitTables,
  scanFunctionRateLimits,
} from "./check_fn_rate_limits.mjs";

const mechanism = `
  export interface RateLimitConfig {maxRequests: number; windowMs: number}
  export async function checkRateLimit(db, uid, action, limit: RateLimitConfig) {}
`;

test("extractCheckRateLimitActions reads literal actions and whether each passes a limit", () => {
  const actions = extractCheckRateLimitActions(`
    await checkRateLimit(admin.firestore(), userId, "placesAutocomplete",
      {maxRequests: 30, windowMs: 60_000});
    await deps.checkRateLimit?.(db, hostUid, "decideEventJoinRequest");
  `);

  assert.deepEqual(actions.map((action) => [action.value, action.hasLimit]), [
    ["placesAutocomplete", true],
    ["decideEventJoinRequest", false],
  ]);
});

test("scanFunctionRateLimits flags checkRateLimit actions missing entries", () => {
  const root = createFixture({
    "functions/src/shared/rateLimit.ts": mechanism,
    "functions/src/clubs/createOrganizer.ts": `
      await checkRateLimit(db, uid, "createOrganizer", {maxRequests: 3, windowMs: 60 * 1000});
      await checkRateLimit(db, uid, "missingLimit");
    `,
  });

  const result = scanFunctionRateLimits({root});

  assert.deepEqual(result.findings.map((finding) => [finding.rule, finding.action]), [
    ["missingRateLimit", "missingLimit"],
  ]);
});

test("scanFunctionRateLimits passes when actions have explicit entries", () => {
  const root = createFixture({
    "functions/src/shared/rateLimit.ts": mechanism,
    "functions/src/clubs/createOrganizer.ts": `
      const limit = {maxRequests: 3, windowMs: 60 * 1000};
      await checkRateLimit(db, uid, "createOrganizer", limit);
    `,
  });

  assert.deepEqual(scanFunctionRateLimits({root}).findings, []);
});

test("scanFunctionRateLimits flags a per-action table in the shared mechanism module", () => {
  for (const table of [
    "export const RATE_LIMITS: Record<string, RateLimitConfig> = {};",
    `const LIMITS = {
      createOrganizer: {maxRequests: 3, windowMs: 60 * 1000},
      joinOrganizer: {maxRequests: 10, windowMs: 60 * 1000},
    };`,
  ]) {
    const root = createFixture({
      "functions/src/shared/rateLimit.ts": mechanism + table,
      "functions/src/clubs/createOrganizer.ts": `
        await checkRateLimit(db, uid, "createOrganizer", {maxRequests: 3, windowMs: 60 * 1000});
      `,
    });
    assert.deepEqual(scanFunctionRateLimits({root}).findings.map((finding) => finding.rule),
      ["sharedRateLimitTable"], table);
  }
  assert.deepEqual(findLimitTables(
    "const fallback = {maxRequests: 30, windowMs: 60 * 1000};"), []);
});

test("the frozen legacy table may shrink but never grow", () => {
  const legacy = (rows) => `${mechanism}
    const LEGACY_RATE_LIMITS = {
      ${rows}
    } as const satisfies Record<string, RateLimitConfig>;
    export function checkRateLimit(db, uid, action, ownLimit?: RateLimitConfig) {}
  `;
  const dispatcher = 'await deps.checkRateLimit(db, actorUid, "dispatchOrganizerCampaign");';
  const frozen = createFixture({
    "functions/src/shared/rateLimit.ts": legacy(
      "dispatchOrganizerCampaign: {maxRequests: 3, windowMs: 60 * 60 * 1000},"),
    "functions/src/organizers/dispatcher.ts": dispatcher,
  });
  assert.deepEqual(scanFunctionRateLimits({root: frozen}).findings, []);

  const grown = createFixture({
    "functions/src/shared/rateLimit.ts": legacy(`
      dispatchOrganizerCampaign: {maxRequests: 3, windowMs: 60 * 60 * 1000},
      "newCallable": {maxRequests: 10, windowMs: 60 * 1000},`),
    "functions/src/organizers/dispatcher.ts": dispatcher,
    "functions/src/organizers/newCallable.ts": 'await checkRateLimit(db, uid, "newCallable");',
  });
  assert.deepEqual(scanFunctionRateLimits({root: grown}).findings.map((finding) =>
    [finding.rule, finding.action]), [["legacyRateLimitGrew", "newCallable"]]);

  const removed = createFixture({
    "functions/src/shared/rateLimit.ts": mechanism,
    "functions/src/organizers/dispatcher.ts": dispatcher,
  });
  assert.deepEqual(scanFunctionRateLimits({root: removed}).findings.map((finding) =>
    [finding.rule, finding.action]), [["missingRateLimit", "dispatchOrganizerCampaign"]]);
  assert.deepEqual([...FROZEN_LEGACY_ACTIONS], ["dispatchOrganizerCampaign"],
    "The frozen set may only shrink.");
});

test("scanFunctionRateLimits flags optional limits that let a call skip its limit", () => {
  const root = createFixture({
    "functions/src/shared/rateLimit.ts": mechanism,
    "functions/src/clubs/deps.ts": `
      interface Deps {
        checkRateLimit: (db: Db, uid: string, action: string, limit?: RateLimitConfig) => Promise<void>;
        other: (limit: RateLimitConfig | undefined) => void;
      }
    `,
    "functions/src/clubs/deps.test.ts": "const fake = (limit?: RateLimitConfig) => undefined;",
  });

  assert.deepEqual(scanFunctionRateLimits({root}).findings.map((finding) => finding.rule),
    ["optionalRateLimit", "optionalRateLimit"]);
});

function createFixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-fn-rate-"));
  for (const [relativePath, source] of Object.entries(files)) {
    const file = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, source);
  }
  return root;
}


test("action extraction ignores uid and config literals around dynamic actions", () => {
  const source = [
    'checkRateLimit(db, normalize("employee,one"), "actualAction", {windowMs: 60000});',
    'checkRateLimit(db, uid, `sales:${action}`, {maxRequests: action === "draft.generate" ? 5 : 40});',
    'checkRateLimit(db, uid, action, select("refresh.batch"));',
  ].join("\n");
  const actions = extractCheckRateLimitActions(source);
  assert.deepEqual(actions.map((action) => action.value), ["actualAction"]);
  assert.equal(source.slice(actions[0].offset).startsWith('"actualAction"'), true);
});
