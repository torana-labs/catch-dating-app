import type {CSSProperties, HTMLAttributes, ReactNode} from "react";
import type {ActivityMeta} from "./foundation";

import type {ActivityListing} from "./organizer";
import {classNames} from "@catch/web-ui";

export type ActivityMarkSize = "sm" | "md" | "lg";

export type MarketingLoopListVariant = "default" | "host";

export interface MarketingLoopListItem {
  body: ReactNode;
  key?: string;
  step: ReactNode;
  title: ReactNode;
}

export interface MarketingLoopListProps
  extends Omit<HTMLAttributes<HTMLOListElement>, "children"> {
  items: readonly MarketingLoopListItem[];
  reveal?: boolean;
  variant?: MarketingLoopListVariant;
}

export function ActivityMark({
  activity,
  className,
  listing,
  size = "md",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  activity: ActivityMeta;
  listing: ActivityListing;
  size?: ActivityMarkSize;
}) {
  const isUnclaimed = listing.status.toLowerCase() === "unclaimed";
  return (
    <span
      {...props}
      className={classNames(
        "activity-mark",
        `activity-mark--${size}`,
        isUnclaimed && "is-unclaimed",
        className
      )}
      style={{"--activity": activity.token, ...props.style} as CSSProperties}
      aria-hidden={props["aria-hidden"] ?? "true"}
    >
      {listing.logo.text || activity.short}
    </span>
  );
}

export function MarketingLoopList({
  className,
  items,
  reveal = true,
  variant = "default",
  ...props
}: MarketingLoopListProps) {
  return (
    <ol
      {...props}
      className={classNames(
        "loop-list",
        variant === "host" && "loop-list--host",
        className
      )}
    >
      {items.map((item, index) => (
        <li data-reveal={reveal || undefined} key={item.key ?? `${String(item.step)}-${index}`}>
          <span>{item.step}</span>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </li>
      ))}
    </ol>
  );
}

export interface CaptureRecord {
  id: string;
  webPath: string;
  /** Framed PNG size in pixels. */
  width: number;
  height: number;
  alt: string;
  caption: string;
  walkthroughStep: string;
  /** Canonical paths whose pages render this capture. */
  pages: readonly string[];
}
