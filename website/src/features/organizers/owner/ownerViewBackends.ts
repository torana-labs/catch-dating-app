import {ownerViewCopy} from "../../../content/ownerView";
import {
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
import {isOwnerViewRow, ownerViewFromRow} from "./ownerViewModel";

/**
 * Everything the owner view reads and writes. Production calls the existing
 * organiser commands (updateOrganizer for about, setReviewResponse for
 * replies, setOrganizerTrackingSettings for Pixel and GA4) and
 * manageOrganizerOwnerPage, all through the website's Firebase service. The
 * page itself and the tracking settings are read from Firestore read models
 * (hostOrganizerOwnerViews, #2306, and the Host app's tracking settings).
 * Stories pass fakes.
 */
export interface OwnerViewBackends {
  watchUser: (callback: (uid: string | null) => void) => () => void;
  /** Listens to the page as uid sees it until the returned stop runs. */
  watchView: (organizerId: string, uid: string, onValue: (view: OwnerViewData) => void,
    onError: (error: Error) => void) => Promise<() => void>;
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
  watchView: async (organizerId, uid, onValue, onError) => {
    const {watchOrganizerOwnerView} = await import("../../../firebaseReadModels");
    return watchOrganizerOwnerView(organizerId, (row) => {
      const view = isOwnerViewRow(row, organizerId) ? ownerViewFromRow(row, uid, Date.now()) : null;
      if (view && isOwnerViewData(view)) onValue(view);
      else onError(new TypeError(ownerViewCopy.bar.failed));
    }, onError);
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
