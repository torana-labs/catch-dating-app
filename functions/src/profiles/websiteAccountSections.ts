import type {Timestamp} from "firebase-admin/firestore";
import type {ManageWebsiteAccountCallableResponse as Account} from
  "../shared/generated/manageWebsiteAccountCallableResponse";
import type {ManageWebsiteAccountCallablePayload as Payload} from
  "../shared/generated/manageWebsiteAccountCallablePayload";

export type AccountSection = NonNullable<
  Extract<Payload, {action: "read"}>["sections"]
>[number];
type Sections = Pick<Account, "plans" | "follows" | "reviews" | "messages">;
type Plan = NonNullable<Account["plans"]>[number];
type Review = NonNullable<Account["reviews"]>[number];
type Channel = NonNullable<Account["messages"]>[number]["sms"];
type Data = Record<string, unknown>;

const limits = {plans: 50, follows: 100, reviews: 50, messages: 50} as const;

/**
 * The account page's own-record reads. Each query filters by the signed-in
 * UID only, so no other person's rows can enter the page; names come from the
 * organizer and event documents and are capped to the contract's lengths.
 */
export async function readAccountSections(
  db: FirebaseFirestore.Firestore,
  uid: string,
  sections: readonly AccountSection[],
  now: Date
): Promise<Sections> {
  const wanted = new Set(sections);
  const own = (collection: string, field: string, limit: number) =>
    db.collection(collection).where(field, "==", uid).limit(limit).get()
      .then((snapshot) => snapshot.docs.map((doc) => ({
        id: doc.id, data: (doc.data() ?? {}) as Data,
      })));
  const [participations, follows, reviews, preferences] = await Promise.all([
    wanted.has("plans") ?
      own("eventParticipations", "uid", limits.plans * 2) : null,
    wanted.has("following") ?
      own("organizerFollows", "uid", limits.follows * 2) : null,
    wanted.has("reviews") ?
      own("reviews", "reviewerUserId", limits.reviews) : null,
    wanted.has("messages") ?
      own("organizerCommunicationPreferences", "uid", limits.messages) : null,
  ]);
  const ownParticipations = (participations ?? []).filter(({data}) =>
    data.uid === uid && data.status !== "deleted" &&
    typeof data.eventId === "string");
  const events = await loadById(db, "events",
    ownParticipations.map(({data}) => data.eventId as string));
  const activeFollows = (follows ?? []).filter(({data}) =>
    data.uid === uid && data.status === "active" &&
    typeof data.organizerId === "string");
  const ownReviews = (reviews ?? []).filter(({data}) =>
    data.reviewerUserId === uid && typeof data.organizerId === "string");
  const ownPreferences = (preferences ?? []).filter(({data}) =>
    data.uid === uid && typeof data.organizerId === "string");
  const organizers = await loadById(db, "organizers", [
    ...[...events.values()].map((event) => event.organizerId),
    ...activeFollows.map(({data}) => data.organizerId),
    ...ownReviews.map(({data}) => data.organizerId),
    ...ownPreferences.map(({data}) => data.organizerId),
  ].filter((id): id is string => typeof id === "string"));
  const organizerName = (id: string) =>
    text(organizers.get(id)?.name, 240);
  const result: Sections = {};
  if (participations) {
    result.plans = ownParticipations.flatMap(({data}): Plan[] => {
      const event = events.get(data.eventId as string);
      const status = data.status;
      if (!event || (status !== "signedUp" && status !== "waitlisted" &&
          status !== "attended" && status !== "cancelled")) return [];
      const startsAt = millis(event.startTime);
      const endsAt = millis(event.endTime) ?? startsAt;
      const past = endsAt !== null && endsAt < now.getTime();
      const organizerId = String(event.organizerId ?? data.organizerId ?? "");
      if (!organizerId) return [];
      return [{
        eventId: data.eventId as string,
        eventName: text(event.name, 240),
        organizerId,
        organizerName: organizerName(organizerId),
        startsAt: iso(startsAt),
        endsAt: iso(millis(event.endTime)),
        venue: text(event.meetingPoint, 240) || null,
        status,
        timing: past ? "past" : "upcoming",
        passAvailable: status === "signedUp" && !past &&
          event.status !== "cancelled",
      }];
    }).sort((a, b) => (b.startsAt ?? "").localeCompare(a.startsAt ?? ""))
      .slice(0, limits.plans);
  }
  if (follows) {
    result.follows = activeFollows.map(({data}) => {
      const organizerId = data.organizerId as string;
      return {
        organizerId,
        organizerName: organizerName(organizerId),
        path: publicPath(organizers.get(organizerId)),
        followedAt: iso(millis(data.followedAt)),
      };
    }).sort((a, b) => (b.followedAt ?? "").localeCompare(a.followedAt ?? ""))
      .slice(0, limits.follows);
  }
  if (reviews) {
    result.reviews = ownReviews.flatMap(({id, data}): Review[] => {
      const rating = data.rating;
      if (typeof rating !== "number" || !Number.isInteger(rating) ||
          rating < 1 || rating > 5) return [];
      const organizerId = data.organizerId as string;
      const moderation = data.moderationStatus;
      const response = data.ownerResponse as {message?: unknown} | null;
      return [{
        reviewId: id,
        organizerId,
        organizerName: organizerName(organizerId),
        eventId: typeof data.eventId === "string" ? data.eventId : null,
        rating,
        comment: text(data.comment, 4000),
        verified: data.verificationStatus === "verified",
        moderationStatus: moderation === "pending" ||
          moderation === "rejected" ? moderation : "published",
        createdAt: iso(millis(data.createdAt)),
        ownerResponse: response && typeof response.message === "string" ?
          response.message.slice(0, 4000) : null,
      }];
    }).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }
  if (preferences) {
    result.messages = ownPreferences.map(({data}) => {
      const organizerId = data.organizerId as string;
      const whatsapp = data.whatsapp as Data | undefined;
      const receipt = whatsapp?.currentReceiptId;
      return {
        organizerId,
        organizerName: organizerName(organizerId),
        whatsapp: channel(whatsapp),
        sms: channel(data.sms as Data | undefined),
        whatsappReceiptId: typeof receipt === "string" ? receipt : null,
      };
    }).sort((a, b) => a.organizerName.localeCompare(b.organizerName));
  }
  return result;
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

/** A published organizer page's path; drafts and removed pages have none. */
function publicPath(organizer: Data | undefined): string | null {
  const page = organizer?.publicPage as Data | undefined;
  return page?.publishStatus === "published" &&
    typeof page.canonicalPath === "string" ?
    page.canonicalPath.slice(0, 240) : null;
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function millis(value: unknown): number | null {
  if (value && typeof (value as Timestamp).toMillis === "function") {
    return (value as Timestamp).toMillis();
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function iso(value: number | null): string | null {
  return value === null ? null : new Date(value).toISOString();
}
