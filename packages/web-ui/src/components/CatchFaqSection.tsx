"use client";

import {useId, type HTMLAttributes, type ReactNode} from "react";
import {catchBandColor, catchBandKickerAccent} from "./catchBandParts";
import type {CatchTextTone} from "./catchCoreVocabulary";
import {CatchAccordion, type CatchAccordionItem} from "./CatchAccordion";
import {CatchBandHeader, type CatchKickerAccent} from "./CatchBandHeader";
import {CatchSurface} from "./CatchSurface";
import type {Ground} from "./palette";
import styles from "./CatchFaqSection.module.css";

export interface CatchFaqSectionProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title"> {
  /** The headline. Resolved copy; the caller localizes it. */
  title: string;
  /** Defaults to 2. */
  level?: 1 | 2;
  kicker?: string;
  kickerTone?: CatchTextTone;
  /** The kicker's accent on white, paper and ink; defaults to the kit's (mint, coral on ink). A colour ground takes its secondary ink. */
  kickerAccent?: CatchKickerAccent;
  lead?: string;
  /** The questions, each with a unique id; an answer may be a node with links. */
  items: readonly CatchAccordionItem[];
  /** Ids open on first render. Defaults to the first question; pass [] for none. */
  defaultOpen?: readonly string[];
  /** A line under the headline, such as where to ask something else; the page passes its own link. */
  footer?: ReactNode;
  /** The band's Website v2 ground; text takes its inks, and ink the dark theme. Defaults to the plain band. */
  ground?: Ground;
}

/**
 * The questions band of a website page (the playbook kit's FAQ): a
 * CatchBandHeader with an optional footer line (such as a WhatsApp link)
 * beside a CatchAccordion of questions, one open at a time. The answers are
 * native disclosures, in the page before any script runs. The columns stack
 * below 840px, and the band is a section named by its headline.
 */
export function CatchFaqSection({title, level = 2, kicker, kickerTone, kickerAccent, lead, items, defaultOpen, footer, ground, ...rest}: CatchFaqSectionProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const open = defaultOpen ?? (items[0] ? [items[0].id] : []);
  return (
    <CatchSurface {...rest} aria-labelledby={titleId} as="section" block="band" color={catchBandColor(ground)}>
      <div className={styles.faq}>
        <div className={styles.head}>
          <CatchBandHeader kicker={kicker} kickerAccent={catchBandKickerAccent(kickerAccent, ground, "mint")} kickerTone={kickerTone} lead={lead} level={level} size="section" title={title} titleId={titleId} />
          {footer != null ? <div className={styles.footer}>{footer}</div> : null}
        </div>
        <div className={styles.questions}>
          <CatchAccordion defaultOpen={open} exclusive items={items} name={`${id}-faq`} size="lg" />
        </div>
      </div>
    </CatchSurface>
  );
}
