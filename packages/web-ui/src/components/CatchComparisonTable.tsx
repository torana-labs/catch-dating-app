"use client";

import {useId, useState, type HTMLAttributes} from "react";
import {catchBandColor, catchBandKickerAccent} from "./catchBandParts";
import type {CatchTextTone} from "./catchCoreVocabulary";
import {CatchBandHeader, type CatchKickerAccent} from "./CatchBandHeader";
import {CatchChip} from "./CatchChip";
import {CatchIcon} from "./CatchIcon";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchComparisonTable.module.css";

/** yes: offered. no: not offered, in the secondary ink. unknown: not published or not checked, in the tertiary ink. */
export type CatchComparisonTableCellStatus = "yes" | "no" | "unknown";

/** A cell: its text, or its text with a status. */
export type CatchComparisonTableCell = string | {text: string; status?: CatchComparisonTableCellStatus};

/** One compared property: its label and a cell per column. */
export interface CatchComparisonTableRow {
  label: string;
  cells: readonly CatchComparisonTableCell[];
}

export interface CatchComparisonTableProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title"> {
  /** The headline; it also names the table. Resolved copy. */
  title: string;
  /** Defaults to 2. */
  level?: 1 | 2;
  kicker?: string;
  kickerTone?: CatchTextTone;
  /** The kicker's accent on white, paper and ink; defaults to the kit's (indigo, coral on ink). A colour ground takes its secondary ink. */
  kickerAccent?: CatchKickerAccent;
  lead?: string;
  /** The compared options' headings, one per column after the row labels. */
  columns: readonly string[];
  /** The heading over the row labels; empty by default. */
  rowHeader?: string;
  rows: readonly CatchComparisonTableRow[];
  /** The position in columns of the highlighted column, usually our own. */
  highlightColumn?: number;
  /** Where the facts come from. */
  source?: string;
  /** When they were last checked, such as "Checked 1 Nov 2026". */
  checked?: string;
  /**
   * With a highlighted column, shows it beside one other column the reader
   * picks from a row of chips, on every width: a calm two-way ledger instead
   * of every column at once. The words before the chips, such as "Compare
   * Catch with".
   */
  compareLabel?: string;
  /** The band's Website v2 ground; text takes its inks, and ink the dark theme. Defaults to the plain band. */
  ground?: Ground;
}

const cellText = (cell: CatchComparisonTableCell | undefined) => (typeof cell === "string" ? cell : cell?.text ?? "");
const cellStatus = (cell: CatchComparisonTableCell | undefined) => (typeof cell === "string" ? undefined : cell?.status);
const statusIcon = {yes: "check", no: "close", unknown: "remove"} as const;

/**
 * A comparison band (the playbook kit's comparison table): a
 * CatchBandHeader over a table of properties against options on a white
 * card, one column highlighted, not-offered cells in the secondary ink and
 * unknown ones in the tertiary ink, then the source and checked-date line.
 * Below 840px each row stacks into a block with every cell under its
 * column's name; the table keeps its table roles, so screen readers still
 * read rows and column headers. The band is a section named by its headline.
 *
 * With `compareLabel` it is a ledger instead (issue: the host comparison,
 * 21 Nov 2026): chips pick one other column to set beside the highlighted
 * one, then hairline rows of need, ours and theirs, marked with a tick, a
 * cross or a dash. Below 840px each need sits over its two answers.
 */
export function CatchComparisonTable({
  title,
  level = 2,
  kicker,
  kickerTone,
  kickerAccent,
  lead,
  columns,
  rowHeader = "",
  rows,
  highlightColumn,
  source,
  checked,
  compareLabel,
  ground,
  ...rest
}: CatchComparisonTableProps) {
  const titleId = `${useId()}-title`;
  const footer = [source, checked].filter(Boolean).join(" · ");
  const others = columns.map((_, index) => index).filter((index) => index !== highlightColumn);
  const [picked, setPicked] = useState(others[0] ?? 0);
  if (compareLabel && highlightColumn !== undefined && others.length > 0) {
    const shown = [highlightColumn, picked];
    return (
      <CatchSurface {...rest} aria-labelledby={titleId} as="section" block="band" color={catchBandColor(ground)}>
        <CatchBandHeader kicker={kicker} kickerAccent={catchBandKickerAccent(kickerAccent, ground, "indigo")} kickerTone={kickerTone} lead={lead} level={level} size="section" title={title} titleId={titleId} />
        <div aria-label={compareLabel} className={styles.picker} role="radiogroup">
          <CatchText tone="secondary" variant="body-small">{compareLabel}</CatchText>
          <span className={styles.chips}>
            {others.map((index) => (
              <CatchChip key={`${index}:${columns[index]}`} label={columns[index]!} mode="single" onPressed={() => setPicked(index)} recipe="choice" selected={index === picked} />
            ))}
          </span>
        </div>
        <div className={styles.ledger} data-catch-theme="light">
          <table aria-labelledby={titleId} className={styles.versus} role="table">
            <thead role="rowgroup">
              <tr className={styles.versusRow} role="row">
                <th className={styles.versusNeed} role="columnheader" scope="col"><CatchText tone="secondary" variant="body-meta">{rowHeader}</CatchText></th>
                {shown.map((index) => (
                  <th data-featured={index === highlightColumn ? "" : undefined} key={`${index}:${columns[index]}`} role="columnheader" scope="col">
                    <CatchText variant="label-action">{columns[index]}</CatchText>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup">
              {rows.map((row, rowIndex) => (
                <tr className={styles.versusRow} key={`${rowIndex}:${row.label}`} role="row">
                  <th className={styles.versusNeed} role="rowheader" scope="row"><CatchText variant="label-action">{row.label}</CatchText></th>
                  {shown.map((index) => {
                    const cell = row.cells[index];
                    const status = cellStatus(cell);
                    return (
                      <td data-featured={index === highlightColumn ? "" : undefined} data-status={status} key={`${index}:${columns[index]}`} role="cell">
                        <span className={styles.answer}>
                          {status ? <span aria-hidden="true" className={styles.mark}><CatchIcon name={statusIcon[status]} size={16} /></span> : null}
                          <CatchText variant="body-small">{cellText(cell)}</CatchText>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {footer ? <CatchText as="p" tone="secondary" variant="body-meta">{footer}</CatchText> : null}
      </CatchSurface>
    );
  }
  return (
    <CatchSurface {...rest} aria-labelledby={titleId} as="section" block="band" color={catchBandColor(ground)}>
      <CatchBandHeader kicker={kicker} kickerAccent={catchBandKickerAccent(kickerAccent, ground, "indigo")} kickerTone={kickerTone} lead={lead} level={level} size="section" title={title} titleId={titleId} />
      <div className={styles.card} data-catch-theme="light">
        <table aria-labelledby={titleId} className={styles.table} role="table">
          <thead className={styles.head} role="rowgroup">
            <tr role="row">
              {rowHeader ? <th role="columnheader" scope="col"><CatchText variant="label-action">{rowHeader}</CatchText></th> : <td aria-hidden="true" />}
              {columns.map((column, index) => (
                <th data-highlight={index === highlightColumn ? "" : undefined} key={`${index}:${column}`} role="columnheader" scope="col">
                  <CatchText variant="label-action">{column}</CatchText>
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup">
            {rows.map((row, rowIndex) => (
              <tr className={styles.row} key={`${rowIndex}:${row.label}`} role="row">
                <th className={styles.label} role="rowheader" scope="row"><CatchText variant="label-action">{row.label}</CatchText></th>
                {columns.map((column, index) => {
                  const cell = row.cells[index];
                  return (
                    <td
                      className={styles.cell}
                      data-highlight={index === highlightColumn ? "" : undefined}
                      data-status={cellStatus(cell)}
                      key={`${index}:${column}`}
                      role="cell"
                    >
                      <span aria-hidden="true" className={styles.cellLabel}><CatchText tone="secondary" variant="body-meta">{column}</CatchText></span>
                      <CatchText variant="body-small">{cellText(cell)}</CatchText>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer ? <CatchText as="p" tone="secondary" variant="body-meta">{footer}</CatchText> : null}
    </CatchSurface>
  );
}
