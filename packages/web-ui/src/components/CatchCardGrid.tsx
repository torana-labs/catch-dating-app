"use client";

import {useId, type HTMLAttributes, type ReactNode} from "react";
import {catchBandActions, catchBandColor, type CatchBandAction, type CatchBandLink} from "./catchBandParts";
import type {CatchTextTone} from "./catchCoreVocabulary";
import {CatchBadge} from "./CatchBadge";
import {CatchBandHeader} from "./CatchBandHeader";
import {CatchButton} from "./CatchButton";
import {CatchEmptyState} from "./CatchEmptyState";
import {CatchHeroImage} from "./CatchHeroImage";
import {CatchOrganizerCard, type CatchOrganizerCardProps} from "./CatchOrganizerCard";
import {CatchPlanCard, type CatchPlanCardProps} from "./CatchPlanCard";
import {CatchReviewItem, type CatchReviewItemProps} from "./CatchReviewItem";
import {CatchStack} from "./CatchStack";
import {CatchStoryCard, type CatchStoryCardProps} from "./CatchStoryCard";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchCardGrid.module.css";

/** The card each item draws: plan, organiser, city, review, story or person. */
export type CatchCardGridKind = "plan" | "org" | "city" | "review" | "story" | "person";

/** Columns on a page at least 840px wide; one column below. */
export type CatchCardGridColumns = 3 | 4;

/** Every item carries a stable id, its React key. */
type Keyed<T> = T & {id: string};

/** A city: its status tag, name and line, and an action. Live cities take the white ground and a success tag. */
export interface CatchCardGridCity {
  id: string;
  title: string;
  /** The tag, such as "Open" or "Launching soon". */
  status: string;
  live?: boolean;
  body?: string;
  /** Drawn as a small D20 button: primary on a live city, secondary otherwise, unless named. */
  action?: CatchBandAction;
}

/** A person: a square photo (or the no-photo fill), the name, a role and a line. */
export interface CatchCardGridPerson {
  id: string;
  name: string;
  role?: string;
  line?: string;
  image?: string;
  imageAlt?: string;
}

/** What an empty grid shows instead of cards. */
export interface CatchCardGridEmpty {
  title: string;
  message?: string;
  /** Buttons, such as one that clears the filters. */
  actions?: ReactNode;
}

/** The kind and its items, typed together: each kind takes its own card's data. */
export type CatchCardGridItems =
  | {kind: "plan"; items: readonly Keyed<CatchPlanCardProps>[]}
  | {kind: "org"; items: readonly Keyed<CatchOrganizerCardProps>[]}
  | {kind: "review"; items: readonly Keyed<CatchReviewItemProps>[]}
  | {kind: "story"; items: readonly Keyed<CatchStoryCardProps>[]}
  | {kind: "city"; items: readonly CatchCardGridCity[]}
  | {kind: "person"; items: readonly CatchCardGridPerson[]};

interface CatchCardGridBaseProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title"> {
  /** The headline. Without one, give the band a label. Resolved copy. */
  title?: string;
  /** The band's accessible name when it has no headline. */
  label?: string;
  /** Defaults to 2; 1 when the grid opens its page, as a directory does. */
  level?: 1 | 2;
  kicker?: string;
  kickerTone?: CatchTextTone;
  lead?: string;
  /** Defaults to start. */
  align?: "start" | "center";
  /** The filter controls between the header and the cards; the page owns their state and passes the filtered items. */
  filters?: ReactNode;
  /** A row of links under the header, such as other cities, drawn as small secondary buttons. */
  links?: readonly CatchBandLink[];
  /** Shown in place of the cards when there are no items. */
  empty?: CatchCardGridEmpty;
  /** D20 buttons under the cards. */
  actions?: readonly CatchBandAction[];
  /** Defaults to 3. */
  columns?: CatchCardGridColumns;
  /** The band's Website v2 ground; text takes its inks, and ink the dark theme. Defaults to the plain band. */
  ground?: Ground;
}

export type CatchCardGridProps = CatchCardGridBaseProps & CatchCardGridItems;

function CityCard({city, heading}: {city: CatchCardGridCity; heading: "h2" | "h3"}) {
  const ground = city.live ? "white" : "paper";
  return (
    <div className={styles.city} data-catch-theme="light" data-ground={ground}>
      <CatchBadge label={city.status} size="sm" tone={city.live ? "success" : "warning"} />
      <CatchText as={heading} variant="title-bar">{city.title}</CatchText>
      {city.body ? <CatchText as="p" tone="secondary" variant="body-small">{city.body}</CatchText> : null}
      {city.action ? (
        <span className={styles.action}>
          <CatchButton
            href={city.action.href}
            label={city.action.label}
            newTab={city.action.newTab}
            onPressed={city.action.onPressed}
            size="sm"
            variant={city.action.variant ?? (city.live ? "primary" : "secondary")}
          />
        </span>
      ) : null}
    </div>
  );
}

function PersonCard({person, heading}: {person: CatchCardGridPerson; heading: "h2" | "h3"}) {
  return (
    <div className={styles.person} data-catch-theme="light">
      <span className={styles.portrait}><CatchHeroImage imageUrl={person.image} semanticLabel={person.imageAlt} showScrim={false} /></span>
      <span className={styles.personCopy}>
        <CatchText as={heading} variant="title-bar">{person.name}</CatchText>
        {person.role ? <CatchText as="p" tone="secondary" variant="body-small">{person.role}</CatchText> : null}
        {person.line ? <CatchText as="p" tone="secondary" variant="body-small">{person.line}</CatchText> : null}
      </span>
    </div>
  );
}

function cards(props: CatchCardGridItems, heading: "h2" | "h3"): {id: string; node: ReactNode}[] {
  switch (props.kind) {
    case "plan":
      return props.items.map(({id, ...item}) => ({id, node: <CatchPlanCard {...item} />}));
    case "org":
      return props.items.map(({id, ...item}) => ({id, node: <CatchOrganizerCard {...(item as CatchOrganizerCardProps)} />}));
    case "review":
      return props.items.map(({id, ...item}) => ({id, node: <CatchReviewItem variant="card" {...item} />}));
    case "story":
      return props.items.map(({id, ...item}) => ({id, node: <CatchStoryCard level={heading === "h2" ? 2 : 3} {...item} />}));
    case "city":
      return props.items.map((city) => ({id: city.id, node: <CityCard city={city} heading={heading} />}));
    case "person":
      return props.items.map((person) => ({id: person.id, node: <PersonCard heading={heading} person={person} />}));
  }
}

/**
 * A band of cards (the playbook kit's card grid): an optional
 * CatchBandHeader, a filters slot, a row of links, then plan, organiser,
 * city, review, story or person cards, three or four across on a wide page
 * and one below 840px, an empty state when there are none, and D20 actions.
 * Plans, organisers, reviews and stories draw through their library cards
 * (CatchPlanCard, CatchOrganizerCard, CatchReviewItem, CatchStoryCard).
 * It is presentational: the page fetches and filters, and passes the items.
 * The band is a section named by its headline, or by its label without one.
 */
export function CatchCardGrid(props: CatchCardGridProps) {
  const {
    title, label, level = 2, kicker, kickerTone, lead, align = "start", filters, links, empty, actions, columns = 3, ground,
    kind, items, ...rest
  } = props;
  const titleId = `${useId()}-title`;
  const heading = title ? (level === 1 ? "h2" : "h3") : "h2";
  const list = cards({kind, items} as CatchCardGridItems, heading);
  return (
    <CatchSurface
      {...rest}
      aria-label={title ? undefined : label}
      aria-labelledby={title ? titleId : undefined}
      as="section"
      block="band"
      color={catchBandColor(ground)}
      data-kind={kind}
    >
      {title ? <CatchBandHeader align={align} kicker={kicker} kickerTone={kickerTone} lead={lead} level={level} title={title} titleId={titleId} /> : null}
      {filters != null ? <div className={styles.filters} data-align={align}>{filters}</div> : null}
      {links && links.length > 0 ? (
        <CatchStack as="ul" className={styles.links} direction="row" gap={8} justify={align === "center" ? "center" : undefined} wrap>
          {links.map((link) => <li key={link.href}><CatchButton href={link.href} label={link.label} size="sm" variant="secondary" /></li>)}
        </CatchStack>
      ) : null}
      {list.length > 0 ? (
        <ul className={styles.grid} data-columns={columns}>
          {list.map((card) => <li className={styles.cell} key={card.id}>{card.node}</li>)}
        </ul>
      ) : empty ? (
        <CatchEmptyState actions={empty.actions} announce="polite" message={empty.message} surface title={empty.title} />
      ) : null}
      {catchBandActions(actions)}
    </CatchSurface>
  );
}
