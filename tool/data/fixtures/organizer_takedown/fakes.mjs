// In-memory Firestore, Storage buckets, fetch and bq for the organiser takedown
// tests. They implement only what tool/data/organizer_takedown.mjs calls.

const DELETE = Symbol("delete");
export const fakeFieldValues = {delete: () => ({[DELETE]: true})};

const clone = (value) => (value === undefined ? undefined : structuredClone(value));

function read(data, dotted) {
  return dotted.split(".").reduce((value, key) => (value && typeof value === "object" ? value[key] : undefined), data);
}

export function createFakeFirestore(initial = {}) {
  const docs = new Map(Object.entries(initial).map(([path, data]) => [path, clone(data)]));
  const log = {deletes: [], updates: [], sets: []};
  const db = {docs, log, collection: (path) => collectionRef(path), batch};
  return db;

  function batch() {
    const writes = [];
    return {
      delete: (ref) => writes.push(() => {
        docs.delete(ref.path);
        log.deletes.push(ref.path);
      }),
      set: (ref, value) => writes.push(() => {
        docs.set(ref.path, clone(value));
        log.sets.push(ref.path);
      }),
      update: (ref, patch) => writes.push(() => {
        const current = docs.get(ref.path);
        if (!current) throw new Error("NOT_FOUND");
        const next = clone(current);
        for (const [key, value] of Object.entries(patch)) {
          if (value && typeof value === "object" && DELETE in value) delete next[key];
          else next[key] = clone(value);
        }
        docs.set(ref.path, next);
        log.updates.push(ref.path);
      }),
      commit: async () => {
        if (writes.length > 500) throw new Error("batch too large");
        for (const write of writes) write();
      },
    };
  }

  function collectionRef(path) {
    const ref = query(path, []);
    ref.doc = (id) => docRef(`${path}/${id}`);
    return ref;
  }

  function docRef(path) {
    return {
      id: path.split("/").at(-1),
      path,
      firestore: db,
      get: async () => snapshot(path),
      listCollections: async () => {
        const ids = new Set();
        for (const candidate of docs.keys()) {
          if (candidate.startsWith(`${path}/`)) ids.add(candidate.slice(path.length + 1).split("/")[0]);
        }
        return [...ids].sort().map((id) => collectionRef(`${path}/${id}`));
      },
    };
  }

  function snapshot(path) {
    const data = docs.get(path);
    return {id: path.split("/").at(-1), ref: docRef(path), exists: data !== undefined, data: () => clone(data)};
  }

  function query(path, filters, after = null, max = Infinity) {
    const next = (changes) => query(path, changes.filters ?? filters, changes.after ?? after, changes.max ?? max);
    return {
      where: (field, op, value) => {
        if (op !== "==") throw new Error(`Unsupported fake operator ${op}`);
        return next({filters: [...filters, {field, value}]});
      },
      orderBy: (field) => {
        if (field !== "__name__") throw new Error("Unsupported order");
        return next({});
      },
      limit: (value) => next({max: value}),
      startAfter: (snap) => next({after: snap.ref.path}),
      get: async () => {
        if (db.failCollection === path) throw Object.assign(new Error(`failed on ${path}`), {code: "failed-precondition"});
        const result = [...docs.keys()]
          .filter((candidate) => candidate.startsWith(`${path}/`) && !candidate.slice(path.length + 1).includes("/"))
          .sort()
          .filter((candidate) => after === null || candidate > after)
          .filter((candidate) => filters.every(({field, value}) => read(docs.get(candidate), field) === value))
          .slice(0, max)
          .map(snapshot);
        return {docs: result, size: result.length, empty: result.length === 0};
      },
    };
  }
}

/** A bucket; with retention set, an existing object can be neither overwritten nor deleted. */
export function createFakeBucket(name, initial = {}, {retention = false} = {}) {
  const objects = new Map(Object.entries(initial).map(([key, value]) => [key, Buffer.from(value)]));
  const log = {saves: [], deletes: []};
  return {
    name,
    objects,
    log,
    getFiles: async ({prefix}) => [[...objects.keys()].filter((key) => key.startsWith(prefix)).sort().map((key) => ({name: key}))],
    file: (key) => ({
      name: key,
      exists: async () => [objects.has(key)],
      download: async () => {
        if (!objects.has(key)) throw Object.assign(new Error("No such object"), {code: 404});
        return [Buffer.from(objects.get(key))];
      },
      save: async (bytes, options) => {
        if (retention && objects.has(key)) throw Object.assign(new Error("retention policy"), {code: 403});
        objects.set(key, Buffer.from(bytes));
        log.saves.push({key, options});
      },
      delete: async () => {
        if (retention) throw Object.assign(new Error("retention policy"), {code: 403});
        objects.delete(key);
        log.deletes.push(key);
      },
    }),
  };
}

/** fetch for verify: status by path, and a sitemap body. */
export function createFakeFetch({statuses = {}, sitemap = "<urlset></urlset>"} = {}) {
  const calls = [];
  const fetchImpl = async (url) => {
    const target = new URL(url);
    calls.push(target.pathname);
    if (target.pathname === "/sitemap.xml") return {ok: true, status: 200, text: async () => sitemap};
    return {ok: false, status: statuses[target.pathname] ?? 404, text: async () => ""};
  };
  return {fetchImpl, calls};
}
