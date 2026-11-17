"use client";

import {CatchText} from "./CatchText";
import styles from "./CatchFeeExamples.module.css";

/** One worked example: what is sold, the fee on it and how that is reached. Resolved copy. */
export interface CatchFeeExample {
  title: string;
  value: string;
  body?: string;
}

export interface CatchFeeExamplesProps {
  examples: readonly CatchFeeExample[];
  /** Defaults to 3; one column on phones. */
  columns?: 2 | 3;
  /** day: white cards with a hairline ring (on white or paper). ink: translucent cards on the ink panel. Defaults to day. */
  on?: "day" | "ink";
}

/**
 * Worked examples of a fee (playbook-panels.css .pg .ex): cards 12px apart,
 * each 20px-cornered, with the title, the fee as a display figure and how it
 * is reached. On white and paper the cards are white with a hairline ring,
 * 20px inside, with 32px figures; on the ink panel they take the translucent
 * fill, 18px inside, with 30px figures (PlaybookHosts .ex).
 */
export function CatchFeeExamples({examples, columns = 3, on = "day"}: CatchFeeExamplesProps) {
  return (
    <ul className={styles.examples} data-columns={columns} data-on={on}>
      {examples.map((example) => (
        <li className={styles.example} key={example.title}>
          <CatchText as="span" className={styles.title} variant="label-action">{example.title}</CatchText>
          <CatchText as="span" className={styles.value} numeric variant="display-section">{example.value}</CatchText>
          {example.body ? <CatchText as="span" className={styles.body} variant="body-small">{example.body}</CatchText> : null}
        </li>
      ))}
    </ul>
  );
}
