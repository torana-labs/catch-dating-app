import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {
  createStripeHostOnboardingLinkHandler,
  refreshStripeHostPaymentAccountHandler,
} from "./stripeHostAccounts";
import type {
  HostPaymentAccountDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  StripeAccountCreateInput,
  StripeAccountLinkInput,
  StripeAccountSnapshot,
  StripeClient,
} from "./stripe";
import {BRAND} from "../shared/generated/brand";

test("createStripeHostOnboardingLinkHandler creates and stores host account",
  async () => {
    const firestore = new FakeFirestore({
      "users/host-1": {
        email: "host@example.com",
        displayName: "Catch Host",
      },
      "clubHostClaims/host-1": {
        clubIds: ["club-1"],
      },
    });
    const accountInputs: StripeAccountCreateInput[] = [];
    const linkInputs: StripeAccountLinkInput[] = [];

    const response = await createStripeHostOnboardingLinkHandler(
      buildRequest({
        data: {country: " us ", defaultCurrency: " usd "},
        auth: {uid: "host-1"},
      }),
      {
        firestore: () =>
          firestore as unknown as FirebaseFirestore.Firestore,
        stripe: () => stripeClient({
          createConnectedAccount: async (input) => {
            accountInputs.push(input);
            return accountSnapshot();
          },
          createAccountLink: async (input) => {
            linkInputs.push(input);
            return {url: "https://connect.stripe.com/setup/c/acct_host"};
          },
        }),
        serverTimestamp: () => "server-now",
        checkRateLimit: async (_db, uid, action) => {
          assert.equal(uid, "host-1");
          assert.equal(action, "createStripeHostOnboardingLink");
        },
      }
    );

    assert.deepEqual(accountInputs, [{
      contactEmail: "host@example.com",
      displayName: "Catch Host",
      country: "US",
      defaultCurrency: "USD",
    }]);
    assert.deepEqual(linkInputs, [{
      accountId: "acct_host",
      returnUrl: `${BRAND.web.origin}/you`,
      refreshUrl: `${BRAND.web.origin}/you`,
    }]);
    assert.deepEqual(response, {
      accountId: "acct_host",
      onboardingUrl: "https://connect.stripe.com/setup/c/acct_host",
    });
    assert.deepEqual(firestore.data["hostPaymentAccounts/host-1_stripe"], {
      userId: "host-1",
      provider: "stripe",
      country: "US",
      defaultCurrency: "USD",
      providerAccountId: "acct_host",
      stripeAccountId: "acct_host",
      razorpayAccountId: "",
      razorpayProductId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      onboardingStatus: "pending",
      disabledReason: null,
      requirementsCurrentlyDue: ["external_account"],
      requirementsPastDue: [],
      requirementsPendingVerification: [],
      lastStripeEventId: null,
      createdAt: "server-now",
      updatedAt: "server-now",
    });
  });

test("createStripeHostOnboardingLinkHandler requires a host claim",
  async () => {
    const firestore = new FakeFirestore({
      "users/host-1": {
        email: "host@example.com",
        displayName: "Catch Host",
      },
    });

    await assert.rejects(
      createStripeHostOnboardingLinkHandler(
        buildRequest({
          data: {},
          auth: {uid: "host-1"},
        }),
        {
          firestore: () =>
            firestore as unknown as FirebaseFirestore.Firestore,
          stripe: () => stripeClient({}),
          serverTimestamp: () => "server-now",
          checkRateLimit: async () => undefined,
        }
      ),
      isHttpsError("permission-denied", "Only club owners can set up payouts.")
    );
  });

test("refreshStripeHostPaymentAccountHandler refreshes existing account state",
  async () => {
    const firestore = new FakeFirestore({
      "hostPaymentAccounts/host-1": hostAccountDoc(),
    });

    const response = await refreshStripeHostPaymentAccountHandler(
      buildRequest({
        data: {},
        auth: {uid: "host-1"},
      }),
      {
        firestore: () =>
          firestore as unknown as FirebaseFirestore.Firestore,
        stripe: () => stripeClient({
          retrieveConnectedAccount: async (accountId) => {
            assert.equal(accountId, "acct_host");
            return accountSnapshot({
              chargesEnabled: true,
              payoutsEnabled: true,
              detailsSubmitted: true,
              requirements: {
                currentlyDue: [],
                pastDue: [],
                pendingVerification: [],
                disabledReason: null,
              },
            });
          },
        }),
        serverTimestamp: () => "server-now",
        checkRateLimit: async (_db, uid, action) => {
          assert.equal(uid, "host-1");
          assert.equal(action, "refreshStripeHostPaymentAccount");
        },
      }
    );

    assert.equal(response.account?.onboardingStatus, "complete");
    assert.deepEqual(firestore.data["hostPaymentAccounts/host-1"], {
      ...hostAccountDoc(),
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      onboardingStatus: "complete",
      requirementsCurrentlyDue: [],
      updatedAt: "server-now",
    });
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

function accountSnapshot(
  overrides: Partial<StripeAccountSnapshot> = {}
): StripeAccountSnapshot {
  return {
    id: "acct_host",
    country: "US",
    defaultCurrency: "USD",
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    requirements: {
      currentlyDue: ["external_account"],
      pastDue: [],
      pendingVerification: [],
      disabledReason: null,
    },
    ...overrides,
  };
}

function hostAccountDoc(
  overrides: Partial<HostPaymentAccountDocument> = {}
): HostPaymentAccountDocument {
  return {
    userId: "host-1",
    provider: "stripe",
    country: "US",
    defaultCurrency: "USD",
    providerAccountId: "acct_host",
    stripeAccountId: "acct_host",
    razorpayAccountId: "",
    razorpayProductId: null,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    onboardingStatus: "pending",
    disabledReason: null,
    requirementsCurrentlyDue: ["external_account"],
    requirementsPastDue: [],
    requirementsPendingVerification: [],
    lastStripeEventId: "evt_old",
    createdAt: "created-at" as unknown as FirebaseFirestore.Timestamp,
    updatedAt: "updated-at" as unknown as FirebaseFirestore.Timestamp,
    ...overrides,
  };
}

function stripeClient(overrides: Partial<StripeClient>): StripeClient {
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

function isHttpsError(expectedCode: string, expectedMessage: string) {
  return (error: unknown) =>
    error instanceof HttpsError &&
    error.code === expectedCode &&
    error.message === expectedMessage;
}

class FakeFirestore {
  constructor(readonly data: Record<string, unknown>) {}

  collection(collectionPath: string) {
    return new FakeCollectionRef(this, collectionPath);
  }
}

class FakeCollectionRef {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly collectionPath: string
  ) {}

  doc(id: string) {
    return new FakeDocRef(this.firestore, this.collectionPath, id);
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
    private readonly filters: Array<{
      field: string;
      op: FirebaseFirestore.WhereFilterOp;
      value: unknown;
    }>,
    private readonly limitCount?: number
  ) {}

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
    if (this.limitCount !== undefined) docs = docs.slice(0, this.limitCount);
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

function matchesFilter(
  data: unknown,
  filter: {field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown}
): boolean {
  const value = (data as Record<string, unknown>)[filter.field];
  if (filter.op === "==") return value === filter.value;
  throw new Error(`Unsupported fake query op ${filter.op}`);
}
