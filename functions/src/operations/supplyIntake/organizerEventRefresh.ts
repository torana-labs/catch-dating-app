/* eslint-disable max-len */
import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import type {AdminRefreshOrganizerEventsCallablePayload} from "../../shared/generated/adminRefreshOrganizerEventsCallablePayload";
import type {AdminRefreshOrganizerEventsCallableResponse} from "../../shared/generated/adminRefreshOrganizerEventsCallableResponse";
import {validateAdminRefreshOrganizerEventsCallablePayload} from "../../shared/generated/validators/adminRefreshOrganizerEventsInput";
import {checkRateLimit as defaultCheckRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {marketForIdOrAlias} from "../../locations/marketConfig";
import {requireAdminRole} from "../../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../../admin/adminAudit";
import {createSupplyIntakeRequest, supplyIntakeRequestId} from "./requests";

// The event-intake front door: read new events for an unclaimed organizer
// Catch already lists, from the links staff give or the event-calendar links
// on its page. The request names the organizer and carries its approval, so it
// never waits in "Listings to review"; when it finishes, its events go through
// the event publication policy like an approved listing's.

const refreshRoles = ["admin", "adminOwner", "support", "salesStaff"] as const;
// Hosts whose pages a Supply Intake adapter reads for events.
const EVENT_PAGE_HOSTS = ["luma.com", "lu.ma", "district.in", "urbanaut.app"];

interface RefreshDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: (db: FirebaseFirestore.Firestore, uid: string, action: string) => Promise<void>;
}

const defaultDeps: RefreshDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

export async function adminRefreshOrganizerEventsHandler(request: CallableRequest<unknown>,
  deps: RefreshDeps = defaultDeps): Promise<AdminRefreshOrganizerEventsCallableResponse> {
  const context = requireAdminRole(request, refreshRoles);
  const data = validateCallableWithAjv<AdminRefreshOrganizerEventsCallablePayload>(request,
    validateAdminRefreshOrganizerEventsCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, context.uid, "adminRefreshOrganizerEvents");
  const now = deps.now();
  return db.runTransaction(async (tx) => {
    const organizerSnap = await tx.get(db.collection("organizers").doc(data.organizerId));
    const organizer = organizerSnap.data();
    if (!organizerSnap.exists || !organizer) throw new HttpsError("not-found", "This organizer was not found.");
    if (recordValue(organizer.publicPage)?.publishStatus !== "published") {
      throw new HttpsError("failed-precondition", "Only an organizer with a published page can import events.");
    }
    // A claimed organizer runs its own events (or connects its own Luma account).
    if (recordValue(organizer.claim)?.state !== "unclaimed") {
      throw new HttpsError("failed-precondition", "This organizer has claimed its page and manages its own events.");
    }
    const urls = data.urls.length > 0 ? data.urls : eventPageLinks(organizer.publicSources);
    if (urls.length === 0) {
      throw new HttpsError("failed-precondition", "The organizer's page links no event calendar. Give a link to read.");
    }
    const intake = {
      schemaVersion: 1 as const,
      requestId: supplyIntakeRequestId("refresh", [context.uid, data.requestId]),
      kind: "event_refresh" as const,
      market: marketForIdOrAlias(stringValue(organizer.locationMarketId) || stringValue(organizer.location))?.slug ??
        "unassigned",
      target: {organizerId: data.organizerId},
      seed: {name: stringValue(organizer.name).slice(0, 160) || null, urls, notes: null, categories: []},
      submittedBy: {role: "associate" as const, uid: context.uid, partnerId: null},
      submittedAt: now.toISOString(),
      origin: {kind: "admin_event_refresh" as const, id: data.requestId},
    };
    const approval = {approvalId: `refresh-${hash(intake.requestId).slice(0, 40)}`, organizerId: data.organizerId,
      approvedByUid: context.uid, approvedAt: now.toISOString(), materialHash: hash(JSON.stringify(intake)),
      salesOwnerUid: context.uid};
    const created = await createSupplyIntakeRequest(tx, db, intake, now, {approval});
    if (created.created) {
      setAdminAuditLogInTransaction(tx, db, context, {
        action: "adminRefreshOrganizerEvents", targetPath: `supplyIntakeRequests/${created.requestId}`, request,
        before: {}, after: {requestId: created.requestId, organizerId: data.organizerId, urls: urls.length},
        note: null, serverTimestamp: deps.serverTimestamp,
      });
    }
    return {...created, status: "queued" as const, urls};
  });
}

export const adminRefreshOrganizerEvents = onCall(appCheckCallableOptions,
  (request) => adminRefreshOrganizerEventsHandler(request));

/** The organizer page's links on platforms whose event pages an adapter reads. */
export function eventPageLinks(sources: unknown): string[] {
  const links = (Array.isArray(sources) ? sources : []).flatMap((source) => {
    const href = recordValue(source)?.href;
    if (typeof href !== "string") return [];
    try {
      const host = new URL(href).hostname.replace(/^www\./u, "");
      return EVENT_PAGE_HOSTS.includes(host) ? [href] : [];
    } catch {
      return [];
    }
  });
  return [...new Set(links)].slice(0, 10);
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  return {...data, organizerId: typeof data.organizerId === "string" ? data.organizerId.trim() : data.organizerId,
    urls: Array.isArray(data.urls) ?
      [...new Set(data.urls.map((url) => typeof url === "string" ? url.trim() : url))] : data.urls};
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
