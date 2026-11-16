"use client";

import {useId, useState, type HTMLAttributes, type ReactNode} from "react";
import {catchBandColor} from "./catchBandParts";
import type {CatchTextTone} from "./catchCoreVocabulary";
import {CatchBandHeader} from "./CatchBandHeader";
import {CatchIndexRow} from "./CatchIndexRow";
import {CatchMarker} from "./CatchMarker";
import {CatchPageTabBar} from "./CatchPageTabBar";
import {CatchStack} from "./CatchStack";
import {CatchStepList} from "./CatchStepList";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";
import type {Ground, PaletteAccent} from "./palette";
import styles from "./CatchTabSection.module.css";

/** tabs: a tab bar over the chosen item's panel. steps: a numbered list beside the chosen step's pane. */
export type CatchTabSectionLayout = "tabs" | "steps";

/** One moment of an item's run of show: when, what, and a line about it. */
export interface CatchTabSectionMoment {
  time: string;
  title: string;
  body?: string;
}

/** One tab or step. */
export interface CatchTabSectionItem {
  /** Unique within the section; selected and onChanged use it. */
  id: string;
  /** The tab's or step's name. */
  label: string;
  /** tabs: a dot in a palette accent before the label. */
  accent?: PaletteAccent;
  /** steps: when the step happens, beside its name and over its pane. */
  time?: string;
  /** tabs: the panel's heading; steps fall back to the label. */
  title?: string;
  subtitle?: string;
  body?: string;
  /** tabs: the run of show, as a step list with the times as markers. */
  list?: readonly CatchTabSectionMoment[];
  /** steps: ticked tips under the body. */
  tips?: readonly string[];
  /** tabs: the panel's second column, usually a CatchScreenPreview. */
  media?: ReactNode;
}

export interface CatchTabSectionProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title" | "onChange"> {
  /** The headline. Resolved copy; the caller localizes it. */
  title: string;
  /** Defaults to 2. */
  level?: 1 | 2;
  kicker?: string;
  kickerTone?: CatchTextTone;
  lead?: string;
  /** Defaults to tabs. */
  layout?: CatchTabSectionLayout;
  items: readonly CatchTabSectionItem[];
  /** The tab list's or step list's accessible name. */
  tabsLabel: string;
  /** The chosen item's id, when the page owns the choice. */
  selected?: string;
  /** The first chosen item when the section owns the choice; defaults to the first item. */
  defaultSelected?: string;
  onChanged?: (id: string) => void;
  /** Centres the header and the tab bar. Defaults to center. */
  align?: "start" | "center";
  /** The band's Website v2 ground; text takes its inks, and ink the dark theme. Defaults to the plain band. */
  ground?: Ground;
}

/**
 * A band that switches between several items (the playbook kit's
 * switcher): a CatchBandHeader over a CatchPageTabBar and the chosen item's
 * panel (its heading, a line, a body and its run of show as a CatchStepList
 * with the times as markers, beside a media slot), or, as steps, a numbered
 * list of CatchIndexRows beside the chosen step's pane, announced politely.
 * The choice is the section's own unless the page passes selected. The
 * band is a section named by its headline.
 */
export function CatchTabSection({
  title,
  level = 2,
  kicker,
  kickerTone,
  lead,
  layout = "tabs",
  items,
  tabsLabel,
  selected,
  defaultSelected,
  onChanged,
  align = "center",
  ground,
  ...rest
}: CatchTabSectionProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const [own, setOwn] = useState(defaultSelected ?? items[0]?.id);
  const chosenId = selected ?? own;
  const chosen = items.find((item) => item.id === chosenId) ?? items[0];
  const choose = (next: string) => {
    if (selected === undefined) setOwn(next);
    onChanged?.(next);
  };
  const heading = level === 1 ? "h2" : "h3";
  const header = <CatchBandHeader align={align} kicker={kicker} kickerTone={kickerTone} lead={lead} level={level} title={title} titleId={titleId} />;
  const band = (children: ReactNode) => (
    <CatchSurface {...rest} aria-labelledby={titleId} as="section" block="band" color={catchBandColor(ground)} data-layout={layout}>
      {header}
      {children}
    </CatchSurface>
  );
  if (!chosen) return band(null);

  if (layout === "steps") {
    return band(
      <div className={styles.steps}>
        <ol aria-label={tabsLabel} className={styles.list}>
          {items.map((item, index) => (
            <li key={item.id}>
              <CatchIndexRow
                density="regular"
                marker={{kind: "number", value: index + 1}}
                onTap={() => choose(item.id)}
                selected={item.id === chosen.id}
                title={item.label}
                value={item.time}
              />
            </li>
          ))}
        </ol>
        <div aria-live="polite" className={styles.pane}>
          {chosen.time ? <CatchText tone="secondary" variant="label-kicker">{chosen.time}</CatchText> : null}
          <CatchText as={heading} variant="display-sm">{chosen.title ?? chosen.label}</CatchText>
          {chosen.body ? <CatchText as="p" tone="secondary" variant="body">{chosen.body}</CatchText> : null}
          {chosen.tips && chosen.tips.length > 0 ? (
            <ul className={styles.tips}>
              {chosen.tips.map((tip, index) => (
                <li className={styles.tip} key={`${index}:${tip}`}>
                  <CatchMarker kind="check" />
                  <CatchText variant="body">{tip}</CatchText>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>,
    );
  }

  return band(
    <>
      <div className={styles.bar} data-align={align}>
        <CatchPageTabBar
          label={tabsLabel}
          onChanged={choose}
          options={items.map((item) => ({
            value: item.id,
            label: <>{item.accent ? <span aria-hidden="true" className={styles.dot} data-accent={item.accent} /> : null}{item.label}</>,
          }))}
          selected={chosen.id}
        />
      </div>
      <div aria-label={chosen.label} className={styles.panel} role="tabpanel">
        <CatchStack align="start" collapseBelow="expanded" direction="row" equal gap={40}>
          <CatchStack className={styles.copy} gap={16}>
            {chosen.title ? <CatchText as={heading} variant="display-sm">{chosen.title}</CatchText> : null}
            {chosen.subtitle ? <CatchText as="p" tone="secondary" variant="body">{chosen.subtitle}</CatchText> : null}
            {chosen.body ? <CatchText as="p" variant="body-lead">{chosen.body}</CatchText> : null}
            {chosen.list && chosen.list.length > 0 ? (
              <CatchStepList steps={chosen.list.map((moment) => ({marker: moment.time, title: moment.title, body: moment.body}))} />
            ) : null}
          </CatchStack>
          {chosen.media != null ? <div className={styles.media}>{chosen.media}</div> : null}
        </CatchStack>
      </div>
    </>,
  );
}
