import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import {moderateText} from "../moderation/textFilter";
import type {
  ReviewDocument,
  EventDocument,
  EventParticipationDocument,
  UserProfileDocument,
  OrganizerDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  checkIpRateLimit,
  checkRateLimit as defaultCheckRateLimit,
} from "../shared/rateLimit";
import {
  eventParticipationId,
} from "../shared/relationshipDocuments";
import type {CreateEventReviewCallablePayload} from
  "../shared/generated/createEventReviewCallablePayload";
import type {CreatePublicOrganizerReviewCallablePayload} from
  "../shared/generated/createPublicOrganizerReviewCallablePayload";
import type {CreatePublicOrganizerReviewCallableResponse} from
  "../shared/generated/createPublicOrganizerReviewCallableResponse";
import type {DeleteEventReviewCallablePayload} from
  "../shared/generated/deleteEventReviewCallablePayload";
import type {ListPublicOrganizerReviewsCallablePayload} from
  "../shared/generated/listPublicOrganizerReviewsCallablePayload";
import type {ListPublicOrganizerReviewsCallableResponse} from
  "../shared/generated/listPublicOrganizerReviewsCallableResponse";
import {
  validateCreateEventReviewCallablePayload,
} from "../shared/generated/validators/createEventReviewInput";
import {
  validateCreatePublicOrganizerReviewCallablePayload,
} from
  "../shared/generated/validators/createPublicOrganizerReviewInput";
import {
  validateDeleteEventReviewCallablePayload,
} from "../shared/generated/validators/deleteEventReviewInput";
import {
  validateListPublicOrganizerReviewsCallablePayload,
} from
  "../shared/generated/validators/listPublicOrganizerReviewsInput";
import {
  validateSetReviewResponseCallablePayload,
} from "../shared/generated/validators/setReviewResponseInput";
import {
  validateUpdateEventReviewCallablePayload,
} from "../shared/generated/validators/updateEventReviewInput";
import type {SetReviewResponseCallablePayload} from
  "../shared/generated/setReviewResponseCallablePayload";
import type {UpdateEventReviewCallablePayload} from
  "../shared/generated/updateEventReviewCallablePayload";
import {normalizePayloadStrings, normalizeSingleIdPayload} from
  "../shared/callablePayloadNormalization";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  publicAvatarUrl,
  publicDisplayName,
} from "../shared/profileProjection";
import {isOrganizerManager, organizerHostProfiles} from
  "../shared/organizerHosts";
import {assertPublicOrganizerPageEligible} from
  "../shared/publicOrganizerPage";

/**
 * Moderation status for a freshly written review. If the comment or the
 * reviewer-supplied name trips the block filter, the review is held as
 * "pending" instead of "published" so it never renders on the public listing
 * nor counts toward the organizer rating until a human clears it.
 * @param {string} comment Review comment text.
 * @param {string} reviewerName Display name attached to the review.
 * @return {"published" | "pending"} Moderation status to store.
 */
function reviewModerationStatus(
  comment: string,
  reviewerName: string
): "published" | "pending" {
  const blocked = moderateText(comment).action === "block" ||
    moderateText(reviewerName).action === "block";
  return blocked ? "pending" : "published";
}

interface ReviewMutationDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp?: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
  checkIpRateLimit?: (
    ip: string,
    maxRequests?: number,
    windowMs?: number
  ) => boolean;
}

const defaultDeps: ReviewMutationDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
  checkIpRateLimit,
};

export type PublicOrganizerReview =
  CreatePublicOrganizerReviewCallableResponse["review"];

export async function createEventReviewHandler(
  request: CallableRequest<unknown>,
  deps: ReviewMutationDeps = defaultDeps
): Promise<{reviewId: string}> {
  const reviewerUserId = requireAuth(request);
  const data = validateCallableWithAjv<CreateEventReviewCallablePayload>(
    request,
    validateCreateEventReviewCallablePayload,
    normalizeCreateEventReviewPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, reviewerUserId, "createEventReview", {
    maxRequests: 30, windowMs: 60 * 1000,
  });

  const reviewId = eventReviewId(data.eventId, reviewerUserId);
  const reviewRef = db.collection("reviews").doc(reviewId);
  const eventRef = db.collection("events").doc(data.eventId);
  const userRef = db.collection("users").doc(reviewerUserId);
  const deletedUserRef = db.collection("deletedUsers").doc(reviewerUserId);
  const participationRef = db
    .collection("eventParticipations")
    .doc(eventParticipationId(data.eventId, reviewerUserId));

  await db.runTransaction(async (tx) => {
    const [
      reviewSnap,
      eventSnap,
      userSnap,
      deletedUserSnap,
      participationSnap,
    ] = await Promise.all([
      tx.get(reviewRef),
      tx.get(eventRef),
      tx.get(userRef),
      tx.get(deletedUserRef),
      tx.get(participationRef),
    ]);

    if (reviewSnap.exists) {
      throw new HttpsError(
        "already-exists",
        "You have already reviewed this event."
      );
    }
    assertCanWriteReview(
      eventSnap,
      userSnap,
      deletedUserSnap,
      participationSnap,
      data.organizerId
    );

    const user = requireDoc<UserProfileDocument>(

      userSnap,

      "UserProfileDocument"

    );
    tx.create(reviewRef, {
      organizerId: eventOrganizerId(eventSnap),
      eventId: data.eventId,
      reviewerUserId,
      reviewerName: publicDisplayName(user),
      rating: data.rating,
      comment: data.comment,
      verificationStatus: "verified",
      source: "catchEvent",
      moderationStatus: reviewModerationStatus(
        data.comment,
        publicDisplayName(user)
      ),
      isAnonymous: false,
      submittedFromPath: null,
      createdAt: deps.serverTimestamp?.() ??
        admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return {reviewId};
}

export async function createPublicOrganizerReviewHandler(
  request: CallableRequest<unknown>,
  deps: ReviewMutationDeps = defaultDeps
): Promise<CreatePublicOrganizerReviewCallableResponse> {
  const data =
    validateCallableWithAjv<CreatePublicOrganizerReviewCallablePayload>(
      request,
      validateCreatePublicOrganizerReviewCallablePayload,
      normalizeCreatePublicOrganizerReviewPayload
    );
  return createPublicOrganizerReviewFromData(
    request,
    data,
    deps,
    "createPublicOrganizerReview"
  );
}

async function createPublicOrganizerReviewFromData(
  request: CallableRequest<unknown>,
  data: CreatePublicOrganizerReviewCallablePayload,
  deps: ReviewMutationDeps,
  rateLimitAction: "createPublicOrganizerReview"
): Promise<CreatePublicOrganizerReviewCallableResponse> {
  const db = deps.firestore();
  const reviewerUserId = request.auth?.uid ?? null;

  if (reviewerUserId) {
    await deps.checkRateLimit?.(db, reviewerUserId, rateLimitAction, {
      maxRequests: 5, windowMs: 60 * 60 * 1000,
    });
  } else {
    const ip = requesterIp(request);
    const allowed = deps.checkIpRateLimit?.(
      ip,
      5,
      60 * 60 * 1000
    ) ?? true;
    if (!allowed) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many public reviews from this connection. Please try again later."
      );
    }
  }

  const organizerRef = db.collection("organizers").doc(data.organizerId);
  const reviewRef = db.collection("reviews").doc();
  const createdAt = new Date().toISOString();
  const reviewerName = publicReviewerName(data);
  const moderationStatus = reviewModerationStatus(data.comment, reviewerName);

  await db.runTransaction(async (tx) => {
    const organizerSnap = await tx.get(organizerRef);
    assertCanReceivePublicReview(organizerSnap, data.submittedFromPath);
    tx.create(reviewRef, {
      organizerId: data.organizerId,
      eventId: null,
      reviewerUserId,
      reviewerName,
      rating: data.rating,
      comment: data.comment,
      verificationStatus: "unverified",
      source: "publicListing",
      moderationStatus,
      isAnonymous: data.isAnonymous,
      submittedFromPath: data.submittedFromPath,
      createdAt: deps.serverTimestamp?.() ??
        admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return {
    reviewId: reviewRef.id,
    review: {
      id: reviewRef.id,
      reviewerName,
      rating: data.rating,
      comment: data.comment,
      createdAt,
      verificationStatus: "unverified",
      source: "publicListing",
      moderationStatus,
      isAnonymous: data.isAnonymous,
      ownerResponse: null,
    },
  };
}

export async function listPublicOrganizerReviewsHandler(
  request: CallableRequest<unknown>,
  deps: ReviewMutationDeps = defaultDeps
): Promise<ListPublicOrganizerReviewsCallableResponse> {
  const data =
    validateCallableWithAjv<ListPublicOrganizerReviewsCallablePayload>(
      request,
      validateListPublicOrganizerReviewsCallablePayload,
      normalizeSingleIdPayload("organizerId")
    );
  return listPublicOrganizerReviewsFromData(data, deps);
}

async function listPublicOrganizerReviewsFromData(
  data: ListPublicOrganizerReviewsCallablePayload,
  deps: ReviewMutationDeps
): Promise<ListPublicOrganizerReviewsCallableResponse> {
  const db = deps.firestore();
  const [organizerSnap, reviewsSnap] =
    await Promise.all([
      db.collection("organizers").doc(data.organizerId).get(),
      db
        .collection("reviews")
        .where("organizerId", "==", data.organizerId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get(),
    ]);
  assertCanReceivePublicReview(organizerSnap, null);

  const reviews = reviewsSnap.docs
    .sort((a, b) => timestampMillis(b.data().createdAt) -
      timestampMillis(a.data().createdAt))
    .slice(0, 50)
    .map((doc) => toPublicOrganizerReview(doc.id, doc.data() as ReviewDocument))
    .filter((review): review is PublicOrganizerReview => review !== null);

  return {reviews};
}

export async function updateEventReviewHandler(
  request: CallableRequest<unknown>,
  deps: ReviewMutationDeps = defaultDeps
): Promise<{updated: boolean}> {
  const reviewerUserId = requireAuth(request);
  const data = validateCallableWithAjv<UpdateEventReviewCallablePayload>(
    request,
    validateUpdateEventReviewCallablePayload,
    normalizeUpdateEventReviewPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, reviewerUserId, "updateEventReview", {
    maxRequests: 30, windowMs: 60 * 1000,
  });

  const reviewRef = db.collection("reviews").doc(data.reviewId);
  await db.runTransaction(async (tx) => {
    const reviewSnap = await tx.get(reviewRef);
    assertOwnsReview(reviewSnap, reviewerUserId);
    tx.update(reviewRef, {
      rating: data.rating,
      comment: data.comment,
      updatedAt: deps.serverTimestamp?.() ??
        admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return {updated: true};
}

export async function deleteEventReviewHandler(
  request: CallableRequest<unknown>,
  deps: ReviewMutationDeps = defaultDeps
): Promise<{deleted: boolean}> {
  const reviewerUserId = requireAuth(request);
  const data = validateCallableWithAjv<DeleteEventReviewCallablePayload>(
    request,
    validateDeleteEventReviewCallablePayload,
    normalizeSingleIdPayload("reviewId")
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, reviewerUserId, "deleteEventReview", {
    maxRequests: 30, windowMs: 60 * 1000,
  });

  const reviewRef = db.collection("reviews").doc(data.reviewId);
  await db.runTransaction(async (tx) => {
    const reviewSnap = await tx.get(reviewRef);
    assertOwnsReview(reviewSnap, reviewerUserId);
    tx.delete(reviewRef);
  });

  return {deleted: true};
}

export async function setReviewResponseHandler(
  request: CallableRequest<unknown>,
  deps: ReviewMutationDeps = defaultDeps
): Promise<{updated: boolean}> {
  const hostUserId = requireAuth(request);
  const data = validateCallableWithAjv<SetReviewResponseCallablePayload>(
    request,
    validateSetReviewResponseCallablePayload,
    normalizeSetReviewResponsePayload
  );
  // The host response is published immediately, so reject blocked content
  // outright (the host can edit and resubmit) rather than holding it.
  if (moderateText(data.message).action === "block") {
    throw new HttpsError(
      "invalid-argument",
      "This response can't be posted. Please revise the wording."
    );
  }
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, hostUserId, "setReviewResponse", {
    maxRequests: 30, windowMs: 60 * 1000,
  });

  const reviewRef = db.collection("reviews").doc(data.reviewId);
  const userRef = db.collection("users").doc(hostUserId);
  const deletedUserRef = db.collection("deletedUsers").doc(hostUserId);

  await db.runTransaction(async (tx) => {
    const reviewSnap = await tx.get(reviewRef);
    if (!reviewSnap.exists) {
      throw new HttpsError("not-found", "Review not found.");
    }
    const review = requireDoc<ReviewDocument>(
      reviewSnap,
      "ReviewDocument"
    );
    const organizerId = review.organizerId;
    if (!organizerId) {
      throw new HttpsError(
        "failed-precondition",
        "Review organizer is missing."
      );
    }
    const organizerRef = db.collection("organizers").doc(organizerId);
    const [
      organizerSnap,
      userSnap,
      deletedUserSnap,
    ] = await Promise.all([
      tx.get(organizerRef),
      tx.get(userRef),
      tx.get(deletedUserRef),
    ]);
    assertCanRespondToReview(
      organizerSnap,
      userSnap,
      deletedUserSnap,
      hostUserId
    );
    const hostProfiles = organizerHostProfiles(requireDoc<OrganizerDocument>(
      organizerSnap,
      "OrganizerDocument"
    ));
    const user = requireDoc<UserProfileDocument>(
      userSnap,
      "UserProfileDocument"
    );
    const existingResponse = responseRecord(review.ownerResponse);
    const hostProfile = hostProfiles
      .find((profile) => profile.uid === hostUserId);
    const timestamp = deps.serverTimestamp?.() ??
      admin.firestore.FieldValue.serverTimestamp();

    tx.update(reviewRef, {
      ownerResponse: {
        hostUserId,
        hostName: hostProfile?.displayName ?? publicDisplayName(user),
        hostAvatarUrl: hostProfile?.avatarUrl ?? publicAvatarUrl(user),
        message: data.message,
        createdAt: existingResponse?.createdAt ?? timestamp,
        updatedAt: timestamp,
      },
    });
  });

  return {updated: true};
}

function normalizeCreateEventReviewPayload(data: unknown): unknown {
  return normalizePayloadStrings(data, {
    stringFields: ["organizerId", "eventId", "comment"],
  });
}

function normalizeCreatePublicOrganizerReviewPayload(data: unknown): unknown {
  return normalizePayloadStrings(data, {
    stringFields: [
      "organizerId",
      "comment",
      "reviewerName",
      "submittedFromPath",
    ],
  });
}

function normalizeUpdateEventReviewPayload(data: unknown): unknown {
  return normalizePayloadStrings(data, {
    stringFields: ["reviewId", "comment"],
  });
}

function normalizeSetReviewResponsePayload(data: unknown): unknown {
  return normalizePayloadStrings(data, {
    stringFields: ["reviewId", "message"],
  });
}

function assertCanWriteReview(
  eventSnap: FirebaseFirestore.DocumentSnapshot,
  userSnap: FirebaseFirestore.DocumentSnapshot,
  deletedUserSnap: FirebaseFirestore.DocumentSnapshot,
  participationSnap: FirebaseFirestore.DocumentSnapshot,
  organizerId: string
) {
  if (deletedUserSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "This account cannot write reviews."
    );
  }
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }

  const event = requireDoc<EventDocument>(

    eventSnap,

    "EventDocument"

  );
  if (event.organizerId !== organizerId) {
    throw new HttpsError(
      "failed-precondition",
      "This review does not match the organizer."
    );
  }
  if (!participationSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "Only attended attendees can review an event."
    );
  }

  const participation = requireDoc<EventParticipationDocument>(
    participationSnap,
    "EventParticipationDocument"
  );
  if (participation.status !== "attended") {
    throw new HttpsError(
      "failed-precondition",
      "Only attended attendees can review an event."
    );
  }
}

function eventOrganizerId(
  eventSnap: FirebaseFirestore.DocumentSnapshot
): string {
  const event = eventSnap.data() as {organizerId?: unknown} | undefined;
  if (typeof event?.organizerId === "string") return event.organizerId;
  throw new HttpsError("failed-precondition", "Event organizer is missing.");
}

function assertCanReceivePublicReview(
  organizerSnap: FirebaseFirestore.DocumentSnapshot,
  submittedFromPath: string | null
) {
  if (!organizerSnap.exists) {
    throw new HttpsError("not-found", "Organizer profile not found.");
  }
  const organizer = requireDoc<OrganizerDocument>(
    organizerSnap,
    "OrganizerDocument"
  );
  assertPublicOrganizerPageEligible(organizer, {pagePath: submittedFromPath});
}

function assertOwnsReview(
  reviewSnap: FirebaseFirestore.DocumentSnapshot,
  reviewerUserId: string
) {
  if (!reviewSnap.exists) {
    throw new HttpsError("not-found", "Review not found.");
  }
  const review = requireDoc<ReviewDocument>(
    reviewSnap,
    "ReviewDocument"
  );
  if (review.reviewerUserId !== reviewerUserId) {
    throw new HttpsError(
      "permission-denied",
      "Only the review author can change this review."
    );
  }
}

function assertCanRespondToReview(
  organizerSnap: FirebaseFirestore.DocumentSnapshot,
  userSnap: FirebaseFirestore.DocumentSnapshot,
  deletedUserSnap: FirebaseFirestore.DocumentSnapshot,
  hostUserId: string,
) {
  if (deletedUserSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "This account cannot respond to reviews."
    );
  }
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }
  if (!organizerSnap.exists) {
    throw new HttpsError("not-found", "Organizer not found.");
  }
  const canRespond = isOrganizerManager(
    requireDoc<OrganizerDocument>(organizerSnap, "OrganizerDocument"),
    hostUserId
  );
  if (!canRespond) {
    throw new HttpsError(
      "permission-denied",
      "Only the organizer team can respond to this review."
    );
  }
}

function responseRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function eventReviewId(eventId: string, reviewerUserId: string): string {
  return `${eventId}~${reviewerUserId}`;
}

function publicReviewerName(data: {
  isAnonymous: boolean;
  reviewerName: string;
}) {
  if (data.isAnonymous) return "Anonymous reviewer";
  const name = data.reviewerName.trim();
  if (!name) {
    throw new HttpsError(
      "invalid-argument",
      "Name is required unless the review is anonymous."
    );
  }
  return name;
}

function requesterIp(request: CallableRequest<unknown>): string {
  const rawRequest = request.rawRequest as
    | {ip?: string; headers?: Record<string, string | string[] | undefined>}
    | undefined;
  const forwarded = rawRequest?.headers?.["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return rawRequest?.ip ?? forwardedIp?.split(",")[0]?.trim() ?? "unknown";
}

function toPublicOrganizerReview(
  id: string,
  review: ReviewDocument
): PublicOrganizerReview | null {
  if (review.moderationStatus && review.moderationStatus !== "published") {
    return null;
  }
  const createdAt = timestampIso(review.createdAt);
  if (!createdAt) return null;
  const ownerResponse = review.ownerResponse;
  return {
    id,
    reviewerName: review.reviewerName,
    rating: review.rating,
    comment: review.comment,
    createdAt,
    verificationStatus:
      review.verificationStatus ?? (review.eventId ? "verified" : "unverified"),
    source: review.source ?? (review.eventId ? "catchEvent" : "publicListing"),
    moderationStatus: "published",
    isAnonymous: review.isAnonymous ?? false,
    ownerResponse: ownerResponse ? {
      hostName: ownerResponse.hostName,
      hostAvatarUrl: ownerResponse.hostAvatarUrl,
      message: ownerResponse.message,
      updatedAt: timestampIso(ownerResponse.updatedAt) ?? createdAt,
    } : null,
  };
}

function timestampIso(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as {toDate?: unknown}).toDate === "function"
  ) {
    return (value as {toDate: () => Date}).toDate().toISOString();
  }
  if (
    value &&
    typeof value === "object" &&
    typeof (value as {_seconds?: unknown})._seconds === "number"
  ) {
    return new Date((value as {_seconds: number})._seconds * 1000)
      .toISOString();
  }
  return null;
}

function timestampMillis(value: unknown): number {
  const iso = timestampIso(value);
  return iso ? Date.parse(iso) : 0;
}

export const createEventReview = onCall(
  appCheckCallableOptions,
  (request) => createEventReviewHandler(request)
);

export const createPublicOrganizerReview = onCall(
  appCheckCallableOptions,
  (request) => createPublicOrganizerReviewHandler(request)
);

export const listPublicOrganizerReviews = onCall(
  appCheckCallableOptions,
  (request) => listPublicOrganizerReviewsHandler(request)
);

export const updateEventReview = onCall(
  appCheckCallableOptions,
  (request) => updateEventReviewHandler(request)
);

export const deleteEventReview = onCall(
  appCheckCallableOptions,
  (request) => deleteEventReviewHandler(request)
);

export const setReviewResponse = onCall(
  appCheckCallableOptions,
  (request) => setReviewResponseHandler(request)
);
