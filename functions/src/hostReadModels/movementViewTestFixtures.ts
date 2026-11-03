import {Timestamp} from "firebase-admin/firestore";
import type {Firestore} from "firebase-admin/firestore";
import type {FakeFirestore} from "../operations/testFirestore";
import {
  departureViewsCollection,
  groupProgressViewsCollection,
  LiveContext,
  MovementViewDeps,
} from "./movementViewSupport";
import {reconcileGroupProgressViews} from "./groupProgressViewStore";
import {reconcileDepartureView, rosterIdsForEvent} from
  "./departureViewStore";
import {progressIdentity} from
  "../eventSuccess/operations/groupProgressSource";

type Data = Record<string, unknown>;

/**
 * The shared fake has no transaction delete. Views delete stale documents,
 * so record deletes and apply them after the fake commits the writes.
 */
export function allowDeletes(fake: FakeFirestore): void {
  const marked = fake as FakeFirestore & {deletesAllowed?: true};
  if (marked.deletesAllowed) return;
  marked.deletesAllowed = true;
  const run = fake.runTransaction.bind(fake);
  type Callback = (tx: unknown) => Promise<unknown>;
  fake.runTransaction = (async (callback: Callback) => {
    const deletes: string[] = [];
    const result = await run(async (tx) => {
      Object.assign(tx, {delete: (ref: {path: string}) => {
        deletes.push(ref.path);
      }});
      return callback(tx);
    });
    for (const path of deletes) fake.remove(path);
    return result;
  }) as FakeFirestore["runTransaction"];
}

/** View evaluators read the same clock as the stores under test. */
export function viewDeps(clock: {now: number}): MovementViewDeps {
  return {now: () => Timestamp.fromMillis(clock.now)};
}

/** Every document of one collection, keyed by id. */
export function documentsOf(fake: FakeFirestore, collection: string):
  Map<string, Data> {
  return new Map(fake.entries()
    .filter(([path]) => path.startsWith(collection + "/"))
    .map(([path, value]) => [path.slice(collection.length + 1), value]));
}

/** The callable view a manager read returned, as the view stores it. */
export function withoutServerTime<T extends {serverTime: number}>(view: T):
  Omit<T, "serverTime"> {
  const {serverTime: _serverTime, ...rest} = view;
  void _serverTime;
  return rest;
}

export function asFirestore(fake: FakeFirestore): Firestore {
  return fake as unknown as Firestore;
}

/**
 * One departure history page as the phone assembles it from the views:
 * the group's view (the current revision) and its departure views, newest
 * first. Evaluates the event's views first, as the triggers would have.
 */
export async function historyPageFromViews(fake: FakeFirestore,
  scope: {context: LiveContext; groupId: string}, actorUid: string,
  clock: {now: number}) {
  allowDeletes(fake);
  const db = asFirestore(fake);
  const deps = viewDeps(clock);
  await reconcileGroupProgressViews(db, scope.context.eventId, deps);
  for await (const rosterId of rosterIdsForEvent(db, scope.context.eventId)) {
    await reconcileDepartureView(db, rosterId, deps);
  }
  const progressId = progressIdentity(scope.context, scope.groupId);
  const group = (await db.collection(groupProgressViewsCollection)
    .doc(progressId).get()).data() as {view: {revision: number}};
  const rows = (await db.collection(departureViewsCollection)
    .where("progressId", "==", progressId).get()).docs
    .map((doc) => doc.data() as {progressRevision: number; view: unknown})
    .sort((a, b) => b.progressRevision - a.progressRevision);
  const page = rows.slice(0, 10);
  return {context: scope.context, groupId: scope.groupId, actorUid,
    validUntil: Number.MAX_SAFE_INTEGER, serverTime: clock.now,
    progressRevision: Math.max(group.view.revision,
      ...page.map((row) => row.progressRevision)),
    coverage: "page" as const, rosters: page.map((row) => row.view),
    nextBeforeRevision: rows.length > 10 ? page.at(-1)!.progressRevision :
      null};
}
