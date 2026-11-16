"use client";

import type {HTMLAttributes} from "react";
import {catchGroundIsNight} from "./catchCoreVocabulary";
import {useCatch} from "./catchRootContext";
import {CatchButton} from "./CatchButton";
import {CatchGroundProvider} from "./CatchGroundProvider";
import {CatchMarker} from "./CatchMarker";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchFeatureTile.module.css";

export interface CatchFeatureTileProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "color" | "style" | "title"> {
  /** The feature's name. Resolved copy; the caller localizes it. */
  title: string;
  /**
   * The title's heading level. Defaults to 3, for a grid under a band's h2;
   * use 2 when the band's headline is the page's h1, so headings never skip a
   * level.
   */
  level?: 2 | 3;
  /** A sentence or two under the title. */
  body?: string;
  /** A big number or short figure above the title, such as "3" or "2×". */
  figure?: string;
  /** A small line under the figure, saying what it counts. */
  figureNote?: string;
  /** Ticked lines under the body. */
  list?: readonly string[];
  /** What is done about it: an emphasised line at the foot of the tile. */
  fix?: string;
  /** What happens afterwards: a quieter line at the foot, under the fix. */
  then?: string;
  /** A link at the very foot, drawn as a small secondary button. */
  link?: {label: string; href: string};
  /**
   * The Website v2 ground the tile is filled with; its text takes that
   * ground's inks. `ink` draws glass, a faint light fill for a tile on an ink
   * band. Defaults to ink on a night ground (an ink CatchSurface band) and to
   * paper elsewhere.
   */
  ground?: Ground;
}

/**
 * One feature in a grid of features: an optional figure with its note, a
 * title, a body, ticked lines, and a foot of the fix, an afterwards line and
 * a link. The foot sits at the bottom, so tiles that a row stretches to one
 * height line up their feet. Lay tiles out with CatchStack (a row with equal
 * set and collapseBelow) or CatchGrid.
 */
export function CatchFeatureTile({title, level = 3, body, figure, figureNote, list, fix, then, link, ground, ...rest}: CatchFeatureTileProps) {
  const context = useCatch();
  const resolved: Ground = ground ?? (catchGroundIsNight(context.ground) ? "ink" : "paper");
  const lines = list?.filter((line) => line.trim() !== "") ?? [];
  const foot = fix || then || link;
  return (
    <div
      {...rest}
      className={styles.tile}
      data-catch-theme={resolved === "ink" ? "dark" : "light"}
      data-ground={resolved}
    >
      {/* The tile is its children's ground: the night one on ink, the plain one otherwise, so a button keeps its outline on a white tile in a tile band. */}
      <CatchGroundProvider ground={resolved === "ink" ? "night" : "ground"}>
        {figure ? (
          <span className={styles.figure}>
            <CatchText numeric variant="display-title">{figure}</CatchText>
            {figureNote ? <CatchText tone="secondary" variant="label-kicker">{figureNote}</CatchText> : null}
          </span>
        ) : null}
        <CatchText as={level === 2 ? "h2" : "h3"} variant="title-bar">{title}</CatchText>
        {body ? <CatchText as="p" tone="secondary" variant="body">{body}</CatchText> : null}
        {lines.length > 0 ? (
          <ul className={styles.list}>
            {lines.map((line, index) => (
              <li className={styles.line} key={`${index}:${line}`}>
                <CatchMarker kind="check" />
                <CatchText variant="body">{line}</CatchText>
              </li>
            ))}
          </ul>
        ) : null}
        {foot ? (
          <div className={styles.foot}>
            {fix ? <CatchText as="p" className={styles.rule} variant="label-action">{fix}</CatchText> : null}
            {then ? <CatchText as="p" className={styles.rule} tone="secondary" variant="body-meta">{then}</CatchText> : null}
            {link ? <span className={styles.link}><CatchButton href={link.href} label={link.label} size="sm" variant="secondary" /></span> : null}
          </div>
        ) : null}
      </CatchGroundProvider>
    </div>
  );
}
