import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import {validateEventPublicPageDocument} from
  "../shared/generated/validators/eventPublicPageDocument";
import {validateOrganizerPublicPageDocument} from
  "../shared/generated/validators/organizerPublicPageDocument";
import {buildOrganizerScope} from "./pageModel";
import {readPublicPageFixture} from "./publicPageTestFixtures";
import {
  collections,
  commitOrganizerScope,
  planChanges,
  planOrganizerScope,
  readOrganizerScope,
  rebuildOrganizerScope,
} from "./rebuild";

const projectId = "demo-catch-rules";
const skip = !process.env.FIRESTORE_EMULATOR_HOST;
type Row = Record<string, unknown>;
interface RawCase {
  name: string;
  organizer: {id: string; data: Row};
  catchEvents: Array<{id: string; data: Row}>;
  externalEvents: Array<{id: string; data: Row}>;
  reviews: Array<{id: string; data: Row}>;
}
const inputs = readPublicPageFixture("parity_inputs.json") as {
  now: number;
  cases: RawCase[];
};

/** Serialized fixture timestamps become Admin SDK timestamps. */
function stored(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stored);
  if (!value || typeof value !== "object") return value;
  const row = value as Row;
  const keys = Object.keys(row).sort();
  if (keys.length === 2 && keys[0] === "_nanoseconds" &&
      keys[1] === "_seconds") {
    return new Timestamp(Number(row._seconds), Number(row._nanoseconds));
  }
  return Object.fromEntries(Object.entries(row)
    .map(([key, item]) => [key, stored(item)]));
}

/** The every-variant organizer under fresh ids, so runs never collide. */
async function fixture() {
  const run = randomUUID().slice(0, 8);
  const app = initializeApp({projectId}, `public-pages-${run}`);
  const db = getEmulatorFirestore(app);
  const source = inputs.cases[0];
  const organizerId = `pages-${run}`;
  const rename = (id: string) => `${id}-${run}`;
  const text = JSON.stringify(source)
    .replaceAll("\"next-proof\"", JSON.stringify(organizerId))
    .replaceAll("/organizers/next-proof/", `/organizers/${organizerId}/`);
  const parity = JSON.parse(text) as RawCase;
  const writes: FirebaseFirestore.DocumentReference[] = [];
  const put = async (path: string, data: Row) => {
    const ref = db.doc(path);
    await ref.set(stored(data) as Row);
    writes.push(ref);
  };
  await put(`organizers/${organizerId}`, parity.organizer.data);
  for (const doc of parity.catchEvents) {
    await put(`events/${rename(doc.id)}`, doc.data);
  }
  for (const doc of parity.externalEvents) {
    await put(`externalEvents/${rename(doc.id)}`,
      {...doc.data, eventId: rename(doc.id)});
  }
  for (const doc of parity.reviews) {
    const eventId = doc.data.eventId;
    await put(`reviews/${rename(doc.id)}`, {...doc.data,
      ...(typeof eventId === "string" ? {eventId: rename(eventId)} : {})});
  }
  const pages = async () => {
    const [page, events, marker] = await Promise.all([
      db.collection(collections.organizerPages).doc(organizerId).get(),
      db.collection(collections.eventPages)
        .where("organizerId", "==", organizerId).get(),
      db.collection(collections.builds).doc(organizerId).get(),
    ]);
    return {page, events: events.docs, marker};
  };
  const close = async () => {
    const {page, events, marker} = await pages();
    await Promise.all([...writes, page.ref, marker.ref,
      ...events.map((doc) => doc.ref)].map((ref) => ref.delete()));
    await db.terminate();
    await deleteApp(app);
  };
  return {db, organizerId, rename, pages, close};
}

const json = (data: unknown) => JSON.parse(JSON.stringify(data));
const at = (offset: number) => () => inputs.now + offset;

test("publishing builds valid organizer and event pages once",
  {skip}, async () => {
    const h = await fixture();
    try {
      // The backfill's dry run reports the pages without writing them.
      const plan = await planOrganizerScope(h.db, h.organizerId, at(0)());
      assert.deepEqual(plan.organizerPage, "create");
      assert.deepEqual(plan.eventPages,
        {create: 5, update: 0, unchanged: 0, delete: 0});
      assert.equal((await h.pages()).page.exists, false);
      const first = await rebuildOrganizerScope(h.db, h.organizerId,
        {now: at(0), fanOut: false});
      assert.equal(first.status, "committed");
      assert.equal(first.organizerPage, "written");
      const {page, events, marker} = await h.pages();
      assert.equal(validateOrganizerPublicPageDocument(json(page.data())),
        true, JSON.stringify(validateOrganizerPublicPageDocument.errors));
      assert.deepEqual(events.map((doc) => doc.id).sort(), [
        h.rename("ext-public"), h.rename("legacy-club-only"),
        h.rename("mixer-restricted"), h.rename("open-upcoming"),
        h.rename("paid-past"),
      ].sort());
      for (const doc of events) {
        assert.equal(validateEventPublicPageDocument(json(doc.data())), true,
          JSON.stringify(validateEventPublicPageDocument.errors));
      }
      assert.equal(marker.get("published"), true);
      const serialized = JSON.stringify([page.data(),
        events.map((doc) => doc.data())]);
      assert(!serialized.includes("race.course@example.test"));
      assert(!serialized.includes("+918800000001"));
      assert.deepEqual(page.get("reviewSummary.distribution"),
        {"1": 0, "2": 0, "3": 1, "4": 1, "5": 2});

      const again = await rebuildOrganizerScope(h.db, h.organizerId,
        {now: at(1000), fanOut: false});
      assert.equal(again.organizerPage, "unchanged");
      assert.equal(again.eventPagesWritten, 0);
      assert.equal(again.eventPagesDeleted, 0);
      assert.equal(planChanges(
        await planOrganizerScope(h.db, h.organizerId, at(2000)())), false);
    } finally {
      await h.close();
    }
  });

test("withdrawing an event removes its page and its listing",
  {skip}, async () => {
    const h = await fixture();
    try {
      await rebuildOrganizerScope(h.db, h.organizerId,
        {now: at(0), fanOut: false});
      await h.db.doc(`events/${h.rename("open-upcoming")}`)
        .update({publicationState: "unpublished"});
      await h.db.doc(`externalEvents/${h.rename("ext-public")}`)
        .update({publicationStatus: "takenDown"});
      const result = await rebuildOrganizerScope(h.db, h.organizerId,
        {now: at(1000), fanOut: false});
      assert.equal(result.eventPagesDeleted, 2);
      const {page, events} = await h.pages();
      const ids = events.map((doc) => doc.id);
      assert(!ids.includes(h.rename("open-upcoming")));
      assert(!ids.includes(h.rename("ext-public")));
      const listed = JSON.stringify([page.get("upcomingEvents"),
        page.get("pastMoments")]);
      assert(!listed.includes(h.rename("open-upcoming")));
      assert(!listed.includes(h.rename("ext-public")));
    } finally {
      await h.close();
    }
  });

test("suppression removes every page and a stale rebuild cannot revive it",
  {skip}, async () => {
    const h = await fixture();
    try {
      await rebuildOrganizerScope(h.db, h.organizerId,
        {now: at(0), fanOut: false});
      // A slow rebuild reads the published organizer...
      const staleRead = inputs.now + 1000;
      const stale = buildOrganizerScope(
        await readOrganizerScope(h.db, h.organizerId, staleRead));
      assert(stale.organizerPage);
      // ...then the organizer is suppressed and a newer rebuild commits.
      await h.db.doc(`organizers/${h.organizerId}`)
        .update({"claim.state": "suppressed"});
      const suppressed = await rebuildOrganizerScope(h.db, h.organizerId,
        {now: at(2000), fanOut: false});
      assert.equal(suppressed.organizerPage, "deleted");
      assert.equal(suppressed.eventPagesDeleted, 5);
      const late = await commitOrganizerScope(h.db, h.organizerId, stale,
        staleRead);
      assert.equal(late.status, "superseded");
      const {page, events, marker} = await h.pages();
      assert.equal(page.exists, false);
      assert.equal(events.length, 0);
      assert.equal(marker.get("published"), false);

      // Lifting the suppression publishes the pages again.
      await h.db.doc(`organizers/${h.organizerId}`)
        .update({"claim.state": "unclaimed"});
      const restored = await rebuildOrganizerScope(h.db, h.organizerId,
        {now: at(3000), fanOut: false});
      assert.equal(restored.organizerPage, "written");
      assert.equal((await h.pages()).events.length, 5);
    } finally {
      await h.close();
    }
  });
