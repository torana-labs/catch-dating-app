import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {runCallable} from "../../platform/callables/callable";
import {
  getEventMessagePreferenceSpec,
  getEventMessageWithdrawalSpec,
  listEventMessagePreferencesSpec,
  setEventMessagePreferenceSpec,
  withdrawEventMessageSpec,
} from "./eventMessagePreferenceHandlers";

// One callable per action for every channel (issue #2494 step 2): the
// envelope is checked first, then the channel's own handler runs with the
// channel's own request.
const call = (data: unknown, auth?: {uid: string}) => ({data,
  auth: auth ? {uid: auth.uid, token: {}} : undefined,
  rawRequest: {ip: "127.0.0.1"}} as unknown as CallableRequest<unknown>);
const scope = {eventId: "event-1", attendeeId: "attendee-1"};

test("a malformed envelope is refused before any channel handler runs",
  async () => {
    const runs = [
      (request: CallableRequest<unknown>) =>
        runCallable(getEventMessagePreferenceSpec, request),
      (request: CallableRequest<unknown>) =>
        runCallable(setEventMessagePreferenceSpec, request),
      (request: CallableRequest<unknown>) =>
        runCallable(listEventMessagePreferencesSpec, request),
      (request: CallableRequest<unknown>) =>
        runCallable(getEventMessageWithdrawalSpec, request),
      (request: CallableRequest<unknown>) =>
        runCallable(withdrawEventMessageSpec, request),
    ];
    for (const run of runs) {
      for (const data of [null, scope, {channel: "email", request: scope},
        {channel: "sms"}, {channel: "sms", request: scope, extra: true}]) {
        await assert.rejects(async () => run(call(data, {uid: "guest-1"})),
          {code: "invalid-argument"});
      }
    }
  });

test("preferences need a signed-in guest; withdrawal links do not",
  async () => {
    for (const channel of ["sms", "rcs", "whatsapp"]) {
      await assert.rejects(async () => runCallable(
        getEventMessagePreferenceSpec, call({channel, request: {...scope,
          ...(channel === "sms" ? {} : {senderId: "sender-1"})}})),
      {code: "unauthenticated"}, channel);
    }
    // A request shaped for another channel fails the envelope check.
    await assert.rejects(async () => runCallable(
      listEventMessagePreferencesSpec, call({channel: "sms", request: {
        ...scope, cursor: "wa-permission:" + "a".repeat(64)}},
      {uid: "guest-1"})), {code: "invalid-argument"});
    // An unsigned withdrawal reaches the channel handler, which refuses a
    // malformed link as unavailable rather than asking for sign-in.
    await assert.rejects(async () => runCallable(
      getEventMessageWithdrawalSpec, call({channel: "sms", request: {
        linkId: "a".repeat(32), secret: "b".repeat(43)}})),
    (error: {code?: string}) => error.code !== "unauthenticated");
  });
