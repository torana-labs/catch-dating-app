import {CatchBadge} from "@catch/web-ui";
import type {FormHTMLAttributes, HTMLAttributes, ReactNode} from "react";
import type {StatStripItem} from "./foundation";
import type {ListingSuccessMetricGridItem} from "./organizer";
import {ButtonLink} from "./actions";
import {EmptyState} from "./feedback";
import {Form} from "./forms";
import {StatStrip, classNames} from "./foundation";
import {SuccessGrid, UiLabel} from "./layout";

export function OrganizerResultCardFooter({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("organizer-result-card__footer", className)}>
      {children}
    </div>
  );
}

export function ClaimFlowMain({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <main {...props} className={classNames("claim-flow", className)}>
      {children}
    </main>
  );
}

export function ClaimFlowHero({
  body,
  className,
  eyebrow,
  reveal = true,
  summaryBody,
  summaryTitle,
  title,
  ...props
}: HTMLAttributes<HTMLElement> & {
  body: ReactNode;
  eyebrow: ReactNode;
  reveal?: boolean;
  summaryBody: ReactNode;
  summaryTitle: ReactNode;
  title: ReactNode;
}) {
  return (
    <section {...props} className={classNames("claim-flow__hero", className)}>
      <div className="claim-flow__intro" data-reveal={reveal || undefined}>
        <span className="ui-label">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
      <div className="claim-flow__summary" data-reveal={reveal || undefined}>
        <strong>{summaryTitle}</strong>
        <span>{summaryBody}</span>
      </div>
    </section>
  );
}

export function ClaimFlowWorkspace({
  children,
  className,
  ...props
}: FormHTMLAttributes<HTMLFormElement> & {
  children: ReactNode;
  pending?: boolean;
}) {
  return (
    <Form {...props} className={classNames("claim-flow__workspace", className)}>
      {children}
    </Form>
  );
}

export function ClaimFlowPanel({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <section {...props} className={classNames("claim-flow__panel", className)}>
      {children}
    </section>
  );
}

export function ClaimFlowStage({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("claim-flow__stage", className)}>
      {children}
    </div>
  );
}

export function ClaimListingResults({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("claim-listing-results", className)}>
      {children}
    </div>
  );
}

export interface OwnerUnlockBoardItem {
  body: ReactNode;
  key?: string;
  title: ReactNode;
}

export function OwnerUnlockBoard({
  className,
  items,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  items: OwnerUnlockBoardItem[];
}) {
  return (
    <div {...props} className={classNames("owner-unlock-board", className)}>
      {items.map((item, index) => (
        <article key={item.key ?? index}>
          <span>{item.title}</span>
          <p>{item.body}</p>
        </article>
      ))}
    </div>
  );
}

export function ListingSuccessMetricGrid({
  className,
  items,
  reveal = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  items: ListingSuccessMetricGridItem[];
  reveal?: boolean;
}) {
  return (
    <SuccessGrid
      {...props}
      className={className}
      reveal={reveal}
      variant="listing"
    >
      {items.map((item, index) => (
        <div key={typeof item.label === "string" ? item.label : index}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </SuccessGrid>
  );
}

export function ClaimBandSection({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <section {...props} className={classNames("claim-band", className)}>
      {children}
    </section>
  );
}

export function ClaimBandGrid({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("claim-band__grid", className)}>
      {children}
    </div>
  );
}

export function ClaimBandRail({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("claim-band__rail", className)}>
      {children}
    </div>
  );
}

export function ClaimRequestPanel({
  children,
  className,
  reveal = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  reveal?: boolean;
}) {
  return (
    <div
      {...props}
      className={classNames("claim-request-panel", className)}
      data-reveal={reveal || undefined}
    >
      {children}
    </div>
  );
}

export function ClaimRequestPanelHeading({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("claim-request-panel__heading", className)}>
      {children}
    </div>
  );
}

export interface PublicReviewCardModel {
  id: string;
  reviewerName: string;
  createdAtLabel: string;
  rating: number;
  comment: string;
  verified: boolean;
  verificationLabel: string;
  sourceLabel: string;
  ownerResponse?: {
    hostName: string;
    message: string;
    updatedAtLabel: string;
  } | null;
}

export function ReviewSignalLane({
  body,
  emptyBody,
  emptyTitle,
  reviews,
  title,
}: {
  body: ReactNode;
  emptyBody: ReactNode;
  emptyTitle: ReactNode;
  reviews: PublicReviewCardModel[];
  title: string;
}) {
  return (
    <section className="review-signal-lane" aria-label={title}>
      <div className="review-signal-lane__head">
        <div>
          <UiLabel>{reviews.length}{" visible"}</UiLabel>
          <h3>{title}</h3>
        </div>
        <p>{body}</p>
      </div>
      {reviews.length ? (
        <div className="review-signal-lane__stack">
          {reviews.map((review) => (
            <ReviewSignalCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <EmptyState variant="review-signal-lane">
          <strong>{emptyTitle}</strong>
          <p>{emptyBody}</p>
        </EmptyState>
      )}
    </section>
  );
}

export function ReviewSignalCard({review}: {review: PublicReviewCardModel}) {
  return (
    <article className="review-signal-card">
      <div className="review-signal-card__header">
        <div>
          <strong>{review.reviewerName}</strong>
          <span>{review.createdAtLabel}</span>
        </div>
        <span aria-label={`${review.rating} out of 5 stars`}>
          {"★".repeat(Math.max(0, Math.min(5, Math.round(review.rating))))}
        </span>
      </div>
      <div className="review-signal-card__badges">
        <CatchBadge
          recipe="status"
          tone={review.verified ? "success" : "warning"}
          label={review.verificationLabel}
        />
        <CatchBadge recipe="status" label={review.sourceLabel} />
      </div>
      {review.comment ? <p>{review.comment}</p> : null}
      {review.ownerResponse ? (
        <div className="listing-owner-response">
          <span>{"Host response · "}{review.ownerResponse.hostName}</span>
          <p>{review.ownerResponse.message}</p>
          <small>{review.ownerResponse.updatedAtLabel}</small>
        </div>
      ) : null}
    </article>
  );
}

export function OwnerResponsePrompt({
  body,
  ctaHref,
  ctaLabel,
  onCtaClick,
  stats,
  title,
}: {
  body: ReactNode;
  ctaHref?: string;
  ctaLabel?: ReactNode;
  onCtaClick?: (href: string) => void;
  stats: StatStripItem[];
  title: ReactNode;
}) {
  return (
    <aside className="owner-response-prompt" data-reveal>
      <div>
        <UiLabel>{"Owner response"}</UiLabel>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      <StatStrip className="owner-response-prompt__stats" items={stats} />
      {ctaHref && ctaLabel ? (
        <ButtonLink
          href={ctaHref}
          variant="ghost"
          onClick={() => {
            onCtaClick?.(ctaHref);
          }}
        >
          {ctaLabel}
        </ButtonLink>
      ) : null}
    </aside>
  );
}
