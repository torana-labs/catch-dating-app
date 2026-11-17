"use client";

import {useId, type HTMLAttributes, type ReactNode} from "react";
import {catchBandActions, catchBandColor, type CatchBandAction} from "./catchBandParts";
import {CatchBandHeader, useCatchBandKicker, type CatchKickerAccent} from "./CatchBandHeader";
import {CatchButton} from "./CatchButton";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchFeeSection.module.css";

/** A worked example under the columns: what is sold, the fee on it and how that is reached. Resolved copy. */
export interface CatchFeeSectionExample {
  title: string;
  value: string;
  body?: string;
}

/** The band's foot line: a sentence and one small action across from it. */
export interface CatchFeeSectionFoot {
  text: string;
  action?: CatchBandAction;
}

export interface CatchFeeSectionProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title"> {
  /** The rate as one giant figure, such as "5%". */
  rate: string;
  /** The headline that completes the rate, such as what it is a share of and its cap. Resolved copy. */
  rateTitle: string;
  /** A display headline over the rate when the band opens its page (/pricing/); without one the rate leads. */
  title?: string;
  /** Defaults to 2; 1 when the band opens its page. */
  level?: 1 | 2;
  kicker?: string;
  /** The kicker's accent; defaults to the kit's yellow. */
  kickerAccent?: CatchKickerAccent;
  /** How the fee works, in a sentence or two. */
  lead?: string;
  /** Short labels under the lead, such as what the plan includes, drawn as translucent pills. */
  labels?: readonly string[];
  /** D20 buttons under the copy. */
  actions?: readonly CatchBandAction[];
  /** The second column: the page's calculator, which owns its state. */
  calculator?: ReactNode;
  /** Worked examples in a row of three under the columns. */
  examples?: readonly CatchFeeSectionExample[];
  /** A line at the band's foot, over a hairline, with a small action. */
  foot?: CatchFeeSectionFoot;
  /** Defaults to ink, the only ground the canvas draws it on. */
  ground?: Ground;
}

function FeeKicker({children, accent}: {children: string; accent: CatchKickerAccent}) {
  return <CatchText {...useCatchBandKicker({accent})}>{children}</CatchText>;
}

/**
 * The fee band of the host landing and /pricing/ (PlaybookHosts #pricing and
 * PlaybookPricing's opening panel): the copy (a kicker, an optional display
 * headline, the rate as one giant coral figure, the headline that completes
 * it, the lead, label pills and D20 actions) beside the page's calculator;
 * then worked examples three across and a foot line with a small action. The
 * columns stack below 840px and the examples on phones. The band is a section
 * named by its headline, or by the rate's headline when it has none.
 */
export function CatchFeeSection({
  rate,
  rateTitle,
  title,
  level = 2,
  kicker,
  kickerAccent = "yellow",
  lead,
  labels,
  actions,
  calculator,
  examples,
  foot,
  ground = "ink",
  ...rest
}: CatchFeeSectionProps) {
  const titleId = `${useId()}-title`;
  const rateHeading = title ? (level === 1 ? "h2" : "h3") : level === 1 ? "h1" : "h2";
  return (
    <CatchSurface {...rest} aria-labelledby={titleId} as="section" block="band" color={catchBandColor(ground)}>
      <div className={styles.columns}>
        <div className={styles.copy}>
          {title ? (
            <CatchBandHeader kicker={kicker} kickerAccent={kickerAccent} level={level} size="hero" title={title} titleId={titleId} />
          ) : kicker ? <FeeKicker accent={kickerAccent}>{kicker}</FeeKicker> : null}
          <CatchText as="p" className={styles.rate} data-after-title={title ? "" : undefined} numeric variant="display-giant">{rate}</CatchText>
          <CatchText as={rateHeading} className={styles.rateTitle} id={title ? undefined : titleId} variant="display-section">{rateTitle}</CatchText>
          {lead ? <CatchText as="p" className={styles.lead} tone="secondary" variant="body-lead">{lead}</CatchText> : null}
          {labels && labels.length > 0 ? (
            <ul className={styles.labels}>
              {labels.map((label) => <li className={styles.label} key={label}><CatchText as="span" variant="body-meta">{label}</CatchText></li>)}
            </ul>
          ) : null}
          {actions && actions.length > 0 ? <div className={styles.actions}>{catchBandActions(actions)}</div> : null}
        </div>
        {calculator != null ? <div className={styles.calculator}>{calculator}</div> : null}
      </div>
      {examples && examples.length > 0 ? (
        <ul className={styles.examples}>
          {examples.map((example) => (
            <li className={styles.example} key={example.title}>
              <CatchText as="span" className={styles.exampleTitle} variant="label-action">{example.title}</CatchText>
              <CatchText as="span" className={styles.exampleValue} numeric variant="display-section">{example.value}</CatchText>
              {example.body ? <CatchText as="span" className={styles.exampleBody} variant="body-meta">{example.body}</CatchText> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {foot ? (
        <div className={styles.foot}>
          <CatchText as="p" variant="body">{foot.text}</CatchText>
          {foot.action ? (
            <CatchButton href={foot.action.href} label={foot.action.label} newTab={foot.action.newTab} onPressed={foot.action.onPressed} size="sm"
              variant={foot.action.variant ?? "secondary"} />
          ) : null}
        </div>
      ) : null}
    </CatchSurface>
  );
}
