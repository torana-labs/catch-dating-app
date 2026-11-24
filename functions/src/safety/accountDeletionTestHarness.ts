import assert from "node:assert/strict";
import * as admin from "firebase-admin";
import {requestAccountDeletionHandler} from "./accountDeletion";

// The in-memory Firestore, Auth and Storage that account deletion tests run
// requestAccountDeletionHandler against. Batch writes are recorded, not
// applied; transaction writes are applied to the seed.

export type FakeDocumentData = Record<string, unknown>;

interface FakeDocumentReference {
  id: string;
  path: string;
  collectionPath: string;
  docId: string;
  ref: FakeDocumentReference;
  data: () => FakeDocumentData | undefined;
  get: () => Promise<{
    id: string;
    ref: FakeDocumentReference;
    exists: boolean;
    data: () => FakeDocumentData | undefined;
  }>;
  set: (data: FakeDocumentData, options?: {merge: boolean}) => Promise<void>;
}

interface SetWrite {
  path: string;
  data: FakeDocumentData;
  options?: {merge: boolean};
}

interface UpdateWrite {
  path: string;
  data: FakeDocumentData;
}

export function createAccountDeletionHarness(params: {
  seed: Record<string, FakeDocumentData>;
  now: unknown;
  beforeTransaction?: () => void;
  /** Rows to add to the seed first, such as every event's seat ledger. */
  seedSupport?: (seed: Record<string, FakeDocumentData>) =>
    Record<string, FakeDocumentData>;
}) {
  const setWrites: SetWrite[] = [];
  const updateWrites: UpdateWrite[] = [];
  const deletedPublicDocs: string[] = [];
  const deletedAuthUsers: string[] = [];
  const deletedStorageFiles: string[] = [];
  const committedBatches: string[][] = [];
  let commits = 0;
  // Tests change the seed in place.
  const seed = Object.assign(params.seed,
    params.seedSupport?.(params.seed) ?? {});

  const docFor = (
    collectionPath: string,
    docId: string
  ): FakeDocumentReference => {
    const path = `${collectionPath}/${docId}`;
    const ref = {
      id: docId,
      path,
      collectionPath,
      docId,
      data: () => seed[path],
      get: async () => ({
        id: docId,
        ref,
        exists: seed[path] !== undefined,
        data: () => seed[path],
      }),
      set: async (data: FakeDocumentData, options?: {merge: boolean}) => {
        setWrites.push({path, data, options});
        seed[path] = options?.merge ? {...seed[path], ...data} : data;
      },
    } as FakeDocumentReference;
    ref.ref = ref;
    return ref;
  };

  const queryFor = (
    collectionPath: string,
    docs: FakeDocumentReference[] = allDocs(collectionPath)
  ) => ({
    where: (field: string, op: string, value: unknown) => {
      assert.ok(op === "==" || op === "array-contains");
      return queryFor(
        collectionPath,
        docs.filter((doc) => {
          const fieldValue = fieldAt(seed[doc.path], field);
          if (op === "array-contains") {
            return Array.isArray(fieldValue) && fieldValue.includes(value);
          }
          return fieldValue === value;
        })
      );
    },
    get: async () => ({
      docs,
      forEach: (callback: (doc: FakeDocumentReference) => void) => {
        docs.forEach(callback);
      },
    }),
    limit: (count: number) => queryFor(collectionPath,
      docs.slice(0, count)),
  });

  const allDocs = (collectionPath: string): FakeDocumentReference[] =>
    Object.keys(seed)
      .filter((path) => path.startsWith(`${collectionPath}/`))
      .filter((path) => {
        const rest = path.substring(collectionPath.length + 1);
        return !rest.includes("/");
      })
      .map((path) => {
        const segments = path.split("/");
        return docFor(collectionPath, segments[segments.length - 1]);
      });

  const collectionGroupDocs = (collectionId: string): FakeDocumentReference[] =>
    Object.keys(seed)
      .filter((path) => {
        const segments = path.split("/");
        return segments.length >= 2 &&
          segments[segments.length - 2] === collectionId;
      })
      .map((path) => {
        const segments = path.split("/");
        return docFor(
          segments.slice(0, segments.length - 1).join("/"),
          segments[segments.length - 1]
        );
      });

  const firestore = {
    collection: (collectionPath: string) => ({
      doc: (docId: string) => ({
        ...docFor(collectionPath, docId),
        collection: (subcollectionPath: string) => queryFor(
          `${collectionPath}/${docId}/${subcollectionPath}`
        ),
      }),
      where: queryFor(collectionPath).where,
      get: queryFor(collectionPath).get,
    }),
    collectionGroup: (collectionId: string) =>
      queryFor(collectionId, collectionGroupDocs(collectionId)),
    runTransaction: async <T>(callback: (
      tx: FirebaseFirestore.Transaction) => Promise<T>): Promise<T> => {
      params.beforeTransaction?.();
      const pending: Array<() => void> = [];
      const tx = {
        get: async (source: {get: () => Promise<unknown>}) => {
          assert.equal(pending.length, 0, "transaction reads precede writes");
          return source.get();
        },
        set: (ref: FakeDocumentReference, data: FakeDocumentData,
          options?: {merge: boolean}) => pending.push(() => {
          setWrites.push({path: ref.path, data, options});
          seed[ref.path] = options?.merge ? {...seed[ref.path], ...data} : data;
        }),
        delete: (ref: FakeDocumentReference) => pending.push(() => {
          delete seed[ref.path];
        }),
        update: (ref: FakeDocumentReference, data: FakeDocumentData) =>
          pending.push(() => {
            assert.ok(seed[ref.path]);
            updateWrites.push({path: ref.path, data});
            seed[ref.path] = {...seed[ref.path], ...data};
          }),
        create: (ref: FakeDocumentReference, data: FakeDocumentData) =>
          pending.push(() => {
            assert.equal(seed[ref.path], undefined);
            setWrites.push({path: ref.path, data});
            seed[ref.path] = data;
          }),
      } as unknown as FirebaseFirestore.Transaction;
      const result = await callback(tx);
      pending.forEach((write) => write());
      return result;
    },
    batch: () => {
      // The paths this batch writes, recorded in commit order.
      const paths: string[] = [];
      return {
        set: (
          ref: FakeDocumentReference,
          data: FakeDocumentData,
          options?: {merge: boolean}
        ) => {
          paths.push(ref.path);
          setWrites.push({path: ref.path, data, options});
        },
        update: (
          ref: FakeDocumentReference,
          data: FakeDocumentData
        ) => {
          paths.push(ref.path);
          updateWrites.push({path: ref.path, data});
        },
        delete: (ref: FakeDocumentReference) => {
          paths.push(ref.path);
          deletedPublicDocs.push(ref.path);
        },
        commit: async () => {
          commits += 1;
          committedBatches.push(paths);
        },
      };
    },
  } as unknown as FirebaseFirestore.Firestore;

  const auth = {
    deleteUser: async (uid: string) => {
      deletedAuthUsers.push(uid);
    },
  } as unknown as admin.auth.Auth;

  const storageBucket = {
    file: (path: string) => ({
      delete: async () => {
        deletedStorageFiles.push(path);
      },
    }),
  } as unknown as ReturnType<ReturnType<typeof admin.storage>["bucket"]>;

  return {
    deps: {
      auth: () => auth,
      firestore: () => firestore,
      storageBucket: () => storageBucket,
      serverTimestamp: () => params.now as FirebaseFirestore.FieldValue,
    },
    setWrites,
    updateWrites,
    deletedPublicDocs,
    deletedAuthUsers,
    deletedStorageFiles,
    rows: seed,
    committedBatches,
    get commits() {
      return commits;
    },
  };
}

/**
 * A field of stored data by dotted path, as a Firestore query reads it.
 * @param {FakeDocumentData|undefined} data Stored data.
 * @param {string} field Dotted field path.
 * @return {unknown} The value, or undefined.
 */
function fieldAt(data: FakeDocumentData | undefined, field: string): unknown {
  return field.split(".").reduce<unknown>((value, key) =>
    value !== null && typeof value === "object" ?
      (value as FakeDocumentData)[key] : undefined, data);
}

/**
 * Deletes runner-1 against the seed and returns the harness.
 * @param {Record<string, FakeDocumentData>} seed Documents by path.
 * @return {Promise<ReturnType<typeof createAccountDeletionHarness>>} Harness.
 */
export async function deleteRunnerOne(seed: Record<string, FakeDocumentData>) {
  const harness = createAccountDeletionHarness({
    seed: {"users/runner-1": {name: "Asha"}, ...seed},
    now: {kind: "serverTimestamp"},
  });
  await requestAccountDeletionHandler({auth: {uid: "runner-1"}} as
    Parameters<typeof requestAccountDeletionHandler>[0], harness.deps);
  return harness;
}
