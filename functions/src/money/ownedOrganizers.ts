import * as admin from "firebase-admin";
import {FieldPath} from "firebase-admin/firestore";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {isOrganizerOwner} from "../shared/organizerHosts";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {OrganizerDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {ListMyOwnedOrganizersCallablePayload as Payload} from
  "../shared/generated/listMyOwnedOrganizersCallablePayload";
import type {ListMyOwnedOrganizersCallableResponse as Result} from
  "../shared/generated/listMyOwnedOrganizersCallableResponse";
import {validateListMyOwnedOrganizersCallablePayload} from
  "../shared/generated/validators/listMyOwnedOrganizersInput";
import {validateListMyOwnedOrganizersCallableResponse} from
  "../shared/generated/validators/listMyOwnedOrganizersOutput";
import {planStatusView, readBillingPlan} from "./organizerBillingPlan";
import {readOrganizerTrialStatus} from "./organizerBillingStatus";

/**
 * The organizers the signed-in user owns, for the host billing website's
 * organizer switcher: ownerUserId, or the legacy hostUserId when no owner is
 * recorded (the same rule as every owner-only billing callable). A page at a
 * time in organizer id order, each with its trial and plan status. No prices.
 */
type Db = FirebaseFirestore.Firestore;

export interface OwnedOrganizersDeps {
  db: () => Db;
  now: () => number;
  checkRateLimit: typeof checkRateLimit;
}

const defaultDeps: OwnedOrganizersDeps = {
  db: () => admin.firestore(),
  now: Date.now,
  checkRateLimit,
};

/**
 * One page of the organizers a user owns, in id order. Both ownership fields
 * are read in id order from the same cursor, merged, and checked with the
 * owner rule, so the page and its cursor are exact.
 * @param {Db} db Firestore.
 * @param {string} uid The user.
 * @param {string|null} after Continue after this organizer id.
 * @param {number} limit Page size.
 * @return {Promise<object>} The page and the cursor for the next one.
 */
export async function ownedOrganizersPage(db: Db, uid: string,
  after: string | null, limit: number):
  Promise<{organizers: {id: string; data: OrganizerDocument}[];
    next: string | null}> {
  const read = (field: "ownerUserId" | "hostUserId") => {
    let query = db.collection("organizers").where(field, "==", uid)
      .orderBy(FieldPath.documentId());
    if (after !== null) query = query.startAfter(after);
    return query.limit(limit + 1).get();
  };
  const snaps = await Promise.all([read("ownerUserId"), read("hostUserId")]);
  const byId = new Map<string, OrganizerDocument>();
  for (const snap of snaps) {
    for (const doc of snap.docs) {
      const data = doc.data() as OrganizerDocument;
      // A legacy hostUserId match counts only when no owner is recorded.
      if (isOrganizerOwner(data, uid)) byId.set(doc.id, data);
    }
  }
  // A read that filled its window may hold unread ids past its last one, so
  // the page stops there: nothing past it is known to be in order yet.
  const full = snaps.filter((snap) => snap.size > limit);
  const bound = full.length === 0 ? null : full
    .map((snap) => snap.docs[snap.docs.length - 1].id).sort()[0];
  const ids = [...byId.keys()].sort()
    .filter((id) => bound === null || id <= bound);
  const page = ids.slice(0, limit);
  const more = ids.length > limit || bound !== null;
  // A window of ids owned by someone else (legacy hostUserId) still moves
  // the cursor on.
  const next = !more ? null : page.length === limit || bound === null ?
    page[page.length - 1] : bound;
  return {organizers: page.map((id) => ({id, data: byId.get(id)!})), next};
}

/**
 * The signed-in user reads the organizers they own.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OwnedOrganizersDeps} deps Dependencies.
 * @return {Promise<Result>} One page, status only.
 */
export async function listMyOwnedOrganizersHandler(
  request: CallableRequest<unknown>,
  deps: OwnedOrganizersDeps = defaultDeps): Promise<Result> {
  const uid = requireAuth(request);
  const {afterOrganizerId, limit} = validateCallableWithAjv<Payload>(request,
    validateListMyOwnedOrganizersCallablePayload);
  const db = deps.db();
  await deps.checkRateLimit(db, uid, "listMyOwnedOrganizers",
    {maxRequests: 60, windowMs: 60 * 1000});
  const page = await ownedOrganizersPage(db, uid, afterOrganizerId, limit);
  const now = deps.now();
  const organizers = await Promise.all(page.organizers.map(async (item) => {
    const [trial, plan] = await Promise.all([
      readOrganizerTrialStatus(db, item.id, now),
      readBillingPlan(db, item.id)]);
    return {organizerId: item.id,
      name: String(item.data.name ?? item.id).slice(0, 160),
      archived: item.data.archived === true || item.data.status === "archived",
      trial, plan: planStatusView(plan)};
  }));
  const result: Result = {organizers,
    nextAfterOrganizerId: page.next};
  if (!validateListMyOwnedOrganizersCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid organizers.");
  }
  return result;
}

export const listMyOwnedOrganizers = onCall(appCheckCallableOptions,
  (request) => listMyOwnedOrganizersHandler(request));
