import type {CallableRequest} from "firebase-functions/v2/https";

/**
 * A small in-memory Firestore for the owner-view tests: documents by path,
 * gets, getAll, transactions, batches and the two queries the roll-up runs
 * (owned organisers, the day's follow edges).
 */
export function ownerViewTestStore(
  seed: Record<string, Record<string, unknown>> = {}
) {
  const docs: Record<string, Record<string, unknown>> = {...seed};
  const snap = (path: string) => {
    const data = docs[path];
    return {id: path.split("/").pop()!, exists: data !== undefined,
      data: () => data, get: (field: string) => data?.[field]};
  };
  const ref = (path: string) => ({path, id: path.split("/").pop()!,
    get: async () => snap(path)});
  const millis = (value: unknown) => typeof value === "object" && value &&
    "toMillis" in value ? (value as {toMillis: () => number}).toMillis() :
    Number(value);
  const query = (name: string, filters: Array<[string, string, unknown]>,
    take = Infinity) => ({
    where: (field: string, op: string, value: unknown) =>
      query(name, [...filters, [field, op, value]], take),
    orderBy: () => query(name, filters, take),
    select: () => query(name, filters, take),
    startAfter: () => query(name, filters, take),
    limit: (n: number) => query(name, filters, n),
    get: async () => {
      const prefix = `${name}/`;
      const matches = Object.keys(docs).filter((path) =>
        path.startsWith(prefix) && path.split("/").length === 2)
        .filter((path) => filters.every(([field, op, value]) => {
          const actual = docs[path][field];
          if (op === ">") return typeof actual === "string" && actual > value!;
          if (op === ">=") return millis(actual) >= millis(value);
          if (op === "<") return millis(actual) < millis(value);
          return actual === value;
        })).slice(0, take);
      return {docs: matches.map(snap)};
    },
  });
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ref(`${name}/${id}`),
      ...query(name, []),
    }),
    getAll: async (...refs: Array<{path: string}>) =>
      refs.map((r) => snap(r.path)),
    runTransaction: async <T>(callback: (tx: unknown) => Promise<T>) => {
      const writes: Array<() => void> = [];
      const result = await callback({
        get: async (r: {path: string}) => snap(r.path),
        set: (r: {path: string}, value: Record<string, unknown>) => {
          writes.push(() => {
            docs[r.path] = value;
          });
        },
        update: (r: {path: string}, value: Record<string, unknown>) => {
          writes.push(() => {
            docs[r.path] = {...docs[r.path], ...value};
          });
        },
      });
      writes.forEach((write) => write());
      return result;
    },
    batch: () => {
      const writes: Array<() => void> = [];
      return {
        set: (r: {path: string}, value: Record<string, unknown>) => {
          writes.push(() => {
            docs[r.path] = value;
          });
        },
        commit: async () => writes.forEach((write) => write()),
      };
    },
  };
  return {docs, db: db as unknown as FirebaseFirestore.Firestore};
}

/**
 * A callable request from a signed-in user, or an anonymous one.
 * @param {unknown} data Payload.
 * @param {string} uid Caller, or "" for none.
 * @return {CallableRequest<unknown>} Request.
 */
export function ownerViewRequest(data: unknown, uid = "owner") {
  return {data, auth: uid ? {uid} : undefined,
    rawRequest: {ip: "test", socket: {remoteAddress: "test"}}} as
    unknown as CallableRequest<unknown>;
}

/**
 * An organiser document with an owner, a manager and two owner links.
 * @return {Record<string, unknown>} Organiser data.
 */
export function ownerViewOrganizer(): Record<string, unknown> {
  return {
    name: "Lantern Lane Social", ownerUserId: "owner", hostUserId: "owner",
    hostUserIds: ["owner", "manager"], hostProfiles: [],
    description: "Trivia on Tuesdays.", organizerPhotos: [],
    status: "active", archived: false,
    ownerLinks: [
      {id: "tickets", label: "Quiz tickets", subtitle: null,
        url: "https://lu.ma/quiz", icon: "tickets", pinned: true,
        showUntil: null},
      {id: "community", label: "WhatsApp community", subtitle: null,
        url: "https://chat.whatsapp.com/abc", icon: "community",
        pinned: false, showUntil: null},
    ],
  };
}
