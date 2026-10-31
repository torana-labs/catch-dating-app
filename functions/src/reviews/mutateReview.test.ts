import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  createEventReviewHandler,
  createPublicOrganizerReviewHandler,
  deleteEventReviewHandler,
  listPublicOrganizerReviewsHandler,
  setReviewResponseHandler,
  updateEventReviewHandler,
} from "./mutateReview";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  get id() {
    return this.path.split("/").pop() ?? this.path;
  }

  async get() {
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

class FakeCollectionRef {
  constructor(
    private readonly firestore: FakeFirestore,
    private path: string
  ) {}

  doc(docId?: string) {
    return new FakeDocRef(
      this.firestore,
      `${this.path}/${docId ?? this.firestore.nextId()}`
    );
  }

  where(field: string, op: "==", value: unknown) {
    return new FakeQuery(this.firestore, this.path)
      .where(field, op, value);
  }
}

class FakeQuery {
  private readonly filters: Array<{field: string; value: unknown}> = [];
  private order: {field: string; direction: "asc" | "desc"} | null = null;
  private maxResults: number | null = null;

  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string
  ) {}

  where(field: string, op: "==", value: unknown) {
    assert.equal(op, "==");
    const next = this.clone();
    next.filters.push({field, value});
    return next;
  }

  orderBy(field: string, direction: "asc" | "desc") {
    const next = this.clone();
    next.order = {field, direction};
    return next;
  }

  limit(maxResults: number) {
    const next = this.clone();
    next.maxResults = maxResults;
    return next;
  }

  async get() {
    let docs = this.firestore
      .collectionDocs(this.path)
      .filter((doc) => this.filters.every(
        (filter) => doc.data[filter.field] === filter.value
      ));
    if (this.order) {
      const {field, direction} = this.order;
      docs = docs.sort((a, b) => {
        const left = comparableValue(a.data[field]);
        const right = comparableValue(b.data[field]);
        return direction === "desc" ? right - left : left - right;
      });
    }
    if (this.maxResults !== null) {
      docs = docs.slice(0, this.maxResults);
    }
    return {
      docs: docs.map((doc) => ({
        id: doc.id,
        data: () => ({...doc.data}),
      })),
    };
  }

  private clone() {
    const next = new FakeQuery(this.firestore, this.path);
    next.filters.push(...this.filters);
    next.order = this.order;
    next.maxResults = this.maxResults;
    return next;
  }
}

class FakeFirestore {
  private autoId = 0;

  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

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
    const data = this.docs[path];
    return data === undefined ? undefined : {...data};
  }

  set(path: string, data: FakeData | undefined) {
    this.docs[path] = data;
  }

  collectionDocs(collectionPath: string) {
    const depth = collectionPath.split("/").length + 1;
    return Object.entries(this.docs)
      .filter(([path, value]) =>
        value !== undefined &&
        path.startsWith(`${collectionPath}/`) &&
        path.split("/").length === depth
      )
      .map(([path, data]) => ({
        id: path.split("/").pop() ?? path,
        data: {...data} as FakeData,
      }));
  }

  nextId() {
    this.autoId += 1;
    return `auto-${this.autoId}`;
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];

  constructor(private readonly firestore: FakeFirestore) {}

  async get(ref: FakeDocRef) {
    return new FakeSnapshot(this.firestore.get(ref.path));
  }

  create(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => {
      if (this.firestore.get(ref.path) !== undefined) {
        throw new Error(`Existing doc for create: ${ref.path}`);
      }
      this.firestore.set(ref.path, data);
    });
  }

  update(ref: FakeDocRef, patch: FakeData) {
    this.writes.push(() => {
      const current = this.firestore.get(ref.path);
      if (current === undefined) {
        throw new Error(`Missing doc for update: ${ref.path}`);
      }
      this.firestore.set(ref.path, {...current, ...patch});
    });
  }

  delete(ref: FakeDocRef) {
    this.writes.push(() => this.firestore.set(ref.path, undefined));
  }

  commit() {
    for (const write of this.writes) write();
  }
}

function harness(initialDocs: Record<string, FakeData | undefined>) {
  const firestore = new FakeFirestore(initialDocs);
  const rateLimitCalls: string[] = [];
  const ipRateLimitCalls: string[] = [];
  return {
    firestore,
    rateLimitCalls,
    ipRateLimitCalls,
    deps: {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      serverTimestamp: () => ({kind: "serverTimestamp"} as unknown) as
        FirebaseFirestore.FieldValue,
      checkRateLimit: async (
        _db: FirebaseFirestore.Firestore,
        uid: string,
        action: string
      ) => {
        rateLimitCalls.push(`${uid}:${action}`);
      },
      checkIpRateLimit: (
        ip: string,
        maxRequests?: number,
        windowMs?: number
      ) => {
        ipRateLimitCalls.push(`${ip}:${maxRequests}:${windowMs}`);
        return true;
      },
    },
  };
}

function request(
  uid: string | null,
  data: Record<string, unknown>,
  rawRequest: Partial<CallableRequest["rawRequest"]> = {}
): CallableRequest<unknown> {
  return {
    auth: uid ? {uid, token: {}} as CallableRequest["auth"] : undefined,
    data,
    rawRequest: rawRequest as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

function assertHttpsCode(error: unknown, code: string): boolean {
  return error instanceof HttpsError && error.code === code;
}

function baseDocs(overrides: Record<string, FakeData | undefined> = {}) {
  return {
    "organizers/club-1": organizerDoc(),
    "users/runner-1": {
      name: "Runner One",
      firstName: "Runner",
      displayName: "Runner",
    },
    "events/event-1": {organizerId: "club-1"},
    "eventParticipations/event-1_runner-1": {
      eventId: "event-1",
      organizerId: "club-1",
      uid: "runner-1",
      status: "attended",
    },
    ...overrides,
  };
}

function organizerDoc(publicPageOverrides: FakeData = {}): FakeData {
  return {
    name: "Club One",
    hostUserId: "host-1",
    hostUserIds: ["host-1"],
    hostProfiles: [],
    status: "active",
    archived: false,
    claim: {
      state: "unclaimed",
      claimHref: "/host/#founding-hosts",
      lastClaimRequestId: null,
    },
    publicPage: {
      slug: "club-one",
      citySlug: "delhi",
      canonicalPath: "/organizers/club-one/",
      publishStatus: "published",
      indexStatus: "indexReady",
      robots: "index, follow",
      seoTitle: null,
      seoDescription: null,
      lastRenderedAt: null,
      ...publicPageOverrides,
    },
  };
}

function comparableValue(value: unknown): number {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as {_seconds?: unknown})._seconds === "number"
  ) {
    return (value as {_seconds: number})._seconds;
  }
  return 0;
}

test("createEventReviewHandler writes attended attendee review", async () => {
  const h = harness(baseDocs());

  const result = await createEventReviewHandler(
    request("runner-1", {
      organizerId: "club-1",
      eventId: "event-1",
      rating: 5,
      comment: "  Great event.  ",
    }),
    h.deps
  );

  assert.deepEqual(result, {reviewId: "event-1~runner-1"});
  assert.deepEqual(h.rateLimitCalls, ["runner-1:createEventReview"]);
  const review = h.firestore.get("reviews/event-1~runner-1");
  assert.equal(review?.reviewerName, "Runner");
  assert.equal(review?.comment, "Great event.");
  assert.equal(review?.verificationStatus, "verified");
  assert.equal(review?.source, "catchEvent");
  assert.equal(review?.moderationStatus, "published");
  assert.equal(review?.isAnonymous, false);
});

test("createPublicOrganizerReviewHandler writes anonymous unverified review",
  async () => {
    const h = harness(baseDocs());

    const result = await createPublicOrganizerReviewHandler(
      request(null, {
        organizerId: "club-1",
        rating: 4,
        comment: "  Friendly group, easy to join.  ",
        reviewerName: "",
        isAnonymous: true,
        submittedFromPath: "/organizers/club-one/",
      }, {ip: "203.0.113.7"}),
      h.deps
    );

    assert.equal(result.reviewId, "auto-1");
    assert.equal(result.review.reviewerName, "Anonymous reviewer");
    assert.equal(result.review.verificationStatus, "unverified");
    assert.equal(result.review.source, "publicListing");
    assert.equal(result.review.moderationStatus, "published");
    assert.deepEqual(h.ipRateLimitCalls, [
      "203.0.113.7:5:3600000",
    ]);
    const review = h.firestore.get("reviews/auto-1");
    assert.equal(review?.organizerId, "club-1");
    assert.equal(review?.eventId, null);
    assert.equal(review?.reviewerUserId, null);
    assert.equal(review?.reviewerName, "Anonymous reviewer");
    assert.equal(review?.comment, "Friendly group, easy to join.");
    assert.equal(review?.verificationStatus, "unverified");
    assert.equal(review?.source, "publicListing");
    assert.equal(review?.moderationStatus, "published");
    assert.equal(review?.isAnonymous, true);
    assert.equal(
      review?.submittedFromPath,
      "/organizers/club-one/"
    );
  });

test("createPublicOrganizerReviewHandler returns blocked content as pending",
  async () => {
    const h = harness(baseDocs());

    const result = await createPublicOrganizerReviewHandler(
      request(null, {
        organizerId: "club-1",
        rating: 1,
        comment: "just kill yourself please",
        reviewerName: "",
        isAnonymous: true,
        submittedFromPath: "/organizers/club-one/",
      }, {ip: "203.0.113.7"}),
      h.deps
    );

    // Blocked content must not auto-publish (so it never shows publicly nor
    // counts toward the club rating) until a human clears it.
    const review = h.firestore.get("reviews/auto-1");
    assert.equal(review?.moderationStatus, "pending");
    assert.equal(result.review.moderationStatus, "pending");
  });

test("createPublicOrganizerReviewHandler requires name when not anonymous",
  async () => {
    const h = harness(baseDocs());

    await assert.rejects(
      () => createPublicOrganizerReviewHandler(
        request(null, {
          organizerId: "club-1",
          rating: 4,
          comment: "Helpful.",
          reviewerName: "  ",
          isAnonymous: false,
        }),
        h.deps
      ),
      (error) => assertHttpsCode(error, "invalid-argument")
    );
  });

test("createPublicOrganizerReviewHandler rejects missing organizer",
  async () => {
    const h = harness(baseDocs({"organizers/club-1": undefined}));

    await assert.rejects(
      () => createPublicOrganizerReviewHandler(
        request(null, {
          organizerId: "club-1",
          rating: 4,
          comment: "Helpful.",
          reviewerName: "Reviewer",
          isAnonymous: false,
          submittedFromPath: "/organizers/club-one/",
        }),
        h.deps
      ),
      (error) => assertHttpsCode(error, "not-found")
    );
  });

test("createPublicOrganizerReviewHandler rejects unpublished pages",
  async () => {
    const h = harness(baseDocs({
      "organizers/club-1": organizerDoc({
        publishStatus: "qa",
        robots: "noindex, follow",
      }),
    }));

    await assert.rejects(
      () => createPublicOrganizerReviewHandler(
        request(null, {
          organizerId: "club-1",
          rating: 5,
          comment: "Good room.",
          reviewerName: "Visitor",
          isAnonymous: false,
          submittedFromPath: "/organizers/club-one/",
        }),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  });

test("ineligible canonical organizer rejects public reviews",
  async () => {
    const h = harness(baseDocs({
      "organizers/club-1": organizerDoc({
        publishStatus: "qa",
        robots: "noindex, follow",
      }),
    }));

    await assert.rejects(
      () => listPublicOrganizerReviewsHandler(
        request(null, {organizerId: "club-1"}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );

    await assert.rejects(
      () => createPublicOrganizerReviewHandler(
        request(null, {
          organizerId: "club-1",
          rating: 5,
          comment: "The public organizer listing is unavailable.",
          reviewerName: "Visitor",
          isAnonymous: false,
          submittedFromPath: "/organizers/club-one/",
        }),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  });

test("createPublicOrganizerReviewHandler rejects noncanonical paths",
  async () => {
    const h = harness(baseDocs());

    await assert.rejects(
      () => createPublicOrganizerReviewHandler(
        request(null, {
          organizerId: "club-1",
          rating: 5,
          comment: "Good room.",
          reviewerName: "Visitor",
          isAnonymous: false,
          submittedFromPath: "/organizers/other-club/",
        }),
        h.deps
      ),
      (error) => assertHttpsCode(error, "invalid-argument")
    );
  });

test("listPublicOrganizerReviewsHandler rejects unpublished pages",
  async () => {
    const h = harness(baseDocs({
      "organizers/club-1": organizerDoc({
        publishStatus: "suppressed",
        robots: "noindex, follow",
      }),
    }));

    await assert.rejects(
      () => listPublicOrganizerReviewsHandler(
        request(null, {organizerId: "club-1"}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  });

test("listPublicOrganizerReviewsHandler returns only public published reviews",
  async () => {
    const h = harness(baseDocs({
      "reviews/public-1": {
        organizerId: "club-1",
        eventId: null,
        reviewerUserId: null,
        reviewerName: "Anonymous reviewer",
        rating: 4,
        comment: "Good public review.",
        verificationStatus: "unverified",
        source: "publicListing",
        moderationStatus: "published",
        isAnonymous: true,
        createdAt: {_seconds: 30, _nanoseconds: 0},
      },
      "reviews/verified-1": {
        organizerId: "club-1",
        eventId: "event-1",
        reviewerUserId: "runner-1",
        reviewerName: "Runner",
        rating: 5,
        comment: "Great Catch event.",
        createdAt: {_seconds: 20, _nanoseconds: 0},
      },
      "reviews/pending-1": {
        organizerId: "club-1",
        eventId: null,
        reviewerUserId: null,
        reviewerName: "Pending",
        rating: 3,
        comment: "Pending review.",
        moderationStatus: "pending",
        createdAt: {_seconds: 40, _nanoseconds: 0},
      },
      "reviews/other-club": {
        organizerId: "club-2",
        reviewerName: "Other",
        rating: 5,
        comment: "Other club.",
        createdAt: {_seconds: 50, _nanoseconds: 0},
      },
    }));

    const result = await listPublicOrganizerReviewsHandler(
      request(null, {organizerId: "club-1"}),
      h.deps
    );

    assert.deepEqual(
      result.reviews.map((review) => ({
        id: review.id,
        verificationStatus: review.verificationStatus,
        source: review.source,
      })),
      [
        {
          id: "public-1",
          verificationStatus: "unverified",
          source: "publicListing",
        },
        {
          id: "verified-1",
          verificationStatus: "verified",
          source: "catchEvent",
        },
      ]
    );
  });

test("createEventReviewHandler rejects non-attendees", async () => {
  const h = harness(baseDocs({
    "eventParticipations/event-1_runner-1": {
      eventId: "event-1",
      organizerId: "club-1",
      uid: "runner-1",
      status: "signedUp",
    },
  }));

  await assert.rejects(
    () => createEventReviewHandler(
      request("runner-1", {
        organizerId: "club-1",
        eventId: "event-1",
        rating: 5,
        comment: "Great.",
      }),
      h.deps
    ),
    (error) => assertHttpsCode(error, "failed-precondition")
  );
});

test("updateEventReviewHandler updates only author reviews", async () => {
  const h = harness(baseDocs({
    "reviews/event-1~runner-1": {
      organizerId: "club-1",
      eventId: "event-1",
      reviewerUserId: "runner-1",
      reviewerName: "Runner",
      rating: 3,
      comment: "Old.",
    },
  }));

  const result = await updateEventReviewHandler(
    request("runner-1", {
      reviewId: "event-1~runner-1",
      rating: 4,
      comment: "Better.",
    }),
    h.deps
  );

  assert.deepEqual(result, {updated: true});
  assert.deepEqual(h.rateLimitCalls, ["runner-1:updateEventReview"]);
  const review = h.firestore.get("reviews/event-1~runner-1");
  assert.equal(review?.rating, 4);
  assert.equal(review?.comment, "Better.");
});

test("deleteEventReviewHandler deletes only author reviews", async () => {
  const h = harness(baseDocs({
    "reviews/event-1~runner-1": {
      organizerId: "club-1",
      eventId: "event-1",
      reviewerUserId: "runner-1",
      reviewerName: "Runner",
      rating: 3,
      comment: "Old.",
    },
  }));

  const result = await deleteEventReviewHandler(
    request("runner-1", {reviewId: "event-1~runner-1"}),
    h.deps
  );

  assert.deepEqual(result, {deleted: true});
  assert.deepEqual(h.rateLimitCalls, ["runner-1:deleteEventReview"]);
  assert.equal(h.firestore.get("reviews/event-1~runner-1"), undefined);
});

test("setReviewResponseHandler lets hosts respond", async () => {
  const h = harness(baseDocs({
    "users/host-1": {
      displayName: "Host One",
      profilePhotos: [{
        id: "photo-1",
        url: "https://example.com/host.jpg",
        thumbnailUrl: "https://example.com/host-thumb.jpg",
        storagePath: "profile_photos/host-1/photo-1.jpg",
        thumbnailStoragePath: "profile_photos/host-1/photo-1_thumb.jpg",
        position: 0,
        createdAt: {toDate: () => new Date("2026-01-01T00:00:00.000Z")},
        updatedAt: {toDate: () => new Date("2026-01-01T00:00:00.000Z")},
      }],
    },
    "organizers/club-1": {
      name: "Club One",
      hostUserId: "host-1",
      ownerUserId: "host-1",
      hostUserIds: ["host-1"],
      hostProfiles: [{
        uid: "host-1",
        displayName: "Club Host",
        avatarUrl: "https://example.com/club-host.jpg",
        role: "owner",
      }],
    },
    "reviews/event-1~runner-1": {
      organizerId: "club-1",
      eventId: "event-1",
      reviewerUserId: "runner-1",
      reviewerName: "Runner",
      rating: 3,
      comment: "Old.",
      createdAt: {kind: "createdAt"},
    },
  }));

  const result = await setReviewResponseHandler(
    request("host-1", {
      reviewId: "event-1~runner-1",
      message: "  Thanks for coming.  ",
    }),
    h.deps
  );

  assert.deepEqual(result, {updated: true});
  assert.deepEqual(h.rateLimitCalls, ["host-1:setReviewResponse"]);
  const review = h.firestore.get("reviews/event-1~runner-1");
  assert.deepEqual(review?.ownerResponse, {
    hostUserId: "host-1",
    hostName: "Club Host",
    hostAvatarUrl: "https://example.com/club-host.jpg",
    message: "Thanks for coming.",
    createdAt: {kind: "serverTimestamp"},
    updatedAt: {kind: "serverTimestamp"},
  });
});

test("setReviewResponseHandler rejects blocked response content", async () => {
  const h = harness(baseDocs({
    "users/host-1": {displayName: "Host One"},
    "organizers/club-1": {
      name: "Club One",
      hostUserId: "host-1",
      ownerUserId: "host-1",
      hostUserIds: ["host-1"],
      hostProfiles: [{uid: "host-1", displayName: "Club Host", role: "owner"}],
    },
    "reviews/event-1~runner-1": {
      organizerId: "club-1",
      eventId: "event-1",
      reviewerUserId: "runner-1",
      reviewerName: "Runner",
      rating: 3,
      comment: "Old.",
      createdAt: {kind: "createdAt"},
    },
  }));

  await assert.rejects(
    () => setReviewResponseHandler(
      request("host-1", {
        reviewId: "event-1~runner-1",
        message: "you are a chink",
      }),
      h.deps
    ),
    (error) => (error as {code?: string}).code === "invalid-argument"
  );

  // The response must not be written when blocked.
  const review = h.firestore.get("reviews/event-1~runner-1");
  assert.equal(review?.ownerResponse, undefined);
});

test("setReviewResponseHandler preserves response createdAt on edits",
  async () => {
    const createdAt = {kind: "existingCreatedAt"};
    const h = harness(baseDocs({
      "users/host-1": {displayName: "Host One"},
      "organizers/club-1": {
        name: "Club One",
        hostUserId: "host-1",
        hostUserIds: ["host-1"],
        hostProfiles: [],
      },
      "reviews/event-1~runner-1": {
        organizerId: "club-1",
        eventId: "event-1",
        reviewerUserId: "runner-1",
        reviewerName: "Runner",
        rating: 3,
        comment: "Old.",
        createdAt: {kind: "reviewCreatedAt"},
        ownerResponse: {
          hostUserId: "host-1",
          hostName: "Host One",
          hostAvatarUrl: null,
          message: "First response.",
          createdAt,
          updatedAt: {kind: "oldUpdatedAt"},
        },
      },
    }));

    await setReviewResponseHandler(
      request("host-1", {
        reviewId: "event-1~runner-1",
        message: "Updated response.",
      }),
      h.deps
    );

    const review = h.firestore.get("reviews/event-1~runner-1");
    assert.equal(
      (review?.ownerResponse as FakeData | undefined)?.createdAt,
      createdAt
    );
    assert.equal(
      (review?.ownerResponse as FakeData | undefined)?.message,
      "Updated response."
    );
  });

test("setReviewResponseHandler rejects non-host responders", async () => {
  const h = harness(baseDocs({
    "organizers/club-1": {
      name: "Club One",
      hostUserId: "host-1",
      hostUserIds: ["host-1"],
      hostProfiles: [],
    },
    "reviews/event-1~runner-1": {
      organizerId: "club-1",
      eventId: "event-1",
      reviewerUserId: "runner-1",
      reviewerName: "Runner",
      rating: 3,
      comment: "Old.",
      createdAt: {kind: "createdAt"},
    },
  }));

  await assert.rejects(
    () => setReviewResponseHandler(
      request("runner-1", {
        reviewId: "event-1~runner-1",
        message: "Not allowed.",
      }),
      h.deps
    ),
    (error) => assertHttpsCode(error, "permission-denied")
  );
});
