import type {HTMLAttributes, ReactNode} from "react";
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
