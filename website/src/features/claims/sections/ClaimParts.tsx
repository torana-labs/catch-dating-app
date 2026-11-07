import {
  CatchAccordion,
  CatchAvatar,
  CatchBadge,
  CatchButton,
  CatchIcon,
  CatchIndexRow,
  CatchPageBody,
  CatchSection,
  CatchStack,
  CatchSurface,
  CatchText,
  catchFormatOf,
  useCatchPane,
  type CatchFormat,
  type CatchTextTone,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {claimFlowCopy as flow} from "@content/claimFlow";
import {claimGuidance} from "@content/claimGuidance";
import {activityMeta} from "@content/marketing";
import {publicSiteCopy, siteFooterLegalLinks} from "@content/site";
import {slugForTracking, trackSiteCtaClick} from "../../../shared/site/siteTracking";
import {activityForListing} from "../../organizers/publicDiscovery";
import type {HostListing} from "../../organizers/types";

/** The format a listing's page is drawn in: its activity's, else run. */
export function claimFormatForListing(listing: HostListing): CatchFormat {
  const activity = activityForListing(listing);
  const kind = Object.entries(activityMeta).find(([, meta]) => meta === activity)?.[0] ?? "";
  return catchFormatOf(kind) ?? (kind === "racket" ? "courts" : "run");
}

/** A claim page's opening: the coloured kicker over the page title and its lead. */
export function ClaimHead({id, kicker = flow.kicker, kickerTone = "danger", title, body}: {
  id: string; kicker?: string; kickerTone?: CatchTextTone; title: string; body?: string;
}) {
  return (
    <CatchStack gap={8}>
      <CatchText tone={kickerTone} variant="label-kicker">{kicker}</CatchText>
      <CatchText as="h1" id={id} variant="page-title">{title}</CatchText>
      {body ? <CatchText tone="secondary" variant="body">{body}</CatchText> : null}
    </CatchStack>
  );
}

/** The page being claimed, as the boards' page card: avatar, name, meta and its claim badge. */
export function ClaimPageCard({listing, claimed = false, onChange}: {
  listing: HostListing; claimed?: boolean; onChange?: () => void;
}) {
  return (
    <CatchSurface block="tile">
      <CatchStack align="center" direction="row" gap={12}>
        <CatchAvatar name={listing.name} size={40} />
        <CatchStack gap={2}>
          <CatchText variant="title-row">{listing.name}</CatchText>
          <CatchText tone="secondary" variant="body-small">{`${listing.category} · ${listing.city}`}</CatchText>
        </CatchStack>
      </CatchStack>
      <CatchStack align="center" direction="row" gap={8} justify="between">
        <CatchBadge icon={claimed ? <CatchIcon name="verified" size={16} /> : undefined} label={claimed ? flow.card.claimed : flow.card.unclaimed}
          tone={claimed ? "success" : "neutral"} />
        {onChange ? <CatchButton label={flow.card.change} onPressed={onChange} size="sm" variant="quiet" /> : null}
      </CatchStack>
    </CatchSurface>
  );
}

/** The two steps, sign in then prove it, with the current one chosen. */
export function ClaimSteps({current}: {current: number | null}) {
  return (
    <CatchSection>
      {flow.steps.map((step, index) => (
        <CatchIndexRow density="compact" key={step.title} rank={index + 1} selected={index === current} subtitle={step.subtitle} title={step.title} />
      ))}
    </CatchSection>
  );
}

/**
 * The reading layout of the desktop board: the flow in the lane and the page
 * card with the steps beside it. On a phone the panes stack, so the aside's
 * parts move into the lane where each phone board places them.
 */
export function SplitOnly({children}: {children: ReactNode}) {
  return useCatchPane().split ? <>{children}</> : null;
}

export function UnsplitOnly({children}: {children: ReactNode}) {
  return useCatchPane().split ? null : <>{children}</>;
}

/** Help for finding, disputing or starting a page, beside the search and the link states. */
export function ClaimGuidance() {
  return (
    <CatchStack aria-labelledby="claim-guidance-title" as="section" gap={16}>
      <CatchText as="h2" id="claim-guidance-title" variant="section-title">{claimGuidance.title}</CatchText>
      <CatchText tone="secondary" variant="body-small">{claimGuidance.body}</CatchText>
      <CatchAccordion items={claimGuidance.items.map((item) => ({title: item.question, body: item.answer}))} size="md" />
      <CatchStack direction="row" gap={8} wrap>
        <CatchButton href="/help/" label={claimGuidance.help} size="sm" variant="secondary" />
        <CatchButton href="/host/apply/" label={claimGuidance.pilot} size="sm" variant="quiet" />
      </CatchStack>
    </CatchStack>
  );
}

/** The boards' site footer: the wordmark beside the site and legal links, then the operator line. */
export function ClaimSiteFooter() {
  const links = [...publicSiteCopy.nav, ...siteFooterLegalLinks];
  return (
    <CatchPageBody constrainToContentWidth pb="s8" pt="s6">
      <CatchStack as="footer" gap={12}>
        <CatchStack align="center" direction="row" gap={12} justify="between" wrap>
          <CatchText variant="display-xs">{publicSiteCopy.wordmark}</CatchText>
          <CatchStack aria-label={flow.footerLabel} as="nav" direction="row" gap={4} wrap>
            {links.map((link) => (
              <CatchButton href={link.href} key={link.href} label={link.label}
                onPressed={() => trackSiteCtaClick(`footer_${slugForTracking(link.label)}`, link.href)} size="sm" variant="quiet" />
            ))}
          </CatchStack>
        </CatchStack>
        <CatchText tone="secondary" variant="body-meta">{publicSiteCopy.footerOperator}</CatchText>
      </CatchStack>
    </CatchPageBody>
  );
}
