import type {FormHTMLAttributes, HTMLAttributes, ReactNode} from "react";
import {Form} from "./forms";
import {classNames} from "./foundation";

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
