import assert from "node:assert/strict";
import test from "node:test";
import {
  syncAuthoredReviewReviewerProfile,
  syncOrganizerHostProfile,
  syncHostProfileProjectionsHandler,
  syncUserProfileProjectionsHandler,
} from "./syncPublicProfile";
import {defaultProfilePromptIds} from "../shared/generated/schemaRegistry";
import {removeOrganizerManagerHandler, transferOrganizerOwnershipHandler} from
  "../organizers/manageOrganizerTeam";
import {getOrganizerEventSetupDefaultsHandler} from
  "../organizers/eventSetupDefaults/callables";
import {isOrganizerManager} from "../shared/organizerHosts";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  async set(data: FakeData, options?: {merge: boolean}) {
    this.firestore.set(this.path, data, options);
  }

  async delete() {
    this.firestore.delete(this.path);
  }
}

class FakeBatch {
  private readonly writes: Array<() => void> = [];

  set(ref: FakeDocRef, data: FakeData, options: {merge: boolean}) {
    this.writes.push(() => ref.firestore.set(ref.path, data, options));
  }

  async commit() {
    for (const write of this.writes) write();
  }
}

class FakeTransaction extends FakeBatch {
  async get(ref: FakeDocRef) {
    const data = ref.firestore.get(ref.path);
    return {ref, exists: data !== undefined, data: () => data};
  }

  update(ref: FakeDocRef, data: FakeData) {
    assert.ok(ref.firestore.get(ref.path));
    this.set(ref, data, {merge: true});
  }
}

class FakeFirestore {
  afterQuery?: (collectionPath: string, field?: string) => Promise<void>;

  async runTransaction<T>(body: (tx: FakeTransaction) => Promise<T>) {
    const tx = new FakeTransaction();
    const result = await body(tx);
    await tx.commit();
    return result;
  }
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

  collection(collectionPath: string) {
    return queryRef(this, collectionPath, []);
  }

  batch() {
    return new FakeBatch();
  }

  get(path: string): FakeData | undefined {
    const data = this.docs[path];
    return data === undefined ? undefined : cloneFakeData(data);
  }

  set(path: string, data: FakeData, options?: {merge: boolean}) {
    const current = this.docs[path] ?? {};
    this.docs[path] = options?.merge ? {...current, ...data} : data;
  }

  delete(path: string) {
    delete this.docs[path];
  }
}

function queryRef(
  firestore: FakeFirestore,
  collectionPath: string,
  filters: Array<{field: string; operator: string; value: unknown}>
) {
  return {
    doc: (docId: string) =>
      new FakeDocRef(firestore, `${collectionPath}/${docId}`),
    where: (field: string, operator: string, value: unknown) => {
      assert.ok(["==", "array-contains"].includes(operator));
      return queryRef(
        firestore,
        collectionPath,
        [...filters, {field, operator, value}]
      );
    },
    get: async () => {
      const docs = Object.entries((firestore as never as {
        docs: Record<string, FakeData | undefined>;
      }).docs)
        .filter(([path]) => path.startsWith(`${collectionPath}/`))
        .filter(([, data]) => data !== undefined)
        .filter(([, data]) =>
          filters.every((filter) => {
            const fieldValue = data?.[filter.field];
            if (filter.operator === "==") return fieldValue === filter.value;
            return Array.isArray(fieldValue) &&
              fieldValue.includes(filter.value);
          })
        )
        .map(([path, data]) => ({
          ref: new FakeDocRef(firestore, path),
          data: () => cloneFakeData(data),
        }));
      await firestore.afterQuery?.(collectionPath, filters[0]?.field);
      return {empty: docs.length === 0, docs};
    },
  };
}

function cloneFakeData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneFakeData(item)) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, child]) => [key, cloneFakeData(child)])
    ) as T;
  }
  return value;
}

function timestamp(date: Date) {
  return {toDate: () => date};
}

function completeUser(overrides: FakeData = {}): FakeData {
  return {
    profileComplete: true,
    name: "Asha Runner",
    firstName: "Asha",
    displayName: "Asha Host",
    dateOfBirth: timestamp(new Date("1996-01-01T00:00:00.000Z")),
    phoneNumber: "+919900000001",
    countryCode: "+91",
    profilePrompts: defaultProfilePromptIds.map((promptId) => ({
      promptId,
      prompt: `Prompt ${promptId}`,
      answer: `Answer ${promptId}`,
    })),
    gender: "woman",
    interestedInGenders: ["man"],
    profilePhotos: profilePhotos(),
    activityPreferences: {
      running: {
        paceMinSecsPerKm: 300,
        paceMaxSecsPerKm: 420,
        preferredDistances: [],
        runningReasons: [],
        preferredRunTimes: [],
        version: 1,
      },
    },
    ...overrides,
  };
}

function profilePhotos(thumbnailUrl = "https://example.test/thumb-1.jpg") {
  return [
    {
      id: "photo-1",
      url: "https://example.test/full-1.jpg",
      thumbnailUrl,
      storagePath: "users/host-1/photos/1.jpg",
      thumbnailStoragePath: "users/host-1/photoThumbnails/1.jpg",
      position: 0,
      createdAt: timestamp(new Date("2026-01-01T00:00:00.000Z")),
      updatedAt: timestamp(new Date("2026-01-01T00:00:00.000Z")),
    },
    {
      id: "photo-2",
      url: "https://example.test/full-2.jpg",
      thumbnailUrl: "https://example.test/thumb-2.jpg",
      storagePath: "users/host-1/photos/2.jpg",
      thumbnailStoragePath: "users/host-1/photoThumbnails/2.jpg",
      position: 1,
      createdAt: timestamp(new Date("2026-01-01T00:00:00.000Z")),
      updatedAt: timestamp(new Date("2026-01-01T00:00:00.000Z")),
    },
  ];
}

test("syncUserProfileProjectionsHandler syncs public profile and reviews only",
  async () => {
    const firestore = new FakeFirestore({
      "reviews/event-1~host-1": {
        reviewerUserId: "host-1",
        reviewerName: "Old Reviewer",
        rating: 5,
      },
      "reviews/event-1~other-host": {
        reviewerUserId: "other-host",
        reviewerName: "Other Reviewer",
        rating: 4,
      },
    });

    await syncUserProfileProjectionsHandler(
      "host-1",
      completeUser({
        displayName: "Asha Updated",
        profilePhotos: profilePhotos("https://example.test/new-thumb.jpg"),
      }) as never,
      {firestore: () => firestore as never}
    );

    assert.equal(
      firestore.get("publicProfiles/host-1")?.name,
      "Asha Updated"
    );
    assert.equal(
      firestore.get("reviews/event-1~host-1")?.reviewerName,
      "Asha Updated"
    );
    assert.equal(
      firestore.get("reviews/event-1~other-host")?.reviewerName,
      "Other Reviewer"
    );
  }
);

test("syncUserProfileProjectionsHandler deletes profiles below social-ready",
  async () => {
    const firestore = new FakeFirestore({
      "publicProfiles/host-1": {name: "Old Public"},
    });

    await syncUserProfileProjectionsHandler(
      "host-1",
      completeUser({
        profileComplete: false,
      }) as never,
      {firestore: () => firestore as never}
    );

    assert.equal(firestore.get("publicProfiles/host-1"), undefined);
  }
);

test("syncOrganizerHostProfile updates organizer hosts",
  async () => {
    const firestore = new FakeFirestore({
      "organizers/club-1": {
        ownerUserId: "host-1",
        hostUserId: "host-1",
        hostName: "Old 1",
        hostProfiles: [],
      },
      "organizers/organizer-2": {
        hostUserId: "host-1",
        hostName: "Old 2",
        hostProfiles: [],
      },
      "organizers/organizer-3": {
        hostUserId: "host-2",
        hostName: "Other",
        hostProfiles: [],
      },
    });

    await syncOrganizerHostProfile(
      "host-1",
      {hostName: "New Host", hostAvatarUrl: null},
      {firestore: () => firestore as never}
    );

    assert.equal(firestore.get("organizers/club-1")?.hostName, "New Host");
    assert.equal(firestore.get("organizers/organizer-2")?.hostName, "New Host");
    assert.equal(firestore.get("organizers/organizer-3")?.hostName, "Other");
  }
);

test("syncHostProfileProjectionsHandler owns organizer host display snapshots",
  async () => {
    const timestamp = {} as FirebaseFirestore.Timestamp;
    const firestore = new FakeFirestore({
      "organizers/club-1": {
        ownerUserId: "host-1",
        hostUserId: "host-1",
        hostName: "Old 1",
        hostAvatarUrl: null,
        hostProfiles: [],
      },
      "organizers/club-2": {
        hostUserId: "host-2",
        hostUserIds: ["host-2", "host-1"],
        hostProfiles: [
          {
            uid: "host-2",
            displayName: "Other",
            avatarUrl: null,
            role: "owner",
          },
          {
            uid: "host-1",
            displayName: "Old 2",
            avatarUrl: "https://old.test/avatar.jpg",
            role: "host",
          },
        ],
      },
    });

    await syncHostProfileProjectionsHandler(
      "host-1",
      {
        displayName: "Asha Studio",
        avatarUrl: "https://example.test/host-avatar.jpg",
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {firestore: () => firestore as never}
    );

    assert.deepEqual(firestore.get("organizers/club-1"), {
      ownerUserId: "host-1",
      hostUserId: "host-1",
      hostName: "Asha Studio",
      hostAvatarUrl: "https://example.test/host-avatar.jpg",
      hostProfiles: [{
        uid: "host-1",
        displayName: "Asha Studio",
        avatarUrl: "https://example.test/host-avatar.jpg",
        role: "owner",
      }],
    });
    assert.deepEqual(firestore.get("organizers/club-2")?.hostProfiles, [
      {
        uid: "host-2",
        displayName: "Other",
        avatarUrl: null,
        role: "owner",
      },
      {
        uid: "host-1",
        displayName: "Asha Studio",
        avatarUrl: "https://example.test/host-avatar.jpg",
        role: "host",
      },
    ]);
  }
);

test("syncHostProfileProjectionsHandler never falls back to dating identity",
  async () => {
    const firestore = new FakeFirestore({
      "organizers/organizer-1": {
        hostUserId: "host-1",
        hostName: "Old 1",
        hostProfiles: [],
      },
    });

    await syncHostProfileProjectionsHandler(
      "host-1",
      undefined,
      {firestore: () => firestore as never}
    );

    assert.equal(
      firestore.get("organizers/organizer-1")?.hostName, "Catch Host"
    );
    assert.equal(firestore.get("organizers/organizer-1")?.hostAvatarUrl, null);
  }
);

test("syncAuthoredReviewReviewerProfile updates every review by the user",
  async () => {
    const firestore = new FakeFirestore({
      "reviews/event-1~reviewer-1": {
        reviewerUserId: "reviewer-1",
        reviewerName: "Old 1",
      },
      "reviews/event-2~reviewer-1": {
        reviewerUserId: "reviewer-1",
        reviewerName: "Old 2",
      },
      "reviews/event-1~reviewer-2": {
        reviewerUserId: "reviewer-2",
        reviewerName: "Other",
      },
    });

    await syncAuthoredReviewReviewerProfile(
      "reviewer-1",
      {reviewerName: "New Reviewer"},
      {firestore: () => firestore as never}
    );

    assert.equal(
      firestore.get("reviews/event-1~reviewer-1")?.reviewerName,
      "New Reviewer"
    );
    assert.equal(
      firestore.get("reviews/event-2~reviewer-1")?.reviewerName,
      "New Reviewer"
    );
    assert.equal(
      firestore.get("reviews/event-1~reviewer-2")?.reviewerName,
      "Other"
    );
  }
);

test("syncUserProfileProjectionsHandler deletes public profile on user delete",
  async () => {
    const firestore = new FakeFirestore({
      "publicProfiles/host-1": {name: "Asha"},
    });

    await syncUserProfileProjectionsHandler(
      "host-1",
      undefined,
      {firestore: () => firestore as never}
    );

    assert.equal(firestore.get("publicProfiles/host-1"), undefined);
  }
);

function teamFirestore() {
  return new FakeFirestore({
    "organizers/org-1": {
      ownerUserId: "owner", hostUserId: "owner",
      hostUserIds: ["owner", "manager"], hostName: "Owner",
      status: "active", archived: false,
      hostProfiles: [
        {uid: "owner", displayName: "Owner", avatarUrl: null, role: "owner"},
        {uid: "manager", displayName: "Manager", avatarUrl: null, role: "host"},
      ],
    },
    "organizerTeamMemberships/org-1_manager": {
      status: "active", role: "manager",
    },
    "hostProfiles/manager": {displayName: "Manager", avatarUrl: null},
    "hostProfiles/owner": {displayName: "Owner", avatarUrl: null},
  });
}

function teamRequest(uid: string, target: string) {
  return {auth: {uid}, data: {organizerId: "org-1", uid: target}} as never;
}

function teamDeps(db: FakeFirestore) {
  return {firestore: () => db as never,
    checkRateLimit: async () => undefined};
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return {promise, resolve};
}

function delayTeamQuery(db: FakeFirestore) {
  const captured = deferred();
  const release = deferred();
  db.afterQuery = async (collection, field) => {
    if (collection === "organizers" && field === "hostUserIds") {
      captured.resolve();
      await release.promise;
    }
  };
  return {captured: captured.promise, release: release.resolve};
}

for (const syncingUid of ["manager", "owner"]) {
  test(`delayed ${syncingUid} sync cannot undo actual manager removal`,
    async () => {
      const db = teamFirestore();
      const gate = delayTeamQuery(db);
      const syncing = syncOrganizerHostProfile(syncingUid,
        {hostName: "Updated", hostAvatarUrl: null}, teamDeps(db));
      await gate.captured;
      try {
        await removeOrganizerManagerHandler(teamRequest("owner", "manager"),
          teamDeps(db));
      } finally {
        gate.release();
      }
      await syncing;
      assert.equal(db.get("organizerTeamMemberships/org-1_manager")?.status,
        "removed");
      const organizer = db.get("organizers/org-1")!;
      assert.deepEqual(organizer.hostUserIds, ["owner"]);
      assert.equal(isOrganizerManager(organizer as never, "manager"), false);
      assert.equal(isOrganizerManager(organizer as never, "manager"), false);
      assert.deepEqual((organizer.hostProfiles as Array<{uid: string}>)
        .map((host) => host.uid), ["owner"]);
      await assert.rejects(getOrganizerEventSetupDefaultsHandler({
        auth: {uid: "manager"}, data: {organizerId: "org-1"},
      } as never, teamDeps(db)), {code: "permission-denied"});
    });
}

test("delayed old-owner sync preserves transfer roles and new owner display",
  async () => {
    const db = teamFirestore();
    const gate = delayTeamQuery(db);
    const syncing = syncOrganizerHostProfile("owner",
      {hostName: "Updated old owner", hostAvatarUrl: null}, teamDeps(db));
    await gate.captured;
    try {
      await transferOrganizerOwnershipHandler(teamRequest("owner", "manager"),
        teamDeps(db));
    } finally {
      gate.release();
    }
    await syncing;
    const organizer = db.get("organizers/org-1")!;
    assert.equal(organizer.ownerUserId, "manager");
    assert.equal(organizer.hostName, "Manager");
    assert.deepEqual(organizer.hostProfiles, [
      {uid: "manager", displayName: "Manager", avatarUrl: null, role: "owner"},
      {uid: "owner", displayName: "Updated old owner", avatarUrl: null,
        role: "host"},
    ]);
    assert.equal(isOrganizerManager(organizer as never, "owner"), true);
    await removeOrganizerManagerHandler(teamRequest("manager", "owner"),
      teamDeps(db));
    assert.equal(isOrganizerManager(db.get("organizers/org-1") as never,
      "owner"), false);
  });

test("delayed sync cannot recreate a deleted organizer", async () => {
  const db = teamFirestore();
  const gate = delayTeamQuery(db);
  const syncing = syncOrganizerHostProfile("owner",
    {hostName: "Updated", hostAvatarUrl: null}, teamDeps(db));
  await gate.captured;
  db.delete("organizers/org-1");
  gate.release();
  await syncing;
  assert.equal(db.get("organizers/org-1"), undefined);
});

test("sync filters stale display entries without changing team authority",
  async () => {
    const db = teamFirestore();
    const organizer = db.get("organizers/org-1")!;
    db.set("organizers/org-1", {...organizer, hostUserIds: ["owner"]});
    await syncOrganizerHostProfile("owner",
      {hostName: "Updated", hostAvatarUrl: null}, teamDeps(db));
    assert.deepEqual(db.get("organizers/org-1")?.hostProfiles, [
      {uid: "owner", displayName: "Updated", avatarUrl: null, role: "owner"},
    ]);
    assert.deepEqual(db.get("organizers/org-1")?.hostUserIds, ["owner"]);
  });
