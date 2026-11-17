import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  applyDeckEraPurgePlan,
  buildDeckEraPurgePlan,
  loadClassifier,
  main,
  manifestLines,
} from "./purge_deck_era_records.mjs";
import {
  createFakeFirestore,
  fakeAdmin,
  fakeFieldValues,
  fakeTimestamp,
} from "./fixtures/deck_era_purge/fake_firestore.mjs";
import {
  AFTER_CUTOFF,
  BEFORE_CUTOFF,
  deckEraPurgeWorld,
} from "./fixtures/deck_era_purge/world.mjs";

// The real rule from the Functions build (npm --prefix functions run build).
const classifier = loadClassifier();
const plan = (db) => buildDeckEraPurgePlan(db, {classifier});
const apply = async (db) =>
  applyDeckEraPurgePlan(db, await plan(db), {fieldValues: fakeFieldValues});

test("the dry-run plan counts deck-era records by reason", async () => {
  const db = createFakeFirestore(deckEraPurgeWorld());
  const {summary} = await plan(db);

  assert.deepEqual(summary.decisions, {
    scanned: 11,
    currentPicks: 4,
    deckEra: 7,
    byReason: {pass: 1, reactionOrComment: 3, beforeCutoff: 5},
    plainLikesCaughtOnlyByTimestamp: 3,
    withComment: 1,
    synthetic: 0,
    missingCreatedAt: 0,
  });
  assert.deepEqual(summary.likeSignalFacts, {
    scanned: 26,
    deckEra: 16,
    byType: {
      outgoing_like: 7,
      incoming_like: 7,
      private_interest_sent: 1,
      private_interest_received: 1,
    },
    keptCurrentPicks: 8,
    keptUnresolved: 2,
  });
  assert.deepEqual(summary.chats, {
    scanned: 4,
    deletedBothDeckEra: 1,
    deletedDeckEraWithOneCurrentPick: 1,
    keptBothCurrentPicks: 1,
    keptBlocked: 1,
    keptUnknownOrigin: 0,
    subcollectionDocsDeleted: 4,
    messagesWithImages: 1,
    profileReactionMessagesInDeletedChats: 1,
    profileReactionMessagesInKeptChats: 1,
    notificationsDeleted: 4,
    chatSignalFactsDeleted: 12,
  });
  assert.deepEqual(summary.storageImagePrefixes, [
    "matches/ana_ben/images/",
    "matches/cal_dee/images/",
  ]);
  // A dry run writes nothing.
  assert.equal(db.log.batches, 0);
});

test("apply deletes only deck-era records and what came from them", async () => {
  const world = deckEraPurgeWorld();
  const db = createFakeFirestore(world);
  await apply(db);
  const has = (docPath) => db.docs.has(docPath);

  // Deck-era decisions, comments included, are gone; current picks stay.
  for (const gone of ["ana/outgoing/ben", "ben/outgoing/ana", "cal/outgoing/dee",
    "gia/outgoing/hal", "hal/outgoing/gia", "ivy/outgoing/jon", "jon/outgoing/ivy"]) {
    assert.equal(has(`profileDecisions/${gone}`), false, gone);
  }
  for (const kept of ["dee/outgoing/cal", "eve/outgoing/fin", "fin/outgoing/eve",
    "kim/outgoing/lee"]) {
    assert.deepEqual(db.docs.get(`profileDecisions/${kept}`), world[`profileDecisions/${kept}`]);
  }

  // Chats that exist only because of a deck-era like go with everything in them.
  for (const matchId of ["ana_ben", "cal_dee"]) {
    assert.equal(has(`matches/${matchId}`), false);
    assert.deepEqual([...db.docs.keys()].filter((key) => key.includes(matchId)), []);
  }
  // Two current picks: the chat stays, only the deck comment message goes.
  assert.ok(has("matches/eve_fin"));
  assert.ok(has("matches/eve_fin/messages/m1"));
  assert.equal(has("matches/eve_fin/messages/profileReaction_eve_fin"), false);
  assert.ok(has("notifications/eve/items/match_eve_fin"));
  // Blocked chats and other conversation types are untouched.
  const untouched = Object.keys(world).filter((key) =>
    (key.includes("ivy_jon") || key.includes("plan_ana_cal")) && !key.includes("swipe_"));
  assert.equal(untouched.length, 10);
  for (const key of untouched) {
    assert.deepEqual(db.docs.get(key), world[key], key);
  }

  // Facts: current picks and unresolved stay; deck-era likes go.
  const facts = [...db.docs.keys()].filter((key) => key.startsWith("participantSignalFacts/"));
  assert.equal(facts.some((key) => /swipe_(ana|ben|cal|hal|ivy|jon|old)_/u.test(key)), false);
  for (const kept of ["dee_cal", "eve_fin", "fin_eve", "kim_lee", "max_ned"]) {
    assert.ok(facts.some((key) => key.includes(`swipe_${kept}_`)), kept);
  }

  // Counters drop by exactly what was deleted; unrelated counters are kept.
  const counter = (uid) => db.docs.get(`participantMetricCounters/${uid}`);
  assert.deepEqual(counter("ana").counters, {
    outgoing_like: 0, incoming_like: 0, match_created: 0,
    chat_message_sent: 0, chat_message_received: 0, event_attended: 3,
  });
  assert.deepEqual(Object.keys(counter("ana").lastSeenByType), []);
  // dee keeps her own current pick and loses the deck like she received.
  assert.deepEqual(counter("dee").counters, {
    outgoing_like: 1, incoming_like: 0, match_created: 0, chat_message_sent: 0,
  });
  assert.equal(counter("dee").lastSeenByType.outgoing_like.toMillis(), Date.parse(AFTER_CUTOFF));
  assert.equal(counter("dee").lastSeenByType.incoming_like, undefined);
  // The blocked chat's match fact is kept, its deck like facts are not.
  assert.deepEqual(counter("ivy").counters, {
    outgoing_like: 0, incoming_like: 0, match_created: 1, chat_message_sent: 1,
  });
  assert.equal(counter("ivy").lastSeenByType.match_created.toMillis(), Date.parse(BEFORE_CUTOFF));
  assert.deepEqual(counter("eve"), world["participantMetricCounters/eve"]);
});

test("a second run finds nothing and writes nothing", async () => {
  const db = createFakeFirestore(deckEraPurgeWorld());
  await apply(db);
  const again = await plan(db);
  assert.equal(again.summary.decisions.deckEra, 0);
  assert.equal(again.summary.likeSignalFacts.deckEra, 0);
  assert.equal(again.summary.chats.deletedBothDeckEra +
    again.summary.chats.deletedDeckEraWithOneCurrentPick, 0);
  assert.equal(again.summary.chats.profileReactionMessagesInKeptChats, 0);
  assert.deepEqual(await applyDeckEraPurgePlan(db, again, {fieldValues: fakeFieldValues}),
    {batches: 0, writes: 0});
});

test("a run that fails midway finishes on rerun without double decrements", async () => {
  const complete = createFakeFirestore(deckEraPurgeWorld());
  await apply(complete);

  const crashed = createFakeFirestore(bulkWorld(deckEraPurgeWorld(), 450));
  crashed.failOnCommit = (batchNumber) => batchNumber === 2;
  await assert.rejects(apply(crashed), /Injected commit failure/u);
  assert.equal(crashed.log.batches, 1);
  crashed.failOnCommit = null;
  await apply(crashed);

  const reference = createFakeFirestore(bulkWorld(deckEraPurgeWorld(), 450));
  await apply(reference);
  assert.deepEqual(snapshot(crashed), snapshot(reference));
  assert.equal(crashed.docs.get("participantMetricCounters/bulk").counters.outgoing_like, 0);
  assert.equal(crashed.docs.get("participantMetricCounters/bulk").counters.event_attended, 2);
  assert.ok(Math.max(...reference.log.batchSizes) <= 400);
  assert.ok(reference.log.batches > 3);
  for (const key of complete.docs.keys()) assert.ok(reference.docs.has(key), key);
});

test("the manifest lists only BigQuery-exported ids that are deleted", async () => {
  const db = createFakeFirestore(deckEraPurgeWorld());
  const lines = manifestLines(await plan(db)).map((line) => JSON.parse(line));
  assert.equal(lines.filter((line) => line.collection === "participantSignalFacts").length, 28);
  assert.deepEqual(lines.filter((line) => line.collection === "matches"),
    [{collection: "matches", document_id: "ana_ben"},
      {collection: "matches", document_id: "cal_dee"}]);
  assert.equal(lines.some((line) => line.document_id.includes("swipe_eve_fin")), false);
});

test("the CLI is dry-run by default, needs a target, and guards prod", async (t) => {
  const output = captureConsole(t);
  const admin = fakeAdmin(deckEraPurgeWorld());
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deck-era-purge-"));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const manifest = path.join(dir, "manifest.ndjson");

  await main(["--emulator", "--json", "--manifest", manifest], {admin, classifier});
  assert.equal(admin.db.log.batches, 0);
  const report = JSON.parse(output.text().slice(0, output.text().indexOf("\n}\n") + 2));
  assert.equal(report.decisions.deckEra, 7);
  assert.match(output.text(), /Dry run only\. Nothing was deleted\./u);
  assert.equal(fs.readFileSync(manifest, "utf8").trim().split("\n").length, 30);

  await assert.rejects(main([], {admin, classifier}), /Name the target explicitly/u);
  await assert.rejects(main(["--apply"], {admin, classifier}), /Name the target explicitly/u);
  await assert.rejects(main(["--env", "prod", "--apply"], {admin, classifier}),
    /Refusing to purge deck-era records in prod without --allow-prod/u);
  await assert.rejects(main(["--emulator", "--manifest"], {admin, classifier}));
  assert.equal(admin.db.log.batches, 0);

  output.clear();
  await main(["--emulator", "--apply", "--summary-only"], {admin, classifier});
  assert.ok(admin.db.log.batches > 0);
  assert.match(output.text(), /Re-checked after apply:[\s\S]*deck-era to delete: 0/u);
});

function bulkWorld(docs, count) {
  const at = fakeTimestamp(BEFORE_CUTOFF);
  for (let i = 0; i < count; i += 1) {
    const target = `peer-${String(i).padStart(3, "0")}`;
    docs[`profileDecisions/bulk/outgoing/${target}`] = {
      swiperId: "bulk", targetId: target, eventId: "event-1", direction: "like", createdAt: at,
    };
    docs[`participantSignalFacts/outgoing_like__bulk__swipe_bulk_${target}_event-1`] = {
      uid: "bulk", type: "outgoing_like", source: "swipe", direction: "sent", value: 1,
      eventId: "event-1", peerUid: target, occurredAt: at, createdAt: at,
    };
  }
  docs["participantMetricCounters/bulk"] = {
    uid: "bulk", counters: {outgoing_like: count, event_attended: 2},
    lastSeenByType: {outgoing_like: at},
  };
  return docs;
}

function snapshot(db) {
  return JSON.stringify([...db.docs.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function captureConsole(t) {
  let lines = [];
  const original = console.log;
  console.log = (...args) => lines.push(args.join(" "));
  t.after(() => {
    console.log = original;
  });
  return {text: () => lines.join("\n"), clear: () => {
    lines = [];
  }};
}
