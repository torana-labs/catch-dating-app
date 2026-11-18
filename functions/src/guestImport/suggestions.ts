// Merge and tag suggestions for a reviewed guest list, each with its reason
// (#2061: "suggest merges with reasons and tags"). Read only: nothing here
// writes. A merge is done later in Customers, through the existing merge
// review (organizerContactMergeReview.ts), which proposes the same pairs
// (sameImportedPhone, sameEmail) once the guests are imported.

import type {HostRosterIntakePreview} from "../events/hostRosterIntakeCore";

export type GuestSuggestionReason = "samePhone" | "sameEmail" |
  "sameEmailInFile" | "ticketType" | "seenBefore";

export interface GuestSuggestion {
  rowId: string;
  kind: "merge" | "tag";
  reason: GuestSuggestionReason;
  /** The existing contact, for a merge with one. */
  contactId: string | null;
  /** The other row in this file, for sameEmailInFile. */
  otherRowId: string | null;
  /** The suggested tag, for kind tag. */
  tag: string | null;
  label: string;
}

const MAX_SUGGESTIONS = 250;
const IN_LIMIT = 30;

interface ContactMatch {
  id: string;
  displayName: string;
}

/**
 * Suggests, for rows the preview would add or update: the organizer's
 * existing contact with the same phone or email; another row in the file
 * with the same email; a tag from the ticket type; and "Returning guest"
 * for someone already in the organizer's contacts.
 * @return {Promise<GuestSuggestion[]>} At most 250 suggestions.
 */
export async function suggestGuestMergesAndTags(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  preview: HostRosterIntakePreview
): Promise<GuestSuggestion[]> {
  const rows = preview.rows.filter((row) =>
    row.kind === "add" || row.kind === "update");
  const proposed = (row: typeof rows[number], field: string) =>
    row.fieldChanges.find((change) => change.field === field)
      ?.proposedValue ?? null;
  const phones = new Set<string>();
  const emails = new Set<string>();
  for (const row of rows) {
    const phone = proposed(row, "phone");
    const email = proposed(row, "email");
    if (phone) phones.add(phone);
    if (email) emails.add(email.toLowerCase());
  }
  const [byPhone, byEmail] = await Promise.all([
    contactsBy(db, organizerId, "phoneE164", [...phones]),
    contactsBy(db, organizerId, "email", [...emails]),
  ]);

  const suggestions: GuestSuggestion[] = [];
  const firstRowByEmail = new Map<string, string>();
  for (const row of rows) {
    const phone = proposed(row, "phone");
    const email = proposed(row, "email")?.toLowerCase() ?? null;
    const phoneMatch = phone ? byPhone.get(phone) : undefined;
    const emailMatch = email ? byEmail.get(email) : undefined;
    const match = phoneMatch ?? emailMatch;
    if (match && row.kind === "add") {
      suggestions.push({rowId: row.rowId, kind: "merge",
        reason: phoneMatch ? "samePhone" : "sameEmail", contactId: match.id,
        otherRowId: null, tag: null,
        label: `${row.displayName} may be ${match.displayName}, already ` +
          `in your contacts (same ${phoneMatch ? "phone" : "email"}).`});
    }
    if (match) {
      suggestions.push({rowId: row.rowId, kind: "tag", reason: "seenBefore",
        contactId: match.id, otherRowId: null, tag: "Returning guest",
        label: `${row.displayName} has been to your events before.`});
    }
    if (email) {
      const first = firstRowByEmail.get(email);
      if (first) {
        suggestions.push({rowId: row.rowId, kind: "merge",
          reason: "sameEmailInFile", contactId: null, otherRowId: first,
          tag: null, label: `${row.displayName} shares an email with row ` +
            `${first}; often one buyer booked for a group.`});
      } else {
        firstRowByEmail.set(email, row.rowId);
      }
    }
    const ticketType = proposed(row, "ticketType");
    if (ticketType) {
      const tag = ticketType.slice(0, 40);
      suggestions.push({rowId: row.rowId, kind: "tag", reason: "ticketType",
        contactId: null, otherRowId: null, tag,
        label: `Tag ${row.displayName} "${tag}" from their ticket.`});
    }
  }
  return suggestions.slice(0, MAX_SUGGESTIONS);
}

/** Live contacts whose [field] is one of [values]; ambiguous values drop. */
async function contactsBy(db: FirebaseFirestore.Firestore,
  organizerId: string, field: "phoneE164" | "email",
  values: string[]): Promise<Map<string, ContactMatch>> {
  const matches = new Map<string, ContactMatch>();
  const ambiguous = new Set<string>();
  for (let start = 0; start < values.length; start += IN_LIMIT) {
    const snapshot = await db.collection("organizerContacts")
      .where("organizerId", "==", organizerId)
      .where(field, "in", values.slice(start, start + IN_LIMIT))
      .limit(IN_LIMIT * 4).get();
    for (const doc of snapshot.docs) {
      const contact = doc.data();
      if (contact.deletedAt != null || contact.hiddenAt != null ||
          contact.mergedIntoContactId != null) continue;
      const key = contact[field];
      if (typeof key !== "string") continue;
      if (matches.has(key) && matches.get(key)?.id !== doc.id) {
        ambiguous.add(key);
      }
      matches.set(key, {id: doc.id, displayName: String(
        contact.displayNameOverride ?? contact.displayName ?? "a contact")});
    }
  }
  for (const key of ambiguous) matches.delete(key);
  return matches;
}
