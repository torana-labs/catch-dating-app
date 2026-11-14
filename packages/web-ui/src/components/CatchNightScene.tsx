"use client";

import {useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode} from "react";
import type {CatchFormat} from "./catchCoreVocabulary";
import {CatchChip} from "./CatchChip";
import {CatchDeviceFrame} from "./CatchDeviceFrame";
import type {PaletteAccent} from "./palette";
import styles from "./CatchNightScene.module.css";

export interface CatchNightSceneMoment {
  /** When it happens, such as "Thursday" or "6:20 AM". */
  time: string;
  title: string;
  body: string;
  /**
   * The event property this moment relies on, phrased as a fact about the
   * event, such as "Grouped by pace". It shows on the focused moment only.
   */
  badge?: string;
  /**
   * The phone's screen for this moment, usually a capture image that carries
   * the description. Ignored with frame "capture", which draws `capture`.
   */
  screen?: ReactNode;
  /** With frame "capture": the framed app capture and the part of it this moment is about. */
  capture?: CatchNightSceneCapture | null;
}

/** A rectangle in a capture's own pixels. */
export interface CatchNightSceneBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A framed app capture (the PNG carries its device frame) for frame
 * "capture". On a wide band the scene shows the device large, running off the
 * bottom edge; on a phone-width band it shows only `focus`, frameless, at the
 * band's width, so the app's text stays readable.
 */
export interface CatchNightSceneCapture {
  src: string;
  /** Describes what the moment's screen shows. */
  alt: string;
  /** Intrinsic pixel size. */
  width: number;
  height: number;
  /** The app screen inside the device frame; a moment without `focus` shows its top. */
  screen?: CatchNightSceneBox;
  /** The part of the screen the moment is about. */
  focus?: CatchNightSceneBox;
  loading?: "eager" | "lazy";
}

export interface CatchNightSceneJourney {
  /** The colour of the timeline, the progress and the badge. */
  accent: PaletteAccent;
  /** The event, such as "Sunday Social Run". */
  event: string;
  /** A sentence under the event on a wide band. */
  lead?: string;
  moments: readonly CatchNightSceneMoment[];
  /** Who and where, such as "Carter Road Runners · Carter Road, Bandra". */
  where: string;
}

export interface CatchNightSceneFormat {
  format: CatchFormat;
  title: string;
}

export interface CatchNightSceneProps {
  /**
   * device (the default): the scene draws a generic phone (CatchDeviceFrame)
   * around unframed screens. none: each screen already carries its own frame,
   * such as a framed app capture (CatchAppCaptureImage), so the scene only
   * stacks and cross-fades them. capture: each moment brings a framed
   * `capture`; the scene crops the device on a wide band and shows only the
   * moment's focus box, frameless, on a phone-width band.
   */
  frame?: "device" | "none" | "capture";
  /** The event types the reader can follow; picking one swaps the journey. */
  formats: readonly CatchNightSceneFormat[];
  journey: CatchNightSceneJourney;
  /** The scene's accessible name, such as "Sunday Social Run, moment by moment". */
  label: string;
  /** Called with the picked event type's index. */
  onSelect?: (index: number) => void;
  /** The chip group's accessible name, such as "Event type". */
  pickerLabel: string;
  /** Words before the chips on a wide band, such as "Show me a". */
  pickerLead?: string;
  /** The caption's position on a phone-width band, such as "3 of 5". */
  position: (index: number, total: number) => string;
  /** The selected event type's index. */
  selected: number;
  /** The moment list's accessible name, such as "Moments in the evening". */
  timelineLabel: string;
}

/** Where a moment's capture is cropped on a phone-width band: its focus box, or else the top of its screen at full width. */
export function catchNightSceneFocus(capture: CatchNightSceneCapture): CatchNightSceneBox {
  if (capture.focus) return capture.focus;
  const screen = capture.screen ?? {x: 0, y: 0, width: capture.width, height: capture.height};
  return {x: screen.x, y: screen.y, width: screen.width, height: Math.min(screen.height, Math.round(screen.width * 10 / 7))};
}

const captureVars = (capture: CatchNightSceneCapture): CSSProperties => {
  const focus = catchNightSceneFocus(capture);
  return {
    "--catch-night-capture-w": capture.width,
    "--catch-night-capture-h": capture.height,
    "--catch-night-focus-x": focus.x,
    "--catch-night-focus-y": focus.y,
    "--catch-night-focus-w": focus.width,
    "--catch-night-focus-h": focus.height,
  } as CSSProperties;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One evening, moment by moment, in a single pinned viewport (proposal
 * WebNightScene, a scene mode for the scroll story). The scene pins while the
 * reader scrolls through a track one step taller per moment, and the moment
 * whose step is in view takes the focus: its screen fades in on the phone and
 * the moment's badge names the event property it relies on. On a wide band
 * the timeline sits to the left of the phone and each moment is a button that
 * scrolls to it; on a phone-width band the chips, phone, progress and a caption
 * stack in the one viewport. With frame "capture" a phone-width band shows
 * each moment's focus crop instead of the whole phone, beside the caption when
 * the screen is short (a phone held sideways).
 */
export function CatchNightScene({frame = "device", formats, journey, label, onSelect, pickerLabel, pickerLead, position, selected, timelineLabel}: CatchNightSceneProps) {
  const moments = journey.moments;
  const count = Math.max(1, moments.length);
  const [ownActive, setOwnActive] = useState(0);
  const active = Math.min(ownActive, count - 1);
  const track = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);

  const geometry = useCallback(() => {
    const element = track.current;
    if (!element) return null;
    const travel = Math.max(1, element.offsetHeight - (scene.current?.offsetHeight ?? 0));
    return {top: element.getBoundingClientRect().top, travel};
  }, []);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const measured = geometry();
      if (!measured) return;
      const progress = Math.min(Math.max(-measured.top / measured.travel, 0), 0.9999);
      setOwnActive(Math.min(count - 1, Math.floor(progress * count)));
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", schedule, {passive: true});
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [count, geometry]);

  const scrollToTrack = (offset: number) => {
    const measured = geometry();
    if (!measured) return;
    window.scrollTo({top: measured.top + window.scrollY + offset * measured.travel, behavior: prefersReducedMotion() ? "auto" : "smooth"});
  };
  const jump = (index: number) => scrollToTrack((index + 0.5) / count);
  const pick = (index: number) => {
    onSelect?.(index);
    const measured = geometry();
    if (measured && measured.top < 0) scrollToTrack(0);
  };

  const current = moments[active];
  const activeCapture = current?.capture ?? moments.find((moment) => moment.capture)?.capture ?? null;
  const captures = (
    <div className={styles.card} style={activeCapture ? captureVars(activeCapture) : undefined}>
      {moments.map((moment, index) => (
        <div aria-hidden={index === active ? undefined : true} className={styles.layer} data-active={index === active || undefined}
          key={`${moment.time}-${moment.title}`} style={moment.capture ? captureVars(moment.capture) : undefined}>
          {moment.capture ? (
            <img alt={moment.capture.alt} className={styles.capture} decoding="async" height={moment.capture.height}
              loading={moment.capture.loading ?? "lazy"} src={moment.capture.src} width={moment.capture.width} />
          ) : null}
        </div>
      ))}
    </div>
  );
  const screens = (
    <div className={styles.screens}>
      {moments.map((moment, index) => (
        <div aria-hidden={index === active ? undefined : true} className={styles.screen} data-active={index === active || undefined}
          key={`${moment.time}-${moment.title}`}>
          {moment.screen}
        </div>
      ))}
    </div>
  );
  return (
    <div className={styles.track} data-accent={journey.accent} data-frame={frame} ref={track} style={{"--catch-night-moments": count} as CSSProperties}>
      <div aria-label={label} className={styles.scene} ref={scene} role="group">
        <div className={styles.story}>
        <div aria-label={pickerLabel} className={styles.picker} role="radiogroup">
          {pickerLead ? <span aria-hidden="true" className={styles.lead}>{pickerLead}</span> : null}
          {formats.map((item, index) => (
            <CatchChip colourWhenSelected dot={item.format} key={item.format} kind="choice" label={item.title}
              onPressed={() => pick(index)} selected={index === selected} size="sm" />
          ))}
        </div>
        <div className={styles.head}>
          <span className={styles.event}>{journey.event}</span>
          <span className={styles.where}>{journey.where}</span>
          {journey.lead ? <span className={styles.intro}>{journey.lead}</span> : null}
        </div>
        <ol aria-label={timelineLabel} className={styles.timeline}>
          {moments.map((moment, index) => (
            <li key={`${moment.time}-${moment.title}`}>
              <button aria-current={index === active ? "step" : undefined} className={styles.moment} data-active={index === active || undefined}
                onClick={() => jump(index)} type="button">
                <span className={styles.time}>{moment.time}</span>
                <span className={styles.copy}>
                  {index === active && moment.badge ? <span className={styles.badge}><span aria-hidden="true" className={styles.mark} />{moment.badge}</span> : null}
                  <span className={styles.title}>{moment.title}</span>
                  {index === active ? <span className={styles.body}>{moment.body}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ol>
        </div>
        <div className={styles.phone} data-frame={frame}>
          {frame === "capture" ? captures : frame === "device" ? <CatchDeviceFrame kind="phone">{screens}</CatchDeviceFrame> : screens}
        </div>
        <div aria-hidden="true" className={styles.segments}>
          {moments.map((moment, index) => <span data-done={index <= active || undefined} key={`${moment.time}-${moment.title}`} />)}
        </div>
        <div aria-live="polite" className={styles.now}>
          <span className={styles.kicker}>{`${journey.event} · ${current?.time ?? ""} · ${position(active + 1, moments.length)}`}</span>
          {current?.badge ? <span className={styles.badge}><span aria-hidden="true" className={styles.mark} />{current.badge}</span> : null}
          <span className={styles.nowTitle}>{current?.title}</span>
          <span className={styles.nowBody}>{current?.body}</span>
        </div>
      </div>
    </div>
  );
}
