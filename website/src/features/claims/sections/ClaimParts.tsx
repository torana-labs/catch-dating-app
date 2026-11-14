import {
  CatchAccordion,
  CatchAvatar,
  CatchBadge,
  CatchButton,
  CatchIcon,
  CatchIndexRow,
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

/**
 * How claiming works and the questions about it, beside the search and the
 * link states: the three steps as ranked rows, then the questions.
 */
export function ClaimGuidance() {
  return (
    <CatchStack aria-label={claimGuidance.title} as="section" gap={32}>
      <CatchSection title={claimGuidance.title}>
        {claimGuidance.steps.map((step, index) => (
          <CatchIndexRow density="compact" key={step.title} rank={index + 1} subtitle={step.subtitle} title={step.title} wrap />
        ))}
      </CatchSection>
      <CatchSection dividers="none" title={claimGuidance.questionsTitle}>
        <CatchAccordion items={claimGuidance.items.map((item) => ({title: item.question, body: item.answer}))} size="md" />
      </CatchSection>
      <CatchStack align="start">
        <CatchButton href="/help/" label={claimGuidance.help} size="sm" variant="secondary" />
      </CatchStack>
    </CatchStack>
  );
}
