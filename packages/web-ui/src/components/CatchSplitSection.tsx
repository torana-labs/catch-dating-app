"use client";

import {useId, type HTMLAttributes, type ReactNode} from "react";
import {catchBandActions, catchBandColor, catchBandKickerAccent, type CatchBandAction, type CatchBandLink} from "./catchBandParts";
import type {CatchTextTone} from "./catchCoreVocabulary";
import {CatchBandHeader, type CatchKickerAccent} from "./CatchBandHeader";
import {CatchButton} from "./CatchButton";
import {CatchMarker} from "./CatchMarker";
import {CatchMetricTile} from "./CatchMetricTile";
import {CatchStack} from "./CatchStack";
import {CatchStepCards} from "./CatchStepCards";
import {CatchStepList, type CatchStepRowData} from "./CatchStepList";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchSplitSection.module.css";

/** How the two columns line up: start (the kit's top) or center. */
export type CatchSplitSectionAlign = "start" | "center";

/** A titled group of lines, with an optional marker such as "01" and a link. */
export interface CatchSplitSectionGroup {
  title: string;
  marker?: string;
  list: readonly string[];
  link?: CatchBandLink;
}

/** One item of a checklist: a title and a line under it. */
export interface CatchSplitSectionCheck {
  title: string;
  body?: string;
}

/** A figure with what it means (the kit's sos), drawn as an inline metric. */
export interface CatchSplitSectionMetric {
  value: string;
  label: string;
  note?: string;
}

export interface CatchSplitSectionProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title"> {
  /** The headline. Resolved copy; the caller localizes it. */
  title: string;
  /** Defaults to 2. */
  level?: 1 | 2;
  kicker?: string;
  kickerTone?: CatchTextTone;
  /** The kicker's accent on white, paper and ink; defaults to the kit's (indigo, coral on ink). A colour ground takes its secondary ink. */
  kickerAccent?: CatchKickerAccent;
  lead?: string;
  /** Ticked lines under the lead. */
  ticks?: readonly string[];
  /**
   * Numbered steps, drawn as the canvas's step cards (.pg .steps): a display
   * number beside the title and body on a translucent card. Steps with
   * markers, such as times, are a timeline and draw as a CatchStepList. They
   * take the second column when there is no media, and sit under the copy
   * beside the media otherwise.
   */
  steps?: readonly CatchStepRowData[];
  /** A checklist of ticked tiles; placed like the steps. */
  checks?: readonly CatchSplitSectionCheck[];
  /** Titled groups of lines under the lead. */
  groups?: readonly CatchSplitSectionGroup[];
  /** A figure with what it means, under the groups. */
  metric?: CatchSplitSectionMetric;
  /** A closing paragraph. */
  body?: string;
  actions?: readonly CatchBandAction[];
  /** The second column, usually a CatchScreenPreview. */
  media?: ReactNode;
  /** The media runs to the band's bottom edge (the kit's flush). Needs media. */
  flush?: boolean;
  /** Defaults to center; a flush band always lines its columns up at the end. */
  align?: CatchSplitSectionAlign;
  /** The band's Website v2 ground; text takes its inks, and ink the dark theme. Defaults to the plain band. */
  ground?: Ground;
}

/**
 * A two-column website band (the playbook kit's split, timeline and
 * checklist): a CatchBandHeader, ticked lines, groups, a metric, a closing
 * paragraph and D20 actions beside a media slot, or beside numbered steps or
 * a checklist when there is no media. A timeline is steps with time markers
 * beside flush media on the ink ground; a checklist is checks on the paper
 * ground. The columns stack below 840px in source order. The band is a
 * section named by its headline; give it an id to make it an anchor.
 */
export function CatchSplitSection({
  title,
  level = 2,
  kicker,
  kickerTone,
  kickerAccent,
  lead,
  ticks,
  steps,
  checks,
  groups,
  metric,
  body,
  actions,
  media,
  flush = false,
  align = "center",
  ground,
  ...rest
}: CatchSplitSectionProps) {
  const titleId = `${useId()}-title`;
  const tickLines = ticks?.filter((line) => line.trim() !== "") ?? [];
  const hasSteps = steps != null && steps.length > 0;
  const hasChecks = checks != null && checks.length > 0;
  const timeline = hasSteps && steps.some((step) => step.marker != null);
  const stepList = !hasSteps ? null : timeline ? <CatchStepList steps={steps} /> : (
    <CatchStepCards headingLevel={level === 1 ? 2 : 3} on={ground === "ink" ? "night" : ground == null || ground === "white" || ground === "paper" ? "day" : "colour"} steps={steps} />
  );
  const checkList = hasChecks ? (
    <ul className={styles.checks}>
      {checks.map((check, index) => (
        <li className={styles.check} data-catch-theme="light" data-ground="white" key={`${index}:${check.title}`}>
          <CatchMarker kind="check" size={12} tone="success" />
          <span className={styles.checkCopy}>
            <CatchText variant="title-row">{check.title}</CatchText>
            {check.body ? <CatchText tone="secondary" variant="body-small">{check.body}</CatchText> : null}
          </span>
        </li>
      ))}
    </ul>
  ) : null;
  const end = media ?? (stepList || checkList ? <CatchStack gap={24}>{stepList}{checkList}</CatchStack> : null);
  const isFlush = flush && media != null;
  const copy = (
    <CatchStack className={styles.copy} gap={24}>
      <CatchBandHeader kicker={kicker} kickerAccent={catchBandKickerAccent(kickerAccent, ground, "indigo")} kickerTone={kickerTone} lead={lead} level={level} size="section" title={title} titleId={titleId} />
      {tickLines.length > 0 ? (
        <ul className={styles.ticks}>
          {tickLines.map((line, index) => (
            <li className={styles.tick} key={`${index}:${line}`}>
              <CatchMarker kind="check" />
              <CatchText variant="body">{line}</CatchText>
            </li>
          ))}
        </ul>
      ) : null}
      {groups && groups.length > 0 ? (
        <CatchStack gap={24}>
          {groups.map((group, index) => (
            <div className={styles.group} key={`${index}:${group.title}`}>
              <CatchText as={level === 1 ? "h2" : "h3"} className={styles.groupTitle} variant="title-bar">
                {group.marker ? <span className={styles.marker}>{group.marker}</span> : null}
                {group.title}
              </CatchText>
              <ul className={styles.lines}>
                {group.list.map((line, position) => (
                  <li key={`${position}:${line}`}><CatchText tone="secondary" variant="body">{line}</CatchText></li>
                ))}
              </ul>
              {group.link ? <span className={styles.link}><CatchButton href={group.link.href} label={group.link.label} recipe="text" tone="neutral" /></span> : null}
            </div>
          ))}
        </CatchStack>
      ) : null}
      {metric ? <CatchMetricTile label={metric.label} layout="inline" note={metric.note} value={metric.value} /> : null}
      {media != null ? stepList : null}
      {media != null ? checkList : null}
      {body ? <CatchText as="p" tone="secondary" variant="body">{body}</CatchText> : null}
      {catchBandActions(actions)}
    </CatchStack>
  );
  return (
    <CatchSurface
      {...rest}
      aria-labelledby={titleId}
      as="section"
      block="band"
      color={catchBandColor(ground)}
      data-flush={isFlush ? "" : undefined}
      padding={isFlush ? "none" : undefined}
    >
      {end != null ? (
        <CatchStack
          align={isFlush ? "end" : align}
          className={isFlush ? styles.flush : undefined}
          collapseBelow="expanded"
          direction="row"
          equal
          gap={64}
        >
          <div className={styles.text}>{copy}</div>
          <div className={styles.end}>{end}</div>
        </CatchStack>
      ) : copy}
    </CatchSurface>
  );
}
