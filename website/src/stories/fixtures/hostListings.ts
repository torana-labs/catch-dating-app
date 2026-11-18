import hostListingsJson from "../../generated/hostListings.demo.json";
import type {HostListing} from "../../features/organizers/types";
import syntheticHostListingsJson from "./syntheticHostListings.json";

// The fictional unclaimed listing stands in for a page built from public
// sources. Real organisers never enter committed fixtures; they live only in
// the production database.
export const syntheticHostListings = syntheticHostListingsJson as HostListing[];

export const hostListings = [...syntheticHostListings, ...hostListingsJson as HostListing[]];
