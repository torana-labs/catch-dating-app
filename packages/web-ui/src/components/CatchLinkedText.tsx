import {Fragment} from "react";
import {CatchIcon} from "./CatchIcon";
import {CatchText} from "./CatchText";
import styles from "./CatchLinkedText.module.css";

/** A link inside the sentence: its words, where it goes, and whether it opens a new tab or ends in an arrow. */
export interface CatchLinkedTextLink {
  label: string;
  href: string;
  newTab?: boolean;
  /** An arrow after the words, for a link that ends the sentence and leads on. */
  arrow?: boolean;
}

/** One piece of the sentence: plain words, or a link. */
export type CatchLinkedTextPart = string | CatchLinkedTextLink;

export interface CatchLinkedTextProps {
  /** The sentence in order, such as ["Or email ", {label, href}, ", or see the ", {label, href}, "."]. */
  parts: readonly CatchLinkedTextPart[];
  /** Defaults to body-small. */
  variant?: "body-small" | "body-meta";
  /** The words' ink; links always take the full ink. Defaults to secondary. */
  tone?: "primary" | "secondary";
}

/**
 * A sentence with links inside it (website cleanup, 21 Nov 2026): "Prefer a
 * person? WhatsApp us or book a walkthrough." The links are underlined words
 * in the sentence, never buttons beside it, so the line wraps like text and
 * keeps one left edge with everything around it.
 */
export function CatchLinkedText({parts, variant = "body-small", tone = "secondary"}: CatchLinkedTextProps) {
  return (
    <CatchText as="p" className={styles.text} tone={tone} variant={variant}>
      {parts.map((part, index) => typeof part === "string" ? <Fragment key={index}>{part}</Fragment> : (
        <a className={styles.link} href={part.href} key={index} rel={part.newTab ? "noopener" : undefined} target={part.newTab ? "_blank" : undefined}>
          {part.label}
          {part.arrow ? <span aria-hidden="true" className={styles.arrow}><CatchIcon name="forward" size={16} /></span> : null}
        </a>
      ))}
    </CatchText>
  );
}
