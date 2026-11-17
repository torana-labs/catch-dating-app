"use client";

import {useId, type HTMLAttributes} from "react";
import {catchBandColor, catchBandKickerAccent} from "./catchBandParts";
import type {CatchTextTone} from "./catchCoreVocabulary";
import {CatchBandHeader, type CatchKickerAccent} from "./CatchBandHeader";
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
  /** The band's Website v2 ground; text takes its inks, and ink the dark theme. Defaults to the plain band. */
  ground?: Ground;
}

const cellText = (cell: CatchComparisonTableCell | undefined) => (typeof cell === "string" ? cell : cell?.text ?? "");
const cellStatus = (cell: CatchComparisonTableCell | undefined) => (typeof cell === "string" ? undefined : cell?.status);

/**
 * A comparison band (the playbook kit's comparison table): a
 * CatchBandHeader over a table of properties against options on a white
 * card, one column highlighted, not-offered cells in the secondary ink and
 * unknown ones in the tertiary ink, then the source and checked-date line.
 * Below 840px each row stacks into a block with every cell under its
 * column's name; the table keeps its table roles, so screen readers still
 * read rows and column headers. The band is a section named by its headline.
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
  ground,
  ...rest
}: CatchComparisonTableProps) {
  const titleId = `${useId()}-title`;
  const footer = [source, checked].filter(Boolean).join(" · ");
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
