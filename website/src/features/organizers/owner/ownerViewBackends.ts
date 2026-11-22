import {ownerViewCopy} from "../../../content/ownerView";
import {
  getOrganizerOwnerView,
  manageOrganizerOwnerPage,
  setOrganizerTrackingSettings,
  setReviewResponse,
  updateOrganizerDescription,
  watchWebsiteAccountAuthState,
} from "../../../firebase";
import {
  isOwnerViewData,
  type OwnerPageCommand,
  type OwnerPageResult,
  ownerTrackingSettings,
  type OwnerTrackingSettings,
  type OwnerViewData,
} from "./ownerViewTypes";

/**
 * Everything the owner view reads and writes. Production calls the existing
 * organiser commands (updateOrganizer for about, setReviewResponse for
 * replies, setOrganizerTrackingSettings for Pixel and GA4) and the two
 * owner-view callables, all through the website's Firebase service. Tracking settings are read from the Firestore read
 * models the Host app listens to. Stories pass fakes.
 */
export interface OwnerViewBackends {
  watchUser: (callback: (uid: string | null) => void) => () => void;
  getView: (organizerId: string) => Promise<OwnerViewData>;
  manage: (command: OwnerPageCommand) => Promise<OwnerPageResult>;
  saveAbout: (organizerId: string, description: string) => Promise<void>;
  replyToReview: (reviewId: string, message: string) => Promise<void>;
  /** Listens to the tracking settings until the returned stop runs. */
  watchTracking: (organizerId: string, onValue: (settings: OwnerTrackingSettings) => void,
    onError: (error: Error) => void) => Promise<() => void>;
  saveTracking: (input: {organizerId: string; expectedRevision: number; metaPixelId: string | null;
    googleMeasurementId: string | null}) => Promise<OwnerTrackingSettings>;
}

export const ownerViewBackends: OwnerViewBackends = {
  watchUser: (callback) => watchWebsiteAccountAuthState((user) => callback(user?.uid ?? null)),
  getView: async (organizerId) => {
    const data: unknown = await getOrganizerOwnerView({organizerId});
    if (!isOwnerViewData(data)) throw new TypeError(ownerViewCopy.bar.failed);
    return data;
  },
  manage: (command) => manageOrganizerOwnerPage(command),
  saveAbout: (organizerId, description) => updateOrganizerDescription(organizerId, description),
  replyToReview: (reviewId, message) => setReviewResponse({reviewId, message}),
  watchTracking: async (organizerId, onValue, onError) => {
    const {watchOrganizerTrackingSettings} = await import("../../../firebaseReadModels");
    return watchOrganizerTrackingSettings(organizerId, (row) => onValue(ownerTrackingSettings(row)), onError);
  },
  saveTracking: async (input) => ownerTrackingSettings(await setOrganizerTrackingSettings({...input, enabled: false})),
};
