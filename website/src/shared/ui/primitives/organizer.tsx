import type {
  AnchorHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from "react";
import {PlainLink} from "./actions";
import {classNames} from "./foundation";
import {UiLabel, listingGridClassNames, listingSectionClassNames} from "./layout";
import {CardGrid} from "./layout2";

export interface ActivityListing {
  logo: {
    text: string;
  };
  status: string;
}

export type FeaturedOrganizerCardItem = {
  activity: ReactNode;
  activityColor?: string;
  detail: ReactNode;
  href: string;
  key?: string;
  name: ReactNode;
  onClick?: AnchorHTMLAttributes<HTMLAnchorElement>["onClick"];
  status: ReactNode;
};

export type ListingSuccessMetricGridItem = {
  label: ReactNode;
  value: ReactNode;
};

export type ListingFactGridItem = {
  key?: string;
  label: ReactNode;
  value: ReactNode;
};

export type ListingEventEvidenceItem = {
  date: ReactNode;
  facts: ReactNode[];
  key?: string;
  location: ReactNode;
  onSourceClick?: AnchorHTMLAttributes<HTMLAnchorElement>["onClick"];
  sourceHref: string;
  sourceLabel: ReactNode;
  sourceRel?: AnchorHTMLAttributes<HTMLAnchorElement>["rel"];
  sourceTarget?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
  summary: ReactNode;
  title: ReactNode;
};

export type ListingStatusLedgerItem = {
  key?: string;
  label: ReactNode;
  value: ReactNode;
};

export type ListingRailLinkItem = {
  href?: string;
  key?: string;
  label: ReactNode;
  onClick?: AnchorHTMLAttributes<HTMLAnchorElement>["onClick"];
  rel?: AnchorHTMLAttributes<HTMLAnchorElement>["rel"];
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
};

export type ListingGridVariant = "default" | "fit";

export type ListingSectionVariant =
  | "default"
  | "events"
  | "reviews"
  | "split"
  | "success";

export function ListingProfileLayout({
  activityToken,
  children,
  className,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  activityToken: string;
  children: ReactNode;
}) {
  return (
    <div
      {...props}
      className={classNames("listing-profile-layout", className)}
      style={{...style, "--activity": activityToken} as CSSProperties}
    >
      {children}
    </div>
  );
}

export function ListingProfilePrimary({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("listing-profile-primary", className)}>
      {children}
    </div>
  );
}

export function ListingProfileRail({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <aside {...props} className={classNames("listing-profile-rail", className)}>
      {children}
    </aside>
  );
}

export function ListingPolaroid({
  caption,
  fallback,
  media,
  provenance,
  title,
  titleId,
}: {
  caption: ReactNode;
  fallback: ReactNode;
  media: null | {
    alt: string;
    mobileSrcSet: string;
    src: string;
  };
  provenance: ReactNode;
  title: ReactNode;
  titleId: string;
}) {
  return (
    <article className="listing-polaroid" data-reveal>
      <div className="listing-polaroid__media">
        {media ? (
          <picture>
            <source media="(max-width: 640px)" srcSet={media.mobileSrcSet} />
            <img alt={media.alt} src={media.src} />
          </picture>
        ) : (
          <div className="listing-polaroid__fallback">{fallback}</div>
        )}
      </div>
      <div className="listing-polaroid__caption">
        <span>{caption}</span>
        <h1 id={titleId}>{title}</h1>
        <small>{provenance}</small>
      </div>
    </article>
  );
}

export function ListingStatusLedger({
  items,
}: {
  items: ListingStatusLedgerItem[];
}) {
  return (
    <dl className="listing-status-ledger" data-reveal tabIndex={0}>
      {items.map((item, index) => (
        <div key={item.key ?? (typeof item.label === "string" ? item.label : index)}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ListingRailIdentity({
  activity,
  eyebrow,
  location,
  name,
  status,
}: {
  activity: ReactNode;
  eyebrow: ReactNode;
  location: ReactNode;
  name: ReactNode;
  status: ReactNode;
}) {
  return (
    <div className="listing-profile-rail__identity">
      <UiLabel>{eyebrow}</UiLabel>
      {activity}
      <div>
        <h2>{name}</h2>
        <p>{location}</p>
      </div>
      <div className="listing-profile-rail__status">{status}</div>
    </div>
  );
}

export function ListingRailActions({
  children,
  description,
  shareStatus,
}: {
  children: ReactNode;
  description: ReactNode;
  shareStatus?: ReactNode;
}) {
  return (
    <div className="listing-profile-rail__actions">
      {children}
      <p>{description}</p>
      {shareStatus ? (
        <div className="listing-profile-rail__live" role="status">{shareStatus}</div>
      ) : null}
    </div>
  );
}

export function ListingRailSection({
  children,
  className,
  eyebrow,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  eyebrow: ReactNode;
}) {
  return (
    <section
      {...props}
      className={classNames("listing-profile-rail__section", className)}
    >
      <UiLabel>{eyebrow}</UiLabel>
      {children}
    </section>
  );
}

export function ListingRailLinkList({
  items,
}: {
  items: ListingRailLinkItem[];
}) {
  return (
    <ul className="listing-profile-rail__links">
      {items.map((item, index) => (
        <li key={item.key ?? (typeof item.label === "string" ? item.label : index)}>
          {item.href ? (
            <PlainLink
              href={item.href}
              onClick={item.onClick}
              rel={item.rel}
              target={item.target}
            >
              {item.label}
            </PlainLink>
          ) : (
            <span>{item.label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function FeaturedOrganizersGrid({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <CardGrid {...props} className={classNames("featured-organizers__grid", className)}>
      {children}
    </CardGrid>
  );
}

export function FeaturedOrganizerCardGrid({
  items,
}: {
  items: FeaturedOrganizerCardItem[];
}) {
  return (
    <FeaturedOrganizersGrid>
      {items.map((item, index) => (
        <PlainLink
          className="organizer-mini-card"
          href={item.href}
          data-reveal
          style={item.activityColor ? ({"--activity": item.activityColor} as CSSProperties) : undefined}
          onClick={item.onClick}
          key={item.key ?? index}
        >
          {item.activity}
          <div>
            {item.status}
            <h3>{item.name}</h3>
            <p>{item.detail}</p>
          </div>
        </PlainLink>
      ))}
    </FeaturedOrganizersGrid>
  );
}

export function ListingSection({
  children,
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  variant?: ListingSectionVariant;
}) {
  return (
    <section {...props} className={classNames(listingSectionClassNames[variant], className)}>
      {children}
    </section>
  );
}

export function ListingSectionIntro({
  body,
  className,
  eyebrow,
  reveal = true,
  title,
  titleId,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  body: ReactNode;
  eyebrow: ReactNode;
  reveal?: boolean;
  title: ReactNode;
  titleId?: string;
}) {
  return (
    <div
      {...props}
      className={className}
      data-reveal={reveal || undefined}
    >
      <UiLabel>{eyebrow}</UiLabel>
      <h2 id={titleId}>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

export function ListingGrid({
  children,
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: ListingGridVariant;
}) {
  return (
    <CardGrid {...props} className={classNames(listingGridClassNames[variant], className)}>
      {children}
    </CardGrid>
  );
}

export function ListingCard({
  children,
  className,
  label,
  reveal = true,
  value,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
  label?: ReactNode;
  reveal?: boolean;
  value?: ReactNode;
}) {
  return (
    <article
      {...props}
      className={classNames("listing-card", className)}
      data-reveal={reveal || undefined}
    >
      {children ?? (
        <>
          <span>{label}</span>
          <strong>{value}</strong>
        </>
      )}
    </article>
  );
}

export function ListingFactGrid({
  items,
}: {
  items: ListingFactGridItem[];
}) {
  return (
    <ListingGrid>
      {items.map((item, index) => (
        <ListingCard
          label={item.label}
          value={item.value}
          key={item.key ?? index}
        />
      ))}
    </ListingGrid>
  );
}
