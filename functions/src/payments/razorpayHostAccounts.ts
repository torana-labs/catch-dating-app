import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {createRazorpayClient, razorpayKeySecret} from
  "./razorpay";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {normalizePayloadStrings} from
  "../shared/callablePayloadNormalization";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {CreateRazorpayHostPaymentAccountCallablePayload} from
  "../shared/generated/createRazorpayHostPaymentAccountCallablePayload";
import type {RefreshRazorpayHostPaymentAccountCallablePayload} from
  "../shared/generated/refreshRazorpayHostPaymentAccountCallablePayload";
import {
  validateCreateRazorpayHostPaymentAccountCallablePayload,
} from
  "../shared/generated/validators/createRazorpayHostPaymentAccountInput";
import {
  validateRefreshRazorpayHostPaymentAccountCallablePayload,
} from
  "../shared/generated/validators/refreshRazorpayHostPaymentAccountInput";
import type {
  HostPaymentAccountDocument,
} from "../shared/generated/firestoreAdminTypes";
import {findHostPaymentAccount} from "./hostPaymentAccounts";

interface RazorpayLinkedAccountSnapshot {
  id: string;
  status: string;
}

interface RazorpayRouteRequirement {
  field_reference?: string;
  reason_code?: string;
  status?: string;
}

interface RazorpayRouteProductSnapshot {
  id: string;
  activation_status: string;
  requirements?: RazorpayRouteRequirement[];
}

interface RazorpayHostAccountClient {
  accounts: {
    create(input: Record<string, unknown>):
      Promise<RazorpayLinkedAccountSnapshot>;
    fetch(accountId: string): Promise<RazorpayLinkedAccountSnapshot>;
  };
  stakeholders: {
    all(accountId: string): Promise<{items: unknown[]}>;
    create(accountId: string, input: Record<string, unknown>):
      Promise<unknown>;
  };
  products: {
    requestProductConfiguration(
      accountId: string,
      input: Record<string, unknown>
    ): Promise<RazorpayRouteProductSnapshot>;
    fetch(accountId: string, productId: string):
      Promise<RazorpayRouteProductSnapshot>;
    edit(
      accountId: string,
      productId: string,
      input: Record<string, unknown>
    ): Promise<RazorpayRouteProductSnapshot>;
  };
}

interface RazorpayHostAccountDeps {
  firestore: () => FirebaseFirestore.Firestore;
  razorpay: () => RazorpayHostAccountClient;
  serverTimestamp: () => unknown;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: RazorpayHostAccountDeps = {
  firestore: () => admin.firestore(),
  razorpay: () => createRazorpayClient() as unknown as
    RazorpayHostAccountClient,
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

export async function createRazorpayHostPaymentAccountHandler(
  request: CallableRequest<unknown>,
  deps: RazorpayHostAccountDeps = defaultDeps
): Promise<{accountId: string; onboardingStatus: string}> {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<
    CreateRazorpayHostPaymentAccountCallablePayload
  >(
    request,
    validateCreateRazorpayHostPaymentAccountCallablePayload,
    normalizeRazorpayHostPayload
  );
  if (payload.termsAccepted !== true) {
    throw new HttpsError(
      "failed-precondition",
      "Accept the Razorpay Route terms before continuing."
    );
  }

  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "createRazorpayHostPaymentAccount", {
    maxRequests: 5, windowMs: 60 * 1000,
  });
  const hostClaim = await db.collection("organizerHostClaims").doc(uid).get();
  if (!hostClaim.exists) {
    throw new HttpsError(
      "permission-denied",
      "Only organizer owners can set up payouts."
    );
  }

  const existing = await findHostPaymentAccount(db, uid, "razorpay");
  const razorpay = deps.razorpay();
  let accountId = existing.account ?
    existing.account.razorpayAccountId ||
      existing.account.providerAccountId :
    "";
  let productId = existing.account?.razorpayProductId ?? null;
  const createdAt = existing.account?.createdAt ?? deps.serverTimestamp();
  let accountStatus = "created";

  if (!accountId) {
    const account = await razorpay.accounts.create({
      email: payload.email,
      phone: payload.phone,
      type: "route",
      legal_business_name: payload.legalBusinessName,
      customer_facing_business_name: payload.legalBusinessName,
      business_type: payload.businessType,
      contact_name: payload.contactName,
      profile: {business_model: payload.businessModel},
      legal_info: {pan: payload.businessPan},
      notes: {catch_host_uid: uid},
    });
    accountId = account.id;
    accountStatus = account.status;
    await existing.ref.set(baseRazorpayDocument({
      uid,
      accountId,
      productId: null,
      createdAt,
      updatedAt: deps.serverTimestamp(),
    }));
  }

  const stakeholders = await razorpay.stakeholders.all(accountId);
  if (stakeholders.items.length === 0) {
    await razorpay.stakeholders.create(accountId, {
      name: payload.stakeholderName,
      email: payload.stakeholderEmail,
      phone: {primary: payload.stakeholderPhone},
      kyc: {pan: payload.stakeholderPan},
      percentage_ownership: payload.stakeholderOwnershipPercent,
      relationship: {
        director: payload.stakeholderIsDirector,
        executive: payload.stakeholderIsExecutive,
      },
    });
  }

  if (!productId) {
    const product = await razorpay.products.requestProductConfiguration(
      accountId,
      {product_name: "route", tnc_accepted: true}
    );
    productId = product.id;
    // Persist each provider-side identifier as soon as it exists. A retry after
    // a later settlement-details failure can then continue the same Route
    // product instead of requesting a duplicate configuration.
    await existing.ref.set({
      razorpayProductId: productId,
      updatedAt: deps.serverTimestamp(),
    }, {merge: true});
  }

  const product = await razorpay.products.edit(accountId, productId, {
    settlements: {
      account_number: payload.bankAccountNumber,
      ifsc_code: payload.ifscCode,
      beneficiary_name: payload.beneficiaryName,
    },
    tnc_accepted: true,
  });
  const next = razorpayDocument({
    uid,
    accountId,
    productId,
    accountStatus,
    product,
    createdAt,
    updatedAt: deps.serverTimestamp(),
  });
  await existing.ref.set(next, {merge: true});
  return {accountId, onboardingStatus: next.onboardingStatus};
}

export async function refreshRazorpayHostPaymentAccountHandler(
  request: CallableRequest<unknown>,
  deps: RazorpayHostAccountDeps = defaultDeps
): Promise<{account: HostPaymentAccountDocument | null}> {
  const uid = requireAuth(request);
  validateCallableWithAjv<RefreshRazorpayHostPaymentAccountCallablePayload>(
    request,
    validateRefreshRazorpayHostPaymentAccountCallablePayload,
    (data) => data ?? {}
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "refreshRazorpayHostPaymentAccount", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const existing = await findHostPaymentAccount(db, uid, "razorpay");
  if (!existing.account) return {account: null};

  const accountId = existing.account.razorpayAccountId ||
    existing.account.providerAccountId;
  const productId = existing.account.razorpayProductId;
  if (!accountId || !productId) {
    return {account: existing.account};
  }
  const razorpay = deps.razorpay();
  const [account, product] = await Promise.all([
    razorpay.accounts.fetch(accountId),
    razorpay.products.fetch(accountId, productId),
  ]);
  const next = razorpayDocument({
    uid,
    accountId,
    productId,
    accountStatus: account.status,
    product,
    createdAt: existing.account.createdAt,
    updatedAt: deps.serverTimestamp(),
  });
  await existing.ref.set(next, {merge: true});
  return {account: next};
}

function baseRazorpayDocument({
  uid,
  accountId,
  productId,
  createdAt,
  updatedAt,
}: {
  uid: string;
  accountId: string;
  productId: string | null;
  createdAt: unknown;
  updatedAt: unknown;
}): HostPaymentAccountDocument {
  return {
    userId: uid,
    provider: "razorpay",
    country: "IN",
    defaultCurrency: "INR",
    providerAccountId: accountId,
    stripeAccountId: "",
    razorpayAccountId: accountId,
    razorpayProductId: productId,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    onboardingStatus: "pending",
    disabledReason: null,
    requirementsCurrentlyDue: [],
    requirementsPastDue: [],
    requirementsPendingVerification: [],
    lastStripeEventId: null,
    createdAt: createdAt as FirebaseFirestore.Timestamp,
    updatedAt: updatedAt as FirebaseFirestore.Timestamp,
  };
}

function razorpayDocument({
  uid,
  accountId,
  productId,
  accountStatus,
  product,
  createdAt,
  updatedAt,
}: {
  uid: string;
  accountId: string;
  productId: string;
  accountStatus: string;
  product: RazorpayRouteProductSnapshot;
  createdAt: unknown;
  updatedAt: unknown;
}): HostPaymentAccountDocument {
  const requirements = (product.requirements ?? [])
    .map((requirement) =>
      requirement.field_reference ?? requirement.reason_code
    )
    .filter((value): value is string => Boolean(value));
  const restricted = accountStatus === "suspended" ||
    product.activation_status === "needs_clarification" ||
    product.activation_status === "suspended";
  const complete = accountStatus !== "suspended" &&
    product.activation_status === "activated";
  return {
    ...baseRazorpayDocument({
      uid,
      accountId,
      productId,
      createdAt,
      updatedAt,
    }),
    chargesEnabled: complete,
    payoutsEnabled: complete,
    detailsSubmitted: true,
    onboardingStatus: complete ? "complete" : restricted ? "restricted" :
      "pending",
    disabledReason: restricted ?
      "Razorpay needs more information before Route payouts can be enabled." :
      null,
    requirementsCurrentlyDue: restricted ? requirements : [],
    requirementsPendingVerification: restricted ? [] : requirements,
  };
}

function normalizeRazorpayHostPayload(data: unknown): unknown {
  const normalized = normalizePayloadStrings(data, {
    stringFields: [
      "legalBusinessName", "businessType", "contactName", "email", "phone",
      "businessModel", "businessPan", "bankAccountNumber", "ifscCode",
      "beneficiaryName", "stakeholderName", "stakeholderEmail",
      "stakeholderPhone", "stakeholderPan",
    ],
  });
  if (normalized === null || typeof normalized !== "object") return normalized;
  const payload = normalized as Record<string, unknown>;
  for (const field of ["businessPan", "stakeholderPan", "ifscCode"]) {
    if (typeof payload[field] === "string") {
      payload[field] = payload[field].toUpperCase();
    }
  }
  return payload;
}

export const createRazorpayHostPaymentAccount = onCall(
  appCheckCallableOptionsWithSecrets([razorpayKeySecret]),
  (request) => createRazorpayHostPaymentAccountHandler(request)
);

export const refreshRazorpayHostPaymentAccount = onCall(
  appCheckCallableOptionsWithSecrets([razorpayKeySecret]),
  (request) => refreshRazorpayHostPaymentAccountHandler(request)
);
