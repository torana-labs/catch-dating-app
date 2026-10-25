"use client";

import {useEffect, useRef, useState, type ReactNode} from "react";
import type {PaletteAccent} from "./palette";
import styles from "./CatchScrollStory.module.css";

export interface CatchScrollStoryChapter {
  /** Stable key. */
  id: string;
  /** The chapter as the caller arranges it: number, time, heading, body. */
  content: ReactNode;
  /** A short label the controls show before the title, such as a time. */
  marker?: string;
  /** What the pinned media shows while this chapter is active. */
  media: ReactNode;
  /** The chapter's short name for the controls and the position announcement. */
  title: string;
}

/** The side the pinned media takes on a page at least 840px wide. */
export type CatchScrollStoryMediaSide = "start" | "end";

export interface CatchScrollStoryProps {
  /**
   * Colours the progress and the position marker: the accent on the ink
   * ground, its deep shade on a light ground. Defaults to the ground's ink.
   */
  accent?: PaletteAccent;
  /** Controlled active chapter. */
  activeIndex?: number;
  chapters: readonly CatchScrollStoryChapter[];
  /** The accessible name of the story. */
  label: string;
  /** Defaults to end. */
  mediaSide?: CatchScrollStoryMediaSide;
  /** Accessible name of the next-chapter control. */
  nextLabel: string;
  /** Called when scrolling or a control activates another chapter. */
  onActiveIndexChange?: (index: number) => void;
  /** Accessible name of the previous-chapter control. */
  previousLabel: string;
}

const twoDigits = (value: number) => String(value).padStart(2, "0");

// The strip, 58% to 68% down the viewport, in which a chapter becomes active.
const activeStrip = "-58% 0px -32% 0px";

// After an arrow step, chapters scrolling past the strip on the way to the
// target must not take over; scrolling stops counting once it settles.
const stepSettleMs = 900;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Pinned media beside a sequence of chapters. The chapter crossing the middle
 * of the viewport becomes active and the media follows it; arrows step through
 * the chapters. On a page narrower than 840px the media and its controls pin
 * to the top of the band and the chapters scroll beneath.
 */
export function CatchScrollStory({
  accent,
  activeIndex,
  chapters,
  label,
  mediaSide = "end",
  nextLabel,
  onActiveIndexChange,
  previousLabel,
}: CatchScrollStoryProps) {
  const [ownIndex, setOwnIndex] = useState(0);
  const chapterRefs = useRef<(HTMLLIElement | null)[]>([]);
  const steppingUntil = useRef(0);
  const last = Math.max(0, chapters.length - 1);
  const active = Math.min(Math.max(activeIndex ?? ownIndex, 0), last);

  chapterRefs.current.length = chapters.length;

  const activate = useRef<(index: number) => void>(() => undefined);
  activate.current = (index: number) => {
    if (index === active) return;
    if (activeIndex === undefined) setOwnIndex(index);
    onActiveIndexChange?.(index);
  };

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (Date.now() < steppingUntil.current) return;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = chapterRefs.current.indexOf(entry.target as HTMLLIElement);
        if (index >= 0) activate.current(index);
      }
    }, {rootMargin: activeStrip});
    chapterRefs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, [chapters]);

  if (chapters.length === 0) return null;
  const current = chapters[active];

  const step = (index: number) => {
    activate.current(index);
    const smooth = !prefersReducedMotion();
    steppingUntil.current = smooth ? Date.now() + stepSettleMs : 0;
    chapterRefs.current[index]?.scrollIntoView({behavior: smooth ? "smooth" : "auto", block: "center"});
  };

  return (
    <section
      aria-label={label}
      className={styles.story}
      data-accent={accent}
      data-media-side={mediaSide}
    >
      <div className={styles.pinned}>
        <div className={styles.controls}>
          <button
            aria-label={previousLabel}
            className={styles.arrow}
            disabled={active === 0}
            onClick={() => step(active - 1)}
            type="button"
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <p aria-live="polite" className={styles.now}>
            <span className={styles.position}>
              {`${twoDigits(active + 1)} / ${twoDigits(chapters.length)}`}
              {current.marker ? ` · ${current.marker}` : null}
            </span>
            <span className={styles.title}>{current.title}</span>
          </p>
          <button
            aria-label={nextLabel}
            className={styles.arrow}
            disabled={active === last}
            onClick={() => step(active + 1)}
            type="button"
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
        <div aria-hidden="true" className={styles.progress}>
          {chapters.map((chapter, index) => (
            <span className={styles.segment} data-reached={index <= active || undefined} key={chapter.id} />
          ))}
        </div>
        <div className={styles.media}>
          {chapters.map((chapter, index) => (
            <div
              aria-hidden={index !== active}
              className={styles.frame}
              data-active={index === active || undefined}
              inert={index !== active}
              key={chapter.id}
            >
              {chapter.media}
            </div>
          ))}
        </div>
      </div>
      <ol className={styles.chapters}>
        {chapters.map((chapter, index) => (
          <li
            aria-current={index === active ? "step" : undefined}
            className={styles.chapter}
            data-active={index === active || undefined}
            key={chapter.id}
            ref={(element) => {
              chapterRefs.current[index] = element;
            }}
          >
            {chapter.content}
          </li>
        ))}
      </ol>
    </section>
  );
}
