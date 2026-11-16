"use client";

import {CatchBadge, type CatchBadgeTone} from "./CatchBadge";
import {CatchIcon} from "./CatchIcon";
import {CatchIndexRow} from "./CatchIndexRow";
import {CatchText} from "./CatchText";
import styles from "./CatchFormStepList.module.css";

/** Flutter `CatchFormStepListStatus`: complete, needs information or optional. */
export type CatchFormStepListStatus = "complete" | "needsInformation" | "optional";

/** Flutter `CatchFormStepReviewItem`: an indexed step and its completion status. */
export interface CatchFormStepReviewItem {
  /** The step's position, from 0; onStepSelected reports it. */
  index: number;
  title: string;
  status: CatchFormStepListStatus;
}

/**
 * column: Flutter's list, a row per step with its status badge, the row a
 * button when a step can be chosen. row: a flow's progress rail, one pill per
 * step, a check on complete steps and the current step filled.
 */
export type CatchFormStepListDirection = "column" | "row";

export interface CatchFormStepListProps {
  /** Ordered steps. */
  items: readonly CatchFormStepReviewItem[];
  /** Caller-resolved, localized label for each completion status. */
  statusLabelBuilder: (status: CatchFormStepListStatus) => string;
  /** Column only: caller-owned step selection; each row becomes a button. */
  onStepSelected?: (index: number) => void;
  /** Web addition: the list's accessible name, such as "Booking steps". */
  label: string;
  /** Web addition: the index of the step in progress, marked as the current step. */
  current?: number;
  /** Web addition. Defaults to column. */
  direction?: CatchFormStepListDirection;
}

const statusTones: Record<CatchFormStepListStatus, CatchBadgeTone> = {
  complete: "success",
  needsInformation: "warning",
  optional: "neutral",
};

/**
 * catch.form_step_list on the web: the sections of a multi-step form with
 * each one's completion status. As a column it is Flutter's navigator, a
 * list row per step with a functional status badge, the row a button when
 * the caller can resume that step. As a row it is the progress rail at the
 * top of a website flow (the playbook kit's flow steps): numbered pills, a
 * check on complete steps, the current step filled and marked
 * aria-current="step", and each status read aloud after its title.
 */
export function CatchFormStepList({items, statusLabelBuilder, onStepSelected, label, current, direction = "column"}: CatchFormStepListProps) {
  if (direction === "row") {
    return (
      <ol aria-label={label} className={styles.rail}>
        {items.map((item) => {
          const now = item.index === current;
          const done = item.status === "complete";
          return (
            <li
              aria-current={now ? "step" : undefined}
              className={styles.pill}
              data-now={now ? "" : undefined}
              data-status={item.status}
              key={item.index}
            >
              <span aria-hidden="true" className={styles.marker}>
                {done && !now ? <CatchIcon name="check" size={16} /> : <CatchText numeric variant="label-badge">{item.index + 1}</CatchText>}
              </span>
              <CatchText variant="label-action">{item.title}</CatchText>
              <span className={styles.visuallyHidden}>{`, ${statusLabelBuilder(item.status)}`}</span>
            </li>
          );
        })}
      </ol>
    );
  }
  return (
    <ol aria-label={label} className={styles.list}>
      {items.map((item) => (
        <li className={styles.item} key={item.index}>
          <CatchIndexRow
            density="regular"
            marker={item.status === "complete" ? {kind: "check", tone: "success"} : {kind: "number", value: item.index + 1}}
            onTap={onStepSelected ? () => onStepSelected(item.index) : undefined}
            selected={item.index === current}
            title={item.title}
            trailing={<CatchBadge label={statusLabelBuilder(item.status)} recipe="functional" tone={statusTones[item.status]} />}
            wrap
          />
        </li>
      ))}
    </ol>
  );
}
