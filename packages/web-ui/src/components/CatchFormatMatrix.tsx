"use client";

import type {CatchFormat} from "./catchCoreVocabulary";
import {CatchChip} from "./CatchChip";
import styles from "./CatchFormatMatrix.module.css";

export interface CatchFormatMatrixFormat {
  format: CatchFormat;
  /** The column heading and the chip label, such as "Run clubs". */
  title: string;
}

export interface CatchFormatMatrixProperty {
  /** The key into each format's values. */
  key: string;
  /** The row heading, such as "When phones come out". */
  label: string;
}

/** How the reader picked a format: a column heading in the table, or a chip on a phone-width band. */
export type CatchFormatMatrixSource = "table" | "chips";

export interface CatchFormatMatrixProps {
  formats: readonly CatchFormatMatrixFormat[];
  /** The matrix's heading; also the table's and the chip group's accessible name. */
  heading: string;
  /** A short line across from the heading. */
  note?: string;
  /** Called with the picked format's index and where it was picked. */
  onSelect?: (index: number, source: CatchFormatMatrixSource) => void;
  properties: readonly CatchFormatMatrixProperty[];
  /** The selected format's index; its column carries a soft tint of its colour. */
  selected: number;
  /** Each format's value for each property key. A missing value is an empty cell. */
  values: Readonly<Partial<Record<CatchFormat, Readonly<Record<string, string>>>>>;
}

/**
 * The properties of several event formats side by side (proposal
 * WebFormatMatrix, "Built for every kind of night"): a table on a wide band,
 * its column headings choosing a format; on a phone-width band, format chips
 * over the selected format's properties. The selected format is shared with
 * whatever the page pairs it with, such as a night scene.
 */
export function CatchFormatMatrix({formats, heading, note, onSelect, properties, selected, values}: CatchFormatMatrixProps) {
  const current = formats[selected];
  const valueOf = (format: CatchFormat | undefined, key: string) => (format ? values[format]?.[key] : undefined) ?? "";
  return (
    <div className={styles.matrix}>
      <div className={styles.head}>
        <span className={styles.heading}>{heading}</span>
        {note ? <span className={styles.note}>{note}</span> : null}
      </div>
      <table aria-label={heading} className={styles.table}>
        <thead>
          <tr>
            <td className={styles.corner} />
            {formats.map((item, index) => (
              <th data-format={item.format} data-selected={index === selected || undefined} key={item.format} scope="col">
                <button aria-pressed={index === selected} className={styles.pick} onClick={() => onSelect?.(index, "table")} type="button">
                  <span aria-hidden="true" className={styles.dot} />
                  {item.title}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr key={property.key}>
              <th className={styles.label} scope="row">{property.label}</th>
              {formats.map((item, index) => (
                <td data-format={item.format} data-selected={index === selected || undefined} key={item.format}>{valueOf(item.format, property.key)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.narrow}>
        <div aria-label={heading} className={styles.chips} role="radiogroup">
          {formats.map((item, index) => (
            <CatchChip colourWhenSelected dot={item.format} key={item.format} kind="choice" label={item.title}
              onPressed={() => onSelect?.(index, "chips")} selected={index === selected} size="sm" />
          ))}
        </div>
        <dl className={styles.list}>
          {properties.map((property) => (
            <div className={styles.row} key={property.key}>
              <dt>{property.label}</dt>
              <dd>{valueOf(current?.format, property.key)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
