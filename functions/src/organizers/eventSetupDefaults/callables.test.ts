import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {updateOrganizerEventSetupDefaultsHandler,
  DefaultsCallableDependencies} from "./callables";

const request = (data: unknown, uid?: string) => ({
  data, ...(uid ? {auth: {uid, token: {}}} : {}),
}) as CallableRequest<unknown>;
const deps: DefaultsCallableDependencies = {
  firestore: () => {
    throw new Error("Unexpected database access");
  },
  checkRateLimit: async () => {
    throw new Error("Unexpected rate charge");
  },
};

test("defaults auth and validation precede database", async () => {
  for (const handler of [updateOrganizerEventSetupDefaultsHandler]) {
    await assert.rejects(handler(request({}), deps),
      (e) => e instanceof HttpsError && e.code === "unauthenticated");
    await assert.rejects(handler(request({}, "host1"), deps),
      (e) => e instanceof HttpsError && e.code === "invalid-argument");
  }
});

test("defaults reject unknown fields and invalid intents", async () => {
  const command = {organizerId: "org1", requestId: "request-1",
    expectedRevision: 0, reviewedDefaultsHash: "a".repeat(64)};
  for (const changes of [{}, {currency: {mode: "clear", value: "INR"}},
    {currency: {mode: "set"}}, {apiKey: {mode: "set", value: "secret"}},
    {reusablePaymentPage: {mode: "set", value: {url: "https://example.com/"}}},
    {usualDurationMinutes: {mode: "set", value: 0}}]) {
    await assert.rejects(updateOrganizerEventSetupDefaultsHandler(
      request({...command, changes}, "host1"), deps),
    (e) => e instanceof HttpsError && e.code === "invalid-argument");
  }
});
