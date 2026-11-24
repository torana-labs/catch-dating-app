import assert from "node:assert/strict";
import test from "node:test";
import {
  syncOrganizerHostProfile,
  syncHostProfileProjectionsHandler,
  syncUserProfileProjectionsHandler,
} from "./syncPublicProfile";
import {removeOrganizerManagerHandler, transferOrganizerOwnershipHandler} from
  "../organizers/manageOrganizerTeam";
import {getManagerEventSetupDefaults} from
  "../organizers/eventSetupDefaults/service";
import {eventSetupDefaultsDependencies} from
  "../organizers/eventSetupDefaults/dependencies";
import {isOrganizerManager} from "../shared/organizerHosts";
import {defaultProfilePromptIds} from
  "../shared/generated/catalogs/defaultProfilePromptIds";


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
  protected readonly writes: Array<() => void> = [];

  set(ref: FakeDocRef, data: FakeData, options: {merge: boolean}) {
    this.writes.push(() => ref.firestore.set(ref.path, data, options));
  }

  async commit() {
    for (const write of this.writes) write();
  }
}

class FakeTransaction extends FakeBatch {
  async get(ref: FakeDocRef | {get: () => Promise<unknown>}) {
    assert.equal(this.writes.length, 0, "Firestore reads must precede writes");
    if (!(ref instanceof FakeDocRef)) return ref.get();
    const data = ref.firestore.get(ref.path);
    return {ref, exists: data !== undefined, data: () => data,
      updateTime: data === undefined ? undefined :
        ref.firestore.updateTime(ref.path)};
  }

  delete(ref: FakeDocRef) {
    this.writes.push(() => ref.firestore.delete(ref.path));
  }

  update(ref: FakeDocRef, data: FakeData) {
    assert.ok(ref.firestore.get(ref.path));
    this.set(ref, data, {merge: true});
  }
}

/** A Timestamp-shaped update time; each write gets a later one. */
type FakeTime = {seconds: number; nanoseconds: number};

class FakeFirestore {
  afterQuery?: (collectionPath: string, field?: string) => Promise<void>;
  private readonly updateTimes = new Map<string, FakeTime>();
  private clock = 0;

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
    this.clock += 1;
    this.updateTimes.set(path,
      {seconds: 1_800_000_000, nanoseconds: this.clock});
  }

  delete(path: string) {
    delete this.docs[path];
    this.updateTimes.delete(path);
  }

  updateTime(path: string): FakeTime {
    return this.updateTimes.get(path) ??
      {seconds: 1_700_000_000, nanoseconds: 0};
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
    // The fixtures stay far below any limit a query sets.
    limit: () => queryRef(firestore, collectionPath, filters),
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
      "users/host-1": completeUser({
        displayName: "Asha Updated",
        profilePhotos: profilePhotos("https://example.test/new-thumb.jpg"),
      }),
      "reviews/event-1~host-1": {
        reviewerUserId: "host-1",
        reviewerName: "Old Reviewer",
        rating: 5,
      },
      "reviews/event-2~host-1": {
        reviewerUserId: "host-1",
        reviewerName: "Older Reviewer",
        rating: 3,
      },
      "eventBookings/event-live_host-1": {eventId: "event-live",
        uid: "host-1", status: "signedUp"},
      "eventBookings/event-gone_host-1": {eventId: "event-gone",
        uid: "host-1", status: "cancelled"},
      "reviews/event-1~other-host": {
        reviewerUserId: "other-host",
        reviewerName: "Other Reviewer",
        rating: 4,
      },
    });

    assert.equal(await syncUserProfileProjectionsHandler(
      "host-1",
      undefined,
      {firestore: () => firestore as never}
    ), "synced");

    assert.equal(
      firestore.get("publicProfiles/host-1")?.name,
      "Asha Updated"
    );
    // The server-only full profile the feeds read is written beside it.
    assert.deepEqual(firestore.get("guestProfiles/host-1"),
      firestore.get("publicProfiles/host-1"));
    // The co-guest copy of a live booking is refreshed; a cancelled one is
    // left alone (#2493).
    assert.equal(firestore.get("eventGuestProfiles/event-live__host-1")?.name,
      "Asha Updated");
    assert.equal(firestore.get("eventGuestProfiles/event-gone__host-1"),
      undefined);
    assert.equal(
      firestore.get("reviews/event-1~host-1")?.reviewerName,
      "Asha Updated"
    );
    assert.equal(
      firestore.get("reviews/event-2~host-1")?.reviewerName,
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
      "users/host-1": completeUser({profileComplete: false}),
      "publicProfiles/host-1": {name: "Old Public"},
    });

    assert.equal(await syncUserProfileProjectionsHandler(
      "host-1",
      undefined,
      {firestore: () => firestore as never}
    ), "deleted");

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
    const firestore = new FakeFirestore({
      "hostProfiles/host-1": {
        displayName: "Asha Studio",
        avatarUrl: "https://example.test/host-avatar.jpg",
        status: "active",
      },
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
      {firestore: () => firestore as never}
    );

    assert.equal(
      firestore.get("organizers/organizer-1")?.hostName, "Catch Host"
    );
    assert.equal(firestore.get("organizers/organizer-1")?.hostAvatarUrl, null);
  }
);

test("syncUserProfileProjectionsHandler deletes public profile on user delete",
  async () => {
    const firestore = new FakeFirestore({
      "publicProfiles/host-1": {name: "Asha"},
      "guestProfiles/host-1": {name: "Asha"},
    });

    assert.equal(await syncUserProfileProjectionsHandler(
      "host-1",
      null,
      {firestore: () => firestore as never}
    ), "deleted");

    assert.equal(firestore.get("publicProfiles/host-1"), undefined);
    assert.equal(firestore.get("guestProfiles/host-1"), undefined);
  }
);

test("out-of-order user writes leave the public profile at the newer state",
  async () => {
    const firestore = new FakeFirestore({});
    const deps = {firestore: () => firestore as never};
    // Write 1 publishes a company; write 2 removes it and renames.
    firestore.set("users/host-1", completeUser({company: "Fictional Labs"}));
    const olderVersion = firestore.updateTime("users/host-1");
    firestore.set("users/host-1", completeUser({displayName: "Asha Private"}));
    const newerVersion = firestore.updateTime("users/host-1");

    // The newer event is delivered first, then the older one.
    assert.equal(await syncUserProfileProjectionsHandler("host-1",
      newerVersion as never, deps), "synced");
    assert.equal(await syncUserProfileProjectionsHandler("host-1",
      olderVersion as never, deps), "stale");

    const projected = firestore.get("publicProfiles/host-1");
    assert.equal(projected?.name, "Asha Private");
    assert.equal(projected?.company, undefined);
  }
);

test("a late event projects the re-read source, never its own payload",
  async () => {
    const firestore = new FakeFirestore({});
    const deps = {firestore: () => firestore as never};
    firestore.set("users/host-1", completeUser({company: "Fictional Labs"}));
    const olderVersion = firestore.updateTime("users/host-1");
    firestore.set("users/host-1", completeUser({displayName: "Asha Private"}));

    // Even with no version to compare (a repair call), the handler projects
    // the re-read source, so the removed company is never published.
    assert.equal(await syncUserProfileProjectionsHandler("host-1",
      undefined, deps), "synced");
    assert.equal(firestore.get("publicProfiles/host-1")?.company, undefined);
    assert.equal(await syncUserProfileProjectionsHandler("host-1",
      olderVersion as never, deps), "stale");
    assert.equal(firestore.get("publicProfiles/host-1")?.name, "Asha Private");
  }
);

test("a delete event delivered after a re-create keeps the profile",
  async () => {
    const firestore = new FakeFirestore({});
    const deps = {firestore: () => firestore as never};
    firestore.set("users/host-1", completeUser());
    assert.equal(await syncUserProfileProjectionsHandler("host-1",
      firestore.updateTime("users/host-1") as never, deps), "synced");
    // The re-created profile is the current state; the delete event is stale.
    assert.equal(await syncUserProfileProjectionsHandler("host-1", null, deps),
      "stale");
    assert.ok(firestore.get("publicProfiles/host-1"));

    // An old create event delivered after a real delete cannot resurrect it.
    const createdVersion = firestore.updateTime("users/host-1");
    firestore.delete("users/host-1");
    assert.equal(await syncUserProfileProjectionsHandler("host-1",
      createdVersion as never, deps), "deleted");
    assert.equal(firestore.get("publicProfiles/host-1"), undefined);
  }
);

test("a late host profile event writes the current host profile",
  async () => {
    const firestore = new FakeFirestore({
      "hostProfiles/host-1": {displayName: "Current Studio", avatarUrl: null},
      "organizers/organizer-1": {
        hostUserId: "host-1", hostName: "Old", hostProfiles: [],
      },
    });
    await syncHostProfileProjectionsHandler("host-1",
      {firestore: () => firestore as never});
    assert.equal(firestore.get("organizers/organizer-1")?.hostName,
      "Current Studio");
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
      // The removed manager loses the authorized defaults read.
      await assert.rejects(getManagerEventSetupDefaults({actorUid: "manager",
        organizerId: "org-1",
        deps: eventSetupDefaultsDependencies(db as never)}),
      {code: "permission-denied"});
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
