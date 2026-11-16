"use client";

import {useId, type HTMLAttributes, type ReactNode} from "react";
import type {CatchTextTone} from "./catchCoreVocabulary";
import {CatchBandHeader} from "./CatchBandHeader";
import {CatchButton} from "./CatchButton";
import {CatchMarker} from "./CatchMarker";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";
import styles from "./CatchArticleBody.module.css";

/** A highlighted tip under a section's text: an optional bold label, then the tip. */
export interface CatchArticleBodyTip {
  label?: string;
  text: string;
}

/** One section of the article: its anchor id, heading, paragraphs, ticked list and tip. */
export interface CatchArticleBodySection {
  /** Unique on the page; the contents link to it. */
  id: string;
  title: string;
  paragraphs: readonly string[];
  list?: readonly string[];
  tip?: CatchArticleBodyTip;
}

export interface CatchArticleBodyProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title"> {
  /** The article's headline. Resolved copy; the caller localizes it. */
  title: string;
  /** Defaults to 1: an article is its page's main heading. */
  level?: 1 | 2;
  kicker?: string;
  kickerTone?: CatchTextTone;
  lead?: string;
  /** A line under the lead, such as the reading time. */
  meta?: string;
  sections: readonly CatchArticleBodySection[];
  /** The contents' accessible name and heading, such as "In this guide". Without it there are no contents. */
  tocLabel?: string;
  /** Under the contents in the sticky column, such as a call-to-action card. */
  aside?: ReactNode;
}

/**
 * The body of a guide or article page (the playbook kit's article): a
 * CatchBandHeader with a meta line, then sections, each an anchored
 * section named by its heading with paragraphs, a ticked list and a tip;
 * beside a 320px column, sticky on a wide page, holding the contents (links
 * to each section) and an aside slot. Without contents or an aside the text
 * is one centred 760px column. The article is named by its headline.
 */
export function CatchArticleBody({title, level = 1, kicker, kickerTone, lead, meta, sections, tocLabel, aside, ...rest}: CatchArticleBodyProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const heading = level === 1 ? "h2" : "h3";
  const hasSide = Boolean(tocLabel) || aside != null;
  return (
    <CatchSurface {...rest} aria-labelledby={titleId} as="article" block="band">
      <div className={styles.article} data-side={hasSide ? "" : undefined}>
        <div className={styles.main}>
          <CatchBandHeader kicker={kicker} kickerTone={kickerTone} lead={lead} level={level} title={title} titleId={titleId} />
          {meta ? <CatchText as="p" className={styles.meta} tone="secondary" variant="body-meta">{meta}</CatchText> : null}
          {sections.map((section) => (
            <section aria-labelledby={`${id}-${section.id}`} className={styles.section} id={section.id} key={section.id}>
              <CatchText as={heading} id={`${id}-${section.id}`} variant="section-title">{section.title}</CatchText>
              {section.paragraphs.map((paragraph, index) => (
                <CatchText as="p" className={styles.paragraph} key={`${index}:${paragraph.slice(0, 24)}`} variant="body-lead">{paragraph}</CatchText>
              ))}
              {section.list && section.list.length > 0 ? (
                <ul className={styles.list}>
                  {section.list.map((line, index) => (
                    <li className={styles.line} key={`${index}:${line}`}>
                      <CatchMarker kind="check" />
                      <CatchText variant="body">{line}</CatchText>
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.tip ? (
                <p className={styles.tip}>
                  {section.tip.label ? <CatchText as="strong" variant="label-action">{section.tip.label} </CatchText> : null}
                  <CatchText variant="body">{section.tip.text}</CatchText>
                </p>
              ) : null}
            </section>
          ))}
        </div>
        {hasSide ? (
          <div className={styles.side}>
            {tocLabel ? (
              <nav aria-label={tocLabel} className={styles.toc}>
                <CatchText as="p" tone="secondary" variant="label-kicker">{tocLabel}</CatchText>
                <ol className={styles.links}>
                  {sections.map((section) => (
                    <li className={styles.link} key={section.id}>
                      <CatchButton href={`#${section.id}`} label={section.title} recipe="text" tone="neutral" />
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
            {aside}
          </div>
        ) : null}
      </div>
    </CatchSurface>
  );
}
