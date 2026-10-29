import assert from "node:assert/strict";
import {isDeepStrictEqual} from "node:util";

type FakeData = Record<string, unknown>;

class FakeSnapshot {
  constructor(readonly id: string, private readonly value?: FakeData) {}

  get exists(): boolean {
    return this.value !== undefined;
  }

  data(): FakeData | undefined {
    return this.value === undefined ? undefined : structuredClone(this.value);
  }
}

class FakeDocReference {
  constructor(
    readonly firestore: FakeFirestore,
    readonly collectionPath: string,
    readonly id: string
  ) {}

  get path(): string {
    return `${this.collectionPath}/${this.id}`;
  }

  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.id, this.firestore.read(this.path));
  }
}

class FakeQuery {
  constructor(
    protected readonly firestore: FakeFirestore,
    protected readonly collectionPath: string,
    private readonly filters: Array<[string, string, unknown]> = [],
    private readonly cursor: unknown[] | null = null,
    private readonly pageLimit: number | null = null,
    private readonly orders: Array<[string, "asc" | "desc"]> = [],
    private readonly projection: string[] | null = null
  ) {}

  where(field: string, operator: string, value: unknown): FakeQuery {
    return new FakeQuery(
      this.firestore,
      this.collectionPath,
      [...this.filters, [field, operator, value]],
      this.cursor,
      this.pageLimit,
      this.orders,
      this.projection
    );
  }

  orderBy(field: unknown, direction: "asc" | "desc" = "asc"): FakeQuery {
    return new FakeQuery(this.firestore, this.collectionPath, this.filters,
      this.cursor, this.pageLimit, [...this.orders,
        [typeof field === "string" ? field : "__name__", direction]],
      this.projection);
  }

  startAfter(...cursor: unknown[]): FakeQuery {
    return new FakeQuery(
      this.firestore,
      this.collectionPath,
      this.filters,
      cursor,
      this.pageLimit,
      this.orders,
      this.projection
    );
  }

  limit(limit: number): FakeQuery {
    return new FakeQuery(
      this.firestore,
      this.collectionPath,
      this.filters,
      this.cursor,
      limit,
      this.orders,
      this.projection
    );
  }

  /** Like Firestore select(): documents carry only these field paths. */
  select(...fields: string[]): FakeQuery {
    return new FakeQuery(
      this.firestore,
      this.collectionPath,
      this.filters,
      this.cursor,
      this.pageLimit,
      this.orders,
      fields
    );
  }

  async get(): Promise<{docs: FakeSnapshot[]; size: number; empty: boolean}> {
    const prefix = `${this.collectionPath}/`;
    const orders = this.orders.length ? this.orders :
      [["__name__", "asc"] as const];
    const read = (snapshot: FakeSnapshot, field: string) =>
      field === "__name__" ? snapshot.id :
        field.split(".").reduce<unknown>((value, part) =>
          value && typeof value === "object" ?
            (value as FakeData)[part] : undefined, snapshot.data());
    const compareTo = (snapshot: FakeSnapshot, values: unknown[]) => {
      for (let i = 0; i < values.length; i++) {
        const [field, direction] = orders[i];
        const delta = compare(read(snapshot, field), values[i]) ?? 0;
        if (delta) return direction === "desc" ? -delta : delta;
      }
      return 0;
    };
    const docs = this.firestore.entries()
      .filter(([path]) => path.startsWith(prefix))
      .map(([path, value]) =>
        new FakeSnapshot(path.slice(prefix.length), value))
      .filter((snapshot) => orders.every(([field]) =>
        read(snapshot, field) !== undefined))
      .filter((snapshot) => !this.cursor ||
        compareTo(snapshot, this.cursor) > 0)
      .filter((snapshot) => this.filters.every(([field, operator, value]) => {
        const stored = field.split(".").reduce<unknown>((value, part) =>
          value && typeof value === "object" ?
            (value as FakeData)[part] : undefined, snapshot.data());
        switch (operator) {
        case "array-contains": return Array.isArray(stored) &&
          stored.some((item) => isDeepStrictEqual(item, value));
        case "==": return isDeepStrictEqual(stored, value);
        case ">=": return (compare(stored, value) ?? -1) >= 0;
        case "<=": return (compare(stored, value) ?? 1) <= 0;
        case ">": return (compare(stored, value) ?? -1) > 0;
        case "<": return (compare(stored, value) ?? 1) < 0;
        default: throw new Error("Unsupported fake query operator: " +
          operator);
        }
      }))
      .sort((left, right) => compareTo(left,
        orders.map(([field]) => read(right, field))));
    const limited = this.pageLimit === null ? docs :
      docs.slice(0, this.pageLimit);
    const page = this.projection === null ? limited :
      limited.map((snapshot) =>
        new FakeSnapshot(snapshot.id, project(snapshot.data() ?? {},
          this.projection ?? [])));
    return {docs: page, size: page.length, empty: page.length === 0};
  }
}

function project(value: FakeData, fields: string[]): FakeData {
  const projected: FakeData = {};
  for (const field of fields) {
    const parts = field.split(".");
    let source: unknown = value;
    for (const part of parts) {
      source = source && typeof source === "object" ?
        (source as FakeData)[part] : undefined;
    }
    if (source === undefined) continue;
    let target = projected;
    for (const part of parts.slice(0, -1)) {
      target[part] = (target[part] as FakeData | undefined) ?? {};
      target = target[part] as FakeData;
    }
    target[parts[parts.length - 1]] = source;
  }
  return projected;
}

function compare(left: unknown, right: unknown): number | null {
  if (typeof left === "string" && typeof right === "string") {
    return left < right ? -1 : left > right ? 1 : 0;
  }
  if (typeof left === "number" && typeof right === "number") {
    return Math.sign(left - right);
  }
  const stamp = (value: unknown): bigint | null => {
    if (!value || typeof value !== "object") return null;
    const v = value as {_seconds?: number; _nanoseconds?: number};
    if (!Number.isSafeInteger(v._seconds) ||
        !Number.isSafeInteger(v._nanoseconds)) return null;
    return BigInt(v._seconds!) * 1_000_000_000n + BigInt(v._nanoseconds!);
  };
  const a = stamp(left);
  const b = stamp(right);
  if (a === null || b === null) return null;
  return a < b ? -1 : a > b ? 1 : 0;
}

class FakeCollection extends FakeQuery {
  doc(id?: string): FakeDocReference {
    return new FakeDocReference(
      this.firestore,
      this.collectionPath,
      id ?? this.firestore.autoId()
    );
  }
}

class FakeTransaction {
  private readonly writes = new Map<string, FakeData>();

  constructor(private readonly firestore: FakeFirestore) {}

  async get(reference: FakeDocReference): Promise<FakeSnapshot> {
    assert.equal(this.writes.size, 0, "Firestore reads must precede writes");
    return reference.get();
  }

  async getAll(...references: FakeDocReference[]): Promise<FakeSnapshot[]> {
    assert.equal(this.writes.size, 0, "Firestore reads must precede writes");
    return Promise.all(references.map((reference) => reference.get()));
  }

  create(reference: FakeDocReference, value: unknown): void {
    if (this.firestore.read(reference.path) ||
        this.writes.has(reference.path)) {
      throw new Error("already exists");
    }
    this.writes.set(reference.path, structuredClone(value as FakeData));
  }

  set(reference: FakeDocReference, value: unknown): void {
    this.writes.set(reference.path, structuredClone(value as FakeData));
  }

  update(reference: FakeDocReference, patch: FakeData): void {
    assert.ok(Object.keys(patch).every((key) => !key.includes(".")),
      "This fake supports top-level field updates only");
    const before = this.writes.get(reference.path) ??
      this.firestore.read(reference.path);
    if (!before) throw new Error("document does not exist");
    this.writes.set(reference.path, {...before, ...structuredClone(patch)});
  }

  commit(): void {
    for (const [path, value] of this.writes) this.firestore.write(path, value);
  }
}

export class FakeFirestore {
  private readonly docs = new Map<string, FakeData>();
  private transactionTail: Promise<unknown> = Promise.resolve();
  private nextAutoId = 0;
  failNextCommit = false;

  collection(path: string): FakeCollection {
    return new FakeCollection(this, path);
  }

  async runTransaction<T>(
    callback: (transaction: FakeTransaction) => Promise<T>
  ): Promise<T> {
    const pending = this.transactionTail.then(async () => {
      const transaction = new FakeTransaction(this);
      const result = await callback(transaction);
      if (this.failNextCommit) {
        this.failNextCommit = false;
        throw new Error("injected transaction interruption");
      }
      transaction.commit();
      return result;
    });
    this.transactionTail = pending.catch(() => undefined);
    return pending;
  }

  read(path: string): FakeData | undefined {
    const value = this.docs.get(path);
    return value === undefined ? undefined : structuredClone(value);
  }

  write(path: string, value: FakeData): void {
    this.docs.set(path, structuredClone(value));
  }

  remove(path: string): void {
    this.docs.delete(path);
  }

  entries(): Array<[string, FakeData]> {
    return [...this.docs.entries()].map(([path, value]) =>
      [path, structuredClone(value)]);
  }

  autoId(): string {
    this.nextAutoId += 1;
    return `auto-${this.nextAutoId}`;
  }
}
