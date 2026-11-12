"use client";

import {useEffect, useId, useRef, useState, type CSSProperties} from "react";
import {CatchAvatar} from "./CatchAvatar";
import {CatchButton} from "./CatchButton";
import type {PaletteAccent} from "./palette";
import styles from "./CatchPipelineBoard.module.css";

export interface CatchPipelineBoardStep {
  /** The column heading, such as "Applied". */
  label: string;
  /** The tab, such as "They apply". */
  title: string;
  /** The selected tab's colour. */
  accent: PaletteAccent;
  /** The step's figure under the board, such as "9 approved · 1 on the waitlist". */
  stat: string;
  /** A sentence about the step. */
  body: string;
}

export interface CatchPipelineBoardGuest {
  name: string;
  /** The last step (0-based) this guest reaches; they stop in that column. */
  reached: number;
}

export interface CatchPipelineBoardProps {
  /** The board's accessible name, such as "Guests moving from applied to booked". */
  boardLabel: string;
  guests: readonly CatchPipelineBoardGuest[];
  /** How long each step shows while the board plays. Defaults to 2800ms. */
  intervalMs?: number;
  /** The tab list's accessible name, such as "Booking steps". */
  label: string;
  /** The replay button, such as "Play again". */
  replayLabel: string;
  steps: readonly CatchPipelineBoardStep[];
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Guests moving through a booking pipeline (proposal WebPipelineBoard): one
 * tab per step over a board of columns, each guest a chip that slides into
 * the furthest column it reaches so far. It plays on its own while on screen,
 * unless the reader prefers reduced motion; choosing a tab stops it there,
 * and the replay button starts it again from the first step.
 */
export function CatchPipelineBoard({boardLabel, guests, intervalMs = 2800, label, replayLabel, steps}: CatchPipelineBoardProps) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const boardId = useId();
  const count = Math.max(1, steps.length);

  useEffect(() => {
    const element = root.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false), {threshold: 0.25});
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !visible || prefersReducedMotion()) return;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % count), intervalMs);
    return () => window.clearInterval(timer);
  }, [count, intervalMs, playing, visible]);

  const reachedBy = steps.map((_, index) => guests.filter((guest) => guest.reached >= index).length);
  const rows = steps.map(() => 0);
  const now = steps[step];

  return (
    <div className={styles.pipeline} ref={root} style={{"--catch-pipeline-columns": count} as CSSProperties}>
      <div aria-label={label} className={styles.tabs} role="tablist">
        {steps.map((item, index) => (
          <button aria-controls={boardId} aria-selected={index === step} className={styles.tab} data-accent={item.accent} key={item.label}
            onClick={() => { setStep(index); setPlaying(false); }} role="tab" type="button">
            <span className={styles.number}>{index + 1}</span>
            <span className={styles.title}>{item.title}</span>
          </button>
        ))}
      </div>
      <div aria-label={boardLabel} className={styles.board} id={boardId} role="tabpanel">
        {steps.map((item, index) => (
          <div aria-hidden="true" className={styles.column} data-reached={index <= step || undefined} key={item.label}
            style={{"--catch-pipeline-column": index} as CSSProperties}>
            <span className={styles.columnLabel}>{item.label}</span>
            <span className={styles.count}>{index <= step ? reachedBy[index] : 0}</span>
          </div>
        ))}
        <ul className={styles.guests}>
          {guests.map((guest) => {
            const column = Math.max(0, Math.min(step, guest.reached, count - 1));
            const row = rows[column]++;
            return (
              <li className={styles.guest} data-done={column === count - 1 || undefined} key={guest.name}
                style={{"--catch-pipeline-column": column, "--catch-pipeline-row": row} as CSSProperties}>
                <CatchAvatar name={guest.name} size={30} />
                <span className={styles.name}>{guest.name}</span>
                <span className={styles.where}>{`, ${steps[column]?.label ?? ""}`}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className={styles.foot}>
        <div aria-live={playing ? "off" : "polite"} className={styles.now}>
          <span className={styles.stat}>{now?.stat}</span>
          <span className={styles.body}>{now?.body}</span>
        </div>
        <CatchButton label={replayLabel} leadingIcon="restart" onPressed={() => { setStep(0); setPlaying(true); }} size="md" variant="secondary" />
      </div>
    </div>
  );
}
