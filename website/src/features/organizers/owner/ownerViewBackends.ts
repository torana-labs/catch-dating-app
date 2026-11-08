import {ownerViewCopy} from "../../../content/ownerView";
import {listPublicOrganizerReviews, watchWebsiteAccountAuthState} from "../../../firebase";
import {
  isOwnerViewData,
  type OwnerPageCommand,
  type OwnerPageResult,
  type OwnerReview,
  type OwnerTrackingSettings,
  type OwnerViewData,
} from "./ownerViewTypes";

/**
 * Everything the owner view reads and writes. Production calls the existing
 * organiser commands (updateOrganizer for about, setReviewResponse for
 * replies, get/setOrganizerTrackingSettings for Pixel and GA4) and the two
 * owner-view callables; stories pass fakes.
 */
export interface OwnerViewBackends {
  watchUser: (callback: (uid: string | null) => void) => () => void;
  getView: (organizerId: string) => Promise<OwnerViewData>;
  manage: (command: OwnerPageCommand) => Promise<OwnerPageResult>;
  saveAbout: (organizerId: string, description: string) => Promise<void>;
  listReviews: (organizerId: string) => Promise<OwnerReview[]>;
  replyToReview: (reviewId: string, message: string) => Promise<void>;
  getTracking: (organizerId: string) => Promise<OwnerTrackingSettings>;
  saveTracking: (input: {organizerId: string; expectedRevision: number; metaPixelId: string | null;
    googleMeasurementId: string | null}) => Promise<OwnerTrackingSettings>;
}

/**
 * Calls a callable on the app the website's Firebase runtime already set up
 * (with App Check). The owner view only calls after a signed-in user is
 * known, and that sign-in is what starts the runtime.
 */
async function invoke<Response>(name: string, payload: unknown): Promise<Response> {
  const [{getApp}, {getFunctions, httpsCallable}] = await Promise.all([
    import("firebase/app"), import("firebase/functions"),
  ]);
  const callable = httpsCallable<unknown, Response>(getFunctions(getApp(), "asia-south1"), name);
  return (await callable(payload)).data;
}

function tracking(raw: OwnerTrackingSettings): OwnerTrackingSettings {
  return {organizerId: raw.organizerId, revision: raw.revision, metaPixelId: raw.metaPixelId ?? null,
    googleMeasurementId: raw.googleMeasurementId ?? null, canEdit: raw.canEdit === true};
}

export const ownerViewBackends: OwnerViewBackends = {
  watchUser: (callback) => watchWebsiteAccountAuthState((user) => callback(user?.uid ?? null)),
  getView: async (organizerId) => {
    const data = await invoke<unknown>("getOrganizerOwnerView", {organizerId});
    if (!isOwnerViewData(data)) throw new TypeError(ownerViewCopy.bar.failed);
    return data;
  },
  manage: (command) => invoke<OwnerPageResult>("manageOrganizerOwnerPage", command),
  saveAbout: async (organizerId, description) => {
    await invoke("updateOrganizer", {organizerId, fields: {description}});
  },
  listReviews: async (organizerId) => (await listPublicOrganizerReviews({organizerId})).reviews.map((review) => ({
    id: review.id, reviewerName: review.reviewerName, rating: review.rating, comment: review.comment,
    createdAt: review.createdAt, verificationStatus: review.verificationStatus,
    ownerResponse: review.ownerResponse ? {message: review.ownerResponse.message, hostName: review.ownerResponse.hostName} : null,
  })),
  replyToReview: async (reviewId, message) => {
    await invoke("setReviewResponse", {reviewId, message});
  },
  getTracking: async (organizerId) => tracking(await invoke("getOrganizerTrackingSettings", {organizerId})),
  saveTracking: async (input) => tracking(await invoke("setOrganizerTrackingSettings", {...input, enabled: false})),
};
