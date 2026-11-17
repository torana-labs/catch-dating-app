// In-memory Firestore for the deck-era purge tests and fixture dry run. It
// implements only what tool/data/purge_deck_era_records.mjs calls: paged
// collection and collection-group reads ordered by document path, equality
// filters, getAll, listCollections, and batched delete/update with the
// increment and delete field sentinels.

const INCREMENT = Symbol("increment");
const DELETE = Symbol("delete");

export const fakeFieldValues = {
  increment: (value) => ({[INCREMENT]: value}),
  delete: () => ({[DELETE]: true}),
};

export function fakeTimestamp(iso) {
  const millis = Date.parse(iso);
  if (!Number.isFinite(millis)) throw new Error(`Bad fixture timestamp: ${iso}`);
  return {
    toMillis: () => millis,
    toDate: () => new Date(millis),
    toJSON: () => new Date(millis).toISOString(),
  };
}

export function createFakeFirestore(initialDocs) {
  const docs = new Map(Object.entries(initialDocs).map(([path, data]) => [path, clone(data)]));
  const log = {batches: 0, batchSizes: [], deletes: [], updates: []};

  const db = {
    docs,
    log,
    collection: (id) => collectionRef(id),
    collectionGroup: (id) => query({
      matches: (path) => {
        const segments = path.split("/");
        return segments.length % 2 === 0 && segments.at(-2) === id;
      },
    }),
    doc: (path) => docRef(path),
    getAll: async (...refs) => refs.map((ref) => snapshot(ref.path)),
    batch: () => {
      const writes = [];
      return {
        delete: (ref) => writes.push(() => {
          docs.delete(ref.path);
          log.deletes.push(ref.path);
        }),
        update: (ref, patch) => writes.push(() => {
          const current = docs.get(ref.path);
          if (current === undefined) throw new Error(`NOT_FOUND: ${ref.path}`);
          docs.set(ref.path, applyPatch(current, patch));
          log.updates.push({path: ref.path, patch});
        }),
        commit: async () => {
          if (writes.length > 500) throw new Error(`Batch of ${writes.length} writes exceeds 500.`);
          if (db.failOnCommit?.(log.batches + 1)) throw new Error("Injected commit failure");
          log.batches += 1;
          log.batchSizes.push(writes.length);
          for (const write of writes) write();
        },
      };
    },
  };
  return db;

  function collectionRef(path) {
    const ref = query({
      matches: (candidate) =>
        candidate.startsWith(`${path}/`) && !candidate.slice(path.length + 1).includes("/"),
    });
    ref.id = path.split("/").at(-1);
    ref.path = path;
    ref.doc = (id) => docRef(`${path}/${id}`);
    return ref;
  }

  function docRef(path) {
    return {
      id: path.split("/").at(-1),
      path,
      get: async () => snapshot(path),
      collection: (id) => collectionRef(`${path}/${id}`),
      listCollections: async () => {
        const ids = new Set();
        for (const candidate of docs.keys()) {
          if (!candidate.startsWith(`${path}/`)) continue;
          ids.add(candidate.slice(path.length + 1).split("/")[0]);
        }
        return [...ids].sort().map((id) => collectionRef(`${path}/${id}`));
      },
    };
  }

  function snapshot(path) {
    const data = docs.get(path);
    return {
      id: path.split("/").at(-1),
      ref: docRef(path),
      exists: data !== undefined,
      data: () => (data === undefined ? undefined : clone(data)),
    };
  }

  function query({matches, filters = [], after = null, max = Infinity}) {
    const next = (changes) => query({matches, filters, after, max, ...changes});
    return {
      where: (field, op, value) => {
        if (op !== "==") throw new Error(`Unsupported fake operator: ${op}`);
        return next({filters: [...filters, {field, value}]});
      },
      orderBy: (field) => {
        if (field !== "__name__") throw new Error(`Unsupported fake order: ${field}`);
        return next({});
      },
      limit: (value) => next({max: value}),
      startAfter: (snap) => next({after: snap.ref.path}),
      get: async () => {
        const result = [...docs.keys()]
          .filter(matches)
          .sort()
          .filter((path) => after === null || path > after)
          .filter((path) => filters.every(({field, value}) => docs.get(path)[field] === value))
          .slice(0, max)
          .map(snapshot);
        return {docs: result, size: result.length};
      },
    };
  }
}

export function fakeAdmin(initialDocs) {
  const db = createFakeFirestore(initialDocs);
  const firestore = () => db;
  firestore.FieldValue = fakeFieldValues;
  return {
    db,
    initializeApp: ({projectId}) => {
      db.projectId = projectId;
    },
    firestore,
  };
}

function applyPatch(current, patch) {
  const next = clone(current);
  for (const [dotted, value] of Object.entries(patch)) {
    const keys = dotted.split(".");
    let target = next;
    for (const key of keys.slice(0, -1)) {
      if (typeof target[key] !== "object" || target[key] === null) target[key] = {};
      target = target[key];
    }
    const last = keys.at(-1);
    if (value && typeof value === "object" && DELETE in value) {
      delete target[last];
    } else if (value && typeof value === "object" && INCREMENT in value) {
      target[last] = (typeof target[last] === "number" ? target[last] : 0) + value[INCREMENT];
    } else {
      target[last] = value;
    }
  }
  return next;
}

// Keeps fixture timestamps (objects with toMillis) intact while copying.
function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object" && typeof value.toMillis !== "function") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  }
  return value;
}
