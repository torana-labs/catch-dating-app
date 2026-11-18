import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "./testing/fakeFirestore";
import {
  COMMAND_RECEIPT_RETENTION_MS,
  buildCommandReceipt,
  claimCommandReceipt,
  commandReceiptId,
  commandReceiptRef,
  commandRequestHash,
  readCommandReceipt,
  writeCommandReceipt,
} from "./commandReceipts";

const NOW = 1_700_000_000_000;

/** Runs one command the way every migrated command does. */
async function run(
  db: FakeFirestore,
  options: {
    id: string; hash: string; nowMillis?: number;
    result?: Record<string, unknown>;
  }
): Promise<string> {
  const firestore = db as unknown as FirebaseFirestore.Firestore;
  const ref = commandReceiptRef(firestore, "demoCommand", options.id);
  const nowMillis = options.nowMillis ?? NOW;
  return firestore.runTransaction(async (tx) => {
    const lookup = await readCommandReceipt<{revision: number}>(tx, ref, {
      command: "demoCommand", requestHash: options.hash, nowMillis,
    });
    if (lookup.kind === "replay") {
      return `replay:${lookup.result?.revision}`;
    }
    if (lookup.kind === "conflict") return "conflict";
    writeCommandReceipt(tx, ref, {
      command: "demoCommand", retention: "request",
      requestHash: options.hash, nowMillis,
      result: options.result ?? {revision: 7},
    });
    return "applied";
  });
}

test("a receipt id is the command and the id", () => {
  assert.equal(commandReceiptId("onMatchCreated", "match-1_a"),
    "onMatchCreated_match-1_a");
  assert.equal(commandReceiptId("setEventCloseOut", "abc123:9.x-y"),
    "setEventCloseOut_abc123:9.x-y");
});

test("an unsafe or long id is hashed, deterministically", () => {
  const slash = commandReceiptId("demoCommand", "a/b");
  assert.match(slash, /^demoCommand_h[a-f0-9]{64}$/);
  assert.equal(commandReceiptId("demoCommand", "a/b"), slash);
  assert.notEqual(commandReceiptId("demoCommand", "a/c"), slash);
  assert.match(commandReceiptId("demoCommand", "x".repeat(101)),
    /^demoCommand_h[a-f0-9]{64}$/);
  assert.equal(commandReceiptId("demoCommand", "x".repeat(100)),
    `demoCommand_${"x".repeat(100)}`);
});

test("a command name or id that cannot name a document is refused", () => {
  assert.throws(() => commandReceiptId("Demo", "id"), /Invalid command/);
  assert.throws(() => commandReceiptId("demo_command", "id"),
    /Invalid command/);
  assert.throws(() => commandReceiptId("demoCommand", ""), /non-empty/);
});

test("the request hash ignores key order and dropped fields", () => {
  const first = commandRequestHash("a", {x: 1, y: [1, {b: 2, a: 1}]});
  assert.equal(commandRequestHash("a",
    {y: [1, {a: 1, b: 2}], x: 1, gone: undefined}), first);
  assert.notEqual(commandRequestHash("a", {x: 2, y: [1, {a: 1, b: 2}]}),
    first);
  assert.notEqual(commandRequestHash("b", {x: 1, y: [1, {a: 1, b: 2}]}),
    first);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test("an exact retry replays the stored result; a new id applies", async () => {
  const db = new FakeFirestore();
  const hash = commandRequestHash("one");
  assert.equal(await run(db, {id: "req-1", hash}), "applied");
  assert.equal(await run(db, {id: "req-1", hash}), "replay:7");
  assert.equal(await run(db, {id: "req-2", hash}), "applied");
  assert.deepEqual(db.paths("commandReceipts/"),
    ["commandReceipts/demoCommand_req-1", "commandReceipts/demoCommand_req-2"]);
});

test("a different request under the same id is a conflict", async () => {
  const db = new FakeFirestore();
  assert.equal(await run(db, {id: "req-1", hash: commandRequestHash("one")}),
    "applied");
  assert.equal(await run(db, {id: "req-1", hash: commandRequestHash("two")}),
    "conflict");
});

test("a receipt past expiresAt counts as absent and is replaced", async () => {
  const db = new FakeFirestore();
  const hash = commandRequestHash("one");
  await run(db, {id: "req-1", hash});
  const later = NOW + COMMAND_RECEIPT_RETENTION_MS.request + 1;
  assert.equal(await run(db, {id: "req-1", hash: commandRequestHash("two"),
    nowMillis: later, result: {revision: 9}}), "applied");
  assert.equal(await run(db, {id: "req-1", hash: commandRequestHash("two"),
    nowMillis: later}), "replay:9");
});

test("a receipt stores the command, hash, result and its expiry", () => {
  const hash = commandRequestHash("one");
  const receipt = buildCommandReceipt({command: "demoCommand",
    retention: "trigger", requestHash: hash, result: {revision: 1},
    nowMillis: NOW});
  assert.deepEqual(Object.keys(receipt).sort(),
    ["command", "createdAt", "expiresAt", "requestHash", "result"]);
  assert.equal((receipt.createdAt as Timestamp).toMillis(), NOW);
  assert.equal((receipt.expiresAt as Timestamp).toMillis(),
    NOW + COMMAND_RECEIPT_RETENTION_MS.trigger);
});

test("a receipt with no request or result carries neither field", () => {
  const receipt = buildCommandReceipt({command: "onMatchCreated",
    retention: "trigger", nowMillis: NOW});
  assert.deepEqual(Object.keys(receipt).sort(),
    ["command", "createdAt", "expiresAt"]);
});

test("a malformed hash or an oversized result is refused", () => {
  assert.throws(() => buildCommandReceipt({command: "demoCommand",
    retention: "request", requestHash: "nope", nowMillis: NOW}), /SHA-256/);
  assert.throws(() => buildCommandReceipt({command: "demoCommand",
    retention: "request", nowMillis: NOW,
    result: {blob: "x".repeat(5000)}}), /limited to/);
});

test("only the first delivery claims a dedupe receipt", async () => {
  const db = new FakeFirestore();
  const firestore = db as unknown as FirebaseFirestore.Firestore;
  const claim = (nowMillis: number) => claimCommandReceipt(firestore, {
    command: "onMatchCreated", id: "match-1", retention: "trigger",
    nowMillis,
  });
  const [first, second] = await Promise.all([claim(NOW), claim(NOW)]);
  assert.deepEqual([first, second].sort(), [false, true]);
  assert.equal(await claim(NOW + 1), false);
  assert.equal(await claim(NOW + COMMAND_RECEIPT_RETENTION_MS.trigger + 1),
    true);
  assert.deepEqual(db.paths("commandReceipts/"),
    ["commandReceipts/onMatchCreated_match-1"]);
});
