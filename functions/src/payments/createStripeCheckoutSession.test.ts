import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {
  createStripeCheckoutSessionHandler,
} from "./createStripeCheckoutSession";
import type {
  EventDocument,
  HostPaymentAccountDocument,
  OrganizerDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  StripeClient,
  StripeCheckoutSessionCreateInput,
} from "./stripe";
import {catchNativeEventOrigin} from "../shared/testUtils";

test("createStripeCheckoutSessionHandler creates trusted destination checkout",
  async () => {
    const firestore = new FakeFirestore({
      "events/event-1": buildEventDoc(),
      "users/runner-1": {
        gender: "man",
        interestedInGenders: ["woman"],
      },
      "organizers/organizer-1": buildOrganizerDoc(),
      "hostPaymentAccounts/host-1": buildHostAccountDoc(),
    });
    let capturedInput: StripeCheckoutSessionCreateInput | undefined;

    const response = await createStripeCheckoutSessionHandler(
      buildRequest({
        data: {eventId: " event-1 "},
        auth: {uid: "runner-1"},
      }),
      {
        firestore: () =>
          firestore as unknown as FirebaseFirestore.Firestore,
        stripe: () => stripeClient({
          createCheckoutSession: async (input) => {
            capturedInput = input;
            return {
              id: "cs_test_123",
              url: "https://checkout.stripe.com/c/pay/cs_test_123",
              paymentStatus: "unpaid",
              amountTotal: null,
              currency: null,
              paymentIntentId: null,
              metadata: {},
            };
          },
        }),
        serverTimestamp: () => "server-now",
        checkRateLimit: async (_db, uid, action) => {
          assert.equal(uid, "runner-1");
          assert.equal(action, "createStripeCheckoutSession");
        },
      }
    );

    assert.equal(capturedInput?.paymentId, "payment_1");
    assert.equal(capturedInput?.eventId, "event-1");
    assert.equal(capturedInput?.organizerId, "organizer-1");
    assert.equal(capturedInput?.userId, "runner-1");
    assert.equal(capturedInput?.hostUserId, "host-1");
    assert.equal(capturedInput?.stripeAccountId, "acct_host_123");
    assert.equal(capturedInput?.amountMinor, 3500);
    assert.equal(capturedInput?.currency, "USD");
    assert.equal(capturedInput?.applicationFeeAmount, 0);
    assert.match(capturedInput?.successUrl ?? "", /session_id=/);

    assert.deepEqual(response, {
      sessionId: "cs_test_123",
      paymentId: "payment_1",
      amountMinor: 3500,
      currency: "USD",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_123",
      provider: "stripe",
    });
    assert.deepEqual(firestore.data["payments/payment_1"], {
      userId: "runner-1",
      orderId: "cs_test_123",
      paymentId: "payment_1",
      eventId: "event-1",
      amount: 3500,
      amountMinor: 3500,
      currency: "USD",
      provider: "stripe",
      providerPaymentId: null,
      checkoutSessionId: "cs_test_123",
      hostUserId: "host-1",
      stripeAccountId: "acct_host_123",
      applicationFeeAmount: 0,
      status: "pending",
      signUpFailed: false,
      createdAt: "server-now",
    });
  });

test("private or incomplete events never start Stripe checkout", async () => {
  for (const [event, message] of [
    [buildEventDoc({publicationState: "private"} as
      Partial<EventDocument>), "This event is not open for public booking."],
    [buildEventDoc({capacityLimit: undefined}),
      "This event is not ready for booking."],
    [buildEventDoc({priceInPaise: undefined}),
      "This event is not ready for booking."],
  ] as const) {
    const firestore = new FakeFirestore({
      "events/event-1": event,
      "users/runner-1": {gender: "man", interestedInGenders: ["woman"]},
    });
    await assert.rejects(createStripeCheckoutSessionHandler(
      buildRequest({data: {eventId: "event-1"}, auth: {uid: "runner-1"}}),
      {
        firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
        stripe: () => stripeClient({
          createCheckoutSession: async () => {
            throw new Error("Stripe should not be called.");
          },
        }),
        serverTimestamp: () => "server-now",
        checkRateLimit: async () => undefined,
      }
    ), isHttpsError("failed-precondition", message));
  }
});

test("createStripeCheckoutSessionHandler rejects hosts without Stripe payouts",
  async () => {
    const firestore = new FakeFirestore({
      "events/event-1": buildEventDoc(),
      "users/runner-1": {
        gender: "man",
        interestedInGenders: ["woman"],
      },
      "organizers/organizer-1": buildOrganizerDoc(),
      "hostPaymentAccounts/host-1": buildHostAccountDoc({
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingStatus: "pending",
      }),
    });

    await assert.rejects(
      createStripeCheckoutSessionHandler(
        buildRequest({
          data: {eventId: "event-1"},
          auth: {uid: "runner-1"},
        }),
        {
          firestore: () =>
            firestore as unknown as FirebaseFirestore.Firestore,
          stripe: () => stripeClient({
            createCheckoutSession: async () => {
              throw new Error("Stripe should not be called.");
            },
          }),
          serverTimestamp: () => "server-now",
          checkRateLimit: async () => undefined,
        }
      ),
      isHttpsError(
        "failed-precondition",
        "This host cannot accept international payments yet."
      )
    );
  });

test("createStripeCheckoutSessionHandler routes INR back to Razorpay",
  async () => {
    const firestore = new FakeFirestore({
      "events/event-1": buildEventDoc({currency: "INR"}),
      "users/runner-1": {
        gender: "man",
        interestedInGenders: ["woman"],
      },
    });

    await assert.rejects(
      createStripeCheckoutSessionHandler(
        buildRequest({
          data: {eventId: "event-1"},
          auth: {uid: "runner-1"},
        }),
        {
          firestore: () =>
            firestore as unknown as FirebaseFirestore.Firestore,
          stripe: () => stripeClient({}),
          serverTimestamp: () => "server-now",
          checkRateLimit: async () => undefined,
        }
      ),
      isHttpsError("failed-precondition", "Use Razorpay for INR paid bookings.")
    );
  });

function buildRequest({
  data,
  auth,
}: {
  data: Record<string, unknown> | null;
  auth?: {uid: string};
}): CallableRequest<Record<string, unknown> | null> {
  return {
    data,
    auth: auth ?
      ({uid: auth.uid, token: {}} as CallableRequest["auth"]) :
      undefined,
    rawRequest: {} as CallableRequest["rawRequest"],
    acceptsStreaming: false,
  };
}

function buildEventDoc(
  overrides: Partial<EventDocument> = {}
): EventDocument {
  return {
    organizerId: "organizer-1",
    eventOrigin: catchNativeEventOrigin(),
    startTime: timestamp("2026-05-02T01:30:00.000Z"),
    endTime: timestamp("2026-05-02T02:30:00.000Z"),
    meetingPoint: "Prospect Park",
    meetingLocation: {
      name: "Prospect Park",
      address: null,
      placeId: null,
      latitude: 40.6602,
      longitude: -73.9690,
      notes: null,
    },
    startingPointLat: 40.6602,
    startingPointLng: -73.9690,
    locationDetails: null,
    eventFormat: {
      version: 1,
      activityKind: "socialRun",
      interactionModel: "pacePods",
      defaultPlaybookId: "social_run_light",
    },
    distanceKm: 5,
    pace: "easy",
    capacityLimit: 20,
    description: "Easy paced park event.",
    priceInPaise: 3500,
    currency: "USD",
    bookedCount: 0,
    checkedInCount: 0,
    waitlistedCount: 0,
    status: "active",
    cancelledAt: null,
    cancellationReason: null,
    constraints: {
      minAge: 0,
      maxAge: 99,
    },
    genderCounts: {},
    cohortCounts: {},
    waitlistedCohortCounts: {},
    discoveryCityName: "new-york",
    discoveryMarketId: "us-ny-new-york",
    discoveryActivityKind: "socialRun",
    discoveryGeoCell: "508:-925",
    discoveryHasOpenSpots: true,
    discoveryAvailability: "open",
    discoveryOpenCohorts: [],
    discoveryWaitlistCohorts: [],
    discoveryInviteRequired: false,
    discoveryMembershipRequired: false,
    discoveryManualApprovalRequired: false,
    discoveryMinAge: 0,
    discoveryMaxAge: 99,
    ...overrides,
  };
}

function buildOrganizerDoc(
  overrides: Partial<OrganizerDocument> = {}
): OrganizerDocument {
  return {
    name: "Brooklyn Run Club",
    description: "Small social runs.",
    location: "us-ny-new-york",
    locationCityId: "us-ny-new-york",
    locationMarketId: "us-ny-new-york",
    area: "Brooklyn",
    hostUserId: "host-1",
    hostName: "Host",
    hostAvatarUrl: null,
    ownerUserId: "host-1",
    hostUserIds: ["host-1"],
    hostProfiles: [{
      uid: "host-1",
      displayName: "Host",
      avatarUrl: null,
      role: "owner",
    }],
    createdAt: timestamp("2026-01-01T00:00:00.000Z"),
    imageUrl: null,
    profileImageUrl: null,
    tags: [],
    organizerType: "club",
    organizerPhotos: [],
    followerCount: 1,
    rating: 0,
    reviewCount: 0,
    nextEventAt: null,
    nextEventLabel: null,
    instagramHandle: null,
    phoneNumber: null,
    email: null,
    status: "active",
    archived: false,
    archivedAt: null,
    archiveReason: null,
    ...overrides,
  } as OrganizerDocument;
}

function buildHostAccountDoc(
  overrides: Partial<HostPaymentAccountDocument> = {}
): HostPaymentAccountDocument {
  return {
    userId: "host-1",
    provider: "stripe",
    country: "US",
    defaultCurrency: "USD",
    providerAccountId: "acct_host_123",
    stripeAccountId: "acct_host_123",
    razorpayAccountId: "",
    chargesEnabled: true,
    payoutsEnabled: true,
    detailsSubmitted: true,
    onboardingStatus: "complete",
    disabledReason: null,
    requirementsCurrentlyDue: [],
    requirementsPastDue: [],
    requirementsPendingVerification: [],
    lastStripeEventId: null,
    createdAt: timestamp("2026-01-01T00:00:00.000Z"),
    updatedAt: timestamp("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function stripeClient(
  overrides: Partial<StripeClient>
): StripeClient {
  return {
    createConnectedAccount: async () => {
      throw new Error("createConnectedAccount should not be called.");
    },
    retrieveConnectedAccount: async () => {
      throw new Error("retrieveConnectedAccount should not be called.");
    },
    createAccountLink: async () => {
      throw new Error("createAccountLink should not be called.");
    },
    createCheckoutSession: async () => {
      throw new Error("createCheckoutSession should not be called.");
    },
    retrieveCheckoutSession: async () => {
      throw new Error("retrieveCheckoutSession should not be called.");
    },
    createRefund: async () => {
      throw new Error("createRefund should not be called.");
    },
    ...overrides,
  };
}

function timestamp(iso: string): FirebaseFirestore.Timestamp {
  return {
    toMillis: () => Date.parse(iso),
  } as FirebaseFirestore.Timestamp;
}

function isHttpsError(expectedCode: string, expectedMessage: string) {
  return (error: unknown) =>
    error instanceof HttpsError &&
    error.code === expectedCode &&
    error.message === expectedMessage;
}

interface QueryFilter {
  field: string;
  op: FirebaseFirestore.WhereFilterOp;
  value: unknown;
}

class FakeFirestore {
  private autoId = 0;

  constructor(readonly data: Record<string, unknown>) {}

  collection(collectionPath: string) {
    return new FakeCollectionRef(this, collectionPath);
  }

  nextId(prefix: string): string {
    this.autoId += 1;
    return `${prefix}_${this.autoId}`;
  }
}

class FakeCollectionRef {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly collectionPath: string
  ) {}

  doc(id?: string) {
    return new FakeDocRef(
      this.firestore,
      this.collectionPath,
      id ?? this.firestore.nextId(this.collectionPath.slice(0, -1))
    );
  }

  where(
    field: string,
    op: FirebaseFirestore.WhereFilterOp,
    value: unknown
  ) {
    return new FakeQuery(this.firestore, this.collectionPath, [{
      field,
      op,
      value,
    }]);
  }
}

class FakeQuery {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly collectionPath: string,
    private readonly filters: QueryFilter[],
    private readonly limitCount?: number
  ) {}

  where(
    field: string,
    op: FirebaseFirestore.WhereFilterOp,
    value: unknown
  ) {
    return new FakeQuery(
      this.firestore,
      this.collectionPath,
      this.filters.concat({field, op, value}),
      this.limitCount
    );
  }

  limit(limitCount: number) {
    return new FakeQuery(
      this.firestore,
      this.collectionPath,
      this.filters,
      limitCount
    );
  }

  async get() {
    const prefix = `${this.collectionPath}/`;
    let docs = Object.entries(this.firestore.data)
      .filter(([path]) => path.startsWith(prefix) &&
        !path.slice(prefix.length).includes("/"))
      .map(([path, data]) => new FakeQueryDocSnapshot(
        this.firestore,
        this.collectionPath,
        path.slice(prefix.length),
        data
      ))
      .filter((doc) => this.filters.every((filter) =>
        matchesFilter(doc.data(), filter)
      ));
    if (this.limitCount !== undefined) {
      docs = docs.slice(0, this.limitCount);
    }
    return {
      docs,
      empty: docs.length === 0,
    };
  }
}

class FakeDocRef {
  readonly path: string;

  constructor(
    private readonly firestore: FakeFirestore,
    collectionPath: string,
    readonly id: string
  ) {
    this.path = `${collectionPath}/${id}`;
  }

  async get() {
    return new FakeDocSnapshot(
      this,
      this.firestore.data[this.path]
    );
  }

  async set(data: Record<string, unknown>, options?: {merge?: boolean}) {
    this.firestore.data[this.path] = options?.merge === true ?
      {
        ...(this.firestore.data[this.path] as Record<string, unknown>),
        ...data,
      } :
      data;
  }
}

class FakeDocSnapshot {
  constructor(
    readonly ref: FakeDocRef,
    private readonly value: unknown
  ) {}

  get id(): string {
    return this.ref.id;
  }

  get exists(): boolean {
    return this.value !== undefined;
  }

  data() {
    return this.value;
  }
}

class FakeQueryDocSnapshot extends FakeDocSnapshot {
  constructor(
    firestore: FakeFirestore,
    collectionPath: string,
    id: string,
    value: unknown
  ) {
    super(new FakeDocRef(firestore, collectionPath, id), value);
  }
}

function matchesFilter(data: unknown, filter: QueryFilter): boolean {
  const value = (data as Record<string, unknown>)[filter.field];
  if (filter.op === "==") return value === filter.value;
  if (filter.op === "in" && Array.isArray(filter.value)) {
    return filter.value.includes(value);
  }
  throw new Error(`Unsupported fake query op ${filter.op}`);
}
