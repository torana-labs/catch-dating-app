import {SecretVersionReferenceGuard} from "../shared/secretVersionReference";
import {InstagramAccessTokenStore} from "./instagramAccessTokenStore";

export const testProjectId = "catch-test-project";
export const testAccountId = "17841400000000001";
export const testSecretParent =
  `projects/${testProjectId}/secrets/CATCH_INSTAGRAM_ACCESS_TOKEN`;

/** An in-memory Firestore and Secret Manager behind the real store. */
export function createInstagramTokenFixture() {
  const docs = new Map<string, Record<string, unknown>>();
  const snapshot = (path: string) => ({exists: docs.has(path),
    data: () => docs.get(path)});
  const ref = (path: string) => ({path, get: async () => snapshot(path)});
  const db = {
    collection: (name: string) => ({doc: (id: string) => ref(`${name}/${id}`)}),
    runTransaction: async <T>(work: (tx: unknown) => Promise<T>) => work({
      get: async (target: {path: string}) => snapshot(target.path),
      set: (target: {path: string}, value: Record<string, unknown>) => {
        docs.set(target.path, value);
      },
    }),
  } as unknown as FirebaseFirestore.Firestore;
  const versions = new Map<string, string>();
  const secrets = {
    failAdd: false,
    add: async (parent: string, value: string) => {
      if (secrets.failAdd) throw new Error("PERMISSION_DENIED");
      const name = `${parent}/versions/${versions.size + 1}`;
      versions.set(name, value);
      return name;
    },
    read: async (version: string) => {
      const value = versions.get(version);
      if (value === undefined) throw new Error("NOT_FOUND");
      return value;
    },
  };
  const store = new InstagramAccessTokenStore(db, () => testProjectId,
    secrets, new SecretVersionReferenceGuard(() => testProjectId,
      async () => "123456789"));
  return {docs, versions, secrets, store,
    record: () => docs.get(`instagramAccessTokens/${testAccountId}`)};
}
