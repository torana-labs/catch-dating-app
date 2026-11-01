import type {CSSProperties, ReactNode} from "react";
import styles from "./CatchMetaRow.module.css";

/** One fact about a record: a label over its value. */
export interface CatchMetaEntry {
  label: string;
  value: ReactNode;
  tone?: "secondary" | "success" | "warning" | "danger";
  /** The value links somewhere (the organizer, the source page). */
  href?: string;
  /** Spans the whole row (a description, an address). */
  wide?: boolean;
}

export interface CatchMetaRowProps {
  entries: readonly CatchMetaEntry[];
  /** grid: label over value, in columns (a record's facts). flow: values only, dot-separated on one line. */
  recipe?: "grid" | "flow";
  /** grid only. */
  columns?: 1 | 2 | 3 | 4;
}

/**
 * Flutter's CatchMetaRow on the web: facts about one record, read at a glance. The grid recipe
 * sets labels over values in columns, folding to one column on phones; the flow recipe reads as
 * one dot-separated line.
 */
export function CatchMetaRow({entries, recipe = "grid", columns = 2}: CatchMetaRowProps) {
  const value = (entry: CatchMetaEntry) => (entry.href ? <a className={styles.link} href={entry.href}>{entry.value}</a> : entry.value);
  if (recipe === "flow") {
    return (
      <p className={styles.flow}>
        {entries.map((entry, index) => <span data-tone={entry.tone} key={`${index}-${entry.label}`}>{value(entry)}</span>)}
      </p>
    );
  }
  return (
    <dl className={styles.grid} style={{"--catch-meta-columns": columns} as CSSProperties}>
      {entries.map((entry, index) => (
        <div className={styles.entry} data-wide={entry.wide ? "" : undefined} key={`${index}-${entry.label}`}>
          <dt>{entry.label}</dt>
          <dd data-tone={entry.tone}>{value(entry)}</dd>
        </div>
      ))}
    </dl>
  );
}
