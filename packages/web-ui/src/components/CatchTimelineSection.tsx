"use client";

import {useId, type HTMLAttributes, type ReactNode} from "react";
import {catchBandActions, catchBandColor, catchBandKickerAccent, type CatchBandAction} from "./catchBandParts";
import {CatchBandHeader, type CatchKickerAccent} from "./CatchBandHeader";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchTimelineSection.module.css";

/** One moment of the timeline: when, what happens and, once chosen, how. Resolved copy. */
export interface CatchTimelineMoment {
  time: string;
  title: string;
  body?: string;
}

export interface CatchTimelineSectionProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "onSelect" | "style" | "title"> {
  title: string;
  level?: 1 | 2;
  kicker?: string;
  /** Defaults to yellow, the canvas's night kicker. */
  kickerAccent?: CatchKickerAccent;
  lead?: string;
  /** Controls between the lead and the timeline, such as which event to follow; the page owns their state. */
  picker?: ReactNode;
  moments: readonly CatchTimelineMoment[];
  /** The chosen moment, opened with its body; the media shows it. */
  selected: number;
  /** Chooses a moment; without it the timeline is a plain list with the selected moment open. */
  onSelect?: (index: number) => void;
  /** The timeline's accessible name. */
  timelineLabel: string;
  actions?: readonly CatchBandAction[];
  /** The second column, the chosen moment's screen, usually a phone capture; it meets the band's bottom edge. */
  media?: ReactNode;
  /** Defaults to ink. */
  ground?: Ground;
}

/**
 * A night, moment by moment (PlaybookHosts #night, .flush and .tl): the
 * header, optional controls and a timeline down a hairline, where the chosen
 * moment is a translucent row with a coral edge, a larger title and its
 * line, and every other moment is its time and title; beside it the chosen
 * moment's screen, flush with the band's foot. Each moment is a button when
 * the page can choose one. The columns stack below 840px.
 */
export function CatchTimelineSection({title, level = 2, kicker, kickerAccent, lead, picker, moments, selected, onSelect, timelineLabel, actions, media, ground = "ink", ...rest}: CatchTimelineSectionProps) {
  const titleId = `${useId()}-title`;
  return (
    <CatchSurface {...rest} aria-labelledby={titleId} as="section" block="band" color={catchBandColor(ground)}
      data-flush={media ? "" : undefined} padding={media ? "none" : undefined}>
      <div className={styles.columns} data-flush={media ? "" : undefined}>
        <div className={styles.text}>
          <CatchBandHeader kicker={kicker} kickerAccent={catchBandKickerAccent(kickerAccent, undefined, "yellow")} lead={lead} level={level} size="section" title={title} titleId={titleId} />
          {picker ? <div className={styles.picker}>{picker}</div> : null}
          <ol aria-label={timelineLabel} className={styles.timeline}>
            {moments.map((moment, index) => {
              const on = index === selected;
              const copy = (
                <>
                  <CatchText as="span" className={styles.time} variant="body-small">{moment.time}</CatchText>
                  <span className={styles.copy}>
                    <CatchText as="span" className={styles.title} variant="title-row">{moment.title}</CatchText>
                    {on && moment.body ? <CatchText as="span" className={styles.body} variant="body">{moment.body}</CatchText> : null}
                  </span>
                </>
              );
              return (
                <li className={styles.moment} data-on={on ? "" : undefined} key={`${index}:${moment.title}`}>
                  {onSelect ? (
                    <button aria-current={on ? "step" : undefined} className={styles.row} onClick={() => onSelect(index)} type="button">{copy}</button>
                  ) : <span className={styles.row}>{copy}</span>}
                </li>
              );
            })}
          </ol>
          {actions && actions.length > 0 ? <div className={styles.actions}>{catchBandActions(actions)}</div> : null}
        </div>
        {media ? <div className={styles.media}>{media}</div> : null}
      </div>
    </CatchSurface>
  );
}
