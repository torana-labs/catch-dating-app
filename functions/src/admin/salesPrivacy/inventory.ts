/* eslint-disable max-len */
import {HttpsError} from "firebase-functions/v2/https";
import {INVENTORY_PAGE_SIZE, MAX_COLLECTION_SCAN, MAX_INVENTORY_ITEMS, privacyHash,
  privacyId} from "./model";

export interface InventoryRow {path: string; data: Record<string, unknown>}
export interface InventoryPort {
  get(path: string): Promise<InventoryRow | null>;
  scan(collection: string, organizerId?: string): Promise<InventoryRow[]>;
  scanChild(parentPath: string, child: string): Promise<InventoryRow[]>;
}
export interface InventoryItem {
  path: string;
  contentHash: string;
  disposition: "delete" | "retain_finance" | "retain_audit";
}
export interface InventoryBlocker {code: string; fingerprint: string}
export interface SalesPrivacyInventory {
  organizerId: string;
  items: InventoryItem[];
  blockers: InventoryBlocker[];
  overflow: boolean;
  inventoryHash: string;
  counts: {deletable: number; retained: number; unresolved: number};
}

/** Only these private, organizer-scoped collections can enter a cleanup plan. */
export const DIRECT_SALES_COLLECTIONS = [
  "hostPilotEventReviews", "hostOrganizerActivations",
  "salesPartnerAssignments", "salesTasks", "salesOpportunities", "salesActivities",
  "salesEvidence", "salesEvidenceProposals", "salesInboundIntents",
  "salesContactRelationships", "salesSuppressionDecisions",
  "salesImportRows", "salesImportCompensations",
  "salesImportHistoryRows", "salesImportHistoryRecords",
  "salesIntelligenceAssessments", "salesIntelligenceClauses",
  "salesIntelligenceScoreSnapshots", "salesOutreachDrafts", "salesProviderAttempts",
  "salesPilotPlans", "salesQuotes", "salesQuoteVersions",
  "salesCommercialDecisions", "salesOpportunityStageHistory",
  "salesDemoBlueprints", "salesDemoSetups", "salesDemoContinuations", "salesFitQueueEntries",
  "salesHostSettlementAttestations", "salesHostSettlementEvidenceUses",
  "salesHostSettlementIdentities",
] as const;
const FINANCE = new Set<string>([
  "salesHostSettlementAttestations", "salesHostSettlementEvidenceUses",
  "salesHostSettlementIdentities", "salesQuotes", "salesQuoteVersions",
  "salesCommercialDecisions", "salesOpportunityStageHistory",
]);
const GLOBAL_SALES_COLLECTIONS = [
  "salesImportJobs", "salesOutreachJobs", "salesActionReceipts",
  "salesIntelligenceReceipts",
  "salesDemoInvitations", "salesDemoSessions",
  "assistantDelegations", "assistantManagementReceipts",
  "adminAuditLogs", "adminActionExecutions",
] as const;
const SAFE_COLLECTIONS = new Set<string>([
  "organizerSalesAccounts", "salesContacts", ...DIRECT_SALES_COLLECTIONS,
  ...GLOBAL_SALES_COLLECTIONS,
]);

export function firestoreInventoryPort(db: FirebaseFirestore.Firestore): InventoryPort {
  const rows = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => docs.map(
    (snap) => ({path: snap.ref.path, data: snap.data() as Record<string, unknown>}));
  const bounded = async (base: FirebaseFirestore.Query) => {
    const result: InventoryRow[] = [];
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    while (true) {
      const query: FirebaseFirestore.Query = cursor ?
        base.startAfter(cursor).limit(INVENTORY_PAGE_SIZE) :
        base.limit(INVENTORY_PAGE_SIZE);
      const docs = (await query.get()).docs;
      result.push(...rows(docs));
      if (result.length > MAX_COLLECTION_SCAN) {
        throw new HttpsError(
          "resource-exhausted", "Sales privacy inventory scan exceeded its bound.");
      }
      if (docs.length < INVENTORY_PAGE_SIZE) return result;
      cursor = docs.at(-1)!;
    }
  };
  return {
    get: async (path) => {
      const snap = await db.doc(path).get();
      return snap.exists ? {path: snap.ref.path,
        data: snap.data() as Record<string, unknown>} : null;
    },
    scan: (collection, organizerId) => bounded(organizerId ?
      db.collection(collection).where("organizerId", "==", organizerId)
        .orderBy("__name__") :
      db.collection(collection).orderBy("__name__")),
    scanChild: (parentPath, child) => bounded(db.doc(parentPath).collection(child)
      .orderBy("__name__")),
  };
}

function organizerIds(raw: unknown): Set<string> {
  const result = new Set<string>();
  let nodes = 0;
  function visit(value: unknown, depth: number): void {
    if (++nodes > 5000 || depth > 12) throw new Error("unbounded_record");
    if (Array.isArray(value)) {
      for (const child of value) visit(child, depth + 1);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "organizerId" && typeof child === "string") {
        result.add(child);
      } else if (key === "organizerIds" && Array.isArray(child)) {
        for (const id of child) {
          if (typeof id === "string") result.add(id);
        }
      } else {
        visit(child, depth + 1);
      }
    }
  }
  visit(raw, 0);
  return result;
}

function fingerprint(path: string): string {
  return privacyHash(path).slice(0, 16);
}
function collectionOf(path: string): string {
  return path.split("/")[0] ?? "";
}

/** Complete only within explicit bounds. Ambiguous records stay untouched. */
export async function inventorySalesOrganizer(port: InventoryPort,
  organizerIdInput: string): Promise<SalesPrivacyInventory> {
  const organizerId = privacyId(organizerIdInput, "organizer ID");
  const items = new Map<string, InventoryItem>();
  const blockers: InventoryBlocker[] = [];
  let overflow = false;
  const block = (code: string, path: string) => {
    if (blockers.length >= MAX_INVENTORY_ITEMS) {
      overflow = true; return;
    }
    blockers.push({code, fingerprint: fingerprint(path)});
  };
  const scan = async (collection: string, org?: string) => {
    try {
      return await port.scan(collection, org);
    } catch (error) {
      if (error instanceof HttpsError && error.code === "resource-exhausted") {
        overflow = true; block("scan_overflow", collection); return [];
      }
      throw error;
    }
  };
  const child = async (path: string, name: string) => {
    try {
      return await port.scanChild(path, name);
    } catch (error) {
      if (error instanceof HttpsError && error.code === "resource-exhausted") {
        overflow = true; block("scan_overflow", path); return [];
      }
      throw error;
    }
  };
  const add = (row: InventoryRow, disposition: InventoryItem["disposition"] =
  "delete") => {
    const parts = row.path.split("/");
    if (!SAFE_COLLECTIONS.has(parts[0]) ||
        !(parts.length === 2 || parts.length === 4 &&
        parts[0] === "organizerSalesAccounts" && parts[2] === "customValues" ||
        parts.length === 4 && parts[0] === "salesImportJobs" &&
        parts[2] === "rows")) {
      block("unsafe_path", row.path); return;
    }
    if (row.data.classification !== "sales_private" &&
        !["adminAuditLogs", "adminActionExecutions"].includes(parts[0])) {
      block("unknown_record", row.path); return;
    }
    items.set(row.path, {path: row.path, contentHash: privacyHash(row.data),
      disposition});
    if (items.size > MAX_INVENTORY_ITEMS) {
      overflow = true; block("inventory_overflow", row.path);
    }
  };

  const accountPath = `organizerSalesAccounts/${organizerId}`;
  const account = await port.get(accountPath);
  if (account) {
    if (account.data.organizerId !== organizerId) block("identity_mismatch", accountPath);
    else add(account);
  }
  // Firestore subcollections survive deletion of their parent document.
  for (const row of await child(accountPath, "customValues")) {
    if (row.data.organizerId === organizerId) add(row);
    else block("identity_mismatch", row.path);
  }
  for (const collection of DIRECT_SALES_COLLECTIONS) {
    for (const row of await scan(collection, organizerId)) {
      if (row.data.organizerId !== organizerId) {
        block("identity_mismatch", row.path);
        continue;
      }
      add(row, FINANCE.has(collection) ? "retain_finance" : "delete");
    }
  }

  const relationships = [...items.values()].filter((row) =>
    collectionOf(row.path) === "salesContactRelationships");
  const contactIds = new Set<string>();
  for (const item of relationships) {
    const row = await port.get(item.path);
    if (typeof row?.data.contactId === "string") contactIds.add(row.data.contactId);
    else block("unknown_contact_link", item.path);
  }
  const allRelationships = contactIds.size ?
    await scan("salesContactRelationships") : [];
  for (const contactId of contactIds) {
    const siblings = allRelationships.filter((row) =>
      row.data.contactId === contactId);
    if (siblings.some((row) => row.data.organizerId !== organizerId)) continue;
    const contact = await port.get(`salesContacts/${privacyId(contactId,
      "contact ID")}`);
    if (contact) add(contact);
  }

  const blueprintOwners = new Map<string, string>();
  for (const row of await scan("salesDemoBlueprints")) {
    if (typeof row.data.organizerId === "string") {
      blueprintOwners.set(row.path.split("/")[1], row.data.organizerId);
    } else block("unattributed_demo_blueprint", row.path);
  }
  const invitationOwners = new Map<string, string>();
  const sessionOwners = new Map<string, string>();
  for (const collection of GLOBAL_SALES_COLLECTIONS) {
    for (const row of await scan(collection)) {
      const data = row.data;
      if (collection === "salesDemoInvitations") {
        const linkedOwner = blueprintOwners.get(String(data.blueprintId));
        if (!linkedOwner) block("unattributed_demo_invitation", row.path);
        else {
          invitationOwners.set(row.path.split("/")[1], linkedOwner);
          if (linkedOwner === organizerId) add(row);
        }
        continue;
      }
      if (collection === "salesDemoSessions") {
        const linkedOwner = invitationOwners.get(String(data.invitationId));
        if (!linkedOwner) block("unattributed_demo_session", row.path);
        else {
          sessionOwners.set(row.path.split("/")[1], linkedOwner);
          if (linkedOwner === organizerId) add(row);
        }
        continue;
      }
      if (collection === "adminAuditLogs" ||
          collection === "adminActionExecutions") {
        const salesAction = String(data.action ?? data.actionId ?? "")
          .toLowerCase().includes("sales") ||
          String(data.targetPath ?? "").startsWith(
            `organizerSalesAccounts/${organizerId}`);
        if (!salesAction) continue;
      }
      if (collection === "assistantDelegations" ||
          collection === "assistantManagementReceipts") {
        let ids: Set<string>;
        try {
          ids = organizerIds(data);
        } catch {
          block("assistant_scope_unverified", row.path);
          continue;
        }
        if (ids.has(organizerId)) {
          block(ids.size > 1 ? "mixed_assistant_scope" :
            "assistant_scope_retirement_required", row.path);
        } else if (ids.size === 0 && collection ===
            "assistantManagementReceipts") {
          block("assistant_receipt_unattributed", row.path);
        }
        continue;
      }
      let ids: Set<string>;
      try {
        ids = organizerIds(data);
      } catch {
        block("unknown_record", row.path);
        continue;
      }
      if (!ids.has(organizerId)) {
        if (ids.size === 0) block("unattributed_record", row.path);
        continue;
      }
      if (ids.size > 1) {
        block("mixed_organizers", row.path); continue;
      }
      if (collection === "salesImportJobs") {
        const children = await child(row.path, "rows");
        if (children.some((item) => item.data.organizerId !== organizerId)) {
          block("mixed_or_unknown_import_rows", row.path); continue;
        }
        for (const item of children) add(item);
      }
      add(row, collection.startsWith("admin") ? "retain_audit" : "delete");
    }
  }

  // These owners are outside the private Sales cleanup transaction boundary.
  for (const code of ["external_exports_unverified",
    "upstream_intake_unverified", "product_forms_untouched",
    "assistant_shared_client_scope_unverified",
    "assistant_budget_metadata_unverified", "provider_budget_accounting_retained"]) {
    block(code, `external:${code}:${organizerId}`);
  }
  // A later plan must still be able to attribute every surviving dependent.
  // Keep each attribution parent until all of its children have been drained.
  const deletionOrder = (item: InventoryItem): number => {
    const collection = collectionOf(item.path);
    if (collection === "salesDemoSessions") return 1;
    if (collection === "salesDemoInvitations") return 2;
    if (collection === "salesDemoBlueprints") return 3;
    if (collection === "salesContacts") return 4;
    if (collection === "salesContactRelationships") return 5;
    if (collection === "salesImportJobs") {
      return item.path.split("/").length === 4 ? 6 : 7;
    }
    if (collection === "organizerSalesAccounts") {
      return item.path.split("/").length === 4 ? 8 : 10;
    }
    return 9;
  };
  const sorted = [...items.values()].sort((a, b) =>
    deletionOrder(a) - deletionOrder(b) || a.path.localeCompare(b.path));
  const uniqueBlockers = [...new Map(blockers.map((item) =>
    [`${item.code}:${item.fingerprint}`, item])).values()].sort((a, b) =>
    a.code.localeCompare(b.code) || a.fingerprint.localeCompare(b.fingerprint));
  return {organizerId, items: sorted, blockers: uniqueBlockers, overflow,
    inventoryHash: privacyHash([sorted, uniqueBlockers]), counts: {
      deletable: sorted.filter((item) => item.disposition === "delete").length,
      retained: sorted.filter((item) => item.disposition !== "delete").length,
      unresolved: uniqueBlockers.length,
    }};
}
