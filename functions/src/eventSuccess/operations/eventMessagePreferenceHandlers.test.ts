import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {
  getEventMessagePreferenceHandler,
  getEventMessageWithdrawalHandler,
  listEventMessagePreferencesHandler,
  setEventMessagePreferenceHandler,
  withdrawEventMessageHandler,
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
    for (const handler of [getEventMessagePreferenceHandler,
      setEventMessagePreferenceHandler, listEventMessagePreferencesHandler,
      getEventMessageWithdrawalHandler, withdrawEventMessageHandler]) {
      for (const data of [null, scope, {channel: "email", request: scope},
        {channel: "sms"}, {channel: "sms", request: scope, extra: true}]) {
        await assert.rejects(async () => handler(call(data)),
          {code: "invalid-argument"});
      }
    }
  });

test("each channel reaches its own handler with its own request",
  async () => {
    for (const channel of ["sms", "rcs", "whatsapp"]) {
      // The channel handler asks for a signed-in guest before any read.
      await assert.rejects(async () => getEventMessagePreferenceHandler(
        call({channel, request: {...scope,
          ...(channel === "sms" ? {} : {senderId: "sender-1"})}})),
      {code: "unauthenticated"}, channel);
    }
    // A request shaped for another channel fails that channel's own check.
    await assert.rejects(async () => listEventMessagePreferencesHandler(
      call({channel: "sms", request: {...scope, cursor: "wa-permission:" +
        "a".repeat(64)}}, {uid: "guest-1"})), {code: "invalid-argument"});
  });
