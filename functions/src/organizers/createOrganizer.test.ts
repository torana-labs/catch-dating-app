import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {createOrganizerHandler} from "./createOrganizer";
import {defaultOrganizerPublicSlug} from "./organizerIdentity";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  readonly id: string;

  constructor(readonly path: string) {
    this.id = path.split("/").at(-1) ?? "";
  }
}

class FakeSnapshot {
  constructor(private readonly value: FakeData | undefined) {}

  get exists() {
    return this.value !== undefined;
  }

  data() {
    return this.value === undefined ? undefined : structuredClone(this.value);
  }
}

class FakeFirestore {
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

  collection(path: string) {
    return {
      doc: (id = "GeneratedAutoId000001") => new FakeDocRef(`${path}/${id}`),
    };
  }

  async runTransaction<T>(
    callback: (tx: FakeTransaction) => Promise<T>
  ): Promise<T> {
    const tx = new FakeTransaction(this);
    const result = await callback(tx);
    tx.commit();
    return result;
  }

  get(path: string) {
    return this.docs[path] === undefined ?
      undefined :
      structuredClone(this.docs[path]);
  }

  set(path: string, value: FakeData) {
    this.docs[path] = structuredClone(value);
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];

  constructor(private readonly firestore: FakeFirestore) {}

  async get(ref: FakeDocRef) {
    return new FakeSnapshot(this.firestore.get(ref.path));
  }

  create(ref: FakeDocRef, value: FakeData) {
    this.writes.push(() => this.firestore.set(ref.path, value));
  }

  set(ref: FakeDocRef, value: FakeData, options?: {merge?: boolean}) {
    this.writes.push(() => this.firestore.set(ref.path, options?.merge ? {
      ...(this.firestore.get(ref.path) ?? {}),
      ...value,
    } : value));
  }

  commit() {
    this.writes.forEach((write) => write());
  }
}

test("app creation keeps opaque identity separate from the public route",
  async () => {
    const organizerId = "AbCdEfGhIjKlMnOpQr12";
    const firestore = new FakeFirestore({
      "users/owner-1": {name: "Owner"},
    });
    const routes: FakeData[] = [];
    const result = await createOrganizerHandler({
      auth: {uid: "owner-1", token: {}} as CallableRequest["auth"],
      data: {
        organizerId,
        name: "Courtside Mumbai",
        description: "Owner supplied description.",
        location: "in-mh-mumbai",
        area: "Bandra",
      },
      rawRequest: {headers: {}} as CallableRequest["rawRequest"],
    } as CallableRequest<unknown>, {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      serverTimestamp: () =>
        ({kind: "serverTimestamp"}) as unknown as
          FirebaseFirestore.FieldValue,
      reserveCanonicalRoute: async (
        _tx,
        _db,
        options
      ) => {
        routes.push(options as unknown as FakeData);
      },
    });

    const publicSlug = defaultOrganizerPublicSlug(
      "Courtside Mumbai",
      organizerId
    );
    assert.deepEqual(result, {organizerId});
    assert.equal(
      (firestore.get(`organizers/${organizerId}`)?.publicPage as FakeData).slug,
      publicSlug
    );
    assert.equal(routes[0].organizerId, organizerId);
    assert.equal(routes[0].canonicalPath, `/organizers/${publicSlug}/`);
    assert.equal(routes[0].source, "createOrganizer");
    assert.equal(
      firestore.get(`organizers/${organizerId}`)?.appVisibility,
      "hidden"
    );
  });
