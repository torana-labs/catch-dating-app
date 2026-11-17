"use client";

import type {HTMLAttributes, ReactNode} from "react";
import type {CatchBandAction} from "./catchBandParts";
import {CatchButton} from "./CatchButton";
import {CatchGroundProvider} from "./CatchGroundProvider";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchRouteCard.module.css";

/**
 * link: the host landing's "Where you are today" cards (.stg): the title,
 * the line and an underlined link at the foot. button: its "However you like
 * to start" cards (.path): a label over the title, an optional picture, the
 * line and a D20 button at the foot.
 */
export type CatchRouteCardKind = "link" | "button";

export interface CatchRouteCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "color" | "style" | "title"> {
  title: string;
  /** Defaults to 3. */
  level?: 2 | 3;
  /** A short label over the title, such as "Ready now" (button cards). */
  kicker?: string;
  body?: string;
  /** A picture between the title and the line, such as a capture (button cards). */
  media?: ReactNode;
  /** Where the card leads, drawn at its foot. */
  action?: CatchBandAction;
  /** Defaults to link. */
  kind?: CatchRouteCardKind;
  /** The card's Website v2 fill; its text takes the ground's inks. Defaults to paper. */
  ground?: Ground;
}

/**
 * One way forward on a website page, as a filled card (PlaybookHosts .stg and
 * .path): 24px corners and 24px inside, its action pushed to the foot so a
 * row of cards lines up its actions. Link cards are at least 230px tall,
 * button cards 300px; neither is below 840px, where the row stacks. The card
 * is its children's ground, so an ink card takes the night inks and button.
 */
export function CatchRouteCard({title, level = 3, kicker, body, media, action, kind = "link", ground = "paper", ...rest}: CatchRouteCardProps) {
  return (
    <div {...rest} className={styles.card} data-catch-theme={ground === "ink" ? "dark" : "light"} data-ground={ground} data-kind={kind}>
      <CatchGroundProvider ground={ground === "ink" ? "night" : "ground"}>
        {kicker ? <CatchText as="p" className={styles.kicker} tone="secondary" variant="label-action">{kicker}</CatchText> : null}
        <CatchText as={level === 2 ? "h2" : "h3"} className={styles.title} variant="title-bar">{title}</CatchText>
        {media ? <div className={styles.media}>{media}</div> : null}
        {body ? <CatchText as="p" className={styles.body} variant="body">{body}</CatchText> : null}
        {action ? (
          <span className={styles.foot}>
            {kind === "button" ? (
              <CatchButton href={action.href} label={action.label} newTab={action.newTab} onPressed={action.onPressed} variant={action.variant ?? "primary"} />
            ) : (
              <a className={styles.link} href={action.href} onClick={action.onPressed ?? undefined}
                rel={action.newTab ? "noopener noreferrer" : undefined} target={action.newTab ? "_blank" : undefined}>
                <CatchText as="span" variant="label-action">{action.label}</CatchText>
              </a>
            )}
          </span>
        ) : null}
      </CatchGroundProvider>
    </div>
  );
}
