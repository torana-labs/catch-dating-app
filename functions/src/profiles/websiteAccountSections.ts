import {
  contactPermissionsCollection,
  readContactPermission,
  whatsappPermissionSummary,
} from "../shared/contactPermissions";
import type {ManageWebsiteAccountCallableResponse as Account} from
  "../shared/generated/manageWebsiteAccountCallableResponse";
import type {ManageWebsiteAccountCallablePayload as Payload} from
  "../shared/generated/manageWebsiteAccountCallablePayload";

export type AccountSection = NonNullable<
  Extract<Payload, {action: "read"}>["sections"]
>[number];
type Sections = Pick<Account, "messages">;
type Channel = NonNullable<Account["messages"]>[number]["sms"];
type Data = Record<string, unknown>;

const messagesLimit = 50;

/**
 * The account page's one server-read section: the signed-in UID's organizer
 * messaging permissions, read from their own contactPermissions documents
 * (issue #2460). The WhatsApp withdrawal they feed is fenced on the receipt
 * id read here. The page's plans, follows and reviews come from listeners on
 * the guest's own rows (guestEventStatuses, organizerFollows, reviews).
 * Organizer names come from the organizer documents, capped to the
 * contract's length.
 */
export async function readAccountSections(
  db: FirebaseFirestore.Firestore,
  uid: string,
  sections: readonly AccountSection[]
): Promise<Sections> {
  if (!sections.includes("messages")) return {};
  const snapshot = await db.collection("users").doc(uid)
    .collection(contactPermissionsCollection)
    .where("senderKind", "==", "organizer").limit(messagesLimit).get();
  const own = snapshot.docs.flatMap((doc) => {
    const organizerId = (doc.data() ?? {}).senderId;
    if (typeof organizerId !== "string") return [];
    const permission = readContactPermission(doc.data(),
      {kind: "organizer", organizerId});
    return permission ? [{organizerId, permission}] : [];
  });
  const organizers = await loadById(db, "organizers",
    own.map((row) => row.organizerId));
  return {
    messages: own.map(({organizerId, permission}) => {
      const whatsapp = whatsappPermissionSummary(permission, "organizer");
      return {
        organizerId,
        organizerName: text(organizers.get(organizerId)?.name, 240),
        whatsapp: whatsapp.status as Channel,
        // Only an effective grant reads as opted in.
        sms: (permission.grants["sms:marketing"]?.status === "optedOut" ?
          "optedOut" : permission.granted.includes("sms:marketing") ?
            "optedIn" : "unknown") as Channel,
        whatsappReceiptId: whatsapp.receiptId,
      };
    }).sort((a, b) => a.organizerName.localeCompare(b.organizerName)),
  };
}

async function loadById(
  db: FirebaseFirestore.Firestore,
  collection: string,
  ids: readonly string[]
): Promise<Map<string, Data>> {
  const unique = [...new Set(ids)];
  const snapshots = await Promise.all(
    unique.map((id) => db.collection(collection).doc(id).get())
  );
  return new Map(snapshots.flatMap((snapshot, index) =>
    snapshot.exists ? [[unique[index], (snapshot.data() ?? {}) as Data]] : []));
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
