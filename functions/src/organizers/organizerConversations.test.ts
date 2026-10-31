import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  organizerInquiryMatchId,
  startOrganizerContactConversationHandler,
  startOrganizerConversationHandler,
} from "./organizerConversations";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore.get(this.path));
  }
}

class FakeSnapshot {
  constructor(private readonly value: FakeData | undefined) {}

  get exists(): boolean {
    return this.value !== undefined;
  }

  data(): FakeData | undefined {
    return this.value === undefined ? undefined : {...this.value};
  }
}

class FakeFirestore {
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

  collection(collectionPath: string) {
    return {
      doc: (docId: string) => new FakeDocRef(
        this,
        `${collectionPath}/${docId}`
      ),
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

  get(path: string): FakeData | undefined {
    const data = this.docs[path];
    return data === undefined ? undefined : {...data};
  }

  set(path: string, data: FakeData) {
    this.docs[path] = data;
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];

  constructor(private readonly firestore: FakeFirestore) {}

  async get(ref: FakeDocRef): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore.get(ref.path));
  }

  create(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => {
      assert.equal(this.firestore.get(ref.path), undefined);
      this.firestore.set(ref.path, data);
    });
  }

  commit() {
    for (const write of this.writes) write();
  }
}

function harness(initialDocs: Record<string, FakeData | undefined>) {
  const firestore = new FakeFirestore(initialDocs);
  const rateLimitCalls: string[] = [];
  return {
    firestore,
    rateLimitCalls,
    deps: {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      serverTimestamp: () => "SERVER_TIMESTAMP" as never,
      checkRateLimit: async (
        _db: FirebaseFirestore.Firestore,
        uid: string,
        action: string
      ) => {
        rateLimitCalls.push(`${uid}:${action}`);
      },
    },
  };
}

function request(
  uid: string,
  data: Record<string, unknown>
): CallableRequest<unknown> {
  return {
    auth: {uid, token: {}} as CallableRequest["auth"],
    data,
    rawRequest: {} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

function organizer(overrides: FakeData = {}): FakeData {
  return {
    name: "Sunday Run Club",
    hostUserId: "owner-1",
    ownerUserId: "owner-1",
    hostUserIds: ["owner-1", "host-1"],
    ...overrides,
  };
}

function organizer(overrides: FakeData = {}): FakeData {
  return {
    ...organizer(),
    organizerType: "club",
    hostProfiles: [],
    ...overrides,
  };
}

function assertHttpsCode(error: unknown, code: string): boolean {
  return error instanceof HttpsError && error.code === code;
}

test("startOrganizerConversationHandler uses organizer authority", async () => {
  const h = harness({
    "organizers/organizer-1": organizer(),
  });

  const result = await startOrganizerConversationHandler(
    request("viewer-1", {
      organizerId: "organizer-1",
      hostUid: "host-1",
    }),
    h.deps
  );
  const matchId = organizerInquiryMatchId({
    organizerId: "organizer-1",
    user1Id: "host-1",
    user2Id: "viewer-1",
  });

  assert.deepEqual(result, {matchId});
  assert.deepEqual(h.rateLimitCalls, [
    "viewer-1:startOrganizerConversation",
  ]);
  assert.equal(
    h.firestore.get(`matches/${matchId}`)?.organizerId,
    "organizer-1"
  );
});

test("startOrganizerContactConversationHandler requires a linked contact",
  async () => {
    const h = harness({
      "organizers/organizer-1": organizer(),
      "organizerContacts/contact-1": {
        organizerId: "organizer-1",
        identityState: "verified",
        linkedUid: "customer-1",
        ambiguousCandidateContactIds: [],
        mergedIntoContactId: null,
        hiddenAt: null,
        deletedAt: null,
      },
    });

    const result = await startOrganizerContactConversationHandler(
      request("owner-1", {
        organizerId: "organizer-1",
        contactId: "contact-1",
      }),
      h.deps
    );
    const matchId = organizerInquiryMatchId({
      organizerId: "organizer-1",
      user1Id: "customer-1",
      user2Id: "owner-1",
    });

    assert.deepEqual(result, {matchId});
    assert.deepEqual(h.rateLimitCalls, [
      "owner-1:startOrganizerConversation",
    ]);
    assert.deepEqual(
      h.firestore.get(`matches/${matchId}`)?.participantIds,
      ["customer-1", "owner-1"]
    );
  }
);

test("startOrganizerContactConversationHandler rejects unlinked contacts",
  async () => {
    const h = harness({
      "organizers/organizer-1": organizer(),
      "organizerContacts/contact-1": {
        organizerId: "organizer-1",
        identityState: "unlinked",
        linkedUid: null,
        hiddenAt: null,
        deletedAt: null,
      },
    });

    await assert.rejects(
      () => startOrganizerContactConversationHandler(
        request("owner-1", {
          organizerId: "organizer-1",
          contactId: "contact-1",
        }),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  }
);

test("startOrganizerContactConversationHandler rejects ambiguous contacts",
  async () => {
    const h = harness({
      "organizers/organizer-1": organizer(),
      "organizerContacts/contact-1": {
        organizerId: "organizer-1",
        identityState: "verified",
        linkedUid: "customer-1",
        ambiguousCandidateContactIds: ["contact-2"],
        mergedIntoContactId: null,
        hiddenAt: null,
        deletedAt: null,
      },
    });

    await assert.rejects(
      () => startOrganizerContactConversationHandler(
        request("owner-1", {
          organizerId: "organizer-1",
          contactId: "contact-1",
        }),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  }
);
