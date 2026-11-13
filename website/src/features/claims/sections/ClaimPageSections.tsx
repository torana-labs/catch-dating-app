import {CatchAvatar, CatchBadge, CatchButton, CatchField, CatchIndexRow, CatchSection, CatchStack, CatchText} from "@catch/web-ui";
import {claimFlowCopy as flow} from "@content/claimFlow";
import {websiteCopy} from "@content/generated";
import {interpolateContent as fill} from "@content/interpolate";
import {websiteTemplates} from "@content/templates";
import {trackMarketingEvent} from "../../../analytics";
import {organizerPolicyForListing} from "../../organizers/organizerPolicy";
import type {HostListing} from "../../organizers/types";
import type {ClaimUrlState} from "../claimRouting";
import {claimWhileYouWaitItems} from "../claimModel";
import type {ClaimFlowController} from "../useClaimFlowController";
import {ClaimHead, ClaimPageCard} from "./ClaimParts";

interface StatusAction {
  href: string;
  label: string;
  trackingLabel?: string;
}

function trackStatusAction(action: StatusAction) {
  trackMarketingEvent("cta_click", {
    cta_href: action.href,
    cta_label: action.trackingLabel ?? "process_status_action",
    page_path: `${window.location.pathname}${window.location.search}`,
  });
}

/**
 * The claim page's opening when no step has begun: the board's kicker over
 * the page title. A link that named its listing asks whether it is yours.
 */
export function ClaimHeroSection({listing}: {listing: HostListing | null}) {
  return listing ?
    <ClaimHead body={flow.signIn.body} id="claim-title" title={fill(flow.signIn.title, {name: listing.name})} /> :
    <ClaimHead body={websiteCopy["claimpagesections_0056"]} id="claim-title" title={websiteCopy["claimpagesections_0092"]} />;
}

/**
 * Finding the page to claim, for a visitor who arrived without one. Once a
 * page is chosen it collapses to that page's card, and the claim takes over.
 */
export function ClaimSearchSection({controller}: {controller: ClaimFlowController}) {
  const {clearListing, listing, query, searchResults, selectListing, setQuery} = controller;
  if (listing) return <ClaimPageCard listing={listing} onChange={clearListing} />;
  return (
    <CatchStack aria-live="polite" gap={16}>
      <CatchField
        id="claim-search"
        inputHint={websiteCopy["claimpagesections_0071"]}
        onChanged={(value) => setQuery(value)}
        recipe="input"
        title={websiteCopy["claimpagesections_0085"]}
        value={query}
      />
      <CatchSection
        empty={
          <CatchStack gap={8}>
            <CatchText variant="title-row">{websiteCopy["claimpagesections_0067"]}</CatchText>
            <CatchText tone="secondary" variant="body-small">{websiteCopy["claimpagesections_0089"]}</CatchText>
          </CatchStack>
        }
      >
        {searchResults.map((item) => (
          <CatchIndexRow
            chevron
            density="regular"
            key={item.id}
            leading={<CatchAvatar name={item.name} size={40} />}
            onTap={() => selectListing(item)}
            status={<CatchBadge label={organizerPolicyForListing(item).badge.label} tone="neutral" />}
            subtitle={`${item.category} · ${item.city} · ${item.sources.length} ${websiteCopy["claimpagesections_0088"]}`}
            title={item.name}
          />
        ))}
      </CatchSection>
      <CatchStack align="start">
        <CatchButton href="/host/#start" label={searchResults.length ? websiteCopy["claimpagesections_0064"] : websiteCopy["claimpagesections_0090"]}
          size="sm" variant="quiet" />
      </CatchStack>
    </CatchStack>
  );
}

/** A link state the claim cannot continue from: why, what still holds, and where to go instead. */
function StatusState({kicker, title, body, items, actions}: {
  kicker: string;
  title: string;
  body: string;
  items: readonly {title: string; body: string}[];
  actions: readonly StatusAction[];
}) {
  return (
    <CatchStack gap={24}>
      <ClaimHead body={body} id="claim-title" kicker={kicker} kickerTone="secondary" title={title} />
      <CatchSection>
        {items.map((item) => <CatchIndexRow density="regular" key={item.title} subtitle={item.body} title={item.title} wrap />)}
      </CatchSection>
      <CatchStack direction="row" gap={8} wrap>
        {actions.map((action, index) => (
          <CatchButton href={action.href} key={action.href} label={action.label} onPressed={() => trackStatusAction(action)}
            variant={index === 0 ? "primary" : "secondary"} />
        ))}
      </CatchStack>
    </CatchStack>
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
      <StatusState
        actions={[
          {href: listing.path, label: websiteCopy["claimpagesections_0099"]},
          {href: "/claim/", label: websiteCopy["claimpagesections_0084"]},
          {href: "/host/#start", label: websiteCopy["claimpagesections_0090"]},
        ]}
        body={websiteCopy["claimpagesections_0040"]}
        items={[
          {title: websiteCopy["claimpagesections_0072"], body: websiteCopy["claimpagesections_0053"]},
          {title: websiteCopy["claimpagesections_0075"], body: websiteCopy["claimpagesections_0063"]},
          {title: websiteCopy["claimpagesections_0065"], body: websiteCopy["claimpagesections_0086"]},
        ]}
        kicker={websiteCopy["claimpagesections_0032"]}
        title={websiteTemplates.listingHasOwner(listing.name)}
      />
    );
  }

  if (state === "claimUnavailable" && listing) {
    return (
      <StatusState
        actions={[
          {href: listing.path, label: websiteCopy["claimpagesections_0099"]},
          {href: "/claim/", label: websiteCopy["claimpagesections_0084"]},
          {href: "/host/#start", label: websiteCopy["claimpagesections_0034"]},
        ]}
        body={websiteCopy["claimpagesections_0041"]}
        items={[
          {title: websiteCopy["claimpagesections_0094"], body: websiteCopy["claimpagesections_0100"]},
          {title: websiteCopy["claimpagesections_0066"], body: websiteCopy["claimpagesections_0051"]},
          {title: websiteCopy["claimpagesections_0058"], body: websiteCopy["claimpagesections_0097"]},
        ]}
        kicker={websiteCopy["claimpagesections_0048"]}
        title={websiteTemplates.listingClaimUnavailable(listing.name)}
      />
    );
  }

  if (state === "pendingClaim") {
    return (
      <StatusState
        actions={[
          {href: "/host/", label: websiteCopy["claimpagesections_0055"]},
          ...(listing ? [{href: listing.path, label: websiteCopy["claimpagesections_0099"]}] : []),
          {href: "/claim/", label: websiteCopy["claimpagesections_0082"]},
        ]}
        body={requestId ?
          `Request ${requestId} is pending. Catch will verify ownership before attaching host tools.` :
          "Catch will verify ownership before attaching host tools, review responses, event publishing, or analytics."}
        items={claimWhileYouWaitItems(listing)}
        kicker={websiteCopy["claimpagesections_0045"]}
        title={listing ? `${listing.name} is already in owner review.` : "This claim is in owner review."}
      />
    );
  }

  return (
    <StatusState
      actions={[
        {href: "/claim/", label: websiteCopy["claimpagesections_0084"]},
        {href: "/organizers/", label: websiteCopy["claimpagesections_0070"]},
        {href: "/host/#start", label: websiteCopy["claimpagesections_0090"]},
      ]}
      body={websiteCopy["claimpagesections_0093"]}
      items={[
        {title: websiteCopy["claimpagesections_0044"], body: websiteCopy["claimpagesections_0083"]},
        {title: websiteCopy["claimpagesections_0091"], body: websiteCopy["claimpagesections_0060"]},
        {title: websiteCopy["claimpagesections_0036"], body: websiteCopy["claimpagesections_0042"]},
      ]}
      kicker={websiteCopy["claimpagesections_0062"]}
      title={lookup ? `No claimable page matched "${lookup}".` : "No claimable page matched this link."}
    />
  );
}
