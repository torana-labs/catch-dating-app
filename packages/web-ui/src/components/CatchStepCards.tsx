"use client";

import {CatchText} from "./CatchText";
import type {CatchStepRowData} from "./CatchStepList";
import styles from "./CatchStepCards.module.css";

/** Where the cards sit: day (white or paper), night (the ink panel) or a colour panel. */
export type CatchStepCardsOn = "day" | "night" | "colour";

export interface CatchStepCardsProps {
  /** Each step's title, an optional line and an optional tag; markers are ignored (a timeline is CatchStepList). */
  steps: readonly CatchStepRowData[];
  /** Defaults to day. */
  on?: CatchStepCardsOn;
  /** The heading level of each step's title. Defaults to 3. */
  headingLevel?: 2 | 3;
  /**
   * The step the reader is on (the canvas's li.on): only that card is
   * filled. Without it every card is filled.
   */
  current?: number;
}

/**
 * The canvas's numbered step cards (playbook-panels.css .pg .steps): a
 * display number beside each step's title and line on a translucent card.
 * CatchSplitSection draws its unmarked steps with them; a page can set them
 * in any band, such as the host landing's start band.
 */
export function CatchStepCards({steps, on = "day", headingLevel = 3, current}: CatchStepCardsProps) {
  return (
    <ol className={styles.steps} data-on={on} role="list">
      {steps.map((step, index) => (
        <li className={styles.step} data-filled={current == null || current === index ? "" : undefined} key={`${index}:${step.title}`}>
          <span aria-hidden="true" className={styles.stepNumber}>{index + 1}</span>
          <span className={styles.stepCopy}>
            <CatchText as={headingLevel === 2 ? "h2" : "h3"} variant="title-bar">{step.title}</CatchText>
            {step.body ? <CatchText as="p" className={styles.stepBody} tone="secondary" variant="body-small">{step.body}</CatchText> : null}
            {step.tag?.trim() ? <CatchText as="p" className={styles.stepBody} variant="label-action">{step.tag}</CatchText> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
