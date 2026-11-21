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
 * messaging permissions. organizerCommunicationPreferences is a consent
 * ledger that stays server-only, and the WhatsApp withdrawal it feeds is
 * fenced on the receipt id read here. The page's plans, follows and reviews
 * come from listeners on the guest's own rows (guestEventStatuses,
 * organizerFollows, reviews). The query filters by the signed-in UID only;
 * organizer names come from the organizer documents, capped to the
 * contract's length.
 */
export async function readAccountSections(
  db: FirebaseFirestore.Firestore,
  uid: string,
  sections: readonly AccountSection[]
): Promise<Sections> {
  if (!sections.includes("messages")) return {};
  const snapshot = await db.collection("organizerCommunicationPreferences")
    .where("uid", "==", uid).limit(messagesLimit).get();
  const own = snapshot.docs.map((doc) => (doc.data() ?? {}) as Data)
    .filter((data) => data.uid === uid && typeof data.organizerId === "string");
  const organizers = await loadById(db, "organizers",
    own.map((data) => data.organizerId as string));
  return {
    messages: own.map((data) => {
      const organizerId = data.organizerId as string;
      const whatsapp = data.whatsapp as Data | undefined;
      const receipt = whatsapp?.currentReceiptId;
      return {
        organizerId,
        organizerName: text(organizers.get(organizerId)?.name, 240),
        whatsapp: channel(whatsapp),
        sms: channel(data.sms as Data | undefined),
        whatsappReceiptId: typeof receipt === "string" ? receipt : null,
      };
    }).sort((a, b) => a.organizerName.localeCompare(b.organizerName)),
  };
}

/** Only complete evidence reads as opted in; legacy rows read unknown. */
function channel(value: Data | undefined): Channel {
  if (value?.status === "optedOut") return "optedOut";
  if (value?.status === "optedIn" && value.evidenceStatus === "complete") {
    return "optedIn";
  }
  return "unknown";
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
