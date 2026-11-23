/**
 * Transactional test store for intake and audience joins. No production
 * export.
 */
import assert from "node:assert/strict";

type Data = Record<string, unknown>;
type Transaction = {
  getAll: (...refs: Ref[]) => Promise<unknown[]>;
  get: (ref: Ref | Query) => Promise<unknown>;
  create: (ref: Ref, data: Data) => void;
  set: (ref: Ref, data: Data, options?: {merge?: boolean}) => void;
  delete: (ref: Ref) => void;
  update: (ref: Ref, data: Data) => void;
};
type Filter = [string, string, unknown];

class Ref {
  constructor(readonly store: AudienceTestStore, readonly path: string) {}
  get id() {
    return this.path.split("/").at(-1)!;
  }
  /** A subcollection of this document, as users/{uid}/... paths need. */
  collection(name: string): Query {
    return this.store.collection(`${this.path}/${name}`);
  }
  async get() {
    return this.store.snapshot(this);
  }
  async set(data: Data, options?: {merge?: boolean}) {
    this.store.write(this, data, options?.merge);
  }
  async update(data: Data) {
    this.store.write(this, data, true);
  }
}

class Query {
  constructor(readonly store: AudienceTestStore, readonly path: string,
    readonly filters: Filter[] = [], readonly cap = Infinity,
    readonly ordering: Array<[string, "asc" | "desc"]> = [],
    readonly after: unknown[] = []) {}
  doc(id = "auto-id") {
    return new Ref(this.store, `${this.path}/${id}`);
  }
  where(field: string, op: string, value: unknown) {
    return new Query(this.store, this.path, [...this.filters, [field, op,
      value]],
    this.cap, this.ordering, this.after);
  }
  orderBy(field: string | object, direction: "asc" | "desc" = "asc") {
    return new Query(this.store, this.path, this.filters, this.cap,
      [...this.ordering, [typeof field === "string" ? field : "__name__",
        direction]], this.after);
  }
  startAfter(...values: unknown[]) {
    return new Query(this.store, this.path, this.filters, this.cap,
      this.ordering, values);
  }
  limit(cap: number) {
    return new Query(this.store, this.path, this.filters, cap,
      this.ordering, this.after);
  }
  count() {
    return {get: async () => {
      const count = (await this.get()).size;
      return {data: () => ({count})};
    }};
  }
  async get() {
    const scalar = (value: unknown): string | number =>
      value != null && typeof (value as {toMillis?: unknown}).toMillis ===
        "function" ? (value as {toMillis: () => number}).toMillis() :
        value as string | number;
    const order = this.ordering.length ? this.ordering :
      [["__name__", "asc"]] as Array<[string, "asc" | "desc"]>;
    const values = ([path, data]: [string, Data]) => order.map(([field]) =>
      scalar(field === "__name__" ? path.split("/").at(-1) : data[field]));
    const compare = (a: unknown[], b: unknown[]) => {
      for (let index = 0; index < order.length; index++) {
        const left = scalar(a[index]);
        const right = scalar(b[index]);
        const compared = left < right ? -1 : left > right ? 1 : 0;
        if (compared) return order[index][1] === "desc" ? -compared : compared;
      }
      return 0;
    };
    let after = this.after;
    if (after.length === 1 && typeof (after[0] as {data?: unknown}).data ===
        "function") {
      const doc = after[0] as {id: string; data: () => Data};
      after = values([doc.id, doc.data()]);
    }
    const docs = Object.entries(this.store.docs)
      .filter(([path, data]) => path.startsWith(this.path + "/") &&
        path.split("/").length === this.path.split("/").length + 1 &&
        this.filters.every(([field, op, value]) => {
          const actual = field.split(".").reduce<unknown>((v, key) =>
            (v as Data)?.[key], data);
          if (op === "array-contains-any") {
            return Array.isArray(actual) &&
            (value as unknown[]).some((item) => actual.includes(item));
          }
          if (op === "array-contains") {
            return Array.isArray(actual) &&
            actual.includes(value);
          }
          if (op === ">") {
            return actual != null &&
            scalar(actual) > scalar(value);
          }
          if (op === "in") return (value as unknown[]).includes(actual);
          if (op === "<=" || op === ">=") {
            if (actual == null) return false;
            const left = (actual as {toMillis: () => number}).toMillis();
            const right = (value as {toMillis: () => number}).toMillis();
            return op === "<=" ? left <= right : left >= right;
          }
          assert.equal(op, "==", "Unsupported test-store query operator");
          return actual === value;
        }))
      .filter((entry) => after.length === 0 ||
        compare(values(entry), after) > 0)
      .sort((a, b) => compare(values(a), values(b))).slice(0, this.cap)
      .map(([path]) => this.store.snapshot(new Ref(this.store, path)));
    return {docs, size: docs.length, empty: docs.length === 0};
  }
}

export class AudienceTestStore {
  constructor(readonly docs: Record<string, Data> = {},
    readonly updateTimes: Record<string, FirebaseFirestore.Timestamp> = {}) {}
  collection(path: string) {
    return new Query(this, path);
  }
  asFirestore() {
    return this as unknown as FirebaseFirestore.Firestore;
  }
  snapshot(ref: Ref) {
    const data = this.docs[ref.path];
    return {ref, id: ref.id, exists: data !== undefined,
      updateTime: this.updateTimes[ref.path], data: () => data};
  }
  async getAll(...refs: Ref[]) {
    return refs.map((ref) => this.snapshot(ref));
  }
  write(ref: Ref, data: Data, merge = false) {
    const next: Data = merge ? {...this.docs[ref.path]} : {};
    for (const [key, value] of Object.entries(data)) {
      next[key] = value?.constructor?.name === "NumericIncrementTransform" ?
        (Number(next[key]) || 0) +
          (value as {operand: number}).operand : value;
    }
    this.docs[ref.path] = next;
  }
  batch() {
    const writes: Array<() => void> = [];
    return {
      set: (ref: Ref, data: Data, options?: {merge?: boolean}) =>
        writes.push(() => this.write(ref, data, options?.merge)),
      create: (ref: Ref, data: Data) => writes.push(() => {
        assert.equal(this.docs[ref.path], undefined, "Duplicate create");
        this.write(ref, data);
      }),
      delete: (ref: Ref) => writes.push(() => {
        delete this.docs[ref.path];
      }),
      commit: async () => writes.forEach((write) => write()),
    };
  }
  async runTransaction<T>(body: (tx: Transaction) => Promise<T>): Promise<T> {
    const writes: Array<() => void> = [];
    const result = await body({
      getAll: (...refs: Ref[]) => {
        assert.equal(writes.length, 0, "Firestore forbids reads after writes");
        return this.getAll(...refs);
      },
      get: (ref: Ref | Query) => {
        assert.equal(writes.length, 0, "Firestore forbids reads after writes");
        return ref.get();
      },
      create: (ref: Ref, data: Data) => writes.push(() => {
        assert.equal(this.docs[ref.path], undefined, "Duplicate create");
        this.write(ref, data);
      }),
      set: (ref: Ref, data: Data, options?: {merge?: boolean}) =>
        writes.push(() => this.write(ref, data, options?.merge)),
      delete: (ref: Ref) => writes.push(() => {
        delete this.docs[ref.path];
      }),
      update: (ref: Ref, data: Data) =>
        writes.push(() => this.write(ref, data, true)),
    });
    writes.forEach((write) => write());
    return result;
  }
}
