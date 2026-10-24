import {CatchBadge} from "@catch/web-ui";
import {ActivityMark as SharedActivityMark} from "../../shared/ui/primitives";
import {activityForListing} from "./publicDiscovery";
import {organizerPolicyForListing} from "./organizerPolicy";
import type {HostListing} from "./types";

export function ActivityMark({
  listing,
  size = "md",
}: {
  listing: HostListing;
  size?: "sm" | "md" | "lg";
}) {
  return <SharedActivityMark listing={listing} activity={activityForListing(listing)} size={size} />;
}

export function StatusBadge({
  listing,
  compact = false,
}: {
  listing: HostListing;
  compact?: boolean;
}) {
  const {badge} = organizerPolicyForListing(listing);
  return (
    <CatchBadge
      recipe={badge.tone === "verified" ? "solidStatus" : "functional"}
      label={compact ? badge.compactLabel : badge.label}
    />
  );
}
