import type {ReactNode} from "react";
import {CatchText} from "./CatchText";
import styles from "./CatchAccordion.module.css";

export interface CatchAccordionItem {
  id: string;
  question: string;
  answer: ReactNode;
}

export interface CatchAccordionProps {
  items: readonly CatchAccordionItem[];
  /** Opening one item closes the others, as the boards' FAQs do. */
  exclusive?: boolean;
  /** Ids open on first render. */
  defaultOpen?: readonly string[];
  /** Names an exclusive group; needed when two exclusive accordions share a page. */
  name?: string;
}

/**
 * Website v2 accordion (CAT-249, from CAT-176): questions that open in place
 * between hairlines. Each item is a native disclosure, so keyboard and
 * screen-reader behaviour come from the browser, and answers are in the page
 * before any script runs.
 */
export function CatchAccordion({items, exclusive = true, defaultOpen = [], name = "catch-accordion"}: CatchAccordionProps) {
  return (
    <div className={styles.accordion}>
      {items.map((item) => (
        <details className={styles.item} key={item.id} name={exclusive ? name : undefined} open={defaultOpen.includes(item.id) || undefined}>
          <summary className={styles.question}>
            <CatchText as="span" variant="titleL">{item.question}</CatchText>
            <span aria-hidden="true" className={styles.sign} />
          </summary>
          <div className={styles.answer}>
            {typeof item.answer === "string" ? <CatchText as="p" color="ink2" variant="bodyL">{item.answer}</CatchText> : item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
