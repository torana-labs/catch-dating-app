import type {EventPageData} from "../../features/events/eventPageModel";
import type {HostListing} from "../../features/organizers/types";
/** An event route also carries its page's read model (CAT-252) and, while maps are on, its map (CAT-272). */
export interface PublicCatalog {listings: HostListing[]; readAt: number; eventPage?: EventPageData; eventMap?: string}
