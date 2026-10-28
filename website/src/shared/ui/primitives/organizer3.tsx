import type {FormHTMLAttributes, HTMLAttributes, ReactNode} from "react";
import type {StatStripItem} from "./foundation";
import type {ListingSuccessMetricGridItem} from "./organizer";
import {ButtonLink} from "./actions";
import {Form} from "./forms";
import {StatStrip, classNames} from "./foundation";
import {SuccessGrid} from "./layout";

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
