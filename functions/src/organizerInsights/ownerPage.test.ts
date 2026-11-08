import test from "node:test";
import assert from "node:assert/strict";
import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {manageOrganizerOwnerPageHandler, type OwnerPageDeps} from
  "./ownerPage";
import {
  ownerViewOrganizer,
  ownerViewRequest,
  ownerViewTestStore,
} from "./ownerViewTestStore";

function fixture(send?: (request: CallableRequest<unknown>) =>
  Promise<unknown>) {
  const {db, docs} = ownerViewTestStore({
    "organizers/org-1": ownerViewOrganizer()});
  const sent: unknown[] = [];
  const deps: OwnerPageDeps = {
    firestore: () => db,
    now: () => new Date("2026-11-30T20:00:00Z"),
    timestampFromDate: (date) => ({toMillis: () => date.getTime()}),
    sendFollowerUpdate: send ?? (async (request) => {
      sent.push(request.data);
      return {};
    }),
  };
  return {docs, deps, sent};
}

const link = {id: "supper", label: "Lantern Supper", subtitle: null,
  url: "https://lu.ma/supper", icon: "tickets", pinned: true,
  showUntil: "2026-12-01T00:00:00.000Z"};

test("owners and editors replace the links through the link policy",
  async () => {
    const {docs, deps} = fixture();
    for (const uid of ["owner", "manager"]) {
      const result = await manageOrganizerOwnerPageHandler(ownerViewRequest({
        organizerId: "org-1", requestId: `links-${uid}`, action: "setLinks",
        links: [link]}, uid), deps);
      assert.deepEqual(result.links, [link]);
    }
    const stored = docs["organizers/org-1"].ownerLinks as Array<
      Record<string, unknown>>;
    assert.equal(stored.length, 1);
    assert.equal(stored[0].pinned, true);
    await assert.rejects(manageOrganizerOwnerPageHandler(ownerViewRequest({
      organizerId: "org-1", requestId: "r", action: "setLinks",
      links: [{...link, url: "https://bit.ly/x"}]}), deps),
    {code: "invalid-argument"});
    await assert.rejects(manageOrganizerOwnerPageHandler(ownerViewRequest({
      organizerId: "org-1", requestId: "r", action: "setLinks",
      links: [link]}, "visitor"), deps), {code: "permission-denied"});
  });

test("message followers sends twice a month, replays reuse a slot",
  async () => {
    const {deps, sent, docs} = fixture();
    const send = (requestId: string) => manageOrganizerOwnerPageHandler(
      ownerViewRequest({organizerId: "org-1", requestId,
        action: "sendFollowerMessage", text: "  New date on Saturday  "}),
      deps);
    // 20:00 UTC on 30 Nov is 1 Dec in India: December's allowance.
    assert.deepEqual((await send("m1")).followerMessages,
      {month: "2026-12", limit: 2, used: 1});
    const replay = await send("m1");
    assert.equal(replay.idempotentReplay, true);
    assert.equal(replay.followerMessages?.used, 1);
    await send("m2");
    await assert.rejects(send("m3"), {code: "resource-exhausted"});
    assert.deepEqual(sent[0], {organizerId: "org-1", requestId: "m1",
      text: "New date on Saturday"});
    assert.deepEqual(
      docs["organizerFollowerMessageQuotas/org-1_202612"].requestIds,
      ["m1", "m2"]);
  });

test("a WhatsApp message is the same send and reports both channels",
  async () => {
    const {deps, sent, docs} = fixture(async (request) => {
      sent.push(request.data);
      return {activityAvailableCount: 12, whatsapp: {status: "collecting",
        queuedCount: 4, skippedCount: 8, sentCount: 0, deliveredCount: 0,
        failedCount: 0}};
    });
    const result = await manageOrganizerOwnerPageHandler(ownerViewRequest({
      organizerId: "org-1", requestId: "w1", action: "sendFollowerMessage",
      text: "New date", channels: ["app", "whatsapp"]}), deps);
    assert.deepEqual(sent[0], {organizerId: "org-1", requestId: "w1",
      text: "New date", channels: ["app", "whatsapp"]});
    assert.equal(result.followerMessages?.used, 1);
    assert.deepEqual(result.followerMessages?.delivery, {
      appRecipientCount: 12, whatsapp: {status: "collecting", queuedCount: 4,
        skippedCount: 8, sentCount: 0, deliveredCount: 0, failedCount: 0}});
    assert.deepEqual(
      docs["organizerFollowerMessageQuotas/org-1_202612"].requestIds, ["w1"]);
  });

test("a failed send gives its slot back", async () => {
  const {deps, docs} = fixture(async () => {
    throw new HttpsError("resource-exhausted", "Weekly posts used.");
  });
  await assert.rejects(manageOrganizerOwnerPageHandler(ownerViewRequest({
    organizerId: "org-1", requestId: "m1", action: "sendFollowerMessage",
    text: "Hello"}), deps), {code: "resource-exhausted"});
  assert.deepEqual(
    docs["organizerFollowerMessageQuotas/org-1_202612"].requestIds, []);
});

test("the payload must match its action", async () => {
  const {deps} = fixture();
  await assert.rejects(manageOrganizerOwnerPageHandler(ownerViewRequest({
    organizerId: "org-1", requestId: "r", action: "setLinks",
    text: "no links"}), deps), {code: "invalid-argument"});
});

test("photos reorder in place and the first becomes the cover", async () => {
  const {docs, deps} = fixture();
  const photo = (id: string) => ({id, url: `https://img.test/${id}.jpg`,
    storagePath: `organizers/org-1/${id}.jpg`, thumbnailUrl: null,
    thumbnailStoragePath: null, position: 0, createdAt: 1, updatedAt: 1});
  docs["organizers/org-1"].organizerPhotos = [photo("a"), photo("b")];
  const result = await manageOrganizerOwnerPageHandler(ownerViewRequest({
    organizerId: "org-1", requestId: "p", action: "setPhotoOrder",
    photoIds: ["b", "a"]}, "manager"), deps);
  assert.deepEqual(result.photoIds, ["b", "a"]);
  const stored = docs["organizers/org-1"].organizerPhotos as Array<
    {id: string; position: number}>;
  assert.deepEqual(stored.map((p) => [p.id, p.position]), [["b", 0],
    ["a", 1]]);
  assert.equal(docs["organizers/org-1"].imageUrl, "https://img.test/b.jpg");
  await assert.rejects(manageOrganizerOwnerPageHandler(ownerViewRequest({
    organizerId: "org-1", requestId: "p", action: "setPhotoOrder",
    photoIds: ["b"]}), deps), {code: "failed-precondition"});
});
