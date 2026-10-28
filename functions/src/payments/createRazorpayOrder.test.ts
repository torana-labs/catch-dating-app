import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {createRazorpayOrderHandler} from "./createRazorpayOrder";

function request(data: unknown, uid: string | null = "runner-1") {
  return {
    auth: uid ? {uid, token: {}} : undefined,
    data,
    rawRequest: {},
  } as unknown as CallableRequest<unknown>;
}

test("new Catch-collected orders are refused with a way forward", async () => {
  await assert.rejects(
    createRazorpayOrderHandler(request({eventId: "event-1"})),
    (error: unknown) =>
      error instanceof HttpsError &&
      error.code === "failed-precondition" &&
      /organiser's own checkout/u.test(error.message),
  );
});

test("the retired callable still requires auth and a valid payload",
  async () => {
    await assert.rejects(
      createRazorpayOrderHandler(request({eventId: "event-1"}, null)),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "unauthenticated",
    );
    await assert.rejects(
      createRazorpayOrderHandler(request({})),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "invalid-argument",
    );
  });
