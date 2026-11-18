"use client";

import type {HTMLAttributes} from "react";
import {CatchFeeExamples, type CatchFeeExample} from "./CatchFeeExamples";
import {CatchText} from "./CatchText";
import styles from "./CatchFeeCapChart.module.css";

/** One stretch of the bar: its words and its share of the bar's length. Resolved copy. */
export interface CatchFeeCapChartPart {
  label: string;
  /** Its length against the other parts, such as 2 and 3. */
  share: number;
}

/** A worked example under the bar. Resolved copy. */
export type CatchFeeCapChartExample = CatchFeeExample;

export interface CatchFeeCapChartProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "color" | "style"> {
  /** The stretch the fee is charged on, then the stretch past the cap. */
  parts: readonly [CatchFeeCapChartPart, CatchFeeCapChartPart];
  /** Worked examples either side of the cap, two across. */
  examples?: readonly CatchFeeCapChartExample[];
}

/**
 * How a capped fee works, drawn (PlaybookPricing's .capbar): a 56px bar at
 * 16px corners whose coral stretch is where the fee is charged and whose mint
 * stretch is the rest of the billing cycle, each labelled in 13px bold; then
 * worked examples two across as white cards (.ex). It is the second column of
 * the cap band, a CatchSplitSection on the paper ground.
 */
export function CatchFeeCapChart({parts, examples, ...rest}: CatchFeeCapChartProps) {
  return (
    <div className={styles.chart} {...rest}>
      <div className={styles.bar} role="list">
        {parts.map((part, index) => (
          <span className={styles.part} data-part={index === 0 ? "fee" : "free"} key={part.label} role="listitem" style={{flexGrow: part.share}}>
            <CatchText as="span" className={styles.partLabel} variant="label-action">{part.label}</CatchText>
          </span>
        ))}
      </div>
      {examples && examples.length > 0 ? <div className={styles.examples}><CatchFeeExamples columns={2} examples={examples} /></div> : null}
    </div>
  );
}
