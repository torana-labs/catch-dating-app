import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import {validateCityPlansDocument} from
  "../shared/generated/validators/cityPlansDocument";
import {readPublicPageFixture} from "../publicPages/publicPageTestFixtures";
import {cityPlansCollection, rebuildCityPlans} from "./rebuild";
import type {CityMarket} from "./cityPlansModel";

const projectId = "demo-catch-rules";
type Row = Record<string, unknown>;
const hour = 60 * 60 * 1000;
const now = Date.parse("2026-10-28T06:00:00.000Z");
const json = (data: unknown) => JSON.parse(JSON.stringify(data));

const page = readPublicPageFixture("../valid/organizer_public_page_doc.json") as
  Row;
const baseEvent = (page.upcomingEvents as Row[])
  .find((item) => item.source === "catch") as Row;
const organizer = (readPublicPageFixture("parity_inputs.json") as
  {cases: Array<{organizer: {data: Row}}>}).cases[0].organizer.data;

function plan(id: string, startsIn: number): Row {
  return {...baseEvent, eventId: id, path: `/events/${id}/`,
    event: {...(baseEvent.event as Row), id, title: `Plan ${id}`,
      startTime: new Date(now + startsIn).toISOString(), endTime: null},
    booking: {...(baseEvent.booking as Row), path: `/events/${id}/`}};
}

/** Each run builds its own market, so no other test's pages are in it. */
async function fixture() {
  const run = randomUUID().slice(0, 8);
  const app = initializeApp({projectId}, `city-plans-${run}`);
  const db = getEmulatorFirestore(app);
  const slug = `city-${run}`;
  const refs: FirebaseFirestore.DocumentReference[] = [
    db.collection(cityPlansCollection).doc(slug)];
  const put = async (path: string, data: Row) => {
    const ref = db.doc(path);
    await ref.set(data);
    refs.push(ref);
  };
  const close = async () => {
    await Promise.all(refs.map((ref) => ref.delete()));
    await db.terminate();
    await deleteApp(app);
  };
  return {db, run, slug, put, close};
}

test("a launched city is built from its organizer pages, and a stale " +
  "rebuild is discarded", {skip: !process.env.FIRESTORE_EMULATOR_HOST},
async () => {
  const h = await fixture();
  try {
    const market: CityMarket = {slug: h.slug, label: "Test City",
      launchStatus: "launched"};
    for (const [index, id] of ["a", "b"].entries()) {
      const organizerId = `org-${id}-${h.run}`;
      await h.put(`organizerPublicPage/${organizerId}`, {...page,
        organizerId, path: `/organizers/${organizerId}/`,
        identity: {...(page.identity as Row), citySlug: h.slug},
        upcomingEvents: [plan(`p${id}1-${h.run}`, (index + 1) * hour),
          plan(`p${id}2-${h.run}`, (index + 3) * 24 * hour)]});
    }
    assert.equal(await rebuildCityPlans(h.db, market, () => now), "written");
    const stored = await h.db.collection(cityPlansCollection).doc(h.slug)
      .get();
    assert.equal(validateCityPlansDocument(json(stored.data())), true,
      JSON.stringify(validateCityPlansDocument.errors));
    assert.equal(stored.get("status"), "live");
    assert.equal(stored.get("planCount"), 4);
    assert.deepEqual(stored.get("organizers").map(
      (item: Row) => item.organizerId), [`org-a-${h.run}`, `org-b-${h.run}`]);

    // A rebuild that read its sources earlier changes nothing.
    assert.equal(await rebuildCityPlans(h.db, {...market, label: "Stale"},
      () => now - hour), "superseded");
    assert.equal((await stored.ref.get()).get("cityLabel"), "Test City");
  } finally {
    await h.close();
  }
});

test("a planned city lists published organisers without page links",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
    const h = await fixture();
    try {
      const market: CityMarket = {slug: h.slug, label: "Soon City",
        launchStatus: "planned"};
      const organizerPage = organizer.publicPage as Row;
      const joining = `joining-${h.run}`;
      await h.put(`organizers/${joining}`, {...organizer,
        publicPage: {...organizerPage, citySlug: h.slug,
          slug: joining, canonicalPath: `/organizers/${joining}/`}});
      await h.put(`organizers/draft-${h.run}`, {...organizer,
        publicPage: {...organizerPage, citySlug: h.slug,
          publishStatus: "draft"}});
      assert.equal(await rebuildCityPlans(h.db, market, () => now),
        "written");
      const stored = await h.db.collection(cityPlansCollection).doc(h.slug)
        .get();
      assert.equal(validateCityPlansDocument(json(stored.data())), true,
        JSON.stringify(validateCityPlansDocument.errors));
      assert.equal(stored.get("status"), "launchingSoon");
      assert.deepEqual(stored.get("plans"), []);
      const organizers = stored.get("organizers") as Row[];
      assert.deepEqual(organizers.map((item) => [item.organizerId,
        item.path]), [[joining, null]]);
      const serialized = JSON.stringify(stored.data());
      assert(!serialized.includes("race.course@example.test"));
      assert(!serialized.includes("+918800000001"));
    } finally {
      await h.close();
    }
  });
