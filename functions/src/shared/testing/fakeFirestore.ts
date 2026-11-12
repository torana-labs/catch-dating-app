import assert from "node:assert/strict";
import {isDeepStrictEqual} from "node:util";
import {FieldValue, Timestamp} from "firebase-admin/firestore";

/**
 * One in-memory Firestore for unit tests. It keeps Firestore's behaviour where
 * tests have historically drifted when each file hand-rolled its own fake:
 * Timestamps stay Timestamps, server timestamps / increments / deletes /
 * array unions resolve when a write commits, `set(..., {merge: true})` merges
 * deeply, `update` accepts dotted paths, queries read dotted paths, and a
 * transaction refuses a read after its first write.
 *
 * Seed it with `{path: data}`; read state back with `get(path)`.
 */
export type FakeData = Record<string, unknown>;
type Op = "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "not-in" |
  "array-contains" | "array-contains-any";

const SERVER_TIMESTAMP = FieldValue.serverTimestamp();
const DELETE = FieldValue.delete();

function isPlainObject(value: unknown): value is FakeData {
  return !!value && typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype;
}

/** Deep copy that keeps Timestamps, Dates and other class instances. */
function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clone) as unknown as T;
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value)
      .map(([key, item]) => [key, clone(item)])) as T;
  }
  return value;
}

export function fieldAt(data: FakeData | undefined, path: string): unknown {
  if (path === "__name__") return undefined;
  return path.split(".").reduce<unknown>((value, part) =>
    value && typeof value === "object" ?
      (value as FakeData)[part] : undefined, data);
}

function sortable(value: unknown): number | string | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return null;
}

function compare(left: unknown, right: unknown): number {
  const a = sortable(left);
  const b = sortable(right);
  if (a === null || b === null) return a === b ? 0 : a === null ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function equal(left: unknown, right: unknown): boolean {
  if (left instanceof Timestamp && right instanceof Timestamp) {
    return left.isEqual(right);
  }
  return isDeepStrictEqual(left, right);
}

function matches(data: FakeData, field: string, op: Op, value: unknown,
  id: string): boolean {
  const stored = field === "__name__" ? id : fieldAt(data, field);
  switch (op) {
  case "==": return equal(stored, value);
  case "!=": return stored !== undefined && !equal(stored, value);
  case "<": return stored !== undefined && compare(stored, value) < 0;
  case "<=": return stored !== undefined && compare(stored, value) <= 0;
  case ">": return stored !== undefined && compare(stored, value) > 0;
  case ">=": return stored !== undefined && compare(stored, value) >= 0;
  case "in": return Array.isArray(value) &&
    value.some((item) => equal(stored, item));
  case "not-in": return stored !== undefined && Array.isArray(value) &&
    !value.some((item) => equal(stored, item));
  case "array-contains": return Array.isArray(stored) &&
    stored.some((item) => equal(item, value));
  case "array-contains-any": return Array.isArray(stored) &&
    Array.isArray(value) &&
    stored.some((item) => value.some((want) => equal(item, want)));
  }
}

/** Applies one field value, resolving Firestore's write-time sentinels. */
function resolve(current: unknown, value: unknown, now: Timestamp): unknown {
  if (value instanceof FieldValue) {
    if (value.isEqual(SERVER_TIMESTAMP)) return now;
    const kind = value.constructor.name;
    if (kind === "NumericIncrementTransform") {
      const operand = (value as unknown as {operand: number}).operand;
      return (typeof current === "number" ? current : 0) + operand;
    }
    if (kind === "ArrayUnionTransform") {
      const items = (value as unknown as {elements: unknown[]}).elements;
      const base = Array.isArray(current) ? [...current] : [];
      for (const item of items) {
        if (!base.some((existing) => equal(existing, item))) base.push(item);
      }
      return base;
    }
    if (kind === "ArrayRemoveTransform") {
      const items = (value as unknown as {elements: unknown[]}).elements;
      return (Array.isArray(current) ? current : [])
        .filter((existing) => !items.some((item) => equal(existing, item)));
    }
    throw new Error(`Unsupported FieldValue ${kind}`);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).flatMap(([key, item]) =>
      item instanceof FieldValue && item.isEqual(DELETE) ? [] :
        [[key, resolve(undefined, item, now)]]));
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolve(undefined, item, now));
  }
  return value;
}

/** Deep merge for set(..., {merge: true}). */
function merge(target: FakeData, patch: FakeData, now: Timestamp): FakeData {
  const next: FakeData = {...target};
  for (const [key, value] of Object.entries(patch)) {
    if (value instanceof FieldValue && value.isEqual(DELETE)) {
      delete next[key];
    } else if (isPlainObject(value) && isPlainObject(next[key])) {
      next[key] = merge(next[key] as FakeData, value, now);
    } else {
      next[key] = resolve(next[key], value, now);
    }
  }
  return next;
}

/** update(): top-level keys may be dotted field paths. */
function applyUpdate(target: FakeData, patch: FakeData,
  now: Timestamp): FakeData {
  const next = clone(target);
  for (const [path, value] of Object.entries(patch)) {
    const parts = path.split(".");
    let parent = next;
    for (const part of parts.slice(0, -1)) {
      if (!isPlainObject(parent[part])) parent[part] = {};
      parent = parent[part] as FakeData;
    }
    const leaf = parts[parts.length - 1];
    if (value instanceof FieldValue && value.isEqual(DELETE)) {
      delete parent[leaf];
    } else {
      parent[leaf] = resolve(parent[leaf], value, now);
    }
  }
  return next;
}

export class FakeSnapshot {
  constructor(readonly ref: FakeDocRef, private readonly value?: FakeData) {}
  get id(): string {
    return this.ref.id;
  }
  get exists(): boolean {
    return this.value !== undefined;
  }
  data(): FakeData | undefined {
    return this.value === undefined ? undefined : clone(this.value);
  }
  get(field: string): unknown {
    return fieldAt(this.value, field);
  }
}

export class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}
  get id(): string {
    return this.path.split("/").at(-1)!;
  }
  get parent(): FakeCollection {
    return new FakeCollection(this.firestore,
      this.path.split("/").slice(0, -1).join("/"));
  }
  collection(name: string): FakeCollection {
    return new FakeCollection(this.firestore, `${this.path}/${name}`);
  }
  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this, this.firestore.get(this.path));
  }
  async set(data: FakeData, options?: {merge?: boolean}): Promise<void> {
    this.firestore.applyWrites([{kind: options?.merge ? "merge" : "set",
      path: this.path, data}]);
  }
  async update(data: FakeData): Promise<void> {
    this.firestore.applyWrites([{kind: "update", path: this.path, data}]);
  }
  async create(data: FakeData): Promise<void> {
    this.firestore.applyWrites([{kind: "create", path: this.path, data}]);
  }
  async delete(): Promise<void> {
    this.firestore.applyWrites([{kind: "delete", path: this.path}]);
  }
  isEqual(other: unknown): boolean {
    return other instanceof FakeDocRef && other.path === this.path;
  }
}

interface QueryState {
  filters: Array<[string, Op, unknown]>;
  orders: Array<[string, "asc" | "desc"]>;
  max: number | null;
  after: unknown[] | null;
}

export class FakeQuery {
  constructor(readonly firestore: FakeFirestore, readonly path: string,
    protected readonly state: QueryState = {filters: [], orders: [],
      max: null, after: null}) {}
  protected with(change: Partial<QueryState>): FakeQuery {
    return new FakeQuery(this.firestore, this.path, {...this.state, ...change});
  }
  where(field: unknown, op: Op, value: unknown): FakeQuery {
    const name = typeof field === "string" ? field : "__name__";
    return this.with({filters: [...this.state.filters, [name, op, value]]});
  }
  orderBy(field: unknown, direction: "asc" | "desc" = "asc"): FakeQuery {
    const name = typeof field === "string" ? field : "__name__";
    return this.with({orders: [...this.state.orders, [name, direction]]});
  }
  limit(max: number): FakeQuery {
    return this.with({max});
  }
  startAfter(...values: unknown[]): FakeQuery {
    const first = values[0];
    return this.with({after: first instanceof FakeSnapshot ?
      this.state.orders.map(([field]) => field === "__name__" ? first.id :
        first.get(field)).concat(this.state.orders.length ? [] : [first.id]) :
      values});
  }
  select(): FakeQuery {
    return this;
  }
  async get(): Promise<{docs: FakeSnapshot[]; size: number; empty: boolean}> {
    const docs = this.firestore.children(this.path)
      .filter(([id, data]) => this.state.filters.every(([field, op, value]) =>
        matches(data, field, op, value, id)))
      .filter(([, data]) => this.state.orders.every(([field]) =>
        field === "__name__" || fieldAt(data, field) !== undefined))
      .sort(([leftId, left], [rightId, right]) => {
        for (const [field, direction] of this.state.orders) {
          const delta = field === "__name__" ? compare(leftId, rightId) :
            compare(fieldAt(left, field), fieldAt(right, field));
          if (delta) return direction === "desc" ? -delta : delta;
        }
        return compare(leftId, rightId);
      })
      .filter(([id, data]) => {
        if (!this.state.after) return true;
        const keys = this.state.orders.length ? this.state.orders :
          [["__name__", "asc"] as [string, "asc"]];
        for (let i = 0; i < keys.length; i++) {
          const [field, direction] = keys[i];
          const delta = compare(field === "__name__" ? id :
            fieldAt(data, field), this.state.after[i]);
          if (delta) return direction === "desc" ? delta < 0 : delta > 0;
        }
        return false;
      })
      .slice(0, this.state.max ?? Infinity)
      .map(([id, data]) => new FakeSnapshot(
        new FakeDocRef(this.firestore, `${this.path}/${id}`), data));
    return {docs, size: docs.length, empty: docs.length === 0};
  }
  count(): {get: () => Promise<{data: () => {count: number}}>} {
    const unlimited = this.with({max: null});
    return {get: async () => {
      const {size} = await unlimited.get();
      return {data: () => ({count: size})};
    }};
  }
}

export class FakeCollection extends FakeQuery {
  get id(): string {
    return this.path.split("/").at(-1)!;
  }
  doc(id?: string): FakeDocRef {
    return new FakeDocRef(this.firestore,
      `${this.path}/${id ?? this.firestore.autoId()}`);
  }
  async add(data: FakeData): Promise<FakeDocRef> {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

type Write = {kind: "set" | "merge" | "update" | "create"; path: string;
  data: FakeData} | {kind: "delete"; path: string};

export class FakeTransaction {
  private readonly writes: Write[] = [];
  async get(ref: FakeDocRef | FakeQuery): Promise<unknown> {
    assert.equal(this.writes.length, 0,
      "Firestore transactions read every document before the first write");
    return ref.get();
  }
  async getAll(...refs: FakeDocRef[]): Promise<FakeSnapshot[]> {
    assert.equal(this.writes.length, 0,
      "Firestore transactions read every document before the first write");
    return Promise.all(refs.map((ref) => ref.get()));
  }
  set(ref: FakeDocRef, data: FakeData, options?: {merge?: boolean}) {
    this.writes.push({kind: options?.merge ? "merge" : "set", path: ref.path,
      data});
    return this;
  }
  update(ref: FakeDocRef, data: FakeData) {
    this.writes.push({kind: "update", path: ref.path, data});
    return this;
  }
  create(ref: FakeDocRef, data: FakeData) {
    this.writes.push({kind: "create", path: ref.path, data});
    return this;
  }
  delete(ref: FakeDocRef) {
    this.writes.push({kind: "delete", path: ref.path});
    return this;
  }
  /** @internal */
  pending(): Write[] {
    return this.writes;
  }
}

export class FakeBatch {
  private readonly writes: Write[] = [];
  constructor(private readonly firestore: FakeFirestore) {}
  set(ref: FakeDocRef, data: FakeData, options?: {merge?: boolean}) {
    this.writes.push({kind: options?.merge ? "merge" : "set", path: ref.path,
      data});
    return this;
  }
  update(ref: FakeDocRef, data: FakeData) {
    this.writes.push({kind: "update", path: ref.path, data});
    return this;
  }
  create(ref: FakeDocRef, data: FakeData) {
    this.writes.push({kind: "create", path: ref.path, data});
    return this;
  }
  delete(ref: FakeDocRef) {
    this.writes.push({kind: "delete", path: ref.path});
    return this;
  }
  async commit(): Promise<void> {
    this.firestore.applyWrites(this.writes);
  }
}

export class FakeFirestore {
  private readonly docs = new Map<string, FakeData>();
  private tail: Promise<unknown> = Promise.resolve();
  private nextId = 0;
  /** Commit time for server timestamps; tests may replace it. */
  now: () => Timestamp = () => Timestamp.fromMillis(1_700_000_000_000);
  /** Throws once from the next transaction commit, after its callback. */
  failNextCommit = false;

  constructor(seed: Record<string, FakeData | undefined> = {}) {
    for (const [path, data] of Object.entries(seed)) {
      if (data !== undefined) this.docs.set(path, clone(data));
    }
  }

  collection(path: string): FakeCollection {
    return new FakeCollection(this, path);
  }
  doc(path: string): FakeDocRef {
    return new FakeDocRef(this, path);
  }
  batch(): FakeBatch {
    return new FakeBatch(this);
  }
  async getAll(...refs: FakeDocRef[]): Promise<FakeSnapshot[]> {
    return Promise.all(refs.map((ref) => ref.get()));
  }
  async runTransaction<T>(
    callback: (tx: FakeTransaction) => Promise<T>
  ): Promise<T> {
    const run = this.tail.then(async () => {
      const tx = new FakeTransaction();
      const result = await callback(tx);
      if (this.failNextCommit) {
        this.failNextCommit = false;
        throw new Error("injected transaction interruption");
      }
      this.applyWrites(tx.pending());
      return result;
    });
    this.tail = run.catch(() => undefined);
    return run;
  }

  /** Stored document, as a copy. */
  get(path: string): FakeData | undefined {
    const data = this.docs.get(path);
    return data === undefined ? undefined : clone(data);
  }
  /** Seeds or replaces a document directly, outside any transaction. */
  put(path: string, data: FakeData): void {
    this.docs.set(path, clone(data));
  }
  remove(path: string): void {
    this.docs.delete(path);
  }
  paths(prefix = ""): string[] {
    return [...this.docs.keys()].filter((path) => path.startsWith(prefix))
      .sort();
  }
  /** Direct children of a collection, as [id, data]. */
  children(collectionPath: string): Array<[string, FakeData]> {
    const prefix = `${collectionPath}/`;
    return [...this.docs.entries()].flatMap(([path, data]) =>
      path.startsWith(prefix) && !path.slice(prefix.length).includes("/") ?
        [[path.slice(prefix.length), clone(data)] as [string, FakeData]] : []);
  }
  autoId(): string {
    this.nextId += 1;
    return `auto-${this.nextId}`;
  }

  /** @internal Commits writes atomically, as one transaction or batch. */
  applyWrites(writes: Write[]): void {
    const now = this.now();
    const staged = new Map<string, FakeData | undefined>();
    const read = (path: string) => staged.has(path) ? staged.get(path) :
      this.docs.get(path);
    for (const write of writes) {
      const current = read(write.path);
      switch (write.kind) {
      case "create":
        if (current !== undefined) {
          throw Object.assign(new Error(`ALREADY_EXISTS: ${write.path}`),
            {code: 6});
        }
        staged.set(write.path, resolve(undefined, write.data, now) as FakeData);
        break;
      case "set":
        staged.set(write.path, resolve(undefined, write.data, now) as FakeData);
        break;
      case "merge":
        staged.set(write.path, merge(current ?? {}, write.data, now));
        break;
      case "update":
        if (current === undefined) {
          throw Object.assign(new Error(`NOT_FOUND: ${write.path}`),
            {code: 5});
        }
        staged.set(write.path, applyUpdate(current, write.data, now));
        break;
      case "delete":
        staged.set(write.path, undefined);
        break;
      }
    }
    for (const [path, data] of staged) {
      if (data === undefined) this.docs.delete(path);
      else this.docs.set(path, data);
    }
  }

  /** Cast for code that takes a real Firestore. */
  asFirestore(): FirebaseFirestore.Firestore {
    return this as unknown as FirebaseFirestore.Firestore;
  }
}
