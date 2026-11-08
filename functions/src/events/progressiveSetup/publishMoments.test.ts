import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {Firestore} from "firebase-admin/firestore";
import {armDefaultMomentsOnPublish, defaultAutoMessages} from
  "./publishMoments";

type Row = Record<string, unknown>;

function fakeDb(rows: Record<string, Row>) {
  const doc = (path: string) => ({
    path,
    get: async () => ({exists: path in rows, data: () => rows[path]}),
    set: async (data: Row, options?: {merge?: boolean}) => {
      rows[path] = options?.merge ? {...rows[path], ...data} : data;
    },
  });
  return {collection: (name: string) => ({doc: (id: string) =>
    doc(`${name}/${id}`)})} as unknown as Firestore;
}

const start = Date.parse("2030-03-17T12:00:00.000Z");
const event = {organizerId: "org1", name: "Trivia night",
  startTime: Timestamp.fromMillis(start),
  endTime: Timestamp.fromMillis(start + 3 * 60 * 60 * 1000)};

test("auto-message defaults read both off unless saved on", () => {
  assert.deepEqual(defaultAutoMessages(undefined),
    {thankYou: false, arrival: false});
  assert.deepEqual(defaultAutoMessages({eventSetup: {autoMessages:
    {thankYou: true, arrival: false}}}), {thankYou: true, arrival: false});
});

test("publishing arms the default thank-you and arrival moments once",
  async () => {
    const rows: Record<string, Row> = {
      "events/event1": event,
      "organizerEventSetupDefaults/org1": {organizerId: "org1", revision: 1,
        eventSetup: {autoMessages: {thankYou: true, arrival: true}}},
    };
    const db = fakeDb(rows);
    const params = {db, eventId: "event1", organizerId: "org1",
      actorUid: "host1", nowMillis: start - 24 * 60 * 60 * 1000,
      replan: async () => undefined};
    assert.deepEqual(await armDefaultMomentsOnPublish(params),
      {thankYou: true, arrival: true});
    const thankYou = rows["organizerMoments/event1_close_out_thank_you"];
    const arrival = rows["organizerMoments/event1_event_start_reminder"];
    assert.equal(thankYou?.status, "armed");
    assert.equal(arrival?.status, "armed");
    // A second publish leaves the host's moments alone.
    assert.deepEqual(await armDefaultMomentsOnPublish(params),
      {thankYou: false, arrival: false});
  });

test("publishing without the defaults arms nothing", async () => {
  const rows: Record<string, Row> = {"events/event1": event};
  assert.deepEqual(await armDefaultMomentsOnPublish({db: fakeDb(rows),
    eventId: "event1", organizerId: "org1", actorUid: "host1",
    nowMillis: start - 1000}), {thankYou: false, arrival: false});
  assert.equal(Object.keys(rows).length, 1);
});
