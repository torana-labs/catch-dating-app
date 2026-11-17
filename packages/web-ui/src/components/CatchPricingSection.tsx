"use client";

import {useId, type HTMLAttributes, type ReactNode} from "react";
import {catchBandActions, catchBandColor, type CatchBandAction} from "./catchBandParts";
import type {CatchTextTone} from "./catchCoreVocabulary";
import {CatchBandHeader} from "./CatchBandHeader";
import {CatchMetricTile} from "./CatchMetricTile";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchPricingSection.module.css";

/** A worked example: what is sold, what it costs and how that is reached. */
export interface CatchPricingSectionExample {
  title: string;
  value: string;
  body?: string;
}

/** A footnote under the band; give it an id so a footnote mark can link to it. */
export interface CatchPricingSectionFootnote {
  id?: string;
  body: ReactNode;
}

export interface CatchPricingSectionProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title"> {
  /** The rate, such as a percentage: one figure that carries the band. */
  rate: string;
  /** The headline that completes the rate, such as what it is a share of. Resolved copy. */
  title: string;
  /** Defaults to 2. */
  level?: 1 | 2;
  /** A short label above the rate. */
  kicker?: string;
  kickerTone?: CatchTextTone;
  /** The cap line, such as the most it costs in a month. */
  cap?: string;
  /** The trial line, such as how long it is free. */
  trial?: string;
  actions?: readonly CatchBandAction[];
  /** Worked examples beside the copy, each a metric tile. */
  examples?: readonly CatchPricingSectionExample[];
  /** A calculator under the columns; the page passes its own, which owns its state. */
  calculator?: ReactNode;
  /** Footnotes at the band's foot, numbered in order. */
  footnotes?: readonly CatchPricingSectionFootnote[];
  /** The band's Website v2 ground; text takes its inks, and ink the dark theme. Defaults to the plain band. */
  ground?: Ground;
}

/**
 * The pricing band of a website page (the playbook kit's pricing): a
 * kicker, the rate as one giant figure (the web display-giant role), the
 * headline that completes it, the cap and trial lines and D20 actions,
 * beside worked examples as metric tiles; then a calculator slot and
 * numbered footnotes. The columns stack below 840px. The band is a section
 * named by its headline.
 */
export function CatchPricingSection({
  rate,
  title,
  level = 2,
  kicker,
  kickerTone = "secondary",
  cap,
  trial,
  actions,
  examples,
  calculator,
  footnotes,
  ground,
  ...rest
}: CatchPricingSectionProps) {
  const titleId = `${useId()}-title`;
  const copy = (
    <CatchStack className={styles.copy} gap={24}>
      <CatchStack gap={16}>
        {kicker ? <CatchText tone={kickerTone} variant="label-kicker">{kicker}</CatchText> : null}
        <CatchText as="p" className={styles.rate} numeric variant="display-giant">{rate}</CatchText>
      </CatchStack>
      <CatchBandHeader level={level} title={title} titleId={titleId} />
      {cap || trial ? (
        <CatchStack gap={8}>
          {cap ? <CatchText as="p" variant="body-lead">{cap}</CatchText> : null}
          {trial ? <CatchText as="p" tone="secondary" variant="body-lead">{trial}</CatchText> : null}
        </CatchStack>
      ) : null}
      {catchBandActions(actions)}
    </CatchStack>
  );
  const exampleTiles = examples && examples.length > 0 ? (
    <ul className={styles.examples}>
      {examples.map((example, index) => (
        <li key={`${index}:${example.title}`}>
          <CatchMetricTile label={example.title} note={example.body} value={example.value} />
        </li>
      ))}
    </ul>
  ) : null;
  return (
    <CatchSurface {...rest} aria-labelledby={titleId} as="section" block="band" color={catchBandColor(ground)}>
      {exampleTiles ? (
        <CatchStack align="center" collapseBelow="expanded" direction="row" equal gap={64}>
          {copy}
          {exampleTiles}
        </CatchStack>
      ) : copy}
      {calculator != null ? <div className={styles.calculator}>{calculator}</div> : null}
      {footnotes && footnotes.length > 0 ? (
        <ol className={styles.footnotes}>
          {footnotes.map((footnote, index) => (
            <li id={footnote.id} key={footnote.id ?? index}>
              <CatchText tone="secondary" variant="body-meta">{footnote.body}</CatchText>
            </li>
          ))}
        </ol>
      ) : null}
    </CatchSurface>
  );
}
