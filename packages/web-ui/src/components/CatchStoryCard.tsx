"use client";

import {useId, type HTMLAttributes} from "react";
import {CatchHeroImage} from "./CatchHeroImage";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchStoryCard.module.css";

/** The figure at a story card's foot and what it measures. */
export interface CatchStoryCardStat {
  label: string;
  value: string;
}

export interface CatchStoryCardProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title"> {
  /** The story's title. Resolved copy; the caller localizes it. */
  title: string;
  /** The title's heading level. Defaults to 3, for a grid under a band's h2. */
  level?: 2 | 3;
  /** A short line above the title, such as the format and the area. */
  meta?: string;
  /** A sentence or two under the title. */
  body?: string;
  /** A figure at the card's foot, such as a count with what it counts. */
  stat?: CatchStoryCardStat;
  /** The photo's URL. Without one the photo box takes the ground. */
  image?: string;
  /** The photo's alternative text; without it the photo is decorative. */
  imageAlt?: string;
  /** The photo box's Website v2 ground when there is no photo. Defaults to paper. */
  ground?: Ground;
  /** The story's page: the title links to it and the whole card presses. */
  href?: string;
}

/**
 * One story in a grid of stories (the playbook kit's story card): a 4:3
 * photo, a meta line, the title, a body and a figure at the foot, on paper at
 * radius xl. With an href the title is the link and the whole card presses;
 * the foot sits at the bottom so stretched cards line up. Lay several out
 * with CatchCardGrid.
 */
export function CatchStoryCard({title, level = 3, meta, body, stat, image, imageAlt, ground = "paper", href, ...rest}: CatchStoryCardProps) {
  const titleId = `${useId()}-title`;
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <article {...rest} aria-labelledby={titleId} className={styles.card} data-pressable={href ? "" : undefined}>
      <span className={styles.photo} data-catch-theme={ground === "ink" ? "dark" : "light"} data-ground={ground}>
        {image ? <CatchHeroImage imageUrl={image} semanticLabel={imageAlt} showScrim={false} /> : null}
      </span>
      <span className={styles.body}>
        {meta ? <CatchText tone="secondary" variant="label-kicker">{meta}</CatchText> : null}
        <CatchText as={Heading} id={titleId} variant="title-bar">
          {href ? <a className={styles.link} href={href}>{title}</a> : title}
        </CatchText>
        {body ? <CatchText as="p" tone="secondary" variant="body">{body}</CatchText> : null}
        {stat ? (
          <span className={styles.stat}>
            <CatchText tone="secondary" variant="body-meta">{stat.label}</CatchText>
            <CatchText numeric variant="display-sm">{stat.value}</CatchText>
          </span>
        ) : null}
      </span>
    </article>
  );
}
