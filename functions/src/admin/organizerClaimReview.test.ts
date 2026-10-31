import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  adminGetOrganizerClaimRequestDetailsHandler,
  adminListOrganizerClaimRequestsHandler,
  normalizeOrganizerClaimDetailsPayload,
} from "./organizerClaimReview";

type FakeData = Record<string, unknown>;

class FakeSnapshot {
  readonly id: string;

  constructor(readonly path: string, private readonly value?: FakeData) {
    this.id = path.split("/").at(-1) ?? "";
  }

  get exists(): boolean {
    return this.value !== undefined;
  }

  data(): FakeData | undefined {
    return this.value ? {...this.value} : undefined;
  }
}

class FakeDocRef {
  constructor(
    private readonly firestore: FakeFirestore,
    readonly path: string
  ) {}

  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.path, this.firestore.get(this.path));
  }
}

class FakeQuery {
  private status: unknown = null;
  private limitCount = 1000;

  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string
  ) {}

  where(field: string, op: "==", value: unknown) {
    assert.equal(field, "status");
    assert.equal(op, "==");
    this.status = value;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  async get() {
    const prefix = `${this.path}/`;
    const docs = this.firestore.entries()
      .filter(([path, value]) =>
        path.startsWith(prefix) &&
        path.slice(prefix.length).split("/").length === 1 &&
        value?.status === this.status
      )
      .slice(0, this.limitCount)
      .map(([path, value]) => new FakeSnapshot(path, value));
    return {docs};
  }
}

class FakeCollectionRef {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string
  ) {}

  doc(id: string) {
    return new FakeDocRef(this.firestore, `${this.path}/${id}`);
  }

  where(field: string, op: "==", value: unknown) {
    return new FakeQuery(this.firestore, this.path).where(field, op, value);
  }
}

class FakeFirestore {
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

  collection(path: string) {
    return new FakeCollectionRef(this, path);
  }

  get(path: string): FakeData | undefined {
    const value = this.docs[path];
    return value ? {...value} : undefined;
  }

  entries(): Array<[string, FakeData | undefined]> {
    return Object.entries(this.docs);
  }
}

function request(
  data: unknown = {},
  token: Record<string, unknown> = {support: true}
): CallableRequest<unknown> {
  return {
    auth: {uid: "admin-1", token} as CallableRequest["auth"],
    data,
    rawRequest: {headers: {}} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

function deps(firestore: FakeFirestore) {
  return {
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    now: () => new Date("2026-07-11T00:00:00.000Z"),
    checkRateLimit: async () => undefined,
  };
}

function pendingClaim(overrides: FakeData = {}): FakeData {
  return {
    requestId: "claim-1",
    organizerId: "afterfly",
    requesterUid: "host-1",
    requesterName: "Asha Host",
    requesterRole: "owner",
    businessEmail: "asha@example.com",
    businessPhone: null,
    proofUrls: ["https://example.com/proof"],
    message: "I operate this organizer.",
    status: "pending",
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-07-10T10:00:00.000Z",
    decidedAt: null,
    decidedByUid: null,
    decisionReason: null,
    previousRequestId: null,
    ...overrides,
  };
}

test("normalizeOrganizerClaimDetailsPayload accepts only exact request ids",
  () => {
    assert.deepEqual(
      normalizeOrganizerClaimDetailsPayload({requestId: " claim_1 "}),
      {requestId: "claim_1"}
    );
    assert.throws(
      () => normalizeOrganizerClaimDetailsPayload({
        requestId: "claims/claim_1",
      }),
      (error) =>
        error instanceof HttpsError && error.code === "invalid-argument"
    );
  });

test(
  "adminListOrganizerClaimRequestsHandler returns pending claims newest first",
  async () => {
    const firestore = new FakeFirestore({
      "organizerClaimRequests/claim-1": pendingClaim(),
      "organizerClaimRequests/claim-2": pendingClaim({
        requestId: "claim-2",
        requesterName: "Newer Host",
        createdAt: "2026-07-10T12:00:00.000Z",
      }),
      "organizerClaimRequests/claim-reviewed": pendingClaim({
        requestId: "claim-reviewed",
        status: "approved",
      }),
    });

    const result = await adminListOrganizerClaimRequestsHandler(
      request(),
      deps(firestore)
    );

    assert.equal(result.generatedAt, "2026-07-11T00:00:00.000Z");
    assert.deepEqual(result.rows.map((row) => row.requestId), [
      "claim-2",
      "claim-1",
    ]);
    assert.equal(result.rows[1].proofCount, 1);
  }
);

test("adminGetOrganizerClaimRequestDetailsHandler returns review-safe evidence",
  async () => {
    const firestore = new FakeFirestore({
      "organizerClaimRequests/claim-1": pendingClaim(),
      "organizers/afterfly": {
        name: "AFTER FLY",
        claim: {state: "claimPending"},
        ownership: {state: "programmatic"},
        ownerUserId: null,
        publicPage: {canonicalPath: "/organizers/afterfly/"},
      },
      "users/host-1": {profileComplete: false},
    });

    const result = await adminGetOrganizerClaimRequestDetailsHandler(
      request({requestId: "claim-1"}),
      deps(firestore)
    );

    assert.equal(result.request.organizer.name, "AFTER FLY");
    assert.equal(result.request.organizer.claimState, "claimPending");
    assert.equal(result.request.requesterProfile.exists, true);
    assert.equal(result.request.requesterProfile.profileComplete, false);
    assert.deepEqual(result.request.proofUrls, ["https://example.com/proof"]);
  }
);

test("club claim review handlers deny viewer-only admins", async () => {
  const firestore = new FakeFirestore({});
  await assert.rejects(
    () => adminListOrganizerClaimRequestsHandler(
      request({}, {analyticsViewer: true}),
      deps(firestore)
    ),
    (error) => error instanceof HttpsError && error.code === "permission-denied"
  );
});
