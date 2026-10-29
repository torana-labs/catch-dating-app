import type {HTMLAttributes, ReactNode} from "react";
import {ToggleGroupControl, UiLabel as WebUiLabel} from "@catch/web-ui";
import type {HostPreviewSectionVariant} from "./host";
import {classNames} from "@catch/web-ui";

export interface PublicEventCardModel {
  activityLabel: string;
  activityToken: string;
  bookedCount?: number;
  capacityLimit?: number;
  city: string;
  date: string;
  externalLinkCount?: number;
  hostName: string;
  href: string;
  id: string;
  location: string;
  priceLabel: string;
  readOnlyLabel?: string;
  sourceLabel?: string;
  summary: string;
  title: string;
  waitlistedCount?: number;
}

export type ContentGridVariant =
  | "claim-review"
  | "format"
  | "listing-event"
  | "marketing-split"
  | "public-event"
  | "surface"
  | "trust";

export function UiLabel({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
}) {
  return (
    <WebUiLabel {...props} className={classNames("ui-label", className)}>
      {children}
    </WebUiLabel>
  );
}

export const contentGridClassNames: Record<ContentGridVariant, string> = {
  "claim-review": "claim-review-grid",
  format: "format-grid",
  "listing-event": "listing-catch-event-grid",
  "marketing-split": "marketing-content-split",
  "public-event": "public-event-grid",
  surface: "surface-grid",
  trust: "trust-grid",
};

export const hostPreviewSectionClassNames: Record<HostPreviewSectionVariant, string> = {
  after: "host-preview-section host-preview-after",
  default: "host-preview-section",
  faq: "host-preview-section host-preview-faq",
  live: "host-preview-section host-preview-live",
  loop: "host-preview-section host-preview-loop",
  payments: "host-preview-section host-preview-payments",
  "product-split": "host-preview-section host-preview-product-split",
  trust: "host-preview-section host-preview-trust",
};

export function VerificationMethodGrid({
  children,
  className,
  ...props
}: Parameters<typeof ToggleGroupControl>[0]) {
  return (
    <ToggleGroupControl
      {...props}
      className={classNames("verification-methods", className)}
    >
      {children}
    </ToggleGroupControl>
  );
}

export function ContentGrid({
  children,
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant: ContentGridVariant;
}) {
  return (
    <div {...props} className={classNames(contentGridClassNames[variant], className)}>
      {children}
    </div>
  );
}
