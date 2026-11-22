/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {linksSuppressed, spendTryItReadBudget, TRY_IT_READ_LIMITS} from "./pageRead";

const db = {} as FirebaseFirestore.Firestore;
const request = {rawRequest: {headers: {"x-forwarded-for": "203.0.113.7"}, ip: "203.0.113.7"}} as unknown as
  CallableRequest<unknown>;

test("a try-it read spends the phone, address and daily budgets under the command's own names", async () => {
  const spent: Array<{key: string; name: string; maxRequests: number; windowMs: number}> = [];
  const checkRateLimit = (async (_db: unknown, key: string, name: string, options: {maxRequests: number; windowMs: number}) => {
    spent.push({key, name, ...options});
  }) as unknown as Parameters<typeof spendTryItReadBudget>[1];
  await spendTryItReadBudget(db, checkRateLimit, request, "+15550100", {phone: "lanternRead", address: "lanternAddress",
    daily: "lanternDaily", dailyScope: "try-it-lantern"});
  assert.deepEqual(spent.map((item) => [item.name, item.maxRequests, item.windowMs]), [
    ["lanternRead", TRY_IT_READ_LIMITS.phonePerHour, 3_600_000],
    ["lanternAddress", TRY_IT_READ_LIMITS.addressPerHour, 3_600_000],
    ["lanternDaily", TRY_IT_READ_LIMITS.dailyTotal, 86_400_000],
  ]);
  assert.equal(spent[2].key, "try-it-lantern");
  assert.notEqual(spent[0].key, spent[1].key);
  assert.ok(!spent[0].key.includes("+15550100"), "the phone is never a raw limiter key");
});

test("the do-not-list check answers suppressed or clear, and fails closed when unavailable", async () => {
  assert.equal(await linksSuppressed(async () => "suppressed", ["https://forms.example.com/a"], "test.command"), true);
  assert.equal(await linksSuppressed(async () => "clear", ["https://forms.example.com/a"], "test.command"), false);
  await assert.rejects(linksSuppressed(async () => "unavailable", ["https://forms.example.com/a"], "test.command"),
    (error: {code?: string; details?: {reason?: string}}) =>
      error.code === "unavailable" && error.details?.reason === "suppression_unavailable");
});
