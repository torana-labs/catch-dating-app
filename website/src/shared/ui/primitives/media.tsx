import type {CSSProperties, HTMLAttributes, ReactNode} from "react";
import type {ActivityMeta} from "./foundation";

import {classNames} from "@catch/web-ui";

interface ActivityListing {
  logo: {
    text: string;
  };
  status: string;
}

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
  /** The capture device (tool/marketing/lib/capture_devices.mjs), such as "generic-phone". */
  device: string;
  webPath: string;
  /** PNG size in pixels: the device's screen alone, or a fragment's crop. */
  width: number;
  height: number;
  /** A fragment capture: the capture whose screen it is cut from. */
  fragmentOf?: string;
  /** A fragment capture: the width in pixels of the screen it is cut from. */
  screenWidth?: number;
  alt: string;
  caption: string;
  walkthroughStep: string;
  /** Canonical paths whose pages render this capture. */
  pages: readonly string[];
}
