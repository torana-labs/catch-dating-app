import type {HTMLAttributes, MouseEvent, ReactNode} from "react";
import {CatchBadge, EmptyStateControl, classNames} from "@catch/web-ui";
import type {AppDownloadCtaItem, ProcessStatusAction} from "./actions";
import {ButtonLink} from "./actionControls";
import {UiLabel} from "./layout";

export type StatusBadgeTone = "claimed" | "unclaimed" | "verified";

export type ReviewSignalBadgeTone = "neutral" | "unverified" | "verified";

export type AuthStatusRowVariant = "default" | "flow";

export type EmptyStateVariant =
  | "claim"
  | "default"
  | "listing-review"
  | "organizer-results"
  | "public-event"
  | "review-signal-lane";

export interface MarketingConsentBannerShellProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  actions: ReactNode;
  body: ReactNode;
}

export interface ProcessStatusItem {
  body: ReactNode;
  key?: string;
  title: ReactNode;
}

export interface ProcessStatusPanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  actions: ProcessStatusAction[];
  body: ReactNode;
  eyebrow: ReactNode;
  items: ProcessStatusItem[];
  mark: ReactNode;
  onActionClick?: (action: ProcessStatusAction, event: MouseEvent<HTMLAnchorElement>) => void;
  reveal?: boolean;
  title: ReactNode;
}

export function ProcessStatusPanel({
  actions,
  body,
  className,
  eyebrow,
  items,
  mark,
  onActionClick,
  reveal = true,
  title,
  ...props
}: ProcessStatusPanelProps) {
  return (
    <section
      {...props}
      className={classNames("process-status-panel", className)}
      data-reveal={reveal || undefined}
    >
      <div className="process-status-panel__card">
        <span className="process-status-panel__mark" aria-hidden="true">
          {mark}
        </span>
        <div>
          <UiLabel>{eyebrow}</UiLabel>
          <h2>{title}</h2>
          <p>{body}</p>
        </div>
      </div>
      <div className="process-status-panel__grid">
        {items.map((item, index) => (
          <article key={item.key ?? index}>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
      <div className="process-status-panel__actions">
        {actions.map((action) => (
          <ButtonLink
            href={action.href}
            key={`${action.href}-${String(action.label)}`}
            rel={action.rel}
            target={action.target}
            variant={action.variant === "secondary" ? "ghost" : "primary"}
            onClick={(event) => {
              action.onClick?.(event);
              onActionClick?.(action, event);
            }}
          >
            {action.label}
          </ButtonLink>
        ))}
      </div>
    </section>
  );
}

export function MarketingConsentBannerShell({
  actions,
  body,
  className,
  ...props
}: MarketingConsentBannerShellProps) {
  return (
    <aside {...props} className={classNames("consent-banner", className)}>
      <p>{body}</p>
      <div>{actions}</div>
    </aside>
  );
}

export function EmptyState({
  children,
  className,
  reveal = false,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  reveal?: boolean;
  variant?: EmptyStateVariant;
}) {
  return (
    <EmptyStateControl
      {...props}
      className={classNames("empty-state", emptyStateClassNames[variant], className)}
      data-reveal={reveal || undefined}
    >
      {children}
    </EmptyStateControl>
  );
}

export function ListingReviewEmptyState({
  className,
  ...props
}: Parameters<typeof EmptyState>[0]) {
  return <EmptyState {...props} variant="listing-review" className={className} />;
}

/** Text content of a badge's children; badges render text only. */
export function badgeLabel(children: ReactNode): string {
  if (children === null || children === undefined || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(badgeLabel).join("");
  throw new Error("Badge children must be text; pass an icon through CatchBadge's icon.");
}

/**
 * Interim: the last callers sit in files other tasks hold. Each moves to
 * CatchBadge (functional, or solidStatus when verified) and this goes.
 */
export function StatusBadge({children, tone}: {children: ReactNode; tone: StatusBadgeTone}) {
  return (
    <CatchBadge recipe={tone === "verified" ? "solidStatus" : "functional"} label={badgeLabel(children)} />
  );
}

/** Interim, as StatusBadge: CatchBadge's status recipe. */
export function ReviewSignalBadge({children, tone = "neutral"}: {
  children: ReactNode;
  tone?: ReviewSignalBadgeTone;
}) {
  return (
    <CatchBadge
      recipe="status"
      tone={tone === "verified" ? "success" : tone === "unverified" ? "warning" : "neutral"}
      label={badgeLabel(children)}
    />
  );
}

export interface BadgeRowItem {
  key?: string;
  label: ReactNode;
}

export function BadgeRow({
  children,
  className,
  items,
  reveal = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  items?: BadgeRowItem[];
  reveal?: boolean;
}) {
  return (
    <div
      {...props}
      className={classNames("listing-badge-row", className)}
      data-reveal={reveal || undefined}
    >
      {items?.map((item, index) => (
        <span key={item.key ?? index}>{item.label}</span>
      )) ?? children}
    </div>
  );
}

export function LiveStatus({
  children,
  className,
  "aria-live": ariaLive = "polite",
  ...props
}: HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
}) {
  return (
    <p
      {...props}
      aria-live={ariaLive}
      className={classNames("live-status", className)}
      role="status"
    >
      {children}
    </p>
  );
}

export function RouteLoadingState({
  className,
  label = "Loading",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  label?: string;
}) {
  return (
    <div
      {...props}
      aria-busy="true"
      aria-label={label}
      className={classNames("route-loading", className)}
      role="status"
    />
  );
}

export function AuthStatusRow({
  action,
  children,
  className,
  variant = "default",
}: {
  action: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: AuthStatusRowVariant;
}) {
  return (
    <div className={classNames("claim-auth-row", variant === "flow" && "claim-auth-row--flow", className)}>
      <span>{children}</span>
      {action}
    </div>
  );
}

export const emptyStateClassNames: Record<EmptyStateVariant, string | null> = {
  claim: "claim-empty-state",
  default: null,
  "listing-review": "listing-review-empty",
  "organizer-results": "empty-results",
  "public-event": "public-event-empty",
  "review-signal-lane": "review-signal-lane__empty",
};
