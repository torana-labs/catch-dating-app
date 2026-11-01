/** Test adapter shared by program/transport handler suites. Real IDs, atomic
 * rollback, read-before-write checks and optimistic transaction retries.
 * It does not prove production index, IAM or emulator behavior.
 */
export type FakeData = Record<string, unknown>;
type Where = {field: string; op: string; value: unknown};
type Order = {field: string; dir: "asc" | "desc"};


export function timestampMillis(value: unknown): number {
  if (value && typeof value === "object") {
    const stamp = value as {seconds?: number; _seconds?: number;
      toMillis?: () => number};
    if (typeof stamp.toMillis === "function") return stamp.toMillis();
    if (typeof stamp.seconds === "number") return stamp.seconds * 1000;
    if (typeof stamp._seconds === "number") return stamp._seconds * 1000;
  }
  return typeof value === "number" ? value : 0;
}

/** Copy mutable fixture containers; SDK value objects retain their prototypes.
 * This deliberately does not clone arbitrary class instances or cyclic data.
 */
function copyDataValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(copyDataValue) as T;
  if (value === null || typeof value !== "object") return value;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  return Object.setPrototypeOf(Object.fromEntries(Object.entries(value)
    .map(([key, child]) => [key, copyDataValue(child)])), prototype) as T;
}

class FakeDocSnapshot {
  private readonly value: FakeData | undefined;
  constructor(readonly id: string,
    readonly ref: FakeDocRef,
    value: FakeData | undefined) {
    this.value = copyDataValue(value);
  }
  get exists() {
    return this.value !== undefined;
  }
  data() {
    return copyDataValue(this.value);
  }
}

export class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}
  get id() {
    return this.path.split("/").pop()!;
  }
  async get() {
    return new FakeDocSnapshot(this.id, this,
      this.firestore.getDoc(this.path));
  }
  async set(data: FakeData) {
    this.firestore.setDoc(this.path, data);
  }
  async update(data: FakeData) {
    this.firestore.updateDoc(this.path, data);
  }
}

class FakeQuery {
  constructor(readonly firestore: FakeFirestore,
    readonly collectionPath: string,
    readonly wheres: Where[] = [],
    readonly orders: Order[] = [],
    readonly limitN: number | null = null,
    readonly startAfterValues: unknown[] | null = null) {}
  where(field: string, op: string, value: unknown) {
    return new FakeQuery(this.firestore, this.collectionPath,
      [...this.wheres, {field, op, value}], this.orders, this.limitN,
      this.startAfterValues);
  }
  orderBy(field: string | {toString(): string}, dir: "asc" | "desc" = "asc") {
    return new FakeQuery(this.firestore, this.collectionPath, this.wheres,
      [...this.orders, {field: String(field), dir}], this.limitN,
      this.startAfterValues);
  }
  limit(n: number) {
    return new FakeQuery(this.firestore, this.collectionPath, this.wheres,
      this.orders, n, this.startAfterValues);
  }
  startAfter(...values: unknown[]) {
    return new FakeQuery(this.firestore, this.collectionPath, this.wheres,
      this.orders, this.limitN, values);
  }
  count() {
    return {
      get: async () => {
        const snap = await this.firestore.runQuery(
          new FakeQuery(this.firestore, this.collectionPath,
            this.wheres, this.orders, null, this.startAfterValues));
        return {data: () => ({count: snap.size})};
      },
    };
  }
  async get() {
    return this.firestore.runQuery(this);
  }
}

class FakeCollectionRef extends FakeQuery {
  doc(id?: string) {
    return new FakeDocRef(this.firestore,
      `${this.collectionPath}/${id ?? this.firestore.nextAutoId()}`);
  }
  async add(data: FakeData) {
    const ref = this.doc();
    this.firestore.createDoc(ref.path, data);
    return ref;
  }
}

class FakeQuerySnapshot {
  constructor(readonly docs: FakeDocSnapshot[]) {}
  get size() {
    return this.docs.length;
  }
  get empty() {
    return this.docs.length === 0;
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];
  constructor(private readonly firestore: FakeFirestore) {}
  async get(source: FakeDocRef | FakeQuery) {
    if (this.writes.length > 0) {
      throw new Error("Firestore transactions require reads before writes.");
    }
    return source.get();
  }
  async getAll(...refs: FakeDocRef[]) {
    return Promise.all(refs.map((ref) => this.get(ref)));
  }
  set(ref: FakeDocRef, data: FakeData) {
    const queued = copyDataValue(data);
    this.writes.push(() => this.firestore.setDoc(ref.path, queued));
  }
  create(ref: FakeDocRef, data: FakeData) {
    const queued = copyDataValue(data);
    this.writes.push(() => this.firestore.createDoc(ref.path, queued));
  }
  update(ref: FakeDocRef, data: FakeData) {
    const queued = copyDataValue(data);
    this.writes.push(() => this.firestore.updateDoc(ref.path, queued));
  }
  delete(ref: FakeDocRef) {
    this.writes.push(() => this.firestore.deleteDoc(ref.path));
  }
  commit() {
    this.firestore.applyWrites(this.writes);
  }
}

/** Firestore batch: writes queue and apply atomically at commit. */
class FakeWriteBatch {
  private readonly writes: Array<() => void> = [];
  constructor(private readonly firestore: FakeFirestore) {}
  set(ref: FakeDocRef, data: FakeData) {
    const queued = copyDataValue(data);
    this.writes.push(() => this.firestore.setDoc(ref.path, queued));
  }
  update(ref: FakeDocRef, data: FakeData) {
    const queued = copyDataValue(data);
    this.writes.push(() => this.firestore.updateDoc(ref.path, queued));
  }
  delete(ref: FakeDocRef) {
    this.writes.push(() => this.firestore.deleteDoc(ref.path));
  }
  async commit() {
    this.firestore.applyWrites(this.writes);
  }
}

export class FakeFirestore {
  readonly docs: Map<string, FakeData>;
  private autoCounter = 0;
  private version = 0;
  transactionCommits = 0;
  beforeCommit?: () => Promise<void>;
  nextAutoId(): string {
    return `auto-${++this.autoCounter}`;
  }
  doc(path: string) {
    return new FakeDocRef(this, path);
  }
  constructor(seed: Record<string, FakeData | undefined>) {
    this.docs = new Map(Object.entries(copyDataValue(seed))
      .filter(([, v]) => v !== undefined) as [string, FakeData][]);
  }
  collection(path: string) {
    return new FakeCollectionRef(this, path);
  }
  batch() {
    return new FakeWriteBatch(this);
  }
  // Mutable setup/inspection ports: docs and getDoc are not snapshots.
  getDoc(path: string) {
    return this.docs.get(path);
  }
  setDoc(path: string, data: FakeData) {
    this.docs.set(path, copyDataValue(data));
    this.version++;
  }
  createDoc(path: string, data: FakeData) {
    if (this.docs.has(path)) {
      throw new Error(`Document already exists: ${path}`);
    }
    this.setDoc(path, data);
  }
  updateDoc(path: string, data: FakeData) {
    const existing = this.docs.get(path);
    if (!existing) throw new Error(`Document missing: ${path}`);
    const next = {...existing};
    for (const [key, value] of Object.entries(data)) {
      applyFieldUpdate(next, key.split("."), copyDataValue(value));
    }
    this.docs.set(path, next);
    this.version++;
  }
  deleteDoc(path: string) {
    if (!this.docs.delete(path)) {
      throw new Error(`Document missing: ${path}`);
    }
    this.version++;
  }
  async runQuery(query: FakeQuery) {
    const prefix = `${query.collectionPath}/`;
    const docs: FakeDocSnapshot[] = [];
    for (const [path, data] of this.docs) {
      if (!path.startsWith(prefix)) continue;
      if (path.slice(prefix.length).includes("/")) continue;
      const id = path.slice(prefix.length);
      const ref = new FakeDocRef(this, path);
      if (query.wheres.every((where) => matchWhere(data, where))) {
        docs.push(new FakeDocSnapshot(id, ref, data));
      }
    }
    if (query.orders.length > 0) {
      docs.sort((a, b) => compareSnapshots(a, b, query.orders));
    }
    let filtered = docs;
    if (query.startAfterValues !== null && query.orders.length > 0) {
      const [snapshot] = query.startAfterValues;
      filtered = snapshot instanceof FakeDocSnapshot ?
        docs.filter((doc) => compareSnapshots(
          doc, snapshot, query.orders) > 0) :
        docs.filter((doc) => compareSnapshotToValues(
          doc, query.startAfterValues!, query.orders) > 0);
    }
    const limited = query.limitN === null ?
      filtered : filtered.slice(0, query.limitN);
    return new FakeQuerySnapshot(limited);
  }
  /** Writes replace records, so a map snapshot restores the prior values.
   * Capture only commit-owned state: allocated IDs and external hook writes
   * predate this boundary and must not be rewound.
   */
  applyWrites(writes: ReadonlyArray<() => void>) {
    const before = new Map(this.docs);
    const version = this.version;
    try {
      for (const write of writes) write();
    } catch (error) {
      this.docs.clear();
      for (const [key, value] of before) this.docs.set(key, value);
      this.version = version;
      throw error;
    }
  }
  async runTransaction<T>(callback: (tx: FakeTransaction) => Promise<T>) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const readVersion = this.version;
      const tx = new FakeTransaction(this);
      const result = await callback(tx);
      await this.beforeCommit?.();
      if (readVersion !== this.version) continue;
      tx.commit();
      this.transactionCommits++;
      return result;
    }
    throw new Error("Test transaction exhausted retries.");
  }
}

function compareSnapshots(
  left: FakeDocSnapshot,
  right: FakeDocSnapshot,
  orders: Order[],
): number {
  for (const order of orders) {
    const comparison = compareOrderedValues(
      snapshotValue(left, order.field),
      snapshotValue(right, order.field),
      order.dir,
    );
    if (comparison !== 0) return comparison;
  }
  if (orders.some((order) => order.field === "__name__")) return 0;
  return compareOrderedValues(
    left.id,
    right.id,
    orders.at(-1)?.dir ?? "asc",
  );
}

function compareSnapshotToValues(
  snapshot: FakeDocSnapshot,
  values: unknown[],
  orders: Order[],
): number {
  for (let index = 0; index < values.length && index < orders.length;
    index++) {
    const order = orders[index];
    const comparison = compareOrderedValues(
      snapshotValue(snapshot, order.field),
      values[index],
      order.dir,
    );
    if (comparison !== 0) return comparison;
  }
  return 0;
}

function snapshotValue(snapshot: FakeDocSnapshot, field: string): unknown {
  return field === "__name__" ? snapshot.id : snapshot.data()?.[field];
}

function compareOrderedValues(
  left: unknown,
  right: unknown,
  direction: "asc" | "desc",
): number {
  const leftValue = timestampMillis(left) || String(left ?? "");
  const rightValue = timestampMillis(right) || String(right ?? "");
  const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ?
    1 : 0;
  return direction === "desc" ? -comparison : comparison;
}

function applyFieldUpdate(
  target: FakeData,
  segments: string[],
  value: unknown,
) {
  const [head, ...rest] = segments;
  if (rest.length === 0) {
    target[head] = resolveSentinel(target[head], value);
    return;
  }
  const child = (target[head] ?? {}) as FakeData;
  target[head] = {...child};
  applyFieldUpdate(target[head] as FakeData, rest, value);
}

function resolveSentinel(current: unknown, value: unknown) {
  if (value && typeof value === "object" &&
      (value as {constructor?: {name?: string}}).constructor?.name ===
        "NumericIncrementTransform") {
    const operand = (value as {operand?: number}).operand ?? 0;
    return (typeof current === "number" ? current : 0) + operand;
  }
  return value;
}

function matchWhere(data: FakeData, where: Where): boolean {
  const value = data[where.field];
  if (where.op === "==") return value === where.value;
  if (where.op === "array-contains") {
    return Array.isArray(value) && value.includes(where.value);
  }
  if (where.op === "in") {
    return Array.isArray(where.value) && where.value.includes(value);
  }
  if (where.op === ">" || where.op === "<=") {
    if (value == null) return false;
    return where.op === ">" ?
      timestampMillis(value) > timestampMillis(where.value) :
      timestampMillis(value) <= timestampMillis(where.value);
  }
  if (where.op === "!=") return value !== where.value;
  throw new Error(`Unsupported where op: ${where.op}`);
}
