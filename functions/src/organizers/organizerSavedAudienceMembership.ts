import {HttpsError} from "firebase-functions/v2/https";
import type {
  EventDocument, OrganizerContactDocument, OrganizerSavedAudienceDocument,
  PaymentDocument,
} from "../shared/generated/firestoreAdminTypes";
import {catchSpendProjection} from "./eventRosterInsights";

type Predicate =
  OrganizerSavedAudienceDocument["definition"]["predicates"][number];
const maxPayments = 5000;
const maxEvents = 1000;

export interface StaticAudienceSelectionRow {
  selectedContactId: string;
  contactId: string | null;
  displayName: string | null;
  available: boolean;
}

/** Resolves only explicitly selected identities; merges never add strangers. */
export async function resolveStaticAudienceSelection(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  contactIds: string[],
  requireAvailable: boolean
): Promise<StaticAudienceSelectionRow[]> {
  const members = new Set<string>();
  let pending = [...new Set(contactIds)];
  const visited = new Set<string>();
  const links = new Map<string, string>();
  const records = new Map<string, OrganizerContactDocument>();
  for (let depth = 0; pending.length && depth < 10; depth++) {
    const next = new Set<string>();
    for (let offset = 0; offset < pending.length; offset += 250) {
      const ids = pending.slice(offset, offset + 250);
      const snapshots = await db.getAll(...ids.map((id) =>
        db.collection("organizerContacts").doc(id)));
      for (const snap of snapshots) {
        const contact = snap.data() as OrganizerContactDocument | undefined;
        if (contact && contact.organizerId !== organizerId) {
          throw new HttpsError("not-found", "Selected person is unavailable.");
        }
        if (contact) records.set(snap.id, contact);
        if (contact?.mergedIntoContactId) {
          links.set(snap.id, contact.mergedIntoContactId);
          if (!visited.has(contact.mergedIntoContactId)) {
            next.add(contact.mergedIntoContactId);
          }
        } else if (!contact || contact.deletedAt || contact.hiddenAt ||
            contact.identityState === "merged") {
          if (requireAvailable) {
            throw new HttpsError("failed-precondition",
              "Remove unavailable people before saving this list.");
          }
        } else {
          members.add(snap.id);
        }
        visited.add(snap.id);
      }
    }
    pending = [...next].filter((id) => !visited.has(id));
  }
  if (pending.length) {
    throw new HttpsError("failed-precondition",
      "Contact merge history must be resolved before using this list.");
  }
  const rows: StaticAudienceSelectionRow[] = [];
  for (const contactId of contactIds) {
    const chain = new Set<string>();
    let id = contactId;
    while (links.has(id)) {
      if (chain.has(id)) {
        throw new HttpsError("failed-precondition",
          "Contact merge history contains a cycle.");
      }
      chain.add(id);
      id = links.get(id)!;
    }
    const available = members.has(id);
    const record = records.get(id);
    rows.push({selectedContactId: contactId, contactId: available ? id : null,
      displayName: available && record ?
        record.displayNameOverride ?? record.displayName : null, available});
  }
  return rows;
}

export async function staticAudienceMembers(
  db: FirebaseFirestore.Firestore, organizerId: string,
  contactIds: string[], requireAvailable: boolean
): Promise<Set<string>> {
  const rows = await resolveStaticAudienceSelection(db, organizerId,
    contactIds, requireAvailable);
  return new Set(rows.flatMap((row) => row.contactId ? [row.contactId] : []));
}

/** Uses bounded canonical payments, with organizer ownership checked first. */
export async function savedAudienceSpendMatches(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  predicates: Array<Extract<Predicate, {kind: "spend"}>>;
  nowMillis: number;
}): Promise<Map<string, Set<string>>> {
  const matches = new Map<string, Set<string>>();
  if (!params.predicates.length) return matches;
  const {db, organizerId, nowMillis} = params;
  const eventSnapshots = await Promise.all([
    db.collection("events").where("organizerId", "==", organizerId)
      .limit(maxEvents + 1).get(),
    db.collection("events").where("organizerId", "==", organizerId)
      .limit(maxEvents + 1).get(),
  ]);
  const events = new Map(eventSnapshots.flatMap((snap) =>
    snap.docs.map((doc) => [doc.id, doc.data() as EventDocument] as const)));
  if (events.size > maxEvents ||
      eventSnapshots.some((snap) => snap.size > maxEvents)) {
    throw new HttpsError("resource-exhausted",
      "Exact spend evaluation exceeds 1,000 organizer events.");
  }
  const eventIds = [...events].filter(([, event]) =>
    (event.organizerId) === organizerId).map(([id]) => id);
  const payments: PaymentDocument[] = [];
  for (let offset = 0; offset < eventIds.length; offset += 30) {
    const snap = await db.collection("payments")
      .where("eventId", "in", eventIds.slice(offset, offset + 30))
      .limit(maxPayments - payments.length + 1).get();
    payments.push(...snap.docs.map((doc) => doc.data() as PaymentDocument));
    if (payments.length > maxPayments) {
      throw new HttpsError("resource-exhausted",
        "Exact spend evaluation exceeds 5,000 payment records.");
    }
  }
  const contacts = await db.collection("organizerContacts")
    .where("organizerId", "==", organizerId)
    .where("deletedAt", "==", null)
    .where("hiddenAt", "==", null)
    .limit(2501).get();
  if (contacts.size > 2500) {
    throw new HttpsError("resource-exhausted",
      "Exact spend evaluation exceeds 2,500 contacts.");
  }
  const byUid = new Map<string, string[]>();
  const uidCounts = new Map<string, number>();
  for (const snap of contacts.docs) {
    const contact = snap.data() as OrganizerContactDocument;
    if (contact.linkedUid && !contact.mergedIntoContactId) {
      uidCounts.set(contact.linkedUid,
        (uidCounts.get(contact.linkedUid) ?? 0) + 1);
    }
    if (contact.identityState !== "verified" ||
        contact.identityConfidence !== "verified" || !contact.linkedUid ||
        contact.mergedIntoContactId) continue;
    byUid.set(contact.linkedUid,
      [...byUid.get(contact.linkedUid) ?? [], snap.id]);
  }
  for (const predicate of params.predicates) {
    const start = predicate.withinDays === null ? 0 :
      nowMillis - predicate.withinDays * 86400000;
    const totals = catchSpendProjection(payments.filter((payment) =>
      (payment.completedAt ?? payment.createdAt).toMillis() >= start),
    nowMillis).byUid;
    const ids = new Set<string>();
    for (const [uid, contactIds] of byUid) {
      if (contactIds.length !== 1 || uidCounts.get(uid) !== 1) continue;
      const amount = totals.get(uid)?.find((row) =>
        row.currency === predicate.currency)?.amountMinor ?? 0;
      if (predicate.operator === "atLeast" ? amount >= predicate.amountMinor :
        amount <= predicate.amountMinor) ids.add(contactIds[0]);
    }
    matches.set(JSON.stringify(predicate), ids);
  }
  return matches;
}
