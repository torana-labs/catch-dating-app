import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  adminGetAdminUserRolesHandler,
  adminListAdminRoleAssignmentsHandler,
  adminSetAdminUserRolesHandler,
  normalizeGetAdminUserRolesPayload,
  normalizeListAdminRoleAssignmentsPayload,
  normalizeSetAdminUserRolesPayload,
} from "./adminUserRoles";

type FakeData = Record<string, unknown>;

interface FakeUser {
  uid: string;
  email?: string;
  displayName?: string;
  disabled: boolean;
  customClaims?: Record<string, unknown>;
}

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  async set(data: FakeData, _options?: {merge: boolean}): Promise<void> {
    void _options;
    this.firestore.set(this.path, data);
  }
}

class FakeCollectionRef {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string
  ) {}

  doc(docId?: string) {
    return new FakeDocRef(
      this.firestore,
      `${this.path}/${docId ?? this.firestore.autoId()}`
    );
  }

  where(fieldPath: string, op: "==", value: unknown): FakeQuery {
    return new FakeQuery(this.firestore, this.path).where(
      fieldPath,
      op,
      value
    );
  }

  orderBy(fieldPath: string, direction: "asc" | "desc" = "asc"): FakeQuery {
    return new FakeQuery(this.firestore, this.path).orderBy(
      fieldPath,
      direction
    );
  }

  limit(count: number): FakeQuery {
    return new FakeQuery(this.firestore, this.path).limit(count);
  }

  async get(): Promise<{docs: FakeQueryDoc[]}> {
    return new FakeQuery(this.firestore, this.path).get();
  }

  async add(data: FakeData): Promise<FakeDocRef> {
    const ref = this.doc();
    this.firestore.set(ref.path, data);
    return ref;
  }
}

class FakeQueryDoc {
  constructor(readonly id: string, private readonly value: FakeData) {}

  data(): FakeData {
    return {...this.value};
  }
}

class FakeQuery {
  private filters: Array<{fieldPath: string; value: unknown}> = [];
  private limitCount: number | null = null;
  private order: {fieldPath: string; direction: "asc" | "desc"} | null = null;

  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string
  ) {}

  where(fieldPath: string, op: "==", value: unknown): FakeQuery {
    void op;
    const next = this.clone();
    next.filters.push({fieldPath, value});
    return next;
  }

  orderBy(fieldPath: string, direction: "asc" | "desc" = "asc"): FakeQuery {
    const next = this.clone();
    next.order = {fieldPath, direction};
    return next;
  }

  limit(count: number): FakeQuery {
    const next = this.clone();
    next.limitCount = count;
    return next;
  }

  async get(): Promise<{docs: FakeQueryDoc[]}> {
    let rows = this.firestore.collectionDocs(this.path)
      .filter((doc) => this.filters.every((filter) =>
        doc.value[filter.fieldPath] === filter.value
      ));
    if (this.order) {
      const {fieldPath, direction} = this.order;
      rows = [...rows].sort((a, b) =>
        compareValues(a.value[fieldPath], b.value[fieldPath]) *
          (direction === "desc" ? -1 : 1)
      );
    }
    if (this.limitCount !== null) rows = rows.slice(0, this.limitCount);
    return {docs: rows.map((row) => new FakeQueryDoc(row.id, row.value))};
  }

  private clone(): FakeQuery {
    const next = new FakeQuery(this.firestore, this.path);
    next.filters = [...this.filters];
    next.limitCount = this.limitCount;
    next.order = this.order;
    return next;
  }
}

class FakeFirestore {
  private autoIdCounter = 0;

  constructor(
    private readonly docs: Record<string, FakeData | undefined> = {}
  ) {}

  collection(collectionPath: string) {
    return new FakeCollectionRef(this, collectionPath);
  }

  autoId(): string {
    this.autoIdCounter += 1;
    return `auto-${this.autoIdCounter}`;
  }

  set(path: string, data: FakeData): void {
    this.docs[path] = {...(this.docs[path] ?? {}), ...data};
  }

  get(path: string): FakeData | undefined {
    const value = this.docs[path];
    return value === undefined ? undefined : {...value};
  }

  collectionDocs(path: string): Array<{id: string; value: FakeData}> {
    const prefix = `${path}/`;
    return Object.entries(this.docs)
      .filter(([docPath, value]) =>
        docPath.startsWith(prefix) &&
        !docPath.slice(prefix.length).includes("/") &&
        value !== undefined
      )
      .map(([docPath, value]) => ({
        id: docPath.slice(prefix.length),
        value: {...(value as FakeData)},
      }));
  }

  adminAuditLogs(): FakeData[] {
    return Object.entries(this.docs)
      .filter(([path, value]) =>
        path.startsWith("adminAuditLogs/") && value !== undefined
      )
      .map(([, value]) => value as FakeData);
  }
}

function compareValues(left: unknown, right: unknown): number {
  const leftValue = sortableValue(left);
  const rightValue = sortableValue(right);
  if (leftValue < rightValue) return -1;
  if (leftValue > rightValue) return 1;
  return 0;
}

function sortableValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

class FakeAuth {
  constructor(private readonly users: Record<string, FakeUser | undefined>) {}

  async getUser(uid: string): Promise<FakeUser> {
    const user = this.users[uid];
    if (!user) {
      const error = new Error("User not found") as Error & {code: string};
      error.code = "auth/user-not-found";
      throw error;
    }
    return {
      ...user,
      customClaims: user.customClaims ? {...user.customClaims} : undefined,
    };
  }

  async setCustomUserClaims(
    uid: string,
    customClaims: Record<string, unknown> | null
  ): Promise<void> {
    const user = this.users[uid];
    if (!user) throw new Error(`Missing user ${uid}`);
    user.customClaims = customClaims ? {...customClaims} : undefined;
  }
}

test("normalizeGetAdminUserRolesPayload validates exact uids", () => {
  assert.deepEqual(
    normalizeGetAdminUserRolesPayload({targetUid: " admin_1 "}),
    {targetUid: "admin_1"}
  );
  assert.throws(
    () => normalizeGetAdminUserRolesPayload({targetUid: "users/admin_1"}),
    (error) =>
      error instanceof HttpsError && error.code === "invalid-argument"
  );
});

test("normalizeSetAdminUserRolesPayload dedupes roles and needs note", () => {
  assert.deepEqual(
    normalizeSetAdminUserRolesPayload({
      targetUid: "support_1",
      roles: ["support", "support", "salesStaff"],
      note: " launch ops ",
    }),
    {
      targetUid: "support_1",
      roles: ["support", "salesStaff"],
      note: "launch ops",
    }
  );
  assert.throws(
    () => normalizeSetAdminUserRolesPayload({
      targetUid: "support_1",
      roles: ["support"],
      note: " ",
    }),
    (error) =>
      error instanceof HttpsError && error.code === "invalid-argument"
  );
});

test("normalizeListAdminRoleAssignmentsPayload bounds status and limit", () => {
  assert.deepEqual(normalizeListAdminRoleAssignmentsPayload({}), {
    status: "active",
    limit: 50,
  });
  assert.deepEqual(
    normalizeListAdminRoleAssignmentsPayload({status: "all", limit: 10}),
    {status: "all", limit: 10}
  );
  assert.throws(
    () => normalizeListAdminRoleAssignmentsPayload({status: "pending"}),
    (error) =>
      error instanceof HttpsError && error.code === "invalid-argument"
  );
  assert.throws(
    () => normalizeListAdminRoleAssignmentsPayload({limit: 0}),
    (error) =>
      error instanceof HttpsError && error.code === "invalid-argument"
  );
});

test("Sales staff role assignment remains Owner-only", async () => {
  assert.deepEqual(normalizeSetAdminUserRolesPayload({targetUid: "staff_1",
    roles: ["salesStaff"], note: "Assigned account work only"}),
  {targetUid: "staff_1", roles: ["salesStaff"],
    note: "Assigned account work only"});
  await assert.rejects(adminSetAdminUserRolesHandler(request({
    targetUid: "staff_1",
    roles: ["adminOwner"], note: "Attempted escalation"}, {salesStaff: true}),
  deps(new FakeAuth({}), new FakeFirestore())),
  (error) => error instanceof HttpsError && error.code === "permission-denied");
});

test("adminGetAdminUserRolesHandler returns Catch admin roles", async () => {
  const auth = new FakeAuth({
    support_1: {
      uid: "support_1",
      email: "support@example.com",
      displayName: "Support One",
      disabled: false,
      customClaims: {support: true, betaTester: true},
    },
  });

  const result = await adminGetAdminUserRolesHandler(
    request({targetUid: "support_1"}),
    deps(auth, new FakeFirestore())
  );

  assert.deepEqual(result.user, {
    targetUid: "support_1",
    email: "support@example.com",
    displayName: "Support One",
    disabled: false,
    roles: ["support"],
    assignmentPath: "adminRoleAssignments/support_1",
  });
});

test("adminListAdminRoleAssignmentsHandler returns active rows", async () => {
  const firestore = new FakeFirestore({
    "adminRoleAssignments/support_1": {
      targetUid: "support_1",
      email: "support@example.com",
      displayName: "Support One",
      disabled: false,
      roles: ["support", "betaTester"],
      status: "active",
      updatedAt: new Date("2026-06-25T08:30:00.000Z"),
      updatedByUid: "admin-1",
    },
    "adminRoleAssignments/revoked_1": {
      targetUid: "revoked_1",
      disabled: false,
      roles: [],
      status: "revoked",
      updatedAt: new Date("2026-06-24T08:30:00.000Z"),
      updatedByUid: "admin-1",
    },
  });

  const result = await adminListAdminRoleAssignmentsHandler(
    request({status: "active", limit: 5}),
    deps(new FakeAuth({}), firestore)
  );

  assert.equal(result.source, "adminRoleAssignments");
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.rows[0], {
    targetUid: "support_1",
    email: "support@example.com",
    displayName: "Support One",
    disabled: false,
    roles: ["support"],
    assignmentPath: "adminRoleAssignments/support_1",
    status: "active",
    updatedAt: "2026-06-25T08:30:00.000Z",
    updatedByUid: "admin-1",
  });
});

test("adminSetAdminUserRolesHandler updates claims and audit log", async () => {
  const auth = new FakeAuth({
    support_1: {
      uid: "support_1",
      email: "support@example.com",
      displayName: "Support One",
      disabled: false,
      customClaims: {salesStaff: true, analyticsViewer: true,
        finance: true, betaTester: true},
    },
  });
  const firestore = new FakeFirestore();

  const result = await adminSetAdminUserRolesHandler(
    request({
      targetUid: "support_1",
      roles: ["support", "salesStaff"],
      note: "Support launch queue coverage.",
    }),
    deps(auth, firestore)
  );

  assert.deepEqual(result.beforeRoles, ["salesStaff"]);
  assert.deepEqual(result.afterRoles, ["support", "salesStaff"]);
  assert.deepEqual(result.user.roles, ["support", "salesStaff"]);
  // The retired finance and analytics claims leave the account on any save.
  assert.deepEqual((await auth.getUser("support_1")).customClaims, {
    betaTester: true,
    support: true,
    salesStaff: true,
  });
  assert.deepEqual(
    firestore.get("adminRoleAssignments/support_1")?.roles,
    ["support", "salesStaff"]
  );
  assert.equal(
    firestore.get("adminRoleAssignments/support_1")?.status,
    "active"
  );
  assert.equal(firestore.adminAuditLogs().length, 1);
  assert.equal(
    firestore.adminAuditLogs()[0].action,
    "adminSetAdminUserRoles"
  );
});

test("adminSetAdminUserRolesHandler can revoke another admin", async () => {
  const auth = new FakeAuth({
    support_1: {
      uid: "support_1",
      disabled: false,
      customClaims: {support: true},
    },
  });
  const firestore = new FakeFirestore();

  const result = await adminSetAdminUserRolesHandler(
    request({
      targetUid: "support_1",
      roles: [],
      note: "No longer on admin rotation.",
    }),
    deps(auth, firestore)
  );

  assert.deepEqual(result.afterRoles, []);
  assert.equal((await auth.getUser("support_1")).customClaims, undefined);
  assert.equal(
    firestore.get("adminRoleAssignments/support_1")?.status,
    "revoked"
  );
});

test("adminSetAdminUserRolesHandler blocks non-owner admins", async () => {
  await assert.rejects(
    () => adminSetAdminUserRolesHandler(
      request(
        {targetUid: "support_1", roles: ["support"], note: "Reviewed."},
        {support: true}
      ),
      deps(new FakeAuth({}), new FakeFirestore())
    ),
    (error) =>
      error instanceof HttpsError && error.code === "permission-denied"
  );
});

test("adminSetAdminUserRolesHandler blocks owner self-demotion", async () => {
  const auth = new FakeAuth({
    "admin-1": {
      uid: "admin-1",
      disabled: false,
      customClaims: {adminOwner: true},
    },
  });

  await assert.rejects(
    () => adminSetAdminUserRolesHandler(
      request({
        targetUid: "admin-1",
        roles: ["admin"],
        note: "Remove owner.",
      }),
      deps(auth, new FakeFirestore())
    ),
    (error) =>
      error instanceof HttpsError && error.code === "failed-precondition"
  );
});

function deps(auth: FakeAuth, firestore: FakeFirestore) {
  return {
    auth: () => auth,
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    serverTimestamp: () =>
      "SERVER_TIME" as unknown as FirebaseFirestore.FieldValue,
    checkRateLimit: async () => undefined,
  };
}

function request(
  data: unknown,
  token: Record<string, unknown> = {adminOwner: true}
): CallableRequest<unknown> {
  return {
    auth: {uid: "admin-1", token},
    data,
  } as unknown as CallableRequest<unknown>;
}
