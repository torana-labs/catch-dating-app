import type {CSSProperties, HTMLAttributes, ReactNode} from "react";
import {classNames} from "./foundation";

export function OrganizerResultCardShell({
  activityToken,
  children,
  className,
  style,
  ...props
}: HTMLAttributes<HTMLElement> & {
  activityToken: string;
  children: ReactNode;
}) {
  return (
    <article
      {...props}
      className={classNames("organizer-result-card", className)}
      style={{...style, "--activity": activityToken} as CSSProperties}
    >
      {children}
    </article>
  );
}

export function OrganizerResultCardBody({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("organizer-result-card__body", className)}>
      {children}
    </div>
  );
}

export function OrganizerResultCardTopline({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("organizer-card-topline", className)}>
      {children}
    </div>
  );
}

export interface OrganizerEventHighlightItem {
  activityToken: string;
  detail: ReactNode;
  id: string;
  kind: ReactNode;
  title: ReactNode;
}

export function OrganizerEventHighlights({
  ariaLabel,
  className,
  items,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  ariaLabel: string;
  items: OrganizerEventHighlightItem[];
}) {
  return (
    <div
      {...props}
      className={classNames("organizer-event-highlights", className)}
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <span key={item.id} style={{"--activity": item.activityToken} as CSSProperties}>
          <strong>{item.title}</strong>
          <small>{item.kind} · {item.detail}</small>
        </span>
      ))}
    </div>
  );
}
