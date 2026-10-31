import assert from "node:assert/strict";
import {Timestamp} from "firebase-admin/firestore";

export type Row = Record<string, unknown>;
class Ref {
  constructor(readonly path: string,
    private readonly rows: Map<string, Row>) {}
  async get() {
    const value = this.rows.get(this.path);
    return {exists: value !== undefined, data: () => value};
  }
}
class Query {
  constructor(readonly collectionPath: string,
    private readonly rows: Map<string, Row>,
    readonly filters: Array<[string, unknown]> = [],
    readonly after: string | null = null,
    readonly max = Infinity) {}
  doc(id: string) {
    return new Ref(`${this.collectionPath}/${id}`,
      this.rows);
  }
  where(field: string, op: string, value: unknown) {
    assert.equal(op, "==");
    return new Query(this.collectionPath, this.rows, [...this.filters,
      [field, value]], this.after, this.max);
  }
  select(...fields: string[]) {
    void fields;
    return this;
  }
  orderBy(_field: unknown) {
    void _field;
    return this;
  }
  startAfter(id: string) {
    return new Query(this.collectionPath,
      this.rows, this.filters, id, this.max);
  }
  limit(max: number) {
    return new Query(this.collectionPath,
      this.rows, this.filters, this.after, max);
  }
}
export class Store {
  rows = new Map<string, Row>();
  writes: Array<{kind: string; path: string}> = [];
  transactionCount = 0;
  failTransactionNumber: number | null = null;
  beforeTransaction: (() => void) | null = null;
  collection(name: string) {
    return new Query(name, this.rows);
  }
  async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    this.transactionCount++;
    this.beforeTransaction?.();
    if (this.transactionCount === this.failTransactionNumber) {
      throw new Error("interrupted transaction");
    }
    const pending: Array<() => void> = [];
    const tx = {
      get: async (source: Ref | Query) => {
        assert.equal(pending.length, 0, "reads must precede writes");
        if (source instanceof Ref) {
          const value = this.rows.get(source.path);
          return {exists: value !== undefined, data: () => value};
        }
        const docs = [...this.rows.entries()]
          .filter(([path, row]) => path.startsWith(
            `${source.collectionPath}/`) &&
            source.filters.every(([field, expected]) =>
              row[field] === expected))
          .sort(([left], [right]) => left.localeCompare(right))
          .filter(([path]) => source.after === null ||
            path.split("/").at(-1)! > source.after!)
          .slice(0, source.max)
          .map(([path, row]) => ({id: path.split("/").at(-1)!,
            data: () => row}));
        return {size: docs.length, docs};
      },
      create: (ref: Ref, value: Row) => pending.push(() => {
        if (this.rows.has(ref.path)) throw new Error("already exists");
        this.rows.set(ref.path, value);
        this.writes.push({kind: "create", path: ref.path});
      }),
      update: (ref: Ref, value: Row) => pending.push(() => {
        assert.equal(this.rows.has(ref.path), true);
        this.rows.set(ref.path, {...this.rows.get(ref.path), ...value});
        this.writes.push({kind: "update", path: ref.path});
      }),
      delete: (ref: Ref) => pending.push(() => {
        this.rows.delete(ref.path);
        this.writes.push({kind: "delete", path: ref.path});
      }),
    };
    const result = await fn(tx);
    pending.forEach((write) => write());
    return result;
  }
  db() {
    return this as unknown as FirebaseFirestore.Firestore;
  }
}
export function migrationTestEvent(): Row {
  return {organizerId: "org1", name: "Event",
    startTime: Timestamp.fromMillis(100000), status: "active",
    publicationState: "private", setupRevision: 1,
    publicRegistrationEnabled: false, eventCityId: "city1",
    eventMarketId: "market1", eventLocalDate: "2026-10-21",
    eventLocalStartTime: "18:00", eventTimezone: "Asia/Kolkata",
    setupDefaults: {city: {value: {cityId: "city1", marketId: "market1"},
      source: "event"}, timezone: {value: "Asia/Kolkata", source: "event"},
    organizerDefaultsRevision: null, organizerDefaultsHash: "a".repeat(64)},
    capacityLimit: 200, bookedCount: 0, checkedInCount: 0,
    waitlistedCount: 0, cancelledAt: null, cancellationReason: null,
    genderCounts: {}, cohortCounts: {}, waitlistedCohortCounts: {}};
}
export function migrationTestAttendee(
  index: number, phone: string | null = null
): Row {
  return {eventId: "event1", organizerId: "org1", source: "hostImport",
    status: "registered", linkedUid: null, phoneE164: phone,
    externalReference: `external-${index}`, sourceRowId: `row-${index}`};
}
