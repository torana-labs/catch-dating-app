import type {EventPageData} from "../../features/events/eventPageModel";
import type {HostListing} from "../../features/organizers/types";
/** An event route also carries its page's read model (CAT-252). */
export interface PublicCatalog {listings: HostListing[]; readAt: number; eventPage?: EventPageData}
