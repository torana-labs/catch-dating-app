import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {validateOrganizerEntitlementsDocument} from
  "../shared/generated/validators/organizerEntitlementsDocument";
import {validateOrganizerEntitlementReceiptDocument} from
  "../shared/generated/validators/organizerEntitlementReceiptDocument";
import {
  adminGrantOrganizerEntitlementHandler,
  adminRevokeOrganizerEntitlementGrantHandler,
} from "./organizerEntitlements";
import {getOrganizerEntitlementHandler} from
  "../entitlements/organizerEntitlementRead";

type FakeData = Record<string, unknown>;
type DocMap = Record<string, FakeData | undefined>;
const now = 1_800_000_000_000;

function callableRequest(
  data: FakeData,
  token: Record<string, unknown> = {adminOwner: true},
  uid = "finance-1"
): CallableRequest<unknown> {
  return {
    auth: {uid, token} as CallableRequest["auth"],
    data,
    rawRequest: {
      headers: {"x-cloud-trace-context": "entitlement-test"},
    } as unknown as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

function ts(millis: number) {
  return {_seconds: Math.floor(millis / 1000), _nanoseconds: 0};
}

class FakeDocRef {
  constructor(
    readonly firestore: FakeFirestore,
    readonly path: string
  ) {}

  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore, this.path);
  }
}

class FakeSnapshot {
  constructor(
    private readonly firestore: FakeFirestore,
    readonly path: string
  ) {}

  get exists(): boolean {
    return this.firestore.get(this.path) !== undefined;
  }

  data(): FakeData | undefined {
    return this.firestore.get(this.path);
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
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];

  constructor(private readonly firestore: FakeFirestore) {}

  async getAll(
    ...refs: FakeDocRef[]
  ): Promise<FakeSnapshot[]> {
    return refs.map((ref) => new FakeSnapshot(this.firestore, ref.path));
  }

  set(ref: FakeDocRef, data: FakeData): void {
    this.writes.push(() => {
      this.firestore.docs[ref.path] = {...data};
    });
  }

  create(ref: FakeDocRef, data: FakeData): void {
    this.writes.push(() => {
      if (this.firestore.get(ref.path) !== undefined) {
        throw new HttpsError("already-exists", `${ref.path} exists`);
      }
      this.firestore.docs[ref.path] = {...data};
    });
  }

  commit(): void {
    for (const write of this.writes) write();
  }
}

class FakeFirestore {
  constructor(readonly docs: DocMap = {}) {}

  collection(collectionPath: string) {
    return new FakeCollectionRef(this, collectionPath);
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
    const value = this.docs[path];
    return value === undefined ? undefined : {...value};
  }

  auditLogs(): FakeData[] {
    return Object.entries(this.docs)
      .filter(([path, value]) =>
        path.startsWith("adminAuditLogs/") && value !== undefined)
      .map(([, value]) => value as FakeData);
  }
}

const grantPayload = {
  organizerId: "organizer-1",
  operationId: "op-aaaaaaaaaaaaaaaaaaaa",
  sku: "wedding_pro",
  unit: "program",
  quantityTotal: 1,
  validUntilMillis: now + 30 * 24 * 60 * 60 * 1000,
  source: "manualInvoice",
  receiptRef: "INV-0412",
  note: "Pilot invoice",
};

function depsFor(firestore: FakeFirestore) {
  const rateLimitActions: string[] = [];
  return {
    rateLimitActions,
    deps: {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      serverTimestamp: () => ts(now) as
        unknown as FirebaseFirestore.FieldValue,
      timestampFromMillis: (millis: number) =>
        ts(millis) as unknown as FirebaseFirestore.Timestamp,
      now: () => now,
      checkRateLimit: async (
        _db: FirebaseFirestore.Firestore,
        _uid: string,
        action: string
      ) => {
        rateLimitActions.push(action);
      },
    },
  };
}

function assertHttpsCode(error: unknown, code: string): boolean {
  assert.equal((error as {code?: string}).code, code);
  return true;
}

test("grant creates the entitlement doc, receipt and audit entry", async () => {
  const firestore = new FakeFirestore();
  const {deps, rateLimitActions} = depsFor(firestore);
  const result = await adminGrantOrganizerEntitlementHandler(
    callableRequest(grantPayload), deps);
  assert.deepEqual(result, {
    schemaVersion: 1,
    organizerId: "organizer-1",
    revision: 1,
    grantId: "grant_op-aaaaaaaaaaaaaaaaaaaa",
    replayed: false,
  });
  const stored = firestore.get("organizerEntitlements/organizer-1");
  assert.equal(validateOrganizerEntitlementsDocument(stored), true);
  const grants = stored?.grants as FakeData[];
  assert.equal(grants.length, 1);
  assert.equal(grants[0].grantedBy, "finance-1");
  assert.equal(grants[0].quantityConsumed, 0);
  assert.deepEqual(grants[0].validFrom, ts(now));
  const receipt = firestore.get(
    "organizerEntitlementReceipts/organizer-1_op-aaaaaaaaaaaaaaaaaaaa");
  assert.equal(validateOrganizerEntitlementReceiptDocument(receipt), true);
  assert.equal(receipt?.action, "grant");
  assert.equal(firestore.auditLogs().length, 1);
  assert.deepEqual(rateLimitActions, ["adminGrantOrganizerEntitlement"]);
});

test("grant replays on the same operation and conflicts on changed input",
  async () => {
    const firestore = new FakeFirestore();
    const {deps} = depsFor(firestore);
    const first = await adminGrantOrganizerEntitlementHandler(
      callableRequest(grantPayload), deps);
    const replay = await adminGrantOrganizerEntitlementHandler(
      callableRequest(grantPayload), deps);
    assert.equal(replay.replayed, true);
    assert.equal(replay.revision, first.revision);
    assert.equal(firestore.auditLogs().length, 1);
    await assert.rejects(
      () => adminGrantOrganizerEntitlementHandler(callableRequest({
        ...grantPayload, sku: "wedding_signature",
      }), deps),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  });

test("grant identity survives receipt expiry, including revoked grants",
  async () => {
    const firestore = new FakeFirestore();
    const {deps} = depsFor(firestore);
    const first = await adminGrantOrganizerEntitlementHandler(
      callableRequest(grantPayload), deps);
    delete firestore.docs[
      "organizerEntitlementReceipts/organizer-1_op-aaaaaaaaaaaaaaaaaaaa"];
    const replay = await adminGrantOrganizerEntitlementHandler(
      callableRequest(grantPayload), deps);
    assert.deepEqual(replay, {...first, replayed: true});
    await assert.rejects(
      () => adminGrantOrganizerEntitlementHandler(callableRequest({
        ...grantPayload, quantityTotal: 2,
      }), deps),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
    await adminRevokeOrganizerEntitlementGrantHandler(callableRequest({
      organizerId: "organizer-1", operationId: "op-bbbbbbbbbbbbbbbbbbbb",
      grantId: first.grantId, reason: "Cancelled",
    }), deps);
    assert.deepEqual(await adminGrantOrganizerEntitlementHandler(
      callableRequest(grantPayload), deps), {...first, replayed: true});
    const grants = firestore.get("organizerEntitlements/organizer-1")?.grants as
      FakeData[];
    assert.equal(grants.length, 1);
    assert.notEqual(grants[0].revokedAt, null);
  });

test("grant rejects SKU units and missing manual invoice references",
  async () => {
    const firestore = new FakeFirestore();
    const {deps} = depsFor(firestore);
    await assert.rejects(
      () => adminGrantOrganizerEntitlementHandler(callableRequest({
        ...grantPayload, sku: "planner_annual", unit: "program",
      }), deps),
      (error) => assertHttpsCode(error, "invalid-argument")
    );
    await assert.rejects(
      () => adminGrantOrganizerEntitlementHandler(callableRequest({
        ...grantPayload, receiptRef: "  ",
      }), deps),
      (error) => assertHttpsCode(error, "invalid-argument")
    );
    assert.equal(firestore.get("organizerEntitlements/organizer-1"),
      undefined);
  });

test("revoke marks the grant and refuses unknown or repeated revokes",
  async () => {
    const firestore = new FakeFirestore();
    const {deps} = depsFor(firestore);
    const granted = await adminGrantOrganizerEntitlementHandler(
      callableRequest(grantPayload), deps);
    const revokePayload = {
      organizerId: "organizer-1",
      operationId: "op-bbbbbbbbbbbbbbbbbbbb",
      grantId: granted.grantId,
      reason: "Duplicate invoice",
    };
    const revoked = await adminRevokeOrganizerEntitlementGrantHandler(
      callableRequest(revokePayload), deps);
    assert.equal(revoked.revision, 2);
    assert.equal(revoked.replayed, false);
    const stored = firestore.get("organizerEntitlements/organizer-1");
    const grants = stored?.grants as FakeData[];
    assert.notEqual(grants[0].revokedAt, null);
    assert.equal(grants[0].revokedBy, "finance-1");
    assert.equal(grants[0].revokeReason, "Duplicate invoice");
    await assert.rejects(
      () => adminRevokeOrganizerEntitlementGrantHandler(callableRequest({
        ...revokePayload, operationId: "op-cccccccccccccccccccc",
      }), deps),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
    await assert.rejects(
      () => adminRevokeOrganizerEntitlementGrantHandler(callableRequest({
        ...revokePayload,
        operationId: "op-dddddddddddddddddddd",
        grantId: "grant_missing",
      }), deps),
      (error) => assertHttpsCode(error, "not-found")
    );
  });

test("only the owner can mutate entitlements", async () => {
  const firestore = new FakeFirestore();
  const {deps} = depsFor(firestore);
  await assert.rejects(
    () => adminGrantOrganizerEntitlementHandler(
      callableRequest(grantPayload, {support: true}), deps),
    (error) => assertHttpsCode(error, "permission-denied")
  );
  await assert.rejects(
    () => adminGrantOrganizerEntitlementHandler(
      {...callableRequest(grantPayload), auth: undefined} as
        CallableRequest<unknown>, deps),
    (error) => assertHttpsCode(error, "unauthenticated")
  );
  const owner = await adminGrantOrganizerEntitlementHandler(
    callableRequest(grantPayload, {adminOwner: true}, "owner-1"), deps);
  assert.equal(owner.replayed, false);
});

test("grant caps at fifty entries and validates the window", async () => {
  const full = new FakeFirestore({
    "organizerEntitlements/organizer-1": {
      schemaVersion: 1,
      organizerId: "organizer-1",
      grants: Array.from({length: 50}, (_, index) => ({
        grantId: `g${index}`,
        sku: "wedding_pro",
        unit: "program",
        quantityTotal: 1,
        quantityConsumed: 0,
        validFrom: ts(now - 1000),
        validUntil: null,
        source: "manualInvoice",
        receiptRef: null,
        note: null,
        grantedBy: "finance-1",
        grantedAt: ts(now - 1000),
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
      })),
      meters: {flightDaysUsed: 0, waConversationsUsed: 0,
        periodStartsAt: ts(now - 1000)},
      revision: 50,
      createdAt: ts(now - 1000),
      updatedAt: ts(now - 1000),
    },
  });
  const {deps} = depsFor(full);
  await assert.rejects(
    () => adminGrantOrganizerEntitlementHandler(
      callableRequest(grantPayload), deps),
    (error) => assertHttpsCode(error, "resource-exhausted")
  );
  const empty = new FakeFirestore();
  await assert.rejects(
    () => adminGrantOrganizerEntitlementHandler(callableRequest({
      ...grantPayload,
      validFromMillis: now + 10_000,
      validUntilMillis: now + 5_000,
    }), depsFor(empty).deps),
    (error) => assertHttpsCode(error, "failed-precondition")
  );
});

const managerOrganizer = {
  schemaVersion: 1,
  organizerId: "organizer-1",
  hostUserId: "host-1",
  hostUserIds: ["host-1", "manager-1"],
  hostProfiles: [],
};

test("getOrganizerEntitlement projects grants, meters and the catalog",
  async () => {
    const firestore = new FakeFirestore({
      "organizers/organizer-1": managerOrganizer,
    });
    const {deps} = depsFor(firestore);
    await adminGrantOrganizerEntitlementHandler(
      callableRequest(grantPayload), deps);
    const result = await getOrganizerEntitlementHandler(
      callableRequest({organizerId: "organizer-1"}, {}, "manager-1"), deps);
    assert.equal(result.catalogVersion, 1);
    assert.equal(result.revision, 1);
    assert.equal(result.grants.length, 1);
    const grant = result.grants[0];
    assert.equal(grant.skuLabel, "Wedding Pro");
    assert.equal(grant.quantityRemaining, 1);
    assert.equal(grant.active, true);
    assert.equal(grant.revoked, false);
    assert.equal(result.skuCatalog.wedding_pro?.priceMinor, 5999900);
    assert.deepEqual(result.meters,
      {flightDaysUsed: 0, waConversationsUsed: 0});
    assert.equal(
      (result.grants[0] as Record<string, unknown>).grantedBy, undefined);
  });

test("getOrganizerEntitlement serves an empty projection and fences managers",
  async () => {
    const firestore = new FakeFirestore({
      "organizers/organizer-1": managerOrganizer,
    });
    const {deps} = depsFor(firestore);
    const empty = await getOrganizerEntitlementHandler(
      callableRequest({organizerId: "organizer-1"}, {}, "host-1"), deps);
    assert.equal(empty.revision, 0);
    assert.deepEqual(empty.grants, []);
    await assert.rejects(
      () => getOrganizerEntitlementHandler(
        callableRequest({organizerId: "organizer-1"}, {}, "stranger-1"),
        deps),
      (error) => assertHttpsCode(error, "permission-denied")
    );
    await assert.rejects(
      () => getOrganizerEntitlementHandler(
        callableRequest({organizerId: "missing-1"}, {}, "host-1"), deps),
      (error) => assertHttpsCode(error, "not-found")
    );
  });

test("Admin Owner can read without organizer membership",
  async () => {
    const firestore = new FakeFirestore();
    const {deps} = depsFor(firestore);
    for (const role of ["adminOwner"]) {
      const result = await getOrganizerEntitlementHandler(
        callableRequest({organizerId: "organizer-1"}, {[role]: true}), deps);
      assert.equal(result.organizerId, "organizer-1");
      assert.deepEqual(result.grants, []);
    }
    await assert.rejects(
      () => getOrganizerEntitlementHandler(
        callableRequest({organizerId: "organizer-1"}, {support: true}), deps),
      (error) => assertHttpsCode(error, "not-found")
    );
  });
