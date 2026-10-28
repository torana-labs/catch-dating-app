import type {CSSProperties, HTMLAttributes, ReactNode} from "react";
import type {ListingEventEvidenceItem} from "./organizer";
import {PlainLink} from "./actions";
import {classNames} from "./foundation";

export function ListingEventStack({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("listing-event-stack", className)}>
      {children}
    </div>
  );
}

export function ListingEventCard({
  children,
  className,
  reveal = true,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  reveal?: boolean;
}) {
  return (
    <article
      {...props}
      className={classNames("listing-event-card", className)}
      data-reveal={reveal || undefined}
    >
      {children}
    </article>
  );
}

export function ListingEventMeta({
  items,
}: {
  items: Array<{label: ReactNode; value: ReactNode}>;
}) {
  return (
    <dl className="listing-event-meta">
      {items.map((item, index) => (
        <div key={index}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ListingEventFacts({
  items,
}: {
  items: ReactNode[];
}) {
  return (
    <ul className="listing-event-facts">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function ListingEventEvidenceList({
  items,
}: {
  items: ListingEventEvidenceItem[];
}) {
  return (
    <ListingEventStack>
      {items.map((item, index) => (
        <ListingEventCard key={item.key ?? index}>
          <div>
            <span className="ui-label">{item.date}</span>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
          </div>
          <ListingEventMeta
            items={[
              {label: "Location", value: item.location},
              {
                label: "Source",
                value: (
                  <PlainLink
                    href={item.sourceHref}
                    target={item.sourceTarget ?? "_blank"}
                    rel={item.sourceRel ?? "noreferrer"}
                    onClick={item.onSourceClick}
                  >
                    {item.sourceLabel}
                  </PlainLink>
                ),
              },
            ]}
          />
          <ListingEventFacts items={item.facts} />
        </ListingEventCard>
      ))}
    </ListingEventStack>
  );
}

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
