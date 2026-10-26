import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
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

test("scanFunctionRateLimits flags checkRateLimit calls missing their limit", () => {
  const root = createFixture({
    "functions/src/shared/rateLimit.ts": mechanism,
    "functions/src/clubs/createClub.ts": `
      await checkRateLimit(db, uid, "createClub", {maxRequests: 3, windowMs: 60 * 1000});
      await checkRateLimit(db, uid, "missingLimit");
    `,
  });

  const result = scanFunctionRateLimits({root});

  assert.deepEqual(result.findings.map((finding) => [finding.rule, finding.action]), [
    ["missingRateLimit", "missingLimit"],
  ]);
});

test("scanFunctionRateLimits passes when every call passes its own limit", () => {
  const root = createFixture({
    "functions/src/shared/rateLimit.ts": mechanism,
    "functions/src/clubs/createClub.ts": `
      const limit = {maxRequests: 3, windowMs: 60 * 1000};
      await checkRateLimit(db, uid, "createClub", limit);
    `,
  });

  assert.deepEqual(scanFunctionRateLimits({root}).findings, []);
});

test("scanFunctionRateLimits flags a per-action table in the shared mechanism module", () => {
  for (const table of [
    "export const RATE_LIMITS: Record<string, RateLimitConfig> = {};",
    `const LIMITS = {
      createClub: {maxRequests: 3, windowMs: 60 * 1000},
      joinClub: {maxRequests: 10, windowMs: 60 * 1000},
    };`,
  ]) {
    const root = createFixture({
      "functions/src/shared/rateLimit.ts": mechanism + table,
      "functions/src/clubs/createClub.ts": `
        await checkRateLimit(db, uid, "createClub", {maxRequests: 3, windowMs: 60 * 1000});
      `,
    });
    assert.deepEqual(scanFunctionRateLimits({root}).findings.map((finding) => finding.rule),
      ["sharedRateLimitTable"], table);
  }
  assert.deepEqual(findLimitTables(
    "const fallback = {maxRequests: 30, windowMs: 60 * 1000};"), []);
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
