import {useLocation} from "react-router";
import type {ListingRequestSubmission} from "../../shared/api/listingRequest";
import {ListingRequestView} from "./sections/ListingRequestSections";
import {useListingRequestController} from "./useListingRequestController";

/**
 * /listings/request/: the structured listing request form (takedown plan,
 * section 7). Organiser and event pages link here with their id, so the
 * target is filled in. Sending posts to /api/listing-request; stories and
 * tests pass their own `submission`.
 */
export function ListingRequestPage({submission}: {submission?: ListingRequestSubmission} = {}) {
  const location = useLocation();
  const controller = useListingRequestController({search: location.search, sourcePage: location.pathname, submission});
  return <ListingRequestView controller={controller} />;
}
