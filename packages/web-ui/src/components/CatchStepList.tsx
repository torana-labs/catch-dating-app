import type {CSSProperties} from "react";
import {CatchText} from "./CatchText";
import styles from "./CatchStepList.module.css";

export interface CatchStepRowData {
  title: string;
  body?: string;
  /** Replaces the step's automatic number, such as a time of day. */
  marker?: string;
  /** A short note under the body in the accent colour. */
  tag?: string;
}

export interface CatchStepListProps {
  steps: readonly CatchStepRowData[];
  /** A CSS colour for the numbers, nodes and tags; the theme primary by default. */
  accent?: string;
}

/**
 * Flutter's CatchStepList: ordered rows with automatic numbers or markers, a
 * node on a connecting trace, and the step's title, body and tag. The final
 * row has no trailing connector.
 */
export function CatchStepList({steps, accent}: CatchStepListProps) {
  if (steps.length === 0) return null;
  return (
    <ol className={styles.list} role="list" style={accent ? ({"--catch-step-accent": accent} as CSSProperties) : undefined}>
      {steps.map((step, index) => (
        <li className={styles.step} key={`${index}-${step.title}`}>
          <span className={styles.index}>{step.marker ?? String(index + 1).padStart(2, "0")}</span>
          <span aria-hidden="true" className={styles.rail} />
          <span className={styles.copy}>
            <CatchText as="span" color="ink" variant="bodyLead">{step.title}</CatchText>
            {step.body != null ? <CatchText as="span" variant="supporting">{step.body}</CatchText> : null}
            {step.tag?.trim() ? <span className={styles.tag}><CatchText as="span" color="inherit" variant="statusLabel">{step.tag}</CatchText></span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
