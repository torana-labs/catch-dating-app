import type {Firestore} from "firebase-admin/firestore";

// An in-memory document store for the inbound router's tests: documents by
// path, plain document writes, and serialized transactions whose writes
// commit together. Values are kept as written (Timestamps included).

type Data = Record<string, unknown>;

interface TestQuery {
  where: (field: string, op: string, value: unknown) => TestQuery;
  limit: (count: number) => TestQuery;
  get: () => Promise<{empty: boolean; size: number; docs: unknown[]}>;
}

export class TestDocStore {
  records = new Map<string, Data>();
  private tail: Promise<unknown> = Promise.resolve();

  asFirestore(): Firestore {
    return this as unknown as Firestore;
  }

  collection(name: string) {
    return {doc: (id: string) => this.ref(`${name}/${id}`),
      where: (field: string, op: string, value: unknown) =>
        this.query(name, [[field, op, value]])};
  }

  /** Equality and array-contains-any filters, for the do-not-list lookup. */
  query(name: string, filters: Array<[string, string, unknown]>,
    max = Infinity): TestQuery {
    const matches = (data: Data) => filters.every(([field, op, value]) =>
      op === "==" ? data[field] === value :
        op === "array-contains-any" && Array.isArray(data[field]) &&
          Array.isArray(value) &&
          (data[field] as unknown[]).some((item) => value.includes(item)));
    return {
      where: (field, op, value) =>
        this.query(name, [...filters, [field, op, value]], max),
      limit: (count) => this.query(name, filters, count),
      get: async () => {
        const docs = [...this.records.keys()]
          .filter((path) => path.startsWith(`${name}/`) &&
            path.split("/").length === 2 && matches(this.records.get(path)!))
          .slice(0, max).map((path) => ({...this.snapshot(path),
            ref: this.ref(path)}));
        return {empty: docs.length === 0, size: docs.length, docs};
      },
    };
  }

  ref(path: string) {
    return {
      path,
      id: path.split("/").pop() ?? "",
      get: async () => this.snapshot(path),
      set: async (data: Data) => {
        this.records.set(path, {...data});
      },
      update: async (data: Data) => {
        const before = this.records.get(path);
        if (!before) throw new Error(`No document at ${path}`);
        this.records.set(path, {...before, ...data});
      },
      delete: async () => {
        this.records.delete(path);
      },
    };
  }

  snapshot(path: string) {
    const value = this.records.get(path);
    return {exists: value !== undefined, id: path.split("/").pop() ?? "",
      data: () => value && {...value}};
  }

  async runTransaction<T>(work: (tx: {
    get: (ref: {path: string} | TestQuery) => Promise<unknown>;
    create: (ref: {path: string}, data: Data) => void;
    set: (ref: {path: string}, data: Data) => void;
    update: (ref: {path: string}, data: Data) => void;
  }) => Promise<T>): Promise<T> {
    const run = this.tail.then(async () => {
      const writes = new Map<string, Data>();
      const result = await work({
        get: async (ref) => "path" in ref ? this.snapshot(ref.path) :
          ref.get(),
        create: (ref, data) => {
          if (this.records.has(ref.path) || writes.has(ref.path)) {
            throw Object.assign(new Error("already exists"), {code: 6});
          }
          writes.set(ref.path, {...data});
        },
        set: (ref, data) => {
          writes.set(ref.path, {...data});
        },
        update: (ref, data) => {
          const before = writes.get(ref.path) ?? this.records.get(ref.path);
          if (!before) throw new Error(`No document at ${ref.path}`);
          writes.set(ref.path, {...before, ...data});
        },
      });
      for (const [path, data] of writes) this.records.set(path, data);
      return result;
    });
    this.tail = run.catch(() => undefined);
    return run;
  }
}
