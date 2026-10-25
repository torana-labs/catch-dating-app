import {ClubCover} from "@catch/web-ui";
import {organiserProfileCopy} from "../../../content/organiserProfile";
import {ProfileContext, ProfileNavigation} from "../../../shared/ui/primitives/organiserProfile";
import {accountCopy} from "../../../content/account";
import {organizerPresenceCopy} from "@content/organizerPresence";
import {organizerListingCopy} from "@content/organizer";
import {
  ActivityMark,
  StatusBadge,
} from "../OrganizerIdentity";
import {activityForListing, activityKindForListing, coverPhotoForListing} from "../publicDiscovery";
import {organizerPolicyForListing} from "../organizerPolicy";
import type {HostListing} from "../types";
import {
  Button,
  ButtonLink,
  ListingPolaroid,
  ListingRailActions,
  ListingRailIdentity,
  ListingStatusLedger,
  PlainLink,
  ListingSection,
} from "../../../shared/ui/primitives";
import {trackOrganizerAnalytics} from "../analytics";
import {trackCtaClick} from "../../marketing/tracking";

export function ListingHeroSection({listing}: {listing: HostListing}) {
  const policy = organizerPolicyForListing(listing);
  const location = listingLocation(listing);

  return (
    <section aria-labelledby="listing-profile-title">
      <ListingPolaroid
        caption={location}
        fallback={<ClubCover photoUrl={coverPhotoForListing(listing)} name={listing.name} city={listing.city}
          activityKind={activityKindForListing(listing)} />}
        media={null}
        provenance={policy.badge.label}
        title={listing.name}
        titleId="listing-profile-title"
      />
      <p>{listing.headline}</p>
      <ProfileNavigation aria-label={organiserProfileCopy.nav.label}>
        <PlainLink href="#events">{organiserProfileCopy.nav.events}</PlainLink>
        <PlainLink href="#about">{organiserProfileCopy.nav.about}</PlainLink>
        {policy.isPubliclyReadable ? <PlainLink href="#reviews">{organiserProfileCopy.nav.reviews}</PlainLink> : null}
        <PlainLink href="#profile-information">{organiserProfileCopy.nav.information}</PlainLink>
      </ProfileNavigation>
    </section>
  );
}

export function ListingHeroRailSection({
  canRequestClaim,
  claimHref,
  isFollowing,
  followPending,
  listing,
  onFollowListing,
  onShareListing,
  shareStatus,
}: {
  canRequestClaim?: boolean;
  claimHref: string;
  isAppCreated: boolean;
  isFollowing: boolean;
  followPending?: boolean;
  listing: HostListing;
  onFollowListing: () => void;
  onShareListing: () => void;
  shareStatus: string;
}) {
  const policy = organizerPolicyForListing(listing);
  const resolvedCanRequestClaim = canRequestClaim ?? policy.canRequestClaim;
  const primaryDescription = organiserProfileCopy.followBody;

  return (
    <>
      <ListingRailIdentity
        activity={<ActivityMark listing={listing} size="lg" />}
        eyebrow={organizerListingCopy.detail.organizerEyebrow}
        location={listingLocation(listing)}
        name={listing.name}
        status={<StatusBadge listing={listing} />}
      />
      <ListingRailActions description={primaryDescription} shareStatus={shareStatus}>
        <Button type="button" aria-pressed={isFollowing} disabled={followPending} onClick={onFollowListing}>
          {isFollowing ? accountCopy.following : accountCopy.follow}
        </Button>
        <Button variant="ghost" type="button" onClick={onShareListing}>
          {organizerListingCopy.detail.shareAction}
        </Button>
        {listing.sources.length ? (
          <ButtonLink variant="ghost" href="#sources">
            {organizerListingCopy.detail.viewSourcesAction}
          </ButtonLink>
        ) : null}

      </ListingRailActions>
      {resolvedCanRequestClaim ? <ProfileContext>
        <summary>{organiserProfileCopy.ownerQuestion}</summary>
        <p>{organizerPresenceCopy.claimDescription}</p>
        <ButtonLink variant="ghost" href={claimHref} onClick={() => {
          trackCtaClick("listing_claim", claimHref);
          trackOrganizerAnalytics(listing, "claimClick", "organizer_rail");
        }}>{organiserProfileCopy.claim}</ButtonLink>
      </ProfileContext> : null}
    </>
  );
}

function listingLocation(listing: HostListing) {
  return [listing.city, listing.region, listing.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
}

function claimStateLabel(state: ReturnType<typeof organizerPolicyForListing>["claimState"]) {
  switch (state) {
  case "unclaimed": return "Unclaimed";
  case "claimPending": return "Claim in review";
  case "claimed": return "Claimed";
  case "verified": return "Verified";
  case "suppressed": return "Unavailable";
  case "unknown": return "Status unknown";
  }
}

function reviewedLabel(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "Review date unavailable";
  const month = date.toLocaleString("en", {month: "short", timeZone: "UTC"}).toUpperCase();
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${month} '${year} reviewed`;
}

function ownershipLabel(policy: ReturnType<typeof organizerPolicyForListing>) {
  if (policy.isCatchCreated) return "Catch created";
  if (policy.verificationStatus === "ownerVerified") return "Ownership verified";
  if (policy.claimState === "claimPending") return "Ownership in review";
  return "Ownership not verified";
}

export function ListingProfileInformation({listing}: {listing: HostListing}) {
  const policy = organizerPolicyForListing(listing);
  return <ListingSection id="profile-information" aria-label={organiserProfileCopy.nav.information}>
    <ProfileContext>
      <summary>{organiserProfileCopy.information}</summary>
      <p>{organiserProfileCopy.verification}</p>
      {!policy.canRequestClaim && policy.claimRequestReason ? <p>{policy.claimRequestReason}</p> : null}
      <ListingStatusLedger
        items={[
          {
            label: organizerListingCopy.detail.sourceCountLabel,
            value: `${listing.sources.length} ${listing.sources.length === 1 ? "source" : "sources"}`,
          },
          {
            label: organizerListingCopy.detail.claimStateLabel,
            value: claimStateLabel(policy.claimState),
          },
          {
            label: organizerListingCopy.detail.freshnessLabel,
            value: reviewedLabel(listing.lastVerifiedAt),
          },
          {
            label: organizerListingCopy.detail.ownershipLabel,
            value: ownershipLabel(policy),
          },
        ]}
      />
    </ProfileContext>
  </ListingSection>;
}
