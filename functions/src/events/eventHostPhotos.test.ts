import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {request} from "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import {
  addEventHostPhotoHandler,
  deleteEventHostPhotoHandler,
  listEventHostPhotosHandler,
  MAX_EVENT_HOST_PHOTOS,
  reencodeHostPhoto,
  type EventHostPhotoDeps,
  type HostPhotoBucket,
} from "./eventHostPhotos";

const validateDocument = contractValidator("EventHostPhotoDocument");
const validateList = contractValidator("EventHostPhotosCallableResponse");
const validateAdd = contractValidator("EventHostPhotoCallableResponse");
const code = (expected: string) => (err: unknown) =>
  (err as {code?: string}).code === expected;
const now = admin.firestore.Timestamp.fromMillis(1_800_000_000_000);
const PHOTO = "abcdefghijklmnopQRST1234";
const STAGED = `events/event-1/hostPhotoUploads/${PHOTO}/original.jpg`;

class FakeBucket {
  readonly objects = new Map<string, {size: number; contentType: string;
    metadata: Record<string, string>; data: Buffer}>();
  readonly deleted: string[] = [];

  put(path: string, params: {uploaderUid: string; contentType?: string;
    size?: number}): void {
    this.objects.set(path, {size: params.size ?? 2048,
      contentType: params.contentType ?? "image/jpeg",
      metadata: {uploaderUid: params.uploaderUid},
      data: Buffer.from("staged")});
  }

  file(path: string) {
    return {
      getMetadata: async () => {
        const object = this.objects.get(path);
        if (!object) throw new Error("No such object");
        return [{size: String(object.size), contentType: object.contentType,
          metadata: object.metadata}];
      },
      download: async () => [this.objects.get(path)!.data],
      save: async (data: Buffer, options: {contentType: string}) => {
        this.objects.set(path, {size: data.length,
          contentType: options.contentType, metadata: {}, data});
      },
      delete: async () => {
        this.deleted.push(path);
        this.objects.delete(path);
        return [{}];
      },
      getSignedUrl: async (options: {expires: number}) =>
        [`https://signed.example/${path}?expires=${options.expires}`],
    };
  }

  asBucket(): HostPhotoBucket {
    return this as unknown as HostPhotoBucket;
  }
}

function seed(overrides: Record<string, FakeData | undefined> = {}) {
  return {
    "events/event-1": {organizerId: "org-1",
      startTime: admin.firestore.Timestamp.fromMillis(now.toMillis() - 1000)},
    "organizers/org-1": {name: "Saturday Supper Club", hostUserId: "owner-1",
      ownerUserId: "owner-1", hostUserIds: ["owner-1", "manager-1"]},
    "eventParticipations/event-1_guest-1": {eventId: "event-1",
      uid: "guest-1", status: "attended"},
    "eventParticipations/event-1_booked-1": {eventId: "event-1",
      uid: "booked-1", status: "signedUp"},
    "eventRuntimeParticipants/event-1_door-1": {eventId: "event-1",
      uid: "door-1", accessStatus: "ready", eventAttendeeId: "attendee-1"},
    "eventAttendees/attendee-1": {eventId: "event-1", linkedUid: "door-1",
      status: "checkedIn"},
    "eventRuntimeParticipants/event-1_door-2": {eventId: "event-1",
      uid: "door-2", accessStatus: "ready", eventAttendeeId: "attendee-2"},
    "eventAttendees/attendee-2": {eventId: "event-1", linkedUid: "door-2",
      status: "expected"},
    ...overrides,
  };
}

function setup(overrides: Record<string, FakeData | undefined> = {}) {
  const db = new FakeFirestore(seed(overrides));
  const bucket = new FakeBucket();
  const deps: EventHostPhotoDeps = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    storageBucket: () => bucket.asBucket(),
    checkRateLimit: async () => undefined,
    now: () => now,
    reencode: async () => ({display: Buffer.from("display-jpeg"),
      thumbnail: Buffer.from("thumb"), width: 2048, height: 1536}),
  };
  return {db, bucket, deps};
}

const add = (ctx: ReturnType<typeof setup>, uid = "manager-1",
  photoId = PHOTO) => addEventHostPhotoHandler(
  request({eventId: "event-1", photoId}, uid), ctx.deps);

test("a manager shares a staged photo; replays return it unchanged",
  async () => {
    const ctx = setup();
    ctx.bucket.put(STAGED, {uploaderUid: "manager-1"});
    const added = await add(ctx);
    assert.equal(validateAdd(added), true, JSON.stringify(validateAdd.errors));
    assert.equal(added.photo.width, 2048);
    const doc = ctx.db.getDoc(`eventHostPhotos/event-1_${PHOTO}`)!;
    assert.equal(validateDocument(doc), true,
      JSON.stringify(validateDocument.errors));
    assert.equal(doc.uploadedByUid, "manager-1");
    assert.equal(doc.organizerId, "org-1");
    assert.ok(ctx.bucket.deleted.includes(STAGED));
    assert.ok(ctx.bucket.objects.has(
      `events/event-1/hostPhotos/${PHOTO}/display.jpg`));
    assert.ok(ctx.bucket.objects.has(
      `events/event-1/hostPhotos/${PHOTO}/thumbnail.jpg`));

    const replay = await add(ctx);
    assert.equal(replay.photo.createdAtMillis, added.photo.createdAtMillis);
  });

test("the organizer owner can share too; guests and strangers cannot",
  async () => {
    const ctx = setup();
    ctx.bucket.put(STAGED, {uploaderUid: "owner-1"});
    await add(ctx, "owner-1");
    for (const uid of ["guest-1", "stranger-1"]) {
      await assert.rejects(add(ctx, uid, "zzzzzzzzzzzzzzzzzzzz0000"),
        code("permission-denied"));
    }
  });

test("photos wait until the event has started", async () => {
  const ctx = setup({"events/event-1": {organizerId: "org-1",
    startTime: admin.firestore.Timestamp.fromMillis(now.toMillis() + 60000)}});
  ctx.bucket.put(STAGED, {uploaderUid: "manager-1"});
  await assert.rejects(add(ctx), code("failed-precondition"));
  assert.equal(ctx.db.getDoc(`eventHostPhotos/event-1_${PHOTO}`), undefined);
});

test("a missing or mismatched staged upload is rejected and removed",
  async () => {
    const missing = setup();
    await assert.rejects(add(missing), code("failed-precondition"));

    for (const staged of [
      {uploaderUid: "owner-1"},
      {uploaderUid: "manager-1", contentType: "image/gif"},
      {uploaderUid: "manager-1", size: 8 * 1024 * 1024 + 1},
    ]) {
      const ctx = setup();
      ctx.bucket.put(STAGED, staged);
      await assert.rejects(add(ctx), code("failed-precondition"));
      assert.ok(ctx.bucket.deleted.includes(STAGED));
    }
  });

test("an unreadable image is rejected and its staged object removed",
  async () => {
    const ctx = setup();
    ctx.deps.reencode = reencodeHostPhoto;
    ctx.bucket.put(STAGED, {uploaderUid: "manager-1"});
    await assert.rejects(add(ctx), code("invalid-argument"));
    assert.ok(ctx.bucket.deleted.includes(STAGED));
  });

test("an event shares at most the photo limit", async () => {
  const full: Record<string, FakeData> = {};
  for (let index = 0; index < MAX_EVENT_HOST_PHOTOS; index++) {
    const photoId = `photo${String(index).padStart(19, "0")}`;
    full[`eventHostPhotos/event-1_${photoId}`] = {eventId: "event-1",
      organizerId: "org-1", photoId};
  }
  const ctx = setup(full);
  ctx.bucket.put(STAGED, {uploaderUid: "manager-1"});
  await assert.rejects(add(ctx), code("resource-exhausted"));
  assert.ok(ctx.bucket.deleted.includes(STAGED));
});

test("checked-in guests and the host team see photos; others see none",
  async () => {
    const ctx = setup();
    ctx.bucket.put(STAGED, {uploaderUid: "manager-1"});
    await add(ctx);
    const list = (uid: string) => listEventHostPhotosHandler(
      request({eventId: "event-1"}, uid), ctx.deps);

    const host = await list("owner-1");
    assert.equal(validateList(host), true, JSON.stringify(validateList.errors));
    assert.equal(host.access, "host");
    assert.equal(host.organizerName, "Saturday Supper Club");
    assert.equal(host.photos.length, 1);
    assert.match(host.photos[0].displayUrl, /hostPhotos\/.+\/display\.jpg/);
    assert.doesNotMatch(host.photos[0].displayUrl, /token=/);

    for (const uid of ["guest-1", "door-1"]) {
      const guest = await list(uid);
      assert.equal(guest.access, "guest", uid);
      assert.equal(guest.photos.length, 1, uid);
    }
    for (const uid of ["booked-1", "door-2", "stranger-1"]) {
      const none = await list(uid);
      assert.equal(validateList(none), true);
      assert.equal(none.access, "none", uid);
      assert.deepEqual(none.photos, [], uid);
    }
  });

test("the host team removes a photo and its files", async () => {
  const ctx = setup();
  ctx.bucket.put(STAGED, {uploaderUid: "manager-1"});
  await add(ctx);
  const remove = (uid: string) => deleteEventHostPhotoHandler(
    request({eventId: "event-1", photoId: PHOTO}, uid), ctx.deps);

  await assert.rejects(remove("guest-1"), code("permission-denied"));
  assert.ok(ctx.db.getDoc(`eventHostPhotos/event-1_${PHOTO}`));

  const removed = await remove("owner-1");
  assert.equal(removed.deleted, true);
  assert.equal(ctx.db.getDoc(`eventHostPhotos/event-1_${PHOTO}`), undefined);
  assert.ok(ctx.bucket.deleted.includes(
    `events/event-1/hostPhotos/${PHOTO}/display.jpg`));
  assert.ok(ctx.bucket.deleted.includes(
    `events/event-1/hostPhotos/${PHOTO}/thumbnail.jpg`));
  assert.equal((await remove("manager-1")).deleted, false);
});

test("re-encoding strips EXIF location and caps the size", async () => {
  const sharp = (await import("sharp")).default;
  const source = await sharp({create: {width: 3000, height: 1000,
    channels: 3, background: {r: 200, g: 120, b: 40}}})
    .withExifMerge({IFD0: {Make: "Catch test camera"},
      IFD3: {GPSLatitudeRef: "N", GPSLatitude: "12/1 58/1 0/1",
        GPSLongitudeRef: "E", GPSLongitude: "77/1 35/1 0/1"}})
    .jpeg().toBuffer();
  assert.ok((await sharp(source).metadata()).exif, "fixture carries EXIF");

  const out = await reencodeHostPhoto(source);
  const display = await sharp(out.display).metadata();
  const thumbnail = await sharp(out.thumbnail).metadata();
  assert.equal(display.exif, undefined);
  assert.equal(display.xmp, undefined);
  assert.equal(display.iptc, undefined);
  assert.equal(thumbnail.exif, undefined);
  assert.equal(out.width, 2048);
  assert.equal(out.height, 683);
  assert.equal(display.format, "jpeg");
  assert.ok((thumbnail.width ?? 0) <= 480);
  assert.equal(out.display.includes(Buffer.from("Catch test camera")), false);
});
