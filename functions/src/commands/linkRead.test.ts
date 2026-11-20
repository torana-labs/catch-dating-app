import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../operations/testFirestore";
import {readTryItLink} from "./linkRead";

const HOUR_MS = 60 * 60 * 1000;
const STOP = new Error("stop after the budgets");
const PHONE = "+919000000002";
const ADDRESS = "198.51.100.7";

function limiterKey(kind: string, value: string): string {
  const digest = createHash("sha256").update(`${kind}:${value}`)
    .digest("hex").slice(0, 32);
  return `idraft-${kind}-${digest}`;
}

interface LimitCall {
  key: string;
  action: string;
  maxRequests: number;
  windowMs: number;
}

test("a first link read spends the shared budgets under its own names",
  async () => {
    const db = new FakeFirestore();
    const calls: LimitCall[] = [];
    const checkRateLimit = (async (_db: unknown, key: string,
      action: string, options: {maxRequests: number; windowMs: number}) => {
      calls.push({key, action, maxRequests: options.maxRequests,
        windowMs: options.windowMs});
      if (calls.length === 3) throw STOP;
    }) as never;
    const request = {data: {}, auth: {uid: "visitor-1"},
      rawRequest: {headers: {}, ip: ADDRESS},
    } as unknown as CallableRequest<unknown>;
    const deps = {now: () => new Date("2026-11-20T08:00:00.000Z"),
      checkRateLimit};
    await assert.rejects(readTryItLink(
      db as unknown as FirebaseFirestore.Firestore, deps, request, {
        uid: "visitor-1", phone: PHONE, commandKey: "key-1",
        requestId: "tryit-request-1",
        link: {url: "https://organizer.example/",
          classification: {provider: null, support: "best_effort",
            reason: null} as never},
        organizerId: "org-1", organizerMarketId: null, surface: "website",
        limits: {phone: "importOrganizerFromLinkRead",
          address: "importOrganizerFromLinkAddress",
          daily: "importOrganizerFromLinkDaily"},
      }), STOP);
    assert.deepEqual(calls, [
      {key: limiterKey("phone", PHONE),
        action: "importOrganizerFromLinkRead", maxRequests: 10,
        windowMs: HOUR_MS},
      {key: limiterKey("ip", ADDRESS),
        action: "importOrganizerFromLinkAddress", maxRequests: 30,
        windowMs: HOUR_MS},
      {key: "try-it-imports", action: "importOrganizerFromLinkDaily",
        maxRequests: 100, windowMs: 24 * HOUR_MS},
    ]);
  });
