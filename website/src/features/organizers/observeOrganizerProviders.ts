import {catchOrganizerProfilePage, currentConsentVersion, organizerAdPage} from "../../analytics/catchMeasurement";
import {admitCatchOrganizerProfile, getMarketingConsent, marketingConsentChangedEvent, setOrganizerAdDestinations,
  trackOrganizerPageViewed} from "../../analytics";
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
  /** Whether Catch's own tags may cover this organiser profile (organiser page reads only). */
  profileTagsEligible?: boolean;
}

interface ProviderObserverDependencies {
  readSettings?: (payload: {organizerId: string; eventId: string | null}) => Promise<OrganizerTrackingSettings>;
}

const choice = () => {
  const consent = getMarketingConsent();
  if (consent?.version !== currentConsentVersion || consent.analytics !== true) return "none" as const;
  return consent.marketing === true ? "marketing" as const : "analytics" as const;
};

/**
 * Advertising tags on a public organiser page or event page (#2063, Option A),
 * from one read of the public tracking projection:
 *
 * - Catch's own tags cover the organiser profile only when the server
 *   classified it eligible (`profileTagsEligible`), under a current analytics
 *   or marketing choice (`admitCatchOrganizerProfile`). Organiser profiles
 *   are otherwise closed to Catch's tags.
 * - The organiser's own IDs go into the first-party transport's separate
 *   organiser set (`adTags.setOrganizer`) only under a current marketing
 *   choice and only when the projection published them (`enabled: true`):
 *   under publication policy v1 there is none, so nothing loads.
 *
 * A fresh epoch fences every async response after navigation or a consent
 * change; leaving the page clears both, and the transport itself stops on any
 * ineligible route or while a private surface (the owner view) is open.
 */
export function observeOrganizerProviders(
  listing: HostListing,
  eventId: string | null = null,
  dependencies: ProviderObserverDependencies = {}
): () => void {
  const publicPath = window.location.pathname;
  const organizerRoute = organizerAdPage(publicPath, window.location.search, window.location.hash) !== null;
  const profilePath = eventId === null ? catchOrganizerProfilePage(publicPath) : null;
  const listingPublic = isPublicApiEnabled(listing) && organizerPolicyForListing(listing).isPubliclyReadable;
  let epoch = 0;
  let stopped = false;
  const clear = () => {
    setOrganizerAdDestinations(null);
    if (profilePath) admitCatchOrganizerProfile(null);
  };
  const refresh = async () => {
    const generation = ++epoch;
    setOrganizerAdDestinations(null);
    const level = choice();
    if (stopped || !listingPublic || window.location.pathname !== publicPath || level === "none" ||
        (!profilePath && !(organizerRoute && level === "marketing"))) {
      if (profilePath) admitCatchOrganizerProfile(null);
      return;
    }
    try {
      const settings = await (dependencies.readSettings ?? readOrganizerProviderSettings)({organizerId: listing.id, eventId});
      const now = choice();
      if (stopped || generation !== epoch || window.location.pathname !== publicPath || now === "none") return;
      if (settings.organizerId !== listing.id || settings.eventId !== eventId) return;
      if (profilePath) admitCatchOrganizerProfile(settings.profileTagsEligible === true ? profilePath : null);
      if (now !== "marketing" || !organizerRoute || settings.enabled !== true) return;
      setOrganizerAdDestinations({organizerId: settings.organizerId, eventId: settings.eventId,
        metaPixelId: settings.metaPixelId, googleMeasurementId: settings.googleMeasurementId});
      trackOrganizerPageViewed();
    } catch {
      // Provider settings are optional; a denied or missing owner is silent and keeps the profile closed.
      if (profilePath && generation === epoch) admitCatchOrganizerProfile(null);
    }
  };
  void refresh();
  window.addEventListener(marketingConsentChangedEvent, refresh);
  return () => {
    stopped = true;
    ++epoch;
    clear();
    window.removeEventListener(marketingConsentChangedEvent, refresh);
  };
}
