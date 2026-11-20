// In-memory Firestore for the listing cohort withdraw tests. It implements
// only what tool/data/lib/listing_cohort_withdraw/withdraw.mjs calls, and it
// applies field projections (select, fieldMask) the way Firestore does, so a
// test proves the tool never receives a field it did not ask for.

const clone = (value) => (value === undefined ? undefined : structuredClone(value));

function read(data, dotted) {
  return dotted.split(".").reduce((value, key) => (value && typeof value === "object" ? value[key] : undefined), data);
}

function project(data, fields) {
  if (data === undefined || fields === null) return clone(data);
  const out = {};
  for (const field of fields) {
    const value = read(data, field);
    if (value === undefined) continue;
    const keys = field.split(".");
    let cursor = out;
    for (const key of keys.slice(0, -1)) cursor = cursor[key] ??= {};
    cursor[keys.at(-1)] = clone(value);
  }
  return out;
}

function setDotted(target, dotted, value) {
  const keys = dotted.split(".");
  let cursor = target;
  for (const key of keys.slice(0, -1)) {
    if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[keys.at(-1)] = clone(value);
}

export const SERVER_TIMESTAMP = Object.freeze({serverTimestamp: true});
export const fakeServerTimestamp = () => SERVER_TIMESTAMP;

export function createFakeFirestore(initial = {}) {
  const docs = new Map(Object.entries(initial).map(([path, data]) => [path, clone(data)]));
  const log = {projections: [], updates: [], sets: [], transactions: 0};
  let autoId = 0;
  const db = {docs, log, collection: (path) => collectionRef(path), runTransaction, beforeTransaction: null};
  return db;

  async function runTransaction(callback) {
    log.transactions += 1;
    await db.beforeTransaction?.(log.transactions);
    const writes = [];
    const tx = {
      getAll: async (...items) => {
        const options = items.at(-1)?.fieldMask ? items.pop() : {};
        log.projections.push(options.fieldMask ? [...options.fieldMask] : null);
        return items.map((ref) => snapshot(ref.path, options.fieldMask ?? null));
      },
      update: (ref, patch) => writes.push(() => {
        const current = docs.get(ref.path);
        if (!current) throw new Error("NOT_FOUND");
        const next = clone(current);
        for (const [field, value] of Object.entries(patch)) setDotted(next, field, value);
        docs.set(ref.path, next);
        log.updates.push({path: ref.path, patch: clone(patch)});
      }),
      set: (ref, value) => writes.push(() => {
        docs.set(ref.path, clone(value));
        log.sets.push(ref.path);
      }),
    };
    const result = await callback(tx);
    if (writes.length > 500) throw new Error("transaction too large");
    for (const write of writes) write();
    return result;
  }

  function collectionRef(path) {
    const ref = query(path, [], null);
    ref.doc = (id) => docRef(`${path}/${id ?? `auto-${String(++autoId).padStart(4, "0")}`}`);
    return ref;
  }

  function docRef(path) {
    return {id: path.split("/").at(-1), path, get: async () => snapshot(path, null)};
  }

  function snapshot(path, fields) {
    const data = docs.get(path);
    return {id: path.split("/").at(-1), ref: docRef(path), exists: data !== undefined, data: () => project(data, fields)};
  }

  function query(path, filters, fields, after = null, max = Infinity) {
    const next = (changes) => query(path, changes.filters ?? filters, changes.fields ?? fields,
      changes.after ?? after, changes.max ?? max);
    return {
      where: (field, op, value) => {
        if (op !== "==") throw new Error(`Unsupported fake operator ${op}`);
        return next({filters: [...filters, {field, value}]});
      },
      select: (...selected) => next({fields: selected}),
      orderBy: (field) => {
        if (field !== "__name__") throw new Error("Unsupported order");
        return next({});
      },
      limit: (value) => next({max: value}),
      startAfter: (snap) => next({after: snap.ref.path}),
      get: async () => {
        log.projections.push(fields ? [...fields] : null);
        const result = [...docs.keys()]
          .filter((candidate) => candidate.startsWith(`${path}/`) && !candidate.slice(path.length + 1).includes("/"))
          .sort()
          .filter((candidate) => after === null || candidate > after)
          .filter((candidate) => filters.every(({field, value}) => read(docs.get(candidate), field) === value))
          .slice(0, max)
          .map((candidate) => snapshot(candidate, fields));
        return {docs: result, size: result.length, empty: result.length === 0};
      },
    };
  }
}
