#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import {parseCommonArgs} from "../lib/cli_args.mjs";
import {
  assertProdWriteAllowed,
  resolveFirebaseProjectId,
} from "../lib/firebase_project.mjs";

/**
 * One-off purge of the retired swipe deck's stored likes, passes and like
 * comments, and of everything derived from them (owner decision, Nov 2026).
 *
 * The deck-era rule lives in functions/src/matching/deckEraDecision.ts and is
 * loaded from the Functions build, so this tool and the live matching code
 * classify decisions identically. A decision is deck-era when it is a pass,
 * carries any reaction field or a comment, or was created before
 * 2026-11-12T12:50:04Z.
 *
 * What it deletes, in this order (so a crash and rerun finishes the job):
 * 1. Chats (`matches/{id}`, conversationType `match` or none) whose mutual
 *    likes were not both current picks: their participantSignalFacts (by
 *    matchId), both
 *    `notifications/{uid}/items/match_{id}` items, every document in the
 *    chat's subcollections (messages, including `profileReaction_*`), then
 *    the chat document. Blocked chats are kept for safety review.
 * 2. Deck-era like facts in participantSignalFacts (outgoing_like,
 *    incoming_like, private_interest_sent/received).
 * 3. `profileReaction_*` messages left in chats that are kept because both
 *    people picked each other with current picks.
 * 4. The deck-era profileDecisions documents themselves (and with them every
 *    like comment).
 *
 * It never touches current picks, other conversation types, or anything
 * else. Storage chat images and BigQuery rows are ops steps documented in
 * docs/release_operations.md; the plan lists the Storage prefixes and
 * `--manifest` writes the deleted ids the BigQuery SQL needs.
 */

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const requireFromFunctions = createRequire(
  path.join(toolDir, "../../functions/package.json")
);

const PAGE_SIZE = 500;
const WRITE_BATCH = 400;
const LIKE_FACT_TYPES = new Set([
  "outgoing_like",
  "incoming_like",
  "private_interest_sent",
  "private_interest_received",
]);
const PRIVATE_INTEREST_TYPES = new Set([
  "private_interest_sent",
  "private_interest_received",
]);
const BIGQUERY_EXPORTED_COLLECTIONS = new Set(["participantSignalFacts", "matches"]);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

export async function main(argv = process.argv.slice(2), {
  admin: injectedAdmin = null,
  classifier: injectedClassifier = null,
} = {}) {
  const args = parseCommonArgs(argv, {
    booleanFlags: ["--summary-only"],
    valueFlags: ["--manifest"],
    allowPositionals: false,
    customFieldCase: "camel",
  });
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.env && !args.project && !args.emulatorHost) {
    throw new Error(
      "Name the target explicitly with --env <dev|prod>, --project <id> " +
      "or --emulator. This tool never falls back to an ambient project."
    );
  }
  if (args.manifest === true || args.manifest === "") {
    throw new Error("--manifest requires a file path.");
  }
  const projectId = resolveFirebaseProjectId({
    env: args.env, project: args.project, defaultEnv: null,
  });
  assertProdWriteAllowed({
    env: args.env, projectId, apply: args.apply,
    allowProd: args.allowProd, confirmProd: args.confirmProd,
    action: "purge deck-era records in",
  });
  if (args.emulatorHost) process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;

  const classifier = injectedClassifier ?? loadClassifier();
  const admin = injectedAdmin ?? requireFromFunctions("firebase-admin");
  admin.initializeApp({projectId});
  const db = admin.firestore();

  const plan = await buildDeckEraPurgePlan(db, {classifier});
  printPlan(plan, {json: args.json, summaryOnly: args.summaryOnly, projectId});
  if (args.manifest) writeManifest(args.manifest, plan);

  if (!args.apply) {
    console.log("\nDry run only. Nothing was deleted. Re-run with --apply to purge.");
    return;
  }

  const result = await applyDeckEraPurgePlan(db, plan);
  const after = await buildDeckEraPurgePlan(db, {classifier});
  if (args.json) {
    console.log(JSON.stringify({applied: result, after: after.summary}, null, 2));
  } else {
    console.log(`\nApplied: ${result.batches} batch(es), ${result.writes} write(s).`);
    console.log("Re-checked after apply:");
    printSummary(after.summary, {summaryOnly: true});
  }
}

export function loadClassifier() {
  try {
    return requireFromFunctions("./lib/matching/deckEraDecision.js");
  } catch (error) {
    throw new Error(
      "Could not load functions/lib/matching/deckEraDecision.js. " +
      "Run `npm --prefix functions run build` before this purge tool. " +
      `Original error: ${error.message}`
    );
  }
}

// ── Plan ──────────────────────────────────────────────────────────────────

export async function buildDeckEraPurgePlan(db, {classifier}) {
  const warnings = [];
  const decisions = await planDecisions(db, classifier, warnings);
  const chats = await planChats(db, decisions, warnings);
  const likeFacts = await planLikeFacts(db, decisions, classifier, warnings);

  const summary = {
    cutoff: classifier.deckRetiredAtIso,
    decisions: decisions.summary,
    likeSignalFacts: likeFacts.summary,
    chats: chats.summary,
    storageImagePrefixes: chats.storagePrefixes,
    warnings,
  };
  return {
    summary,
    // Deletion order matters: dependants first, the decisions last.
    chatFacts: chats.facts,
    chatNotifications: chats.notifications,
    chatSubcollectionDocs: chats.subcollectionDocs,
    chatDocs: chats.chatDocs,
    likeFacts: likeFacts.facts,
    keptChatReactionMessages: chats.keptChatReactionMessages,
    decisionDocs: decisions.deckEraDocs,
  };
}

async function planDecisions(db, classifier, warnings) {
  const byPair = new Map();
  const deckEraDocs = [];
  const summary = {
    scanned: 0,
    currentPicks: 0,
    deckEra: 0,
    byReason: {pass: 0, reactionOrComment: 0, beforeCutoff: 0},
    plainLikesCaughtOnlyByTimestamp: 0,
    withComment: 0,
    synthetic: 0,
    missingCreatedAt: 0,
  };
  for await (const doc of pagedDocs(db.collectionGroup("outgoing"))) {
    const match = /^profileDecisions\/([^/]+)\/outgoing\/([^/]+)$/u.exec(doc.ref.path);
    if (!match) continue;
    const [, swiperId, targetId] = match;
    const data = doc.data() ?? {};
    summary.scanned += 1;
    const reasons = classifier.deckEraReasons(data);
    const deckEra = reasons.length > 0;
    if (classifier.timestampMillis(data.createdAt) == null) {
      summary.missingCreatedAt += 1;
      warnings.push(`${doc.ref.path} has no readable createdAt; classified by its other fields only.`);
    }
    byPair.set(pairKey(swiperId, targetId), {
      path: doc.ref.path,
      swiperId,
      targetId,
      eventId: typeof data.eventId === "string" ? data.eventId : null,
      direction: data.direction,
      deckEra,
      currentPick: classifier.isCurrentPick(data),
    });
    if (!deckEra) {
      if (data.direction === "like") summary.currentPicks += 1;
      continue;
    }
    summary.deckEra += 1;
    for (const reason of reasons) summary.byReason[reason] += 1;
    if (reasons.length === 1 && reasons[0] === "beforeCutoff") {
      summary.plainLikesCaughtOnlyByTimestamp += 1;
    }
    if (data.comment != null) summary.withComment += 1;
    if (data.synthetic === true) summary.synthetic += 1;
    deckEraDocs.push({path: doc.ref.path, collection: "profileDecisions", id: doc.id});
  }
  return {byPair, deckEraDocs, summary};
}

/**
 * A chat is deleted when its two people's decisions about each other are both
 * likes and at least one of them is deck-era: the chat exists only because of
 * a deck-era like. It is kept when both are current picks (only its
 * `profileReaction_*` messages are removed), when it is blocked (kept for
 * safety review, untouched), and when the decisions do not show two likes
 * (origin unknown, untouched and reported).
 */
async function planChats(db, decisions, warnings) {
  const summary = {
    scanned: 0,
    deletedBothDeckEra: 0,
    deletedDeckEraWithOneCurrentPick: 0,
    keptBothCurrentPicks: 0,
    keptBlocked: 0,
    keptUnknownOrigin: 0,
    subcollectionDocsDeleted: 0,
    messagesWithImages: 0,
    profileReactionMessagesInDeletedChats: 0,
    profileReactionMessagesInKeptChats: 0,
    notificationsDeleted: 0,
    chatSignalFactsDeleted: 0,
  };
  const facts = [];
  const notifications = [];
  const subcollectionDocs = [];
  const chatDocs = [];
  const keptChatReactionMessages = [];
  const storagePrefixes = [];

  for await (const doc of pagedDocs(db.collection("matches"))) {
    const chat = doc.data() ?? {};
    const conversationType = chat.conversationType ?? null;
    if (conversationType !== null && conversationType !== "match") continue;
    summary.scanned += 1;
    const {user1Id, user2Id} = chat;
    if (typeof user1Id !== "string" || typeof user2Id !== "string") {
      summary.keptUnknownOrigin += 1;
      warnings.push(`${doc.ref.path} has no user1Id/user2Id; kept.`);
      continue;
    }
    const forward = decisions.byPair.get(pairKey(user1Id, user2Id));
    const reverse = decisions.byPair.get(pairKey(user2Id, user1Id));
    const mutualLikes = forward?.direction === "like" && reverse?.direction === "like";
    const deckEraSides = [forward, reverse].filter((side) => side?.deckEra).length;
    const reactionMessageRefs = [
      doc.ref.collection("messages").doc(`profileReaction_${user1Id}_${user2Id}`),
      doc.ref.collection("messages").doc(`profileReaction_${user2Id}_${user1Id}`),
    ];

    if (chat.status === "blocked") {
      if (mutualLikes && deckEraSides > 0) summary.keptBlocked += 1;
      continue;
    }
    if (!mutualLikes) {
      if (deckEraSides > 0) {
        summary.keptUnknownOrigin += 1;
        warnings.push(
          `${doc.ref.path} involves a deck-era decision but the pair's decisions ` +
          "are not two likes; kept."
        );
      }
      continue;
    }
    if (deckEraSides === 0) {
      summary.keptBothCurrentPicks += 1;
      for (const ref of reactionMessageRefs) {
        const message = await ref.get();
        if (!message.exists) continue;
        summary.profileReactionMessagesInKeptChats += 1;
        keptChatReactionMessages.push({path: ref.path, collection: "messages", id: ref.id});
      }
      continue;
    }

    if (deckEraSides === 2) summary.deletedBothDeckEra += 1;
    else summary.deletedDeckEraWithOneCurrentPick += 1;

    const factsSnap = await db.collection("participantSignalFacts")
      .where("matchId", "==", doc.id).get();
    for (const factDoc of factsSnap.docs) {
      facts.push(factEntry(factDoc));
      summary.chatSignalFactsDeleted += 1;
    }
    for (const uid of [user1Id, user2Id]) {
      const ref = db.collection("notifications").doc(uid)
        .collection("items").doc(`match_${doc.id}`);
      if ((await ref.get()).exists) {
        notifications.push({path: ref.path, collection: "notifications", id: ref.id});
        summary.notificationsDeleted += 1;
      }
    }
    const reactionPaths = new Set(reactionMessageRefs.map((ref) => ref.path));
    for (const subcollection of await doc.ref.listCollections()) {
      for await (const child of pagedDocs(subcollection)) {
        subcollectionDocs.push({path: child.ref.path, collection: subcollection.id, id: child.id});
        summary.subcollectionDocsDeleted += 1;
        if (reactionPaths.has(child.ref.path)) summary.profileReactionMessagesInDeletedChats += 1;
        const imageUrl = child.data()?.imageUrl;
        if (typeof imageUrl === "string" && imageUrl.length > 0) summary.messagesWithImages += 1;
      }
    }
    chatDocs.push({path: doc.ref.path, collection: "matches", id: doc.id});
    storagePrefixes.push(`matches/${doc.id}/images/`);
  }
  return {
    summary,
    facts,
    notifications,
    subcollectionDocs,
    chatDocs,
    keptChatReactionMessages,
    storagePrefixes,
  };
}

/**
 * Like facts carry no direction or reaction data, so each is matched back to
 * the decision it came from (swiper/target from uid, peerUid and direction).
 * - The decision exists for the same event: the fact follows its decision.
 * - Otherwise (the decision is gone or was for another event): the fact is
 *   deck-era if it is a private-interest fact, if it occurred before the
 *   cutoff, or if a private-interest fact exists for the same pair and event.
 *   Anything else is kept and counted as unresolved.
 */
async function planLikeFacts(db, decisions, classifier, warnings) {
  const summary = {
    scanned: 0,
    deckEra: 0,
    byType: {},
    keptCurrentPicks: 0,
    keptUnresolved: 0,
  };
  const candidates = [];
  const privateInterestPairs = new Set();
  for await (const doc of pagedDocs(
    db.collection("participantSignalFacts").where("source", "==", "swipe")
  )) {
    const fact = doc.data() ?? {};
    if (!LIKE_FACT_TYPES.has(fact.type)) continue;
    summary.scanned += 1;
    const pair = factPair(fact);
    if (!pair) {
      summary.keptUnresolved += 1;
      warnings.push(`${doc.ref.path} has no uid/peerUid/direction; kept.`);
      continue;
    }
    if (PRIVATE_INTEREST_TYPES.has(fact.type)) {
      privateInterestPairs.add(`${pairKey(pair.swiperId, pair.targetId)}@${fact.eventId ?? ""}`);
    }
    candidates.push({doc, fact, pair});
  }

  const facts = [];
  for (const {doc, fact, pair} of candidates) {
    const decision = decisions.byPair.get(pairKey(pair.swiperId, pair.targetId));
    let deckEra;
    if (decision && decision.eventId === (fact.eventId ?? null)) {
      deckEra = decision.deckEra;
    } else {
      const occurredAt = classifier.timestampMillis(fact.occurredAt);
      deckEra = PRIVATE_INTEREST_TYPES.has(fact.type) ||
        (occurredAt != null && occurredAt < classifier.deckRetiredAtMillis) ||
        privateInterestPairs.has(
          `${pairKey(pair.swiperId, pair.targetId)}@${fact.eventId ?? ""}`
        );
      if (!deckEra) {
        summary.keptUnresolved += 1;
        warnings.push(`${doc.ref.path} has no matching decision and is not provably deck-era; kept.`);
        continue;
      }
    }
    if (!deckEra) {
      summary.keptCurrentPicks += 1;
      continue;
    }
    summary.deckEra += 1;
    summary.byType[fact.type] = (summary.byType[fact.type] ?? 0) + 1;
    facts.push(factEntry(doc));
  }
  return {summary, facts};
}

// ── Apply ─────────────────────────────────────────────────────────────────

export async function applyDeckEraPurgePlan(db, plan) {
  const result = {batches: 0, writes: 0};
  const commit = async (writes) => {
    if (writes.length === 0) return;
    const batch = db.batch();
    for (const write of writes) write(batch);
    await batch.commit();
    result.batches += 1;
    result.writes += writes.length;
  };

  const applyDeletes = async (entries) => {
    for (let i = 0; i < entries.length; i += WRITE_BATCH) {
      await commit(entries.slice(i, i + WRITE_BATCH)
        .map((entry) => (batch) => batch.delete(db.doc(entry.path))));
    }
  };

  // A chat fact can also be a like fact; delete each path once.
  const facts = new Map([...plan.chatFacts, ...plan.likeFacts]
    .map((fact) => [fact.path, fact]));
  await applyDeletes([...facts.values()]);
  await applyDeletes(plan.chatNotifications);
  await applyDeletes(plan.chatSubcollectionDocs);
  await applyDeletes(plan.chatDocs);
  await applyDeletes(plan.keptChatReactionMessages);
  await applyDeletes(plan.decisionDocs);
  return result;
}

// ── Output ────────────────────────────────────────────────────────────────

export function manifestLines(plan) {
  const lines = [];
  const add = (entries) => {
    for (const entry of entries) {
      const collection = entry.path.split("/")[0];
      if (!BIGQUERY_EXPORTED_COLLECTIONS.has(collection) || entry.path.split("/").length !== 2) continue;
      lines.push(JSON.stringify({collection, document_id: entry.id}));
    }
  };
  add(plan.chatFacts);
  add(plan.likeFacts);
  add(plan.chatDocs);
  return lines;
}

function writeManifest(file, plan) {
  const lines = manifestLines(plan);
  fs.mkdirSync(path.dirname(path.resolve(file)), {recursive: true});
  fs.writeFileSync(file, lines.length > 0 ? `${lines.join("\n")}\n` : "");
  console.log(`\nWrote ${lines.length} BigQuery-exported document id(s) to ${file}.`);
}

function printPlan(plan, {json, summaryOnly, projectId}) {
  if (json) {
    console.log(JSON.stringify({projectId, ...plan.summary}, null, 2));
    return;
  }
  console.log(`Deck-era purge plan for ${projectId}`);
  printSummary(plan.summary, {summaryOnly});
}

function printSummary(summary, {summaryOnly = false} = {}) {
  const d = summary.decisions;
  const f = summary.likeSignalFacts;
  const c = summary.chats;
  console.log(`Cutoff: decisions created before ${summary.cutoff} are deck-era.`);
  console.log("\nProfile decisions");
  console.log(`  scanned: ${d.scanned}`);
  console.log(`  current picks kept: ${d.currentPicks}`);
  console.log(`  deck-era to delete: ${d.deckEra}`);
  console.log(`    by reason (a decision can match several): pass ${d.byReason.pass}, ` +
    `reaction or comment ${d.byReason.reactionOrComment}, before cutoff ${d.byReason.beforeCutoff}`);
  console.log(`    plain likes caught only by the timestamp: ${d.plainLikesCaughtOnlyByTimestamp}`);
  console.log(`    with a comment: ${d.withComment}`);
  console.log(`    synthetic (demo): ${d.synthetic}`);
  console.log(`  missing createdAt: ${d.missingCreatedAt}`);
  console.log("\nLike signal facts (participantSignalFacts, source swipe)");
  console.log(`  scanned: ${f.scanned}`);
  console.log(`  deck-era to delete: ${f.deckEra} ${JSON.stringify(f.byType)}`);
  console.log(`  current picks kept: ${f.keptCurrentPicks}`);
  console.log(`  unresolved kept: ${f.keptUnresolved}`);
  console.log("\nChats (matches, conversationType match)");
  console.log(`  scanned: ${c.scanned}`);
  console.log(`  delete, both likes deck-era: ${c.deletedBothDeckEra}`);
  console.log(`  delete, one deck-era like and one current pick: ${c.deletedDeckEraWithOneCurrentPick}`);
  console.log(`  keep, both current picks: ${c.keptBothCurrentPicks}`);
  console.log(`  keep, blocked (safety review): ${c.keptBlocked}`);
  console.log(`  keep, origin unknown: ${c.keptUnknownOrigin}`);
  console.log(`  chat documents to delete under deleted chats: ${c.subcollectionDocsDeleted} ` +
    `(${c.messagesWithImages} with images, ${c.profileReactionMessagesInDeletedChats} profileReaction)`);
  console.log(`  profileReaction messages to delete in kept chats: ${c.profileReactionMessagesInKeptChats}`);
  console.log(`  match notifications to delete: ${c.notificationsDeleted}`);
  console.log(`  chat signal facts to delete: ${c.chatSignalFactsDeleted}`);
  console.log(`\nStorage image prefixes for deleted chats: ${summary.storageImagePrefixes.length}`);
  if (!summaryOnly) {
    for (const prefix of summary.storageImagePrefixes.slice(0, 100)) console.log(`  ${prefix}`);
  }
  console.log(`\nWarnings: ${summary.warnings.length}`);
  if (!summaryOnly) {
    for (const warning of summary.warnings.slice(0, 100)) console.log(`  - ${warning}`);
    if (summary.warnings.length > 100) console.log(`  ... ${summary.warnings.length - 100} more`);
  }
}

function printHelp() {
  console.log(`Usage: node tool/data/purge_deck_era_records.mjs (--env <name> | --project <id> | --emulator) [options]

One-off purge of the retired swipe deck's likes, passes and like comments,
the chats that exist only because of them, and their derived signal facts.
Dry run by default. Build Functions first
(npm --prefix functions run build): the deck-era rule is loaded from
functions/lib/matching/deckEraDecision.js.

Options:
  --env <dev|prod>  Resolve the project id from .firebaserc.
  --project <id>            Firebase project id.
  --emulator                Use the Firestore emulator at 127.0.0.1:8080.
  --emulator-host <host>    Use a custom Firestore emulator host.
  --apply                   Delete the planned documents. Default is a dry run.
  --allow-prod              Required with --apply when the target is prod.
  --manifest <path>         Write the deleted participantSignalFacts and matches
                            ids (NDJSON) for the BigQuery cleanup.
  --summary-only            Omit Storage prefixes and warnings from text output.
  --json                    Print the plan summary as JSON.
  -h, --help                Show this help.
`);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function pairKey(swiperId, targetId) {
  return `${swiperId}->${targetId}`;
}

function factPair(fact) {
  if (typeof fact.uid !== "string" || typeof fact.peerUid !== "string") return null;
  if (fact.direction === "sent") return {swiperId: fact.uid, targetId: fact.peerUid};
  if (fact.direction === "received") return {swiperId: fact.peerUid, targetId: fact.uid};
  return null;
}

function factEntry(doc) {
  const data = doc.data() ?? {};
  return {
    path: doc.ref.path,
    collection: "participantSignalFacts",
    id: doc.id,
    uid: data.uid,
    type: data.type,
    value: typeof data.value === "number" ? data.value : 1,
  };
}

async function* pagedDocs(query) {
  let last = null;
  for (;;) {
    let page = query.orderBy("__name__").limit(PAGE_SIZE);
    if (last) page = page.startAfter(last);
    const snap = await page.get();
    for (const doc of snap.docs) yield doc;
    if (snap.docs.length < PAGE_SIZE) return;
    last = snap.docs[snap.docs.length - 1];
  }
}
