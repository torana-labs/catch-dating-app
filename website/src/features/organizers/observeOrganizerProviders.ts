import {currentConsentVersion, organizerAdPage} from "../../analytics/catchMeasurement";
import {getMarketingConsent, marketingConsentChangedEvent, setOrganizerAdDestinations, trackOrganizerPageViewed}
  from "../../analytics";
import {organizerPolicyForListing} from "./organizerPolicy";
import {isPublicApiEnabled} from "./selectors";
import {readOrganizerProviderSettings} from "./trackingProvidersRepository";
import type {HostListing} from "./types";

/** The public tracking projection for one organiser page or event page. */
export interface OrganizerTrackingSettings {
  organizerId: string;
  eventId: string | null;
  enabled: boolean;
  metaPixelId: string | null;
  googleMeasurementId: string | null;
}

interface ProviderObserverDependencies {
  readSettings?: (payload: {organizerId: string; eventId: string | null}) => Promise<OrganizerTrackingSettings>;
}

const marketingNow = () => {
  const consent = getMarketingConsent();
  return consent?.version === currentConsentVersion && consent.marketing === true;
};

/**
 * Organiser-owned tags for a public organiser page or event page (#2063,
 * Option A). The organiser's IDs go into the first-party transport's separate
 * organiser destination set (`adTags.setOrganizer`); there is no other loader.
 * Settings are read only under a current marketing choice, and only a set the
 * public projection published (`enabled: true`) is used: under publication
 * policy v1 there is none, so nothing loads. A fresh epoch fences every async
 * response after navigation or a consent change; leaving the page clears the
 * set, and the transport itself stops on any ineligible route.
 */
export function observeOrganizerProviders(
  listing: HostListing,
  eventId: string | null = null,
  dependencies: ProviderObserverDependencies = {}
): () => void {
  const publicPath = window.location.pathname;
  const eligible = isPublicApiEnabled(listing) && organizerPolicyForListing(listing).isPubliclyReadable &&
    organizerAdPage(publicPath, window.location.search, window.location.hash) !== null;
  let epoch = 0;
  let stopped = false;
  const refresh = async () => {
    const generation = ++epoch;
    setOrganizerAdDestinations(null);
    if (stopped || !eligible || window.location.pathname !== publicPath || !marketingNow()) return;
    try {
      const settings = await (dependencies.readSettings ?? readOrganizerProviderSettings)({organizerId: listing.id, eventId});
      if (stopped || generation !== epoch || window.location.pathname !== publicPath || !marketingNow()) return;
      if (settings.enabled !== true || settings.organizerId !== listing.id || settings.eventId !== eventId) return;
      setOrganizerAdDestinations({organizerId: settings.organizerId, eventId: settings.eventId,
        metaPixelId: settings.metaPixelId, googleMeasurementId: settings.googleMeasurementId});
      trackOrganizerPageViewed();
    } catch { /* Provider settings are optional; a denied or missing owner is silent. */ }
  };
  void refresh();
  window.addEventListener(marketingConsentChangedEvent, refresh);
  return () => {
    stopped = true;
    ++epoch;
    setOrganizerAdDestinations(null);
    window.removeEventListener(marketingConsentChangedEvent, refresh);
  };
}
