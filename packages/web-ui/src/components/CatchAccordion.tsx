import type {ReactNode} from "react";
import {CatchIcon} from "./CatchIcon";
import {CatchLegacyText} from "./CatchLegacyText";
import {CatchText} from "./CatchText";
import styles from "./CatchAccordion.module.css";

/** The Website v2 item: an id, a question and an answer. */
export interface CatchAccordionItem {
  id: string;
  question: string;
  answer: ReactNode;
}

/** The system item: a title and a body. */
export interface CatchAccordionEntry {
  title: ReactNode;
  body: ReactNode;
}

/** md for in-page "Good to know"; lg for website FAQs. */
export type CatchAccordionSize = "md" | "lg";

export interface CatchAccordionProps {
  items: readonly (CatchAccordionItem | CatchAccordionEntry)[];
  /** Opening one item closes the others, as the boards' FAQs do. */
  exclusive?: boolean;
  /** The system's name: several items may be open at once (the opposite of exclusive). */
  multiple?: boolean;
  /** Ids (or, for system items, positions) open on first render. */
  defaultOpen?: readonly (string | number)[];
  /** Names an exclusive group; needed when two exclusive accordions share a page. */
  name?: string;
  /** Draws the system Accordion at this size; without it the Website v2 accordion. */
  size?: CatchAccordionSize;
}

/**
 * catch.accordion: questions and answers that open in place between
 * hairlines. Each item is a native disclosure, so keyboard and screen-reader
 * behaviour come from the browser, and answers are in the page before any
 * script runs. With a size it takes the system's type and chevron.
 */
export function CatchAccordion({items, exclusive, multiple, defaultOpen = [], name = "catch-accordion", size}: CatchAccordionProps) {
  const single = exclusive ?? !multiple;
  return (
    <div className={styles.accordion} data-size={size}>
      {items.map((item, index) => {
        const system = "title" in item;
        const key = system ? String(index) : item.id;
        const open = defaultOpen.includes(system ? index : item.id);
        const title = system ? item.title : item.question;
        const body = system ? item.body : item.answer;
        return (
          <details className={styles.item} key={key} name={single ? name : undefined} open={open || undefined}>
            <summary className={styles.question}>
              {size ? <span>{title}</span> : <CatchLegacyText as="span" variant="titleL">{title as string}</CatchLegacyText>}
              {size ? <span className={styles.chevron}><CatchIcon name="expand" size={20} /></span> : <span aria-hidden="true" className={styles.sign} />}
            </summary>
            <div className={styles.answer}>
              {typeof body !== "string" ? body : size
                ? <CatchText as="p" tone="secondary" variant="body">{body}</CatchText>
                : <CatchLegacyText as="p" color="ink2" variant="bodyL">{body}</CatchLegacyText>}
            </div>
          </details>
        );
      })}
    </div>
  );
}
