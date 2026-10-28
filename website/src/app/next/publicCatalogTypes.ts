import type {OrganizerPageRecord} from "../../features/organizers/organizerPage";
import type {HostListing} from "../../features/organizers/types";
/** An organiser route also carries its `organizerPublicPage` read model, when it has one. */
export interface PublicCatalog {listings: HostListing[]; readAt: number; organizerPage?: OrganizerPageRecord}
