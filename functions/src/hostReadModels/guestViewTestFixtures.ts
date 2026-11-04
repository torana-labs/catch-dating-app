import {Timestamp} from "firebase-admin/firestore";
import type {Firestore} from "firebase-admin/firestore";
import type {FakeFirestore} from "../operations/testFirestore";
import type {GuestViewDeps} from "./guestViewSupport";

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
export function viewDeps(clock: {now: number}): GuestViewDeps {
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
