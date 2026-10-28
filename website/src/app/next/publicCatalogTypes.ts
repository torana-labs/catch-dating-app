import type {EventPageData} from "../../features/events/eventPageModel";
import type {OrganizerPageRecord} from "../../features/organizers/organizerPage";
import type {HostListing} from "../../features/organizers/types";
/**
 * An organiser route also carries its `organizerPublicPage` read model, when it
 * has one; an event route carries its page's read model (CAT-252) and, while
 * maps are on, its map (CAT-272).
 */
export interface PublicCatalog {
  listings: HostListing[]; readAt: number; organizerPage?: OrganizerPageRecord; eventPage?: EventPageData; eventMap?: string;
}
