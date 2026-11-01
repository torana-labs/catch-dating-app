import {CatchField} from "@catch/web-ui";
import {websiteCopy} from "@content/generated";
import {websiteTemplates} from "@content/templates";
import {trackMarketingEvent} from "../../../analytics";
import {
  ActionGroup,
  ButtonLink,
  ClaimFlowHero,
  ClaimFlowPanel,
  ClaimFlowStage,
  ClaimListingResults,
  ClaimResultButton,
  EmptyState,
  ProcessStatusPanel,
  type ProcessStatusAction,
  SelectedListingCard,
  TextActionButton,
} from "../../../shared/ui/primitives";
import {ActivityMark, StatusBadge} from "../../organizers/OrganizerIdentity";
import {activityForListing} from "../../organizers/publicDiscovery";
import {organizerPolicyForListing} from "../../organizers/organizerPolicy";
import type {HostListing} from "../../organizers/types";
import type {ClaimUrlState} from "../claimRouting";
import {claimWhileYouWaitItems} from "../claimModel";
import type {ClaimFlowController} from "../useClaimFlowController";

function trackProcessStatusAction(action: ProcessStatusAction) {
  trackMarketingEvent("cta_click", {
    cta_href: action.href,
    cta_label: action.trackingLabel ?? "process_status_action",
    page_path: `${window.location.pathname}${window.location.search}`,
  });
}

export function ClaimHeroSection({listing}: {listing: HostListing | null}) {
  const policy = listing ? organizerPolicyForListing(listing) : null;
  return (
    <ClaimFlowHero
      eyebrow={websiteCopy["claimpagesections_0049"]}
      title={websiteCopy["claimpagesections_0092"]}
      body={websiteCopy["claimpagesections_0056"]}
      summaryTitle={listing?.name ?? "No listing selected"}
      summaryBody={listing ?
        `${listing.category} · ${listing.city} · ${policy?.badge.label}` :
        "Search the source-backed organizer directory first."}
    />
  );
}

/**
 * Finding the page to claim, for a visitor who arrived without one. Once a
 * page is chosen it collapses to that page, and the claim panel takes over.
 */
export function ClaimSearchSection({controller}: {controller: ClaimFlowController}) {
  const {clearListing, listing, query, searchResults, selectListing, setQuery} = controller;
  if (listing) {
    return (
      <SelectedListingCard>
        <ActivityMark listing={listing} size="sm" />
        <span>
          <strong>{listing.name}</strong>
          <small>{listing.category} · {listing.city}</small>
        </span>
        <TextActionButton onClick={clearListing}>{websiteCopy["claimpagesections_0043"]}</TextActionButton>
      </SelectedListingCard>
    );
  }
  return (
    <ClaimFlowPanel aria-live="polite">
      <ClaimFlowStage>
        <CatchField
          recipe="input"
          id="claim-search"
          title={websiteCopy["claimpagesections_0085"]}
          value={query}
          inputHint={websiteCopy["claimpagesections_0071"]}
          onChanged={(value) => setQuery(value)}
        />
        <ClaimListingResults>
          {searchResults.map((item) => (
            <ClaimResultButton
              activityToken={activityForListing(item).token}
              key={item.id}
              onClick={() => selectListing(item)}
              selected={false}
            >
              <ActivityMark listing={item} size="sm" />
              <span>
                <strong>{item.name}</strong>
                <small>
                  {item.category} · {item.city} · {item.sources.length}{" "}
                  {websiteCopy["claimpagesections_0088"]}
                </small>
              </span>
              <StatusBadge listing={item} compact />
            </ClaimResultButton>
          ))}
          {!searchResults.length ? (
            <EmptyState variant="claim">
              <strong>{websiteCopy["claimpagesections_0067"]}</strong>
              <p>{websiteCopy["claimpagesections_0089"]}</p>
              <ButtonLink variant="ghost" href="/host/apply/">{websiteCopy["claimpagesections_0090"]}</ButtonLink>
            </EmptyState>
          ) : null}
        </ClaimListingResults>
        <ActionGroup>
          <ButtonLink variant="ghost" href="/host/apply/">{websiteCopy["claimpagesections_0064"]}</ButtonLink>
        </ActionGroup>
      </ClaimFlowStage>
    </ClaimFlowPanel>
  );
}

export function ClaimUrlStateSection({
  state,
  listing,
  lookup,
  requestId,
}: {
  state: ClaimUrlState;
  listing: HostListing | null;
  lookup: string | null;
  requestId: string | null;
}) {
  if (state === "alreadyClaimed" && listing) {
    return (
      <ProcessStatusPanel
        mark="C"
        eyebrow={websiteCopy["claimpagesections_0032"]}
        title={websiteTemplates.listingHasOwner(listing.name)}
        body={websiteCopy["claimpagesections_0040"]}
        items={[
          {
            title: websiteCopy["claimpagesections_0072"],
            body: websiteCopy["claimpagesections_0053"],
          },
          {
            title: websiteCopy["claimpagesections_0075"],
            body: websiteCopy["claimpagesections_0063"],
          },
          {
            title: websiteCopy["claimpagesections_0065"],
            body: websiteCopy["claimpagesections_0086"],
          },
        ]}
        onActionClick={trackProcessStatusAction}
        actions={[
          {href: listing.path, label: websiteCopy["claimpagesections_0099"], variant: "primary"},
          {href: "/claim/", label: websiteCopy["claimpagesections_0084"], variant: "secondary"},
          {href: "/host/apply/", label: websiteCopy["claimpagesections_0090"], variant: "secondary"},
        ]}
      />
    );
  }

  if (state === "claimUnavailable" && listing) {
    return (
      <ProcessStatusPanel
        mark="!"
        eyebrow={websiteCopy["claimpagesections_0048"]}
        title={websiteTemplates.listingClaimUnavailable(listing.name)}
        body={websiteCopy["claimpagesections_0041"]}
        items={[
          {
            title: websiteCopy["claimpagesections_0094"],
            body: websiteCopy["claimpagesections_0100"],
          },
          {
            title: websiteCopy["claimpagesections_0066"],
            body: websiteCopy["claimpagesections_0051"],
          },
          {
            title: websiteCopy["claimpagesections_0058"],
            body: websiteCopy["claimpagesections_0097"],
          },
        ]}
        onActionClick={trackProcessStatusAction}
        actions={[
          {href: listing.path, label: websiteCopy["claimpagesections_0099"], variant: "primary"},
          {href: "/claim/", label: websiteCopy["claimpagesections_0084"], variant: "secondary"},
          {href: "/host/apply/", label: websiteCopy["claimpagesections_0034"], variant: "secondary"},
        ]}
      />
    );
  }

  if (state === "pendingClaim") {
    return (
      <ProcessStatusPanel
        mark="..."
        eyebrow={websiteCopy["claimpagesections_0045"]}
        title={listing ? `${listing.name} is already in owner review.` : "This claim is in owner review."}
        body={requestId ?
          `Request ${requestId} is pending. Catch will verify ownership before attaching host tools.` :
          "Catch will verify ownership before attaching host tools, review responses, event publishing, or analytics."}
        items={claimWhileYouWaitItems(listing)}
        onActionClick={trackProcessStatusAction}
        actions={[
          ...(listing ? [{href: listing.path, label: websiteCopy["claimpagesections_0099"], variant: "secondary" as const}] : []),
          {href: "/host/", label: websiteCopy["claimpagesections_0055"], variant: "primary"},
          {href: "/claim/", label: websiteCopy["claimpagesections_0082"], variant: "secondary"},
        ]}
      />
    );
  }

  return (
    <ProcessStatusPanel
      mark="?"
      eyebrow={websiteCopy["claimpagesections_0062"]}
      title={lookup ? `No claimable page matched "${lookup}".` : "No claimable page matched this link."}
      body={websiteCopy["claimpagesections_0093"]}
      items={[
        {
          title: websiteCopy["claimpagesections_0044"],
          body: websiteCopy["claimpagesections_0083"],
        },
        {
          title: websiteCopy["claimpagesections_0091"],
          body: websiteCopy["claimpagesections_0060"],
        },
        {
          title: websiteCopy["claimpagesections_0036"],
          body: websiteCopy["claimpagesections_0042"],
        },
      ]}
      onActionClick={trackProcessStatusAction}
      actions={[
        {href: "/claim/", label: websiteCopy["claimpagesections_0084"], variant: "primary"},
        {href: "/organizers/", label: websiteCopy["claimpagesections_0070"], variant: "secondary"},
        {href: "/host/apply/", label: websiteCopy["claimpagesections_0090"], variant: "secondary"},
      ]}
    />
  );
}
