import {ownerViewCopy} from "../../../content/ownerView";
import {listPublicOrganizerReviews, watchWebsiteAccountAuthState} from "../../../firebase";
import {
  isOwnerViewData,
  type OwnerPageCommand,
  type OwnerPageResult,
  type OwnerReview,
  ownerTrackingSettings,
  type OwnerTrackingSettings,
  type OwnerViewData,
} from "./ownerViewTypes";

/**
 * Everything the owner view reads and writes. Production calls the existing
 * organiser commands (updateOrganizer for about, setReviewResponse for
 * replies, setOrganizerTrackingSettings for Pixel and GA4) and the two
 * owner-view callables. Tracking settings are read from the Firestore read
 * models the Host app listens to. Stories pass fakes.
 */
export interface OwnerViewBackends {
  watchUser: (callback: (uid: string | null) => void) => () => void;
  getView: (organizerId: string) => Promise<OwnerViewData>;
  manage: (command: OwnerPageCommand) => Promise<OwnerPageResult>;
  saveAbout: (organizerId: string, description: string) => Promise<void>;
  listReviews: (organizerId: string) => Promise<OwnerReview[]>;
  replyToReview: (reviewId: string, message: string) => Promise<void>;
  /** Listens to the tracking settings until the returned stop runs. */
  watchTracking: (organizerId: string, onValue: (settings: OwnerTrackingSettings) => void,
    onError: (error: Error) => void) => Promise<() => void>;
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
  watchTracking: async (organizerId, onValue, onError) => {
    const {watchOrganizerTrackingSettings} = await import("../../../firebaseReadModels");
    return watchOrganizerTrackingSettings(organizerId, (row) => onValue(ownerTrackingSettings(row)), onError);
  },
  saveTracking: async (input) => ownerTrackingSettings(await invoke("setOrganizerTrackingSettings", {...input, enabled: false})),
};
