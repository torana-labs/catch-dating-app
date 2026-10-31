import assert from "node:assert/strict";
import test from "node:test";
import {type CallableRequest} from "firebase-functions/v2/https";
import {
  createRazorpayHostPaymentAccountHandler,
  refreshRazorpayHostPaymentAccountHandler,
} from "./razorpayHostAccounts";

test("creates a Razorpay Route linked account without persisting KYC data",
  async () => {
    const firestore = new FakeFirestore({
      "organizerHostClaims/host-1": {organizerIds: ["club-1"]},
    });
    const accountInputs: Record<string, unknown>[] = [];
    const stakeholderInputs: Record<string, unknown>[] = [];
    const productInputs: Record<string, unknown>[] = [];
    const settlementInputs: Record<string, unknown>[] = [];

    const result = await createRazorpayHostPaymentAccountHandler(
      request(validPayload()),
      {
        firestore: () => firestore as unknown as
          FirebaseFirestore.Firestore,
        razorpay: () => ({
          accounts: {
            create: async (input) => {
              accountInputs.push(input);
              return {id: "acc_route", status: "created"};
            },
            fetch: async () => ({id: "acc_route", status: "created"}),
          },
          stakeholders: {
            all: async () => ({items: []}),
            create: async (_accountId, input) => {
              stakeholderInputs.push(input);
              return {};
            },
          },
          products: {
            requestProductConfiguration: async (_accountId, input) => {
              productInputs.push(input);
              return {
                id: "acc_prd_route",
                activation_status: "requested",
                requirements: [],
              };
            },
            fetch: async () => ({
              id: "acc_prd_route",
              activation_status: "requested",
              requirements: [],
            }),
            edit: async (_accountId, _productId, input) => {
              settlementInputs.push(input);
              return {
                id: "acc_prd_route",
                activation_status: "under_review",
                requirements: [{field_reference: "business.pan"}],
              };
            },
          },
        }),
        serverTimestamp: () => "server-now",
        checkRateLimit: async (_db, uid, action) => {
          assert.equal(uid, "host-1");
          assert.equal(action, "createRazorpayHostPaymentAccount");
        },
      }
    );

    assert.deepEqual(result, {
      accountId: "acc_route",
      onboardingStatus: "pending",
    });
    assert.equal(accountInputs[0].legal_business_name, "Catch Events Pvt Ltd");
    assert.deepEqual(productInputs, [{
      product_name: "route",
      tnc_accepted: true,
    }]);
    assert.deepEqual(settlementInputs, [{
      settlements: {
        account_number: "123456789012",
        ifsc_code: "HDFC0000317",
        beneficiary_name: "Catch Events Pvt Ltd",
      },
      tnc_accepted: true,
    }]);
    assert.equal(stakeholderInputs.length, 1);

    const stored = firestore.data[
      "hostPaymentAccounts/host-1_razorpay"
    ] as Record<string, unknown>;
    assert.equal(stored.provider, "razorpay");
    assert.equal(stored.providerAccountId, "acc_route");
    assert.equal(stored.razorpayProductId, "acc_prd_route");
    assert.equal(stored.onboardingStatus, "pending");
    for (const forbidden of [
      "businessPan", "stakeholderPan", "bankAccountNumber", "ifscCode",
    ]) {
      assert.equal(stored[forbidden], undefined);
    }
  });

test("retries continue the checkpointed Route account and product",
  async () => {
    const firestore = new FakeFirestore({
      "organizerHostClaims/host-1": {organizerIds: ["club-1"]},
    });
    let accountCreates = 0;
    let productRequests = 0;
    let settlementEdits = 0;
    const stakeholderItems: unknown[] = [];
    const razorpay = {
      accounts: {
        create: async () => {
          accountCreates += 1;
          return {id: "acc_route", status: "created"};
        },
        fetch: async () => ({id: "acc_route", status: "created"}),
      },
      stakeholders: {
        all: async () => ({items: stakeholderItems}),
        create: async () => {
          stakeholderItems.push({id: "sth_1"});
          return {};
        },
      },
      products: {
        requestProductConfiguration: async () => {
          productRequests += 1;
          return {
            id: "acc_prd_route",
            activation_status: "requested",
            requirements: [],
          };
        },
        fetch: async () => ({
          id: "acc_prd_route",
          activation_status: "requested",
          requirements: [],
        }),
        edit: async () => {
          settlementEdits += 1;
          if (settlementEdits === 1) {
            throw new Error("temporary settlement update failure");
          }
          return {
            id: "acc_prd_route",
            activation_status: "under_review",
            requirements: [],
          };
        },
      },
    };
    const deps = {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      razorpay: () => razorpay,
      serverTimestamp: () => "server-now",
      checkRateLimit: async () => undefined,
    };

    await assert.rejects(
      createRazorpayHostPaymentAccountHandler(request(validPayload()), deps),
      /temporary settlement update failure/
    );
    assert.equal(
      (firestore.data["hostPaymentAccounts/host-1_razorpay"] as
      Record<string, unknown>).razorpayProductId,
      "acc_prd_route"
    );

    await createRazorpayHostPaymentAccountHandler(
      request(validPayload()),
      deps
    );

    assert.equal(accountCreates, 1);
    assert.equal(productRequests, 1);
    assert.equal(settlementEdits, 2);
    assert.equal(stakeholderItems.length, 1);
  });

test(
  "refresh maps Razorpay clarification requirements to restricted",
  async () => {
    const firestore = new FakeFirestore({
      "hostPaymentAccounts/host-1_razorpay": {
        userId: "host-1",
        provider: "razorpay",
        country: "IN",
        defaultCurrency: "INR",
        providerAccountId: "acc_route",
        stripeAccountId: "",
        razorpayAccountId: "acc_route",
        razorpayProductId: "acc_prd_route",
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: true,
        onboardingStatus: "pending",
        requirementsCurrentlyDue: [],
        requirementsPastDue: [],
        requirementsPendingVerification: [],
        createdAt: "created-at",
        updatedAt: "updated-at",
      },
    });

    const result = await refreshRazorpayHostPaymentAccountHandler(
      request({}),
      {
        firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
        razorpay: () => ({
          accounts: {
            create: async () => ({id: "acc_route", status: "created"}),
            fetch: async () => ({id: "acc_route", status: "created"}),
          },
          stakeholders: {
            all: async () => ({items: []}),
            create: async () => ({}),
          },
          products: {
            requestProductConfiguration: async () => ({
              id: "acc_prd_route",
              activation_status: "requested",
            }),
            fetch: async () => ({
              id: "acc_prd_route",
              activation_status: "needs_clarification",
              requirements: [{field_reference: "stakeholder.kyc.pan"}],
            }),
            edit: async () => ({
              id: "acc_prd_route",
              activation_status: "requested",
            }),
          },
        }),
        serverTimestamp: () => "server-now",
        checkRateLimit: async () => undefined,
      }
    );

    assert.equal(result.account?.onboardingStatus, "restricted");
    assert.deepEqual(result.account?.requirementsCurrentlyDue, [
      "stakeholder.kyc.pan",
    ]);
  }
);

function validPayload(): Record<string, unknown> {
  return {
    legalBusinessName: " Catch Events Pvt Ltd ",
    businessType: "private_limited",
    contactName: "Mira Shah",
    email: "host@example.com",
    phone: "9876543210",
    businessModel: "Curated social events",
    businessPan: "abcde1234f",
    bankAccountNumber: "123456789012",
    ifscCode: "hdfc0000317",
    beneficiaryName: "Catch Events Pvt Ltd",
    stakeholderName: "Mira Shah",
    stakeholderEmail: "mira@example.com",
    stakeholderPhone: "9876543210",
    stakeholderPan: "abcde1234f",
    stakeholderOwnershipPercent: 100,
    stakeholderIsDirector: true,
    stakeholderIsExecutive: true,
    termsAccepted: true,
  };
}

function request(data: Record<string, unknown>): CallableRequest<unknown> {
  return {
    data,
    auth: {uid: "host-1", token: {}} as CallableRequest["auth"],
    rawRequest: {} as CallableRequest["rawRequest"],
    acceptsStreaming: false,
  };
}

class FakeFirestore {
  constructor(readonly data: Record<string, unknown>) {}

  collection(path: string) {
    return new FakeCollectionRef(this, path);
  }
}

class FakeCollectionRef {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string
  ) {}

  doc(id: string) {
    return new FakeDocumentRef(this.firestore, `${this.path}/${id}`);
  }
}

class FakeDocumentRef {
  constructor(
    private readonly firestore: FakeFirestore,
    readonly path: string
  ) {}

  async get() {
    return new FakeDocumentSnapshot(this, this.firestore.data[this.path]);
  }

  async set(value: Record<string, unknown>, options?: {merge?: boolean}) {
    const existing = this.firestore.data[this.path];
    this.firestore.data[this.path] = options?.merge && isRecord(existing) ?
      {...existing, ...value} :
      value;
  }
}

class FakeDocumentSnapshot {
  constructor(
    readonly ref: FakeDocumentRef,
    private readonly value: unknown
  ) {}

  get exists() {
    return this.value !== undefined;
  }

  data() {
    return this.value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
