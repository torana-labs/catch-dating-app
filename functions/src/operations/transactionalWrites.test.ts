import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationCollections} from "./collections";
import {OperationDomainError} from "./errors";
import {operationRun, operationWorkItem} from "./testFixtures";
import {FakeFirestore} from "./testFirestore";
import {
  stageRunAndWorkItemCreate,
  stageRunCreate,
  stageRunSet,
  stageWorkItemCreate,
} from "./transactionalWrites";

const run = operationRun();
const item = operationWorkItem();
const runPath = `${operationCollections.runs}/${run.runId}`;
const itemPath = `${operationCollections.workItems}/${item.workItemId}`;

function transact(firestore: FakeFirestore,
  stage: (db: Firestore, tx: Transaction) => void): Promise<void> {
  const db = firestore as unknown as Firestore;
  return firestore.runTransaction(async (tx) => {
    stage(db, tx as unknown as Transaction);
  });
}

function invalidEntity(entity: string, path: string) {
  return (error: unknown) => error instanceof OperationDomainError &&
    error.code === "invalid_entity" &&
    error.message.startsWith(`${entity} is invalid`) &&
    error.message.includes(path);
}

test("stageRunCreate creates the run under its own id", async () => {
  const firestore = new FakeFirestore();
  await transact(firestore, (db, tx) => stageRunCreate(db, tx, run));
  assert.deepEqual(firestore.read(runPath), run);
  await assert.rejects(
    transact(firestore, (db, tx) => stageRunCreate(db, tx, run)),
    /already exists/);
});

test("stageRunSet replaces an existing run", async () => {
  const firestore = new FakeFirestore();
  firestore.write(runPath, {...run} as Record<string, unknown>);
  const next = operationRun({revision: 1, status: "running",
    startedAt: "2026-07-14T08:01:00.000Z",
    updatedAt: "2026-07-14T08:01:00.000Z"});
  await transact(firestore, (db, tx) => stageRunSet(db, tx, next));
  assert.deepEqual(firestore.read(runPath), next);
});

test("stageWorkItemCreate creates the work item under its own id",
  async () => {
    const firestore = new FakeFirestore();
    await transact(firestore, (db, tx) => stageWorkItemCreate(db, tx, item));
    assert.deepEqual(firestore.read(itemPath), item);
    assert.equal(firestore.read(runPath), undefined);
    await assert.rejects(
      transact(firestore, (db, tx) => stageWorkItemCreate(db, tx, item)),
      /already exists/);
  });

test("stageRunAndWorkItemCreate creates both records together", async () => {
  const firestore = new FakeFirestore();
  await transact(firestore, (db, tx) =>
    stageRunAndWorkItemCreate(db, tx, {run, item}));
  assert.deepEqual(firestore.read(runPath), run);
  assert.deepEqual(firestore.read(itemPath), item);
});

test("invalid runs are rejected before any write is staged", async () => {
  const firestore = new FakeFirestore();
  const started = operationRun({status: "running", startedAt: null});
  await assert.rejects(
    transact(firestore, (db, tx) => stageRunCreate(db, tx, started)),
    invalidEntity("run", "startedAt:run_started_at"));
  firestore.write(runPath, {...run} as Record<string, unknown>);
  await assert.rejects(
    transact(firestore, (db, tx) => stageRunSet(db, tx, started)),
    invalidEntity("run", "startedAt:run_started_at"));
  assert.deepEqual(firestore.read(runPath), run);
});

test("invalid work items are rejected before any write is staged",
  async () => {
    const firestore = new FakeFirestore();
    const finished = operationWorkItem({outcome: "published"});
    await assert.rejects(
      transact(firestore, (db, tx) => stageWorkItemCreate(db, tx, finished)),
      invalidEntity("work item", "outcome:work_item_nonterminal_outcome"));
    await assert.rejects(
      transact(firestore, (db, tx) =>
        stageRunAndWorkItemCreate(db, tx, {run, item: finished})),
      invalidEntity("work item", "outcome:work_item_nonterminal_outcome"));
    assert.deepEqual(firestore.entries(), []);
  });
