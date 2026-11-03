import * as admin from "firebase-admin";
import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import {adminRolesFromToken, requireAdminRole} from "../adminAuth";
import {appCheckCallableOptionsWithLimits} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {
  assertSalesFinanceAuthority,
  executeSalesAction,
  executeSalesRead,
  type SalesServiceDeps,
} from "./service";
import type {
  SalesMutationAction,
  SalesPrincipal,
  SalesReadAction,
} from "./types";
import {assignedSalesAccountIds, assertSalesStaffAccount,
  assertSalesStaffScope, isAssignedSalesStaff,
  SALES_STAFF_ACTIONS} from "./staffAccess";

const allowedRoles = ["admin", "adminOwner", "salesStaff"] as const;
const callableLimits = {
  concurrency: 20,
  maxInstances: 10,
  memory: "256MiB" as const,
  timeoutSeconds: 30,
};

/** Current Auth state is authoritative after the initial token gate. */
export async function currentSalesEmployee(
  request: CallableRequest<unknown>,
  getUser: (uid: string) => Promise<{
    disabled: boolean;
    customClaims?: Record<string, unknown>;
    tokensValidAfterTime?: string;
  }> = (uid) => admin.auth().getUser(uid),
  assignedIds: (uid: string) => Promise<string[]> =
  (uid) => assignedSalesAccountIds(admin.firestore(), uid),
): Promise<SalesPrincipal> {
  const initial = requireAdminRole(request, allowedRoles);
  const user = await getUser(initial.uid);
  if (user.disabled) {
    throw new HttpsError(
      "permission-denied",
      "Sales employee account is disabled.",
    );
  }
  const roles = adminRolesFromToken(user.customClaims);
  if (!roles.some((role) =>
    (allowedRoles as readonly string[]).includes(role))) {
    throw new HttpsError(
      "permission-denied",
      "Current Sales role is required.",
    );
  }
  const authTime = request.auth?.token.auth_time;
  const validAfter = user.tokensValidAfterTime ?
    Date.parse(user.tokensValidAfterTime) :
    0;
  if (
    typeof authTime !== "number" ||
    !Number.isFinite(authTime) ||
    !Number.isFinite(validAfter) ||
    authTime * 1000 < validAfter
  ) {
    throw new HttpsError(
      "permission-denied",
      "Sales session has been revoked.",
    );
  }
  const principal: SalesPrincipal = {uid: initial.uid, roles};
  if (isAssignedSalesStaff(principal)) {
    principal.organizerIds = await assignedIds(initial.uid);
    principal.allowedActions = SALES_STAFF_ACTIONS;
  }
  return principal;
}

async function handleRead(
  action: SalesReadAction,
  request: CallableRequest<unknown>,
): Promise<Record<string, unknown>> {
  const principal = await currentSalesEmployee(request);
  if (["imports.compensation.preview", "imports.hosts",
    "imports.history.preview"].includes(action) &&
      !principal.roles.includes("adminOwner")) {
    throw new HttpsError("permission-denied",
      "Current Admin Owner authority is required for compensation.");
  }
  const db = admin.firestore();
  await checkRateLimit(db, principal.uid, `sales:${action}`, {
    maxRequests: 60,
    windowMs: 60_000,
  });
  const deps: SalesServiceDeps = {
    firestore: () => db,
    now: () => new Date(),
    authorizeRead: async (_db, _principal, readAction, organizerId) => {
      const current = await currentSalesEmployee(request);
      if (isAssignedSalesStaff(principal) !== isAssignedSalesStaff(current)) {
        throw new HttpsError("permission-denied",
          "Sales role changed; sign in again.");
      }
      if (organizerId) await assertSalesStaffAccount(db, current, organizerId);
      else await assertSalesStaffScope(db, principal);
      if (["imports.compensation.preview", "imports.hosts",
        "imports.history.preview"].includes(readAction) &&
          !current.roles.includes("adminOwner")) {
        throw new HttpsError("permission-denied",
          "Current Admin Owner authority is required for compensation.");
      }
      if (readAction === "imports.compensation.apply" ||
          readAction === "imports.history.apply" ||
          readAction === "commercial.finance.attest") {
        assertSalesFinanceAuthority(current, readAction, null);
      }
    },
  };
  return executeSalesRead(principal, action, request.data, deps);
}

async function handleAction(
  action: SalesMutationAction,
  request: CallableRequest<unknown>,
): Promise<Record<string, unknown>> {
  const principal = await currentSalesEmployee(request);
  const db = admin.firestore();
  await checkRateLimit(db, principal.uid, `sales:${action}`, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  const deps: SalesServiceDeps = {
    firestore: () => db,
    now: () => new Date(),
    authorizeInTransaction: async (
      tx, _db, _principal, _action, organizerId,
    ) => {
      const current = await currentSalesEmployee(request);
      if (isAssignedSalesStaff(principal) !== isAssignedSalesStaff(current)) {
        throw new HttpsError("permission-denied",
          "Sales role changed; sign in again.");
      }
      if (organizerId) {
        await assertSalesStaffAccount(db, current, organizerId, tx);
      }
      assertSalesFinanceAuthority(current, action, request.data);
    },
  };
  return executeSalesAction(principal, action, request.data, deps);
}

const read = (action: SalesReadAction) =>
  onCall(appCheckCallableOptionsWithLimits(callableLimits),
    (request) => handleRead(action, request));
const write = (action: SalesMutationAction) =>
  onCall(appCheckCallableOptionsWithLimits(callableLimits),
    (request) => handleAction(action, request));

export const adminListSalesAccounts = read("hosts.search");
export const adminGetSalesAccount = read("hosts.get");
export const adminListSalesTasks = read("tasks.list");
export const adminListSalesOpportunities = read("opportunities.list");
export const adminListSalesCustomFields = read("fields.list");
export const adminGetSalesReceipt = read("receipts.get");
export const adminListSalesInboundIntents = read("intents.list");
export const adminListSalesImports = read("imports.list");
export const adminListSalesImportHosts = read("imports.hosts");
export const adminPreviewSalesImport = read("imports.preview");
export const adminPreviewSalesImportCompensation =
  read("imports.compensation.preview");
export const adminListSalesContacts = read("contacts.list");
export const adminListSalesEvidence = read("evidence.list");

export const adminCreateSalesAccount = write("hosts.create");
export const adminUpdateSalesAccount = write("hosts.update");
export const adminUpsertSalesTask = write("tasks.upsert");
export const adminUpsertSalesOpportunity = write("opportunities.upsert");
export const adminRecordSalesActivity = write("activities.log");
export const adminCreateSalesCustomField = write("fields.create");
export const adminSetSalesCustomFieldValue = write("fields.setValue");
export const adminLinkSalesInboundIntent = write("intents.link");
export const adminApplySalesImport = write("imports.apply");
export const adminApplySalesImportCompensation =
  write("imports.compensation.apply");
export const adminUpsertSalesContact = write("contacts.upsert");
export const adminAddSalesEvidence = write("evidence.add");
export const adminSetSalesAccountSuppression = write("accounts.setSuppression");
export const adminSetSalesContactability = write("contacts.setContactability");

export const adminProposeSalesEvidence = write("evidence.propose");
export const adminReviewSalesEvidenceProposal =
  write("evidence.reviewProposal");
export const adminListSalesEvidenceProposals = read("evidenceProposals.list");

export const adminGetSalesCommercialDetail = read("commercial.detail");
export const adminListSalesCommercialReport = read("commercial.report");
export const adminUpsertSalesPilotPlan = write("commercial.pilots.upsert");
export const adminReviseSalesQuote = write("commercial.quotes.revise");
export const adminApproveSalesQuote = write("commercial.quotes.approve");
export const adminAcceptSalesQuote = write("commercial.quotes.accept");

export const adminAttestSalesHostSettlement =
  write("commercial.finance.attest");

export const adminPreviewSalesImportHistory = read("imports.history.preview");
export const adminApplySalesImportHistory = write("imports.history.apply");
export const adminListSalesImportHistory = read("imports.history.list");
export const adminListSalesImportHistoryRows =
  read("imports.history.rows.list");
