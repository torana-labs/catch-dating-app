import {isValidElement, type ReactNode} from "react";
import {CatchBadge, type CatchBadgeProps} from "./CatchBadge";
import {CatchButton} from "./CatchButton";
import {CatchIndexRow} from "./CatchIndexRow";
import {useCatchViewport} from "./catchViewportContext";
import styles from "./CatchTable.module.css";

export type CatchTableCellTone = "secondary" | "success" | "warning" | "danger";

/** A cell that is text with a tone: {text: "3 days", tone: "danger"}. */
export interface CatchTableCellText {
  text: ReactNode;
  tone?: CatchTableCellTone;
}

/** A two-line cell: the title, then a muted line. */
export interface CatchTableCellTitle {
  title: ReactNode;
  subtitle?: ReactNode;
}

/** A status dot read aloud by its label (a reply, a state). */
export interface CatchTableCellMarker {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}

export interface CatchTableColumn<T> {
  key: keyof T & string;
  label: string;
  align?: "start" | "center" | "end";
  /** A CSS width, such as "120px". */
  width?: string;
  /**
   * What the cell value is. text: a string or {text, tone}. title: {title, subtitle}. marker:
   * {label, tone}. badge: CatchBadge props. number: right-aligned figures.
   */
  kind?: "text" | "title" | "marker" | "badge" | "number";
  render?: (row: T) => ReactNode;
  /** The column the rows are ordered by: an arrow after the label. */
  sort?: "asc" | "desc";
}

export interface CatchTableBulkAction {
  label: string;
  onPressed: (() => void) | null;
  variant?: "secondary" | "primary";
}

export interface CatchTableProps<T> {
  columns: readonly CatchTableColumn<T>[];
  rows: readonly T[];
  /** A function, or the field that names each row. Defaults to key, then id, then the row's position. */
  rowKey?: ((row: T) => string) | (keyof T & string);
  /** The table's accessible name. */
  label: string;
  /** Pressing a row; on phones each row becomes a list row (first column the title, last the value). */
  onRowPressed?: (row: T) => void;
  /** The row open in the inspector beside the table. */
  selectedKey?: string | null;
  /** A checkbox column for acting on several rows at once. */
  selectable?: boolean;
  checked?: readonly string[];
  onChecked?: (keys: string[]) => void;
  /** Shown above the table while rows are checked ("Approve 3", "Assign"). */
  bulk?: readonly CatchTableBulkAction[];
  /** compact rows (8px) for long queues; regular (12px) otherwise. */
  density?: "compact" | "regular";
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !isValidElement(value);

/**
 * Flutter's CatchTable on the web: wide data for tablets and desktops that folds into list rows
 * on phones. Title, badge, marker and number cells; a checkbox column with a bulk bar; the row
 * open beside the table; a sort arrow; compact density. The quiet register keeps cells to one line.
 */
export function CatchTable<T extends object>({
  columns,
  rows,
  rowKey,
  label,
  onRowPressed,
  selectedKey = null,
  selectable = false,
  checked = [],
  onChecked,
  bulk,
  density = "regular",
}: CatchTableProps<T>) {
  const {sizeClass} = useCatchViewport();
  const keyOf = (row: T, index: number) => {
    if (typeof rowKey === "function") return rowKey(row);
    const record = row as Record<string, unknown>;
    return String(record[rowKey ?? "key"] ?? record.id ?? index);
  };
  const keys = rows.map(keyOf);
  const cell = (row: T, column: CatchTableColumn<T>): ReactNode => {
    if (column.render) return column.render(row);
    const value = (row as Record<string, unknown>)[column.key];
    if (value == null) return null;
    if (column.kind === "title" && isRecord(value)) {
      const title = value as unknown as CatchTableCellTitle;
      return (
        <span className={styles.title}>
          <span>{title.title}</span>
          {title.subtitle ? <span className={styles.subtitle}>{title.subtitle}</span> : null}
        </span>
      );
    }
    if (column.kind === "marker" && isRecord(value)) {
      const marker = value as unknown as CatchTableCellMarker;
      return <span aria-label={marker.label} className={styles.marker} data-tone={marker.tone ?? "neutral"} role="img" />;
    }
    if (column.kind === "badge" && isRecord(value)) return <CatchBadge size="sm" {...(value as unknown as CatchBadgeProps)} />;
    if (isRecord(value) && "text" in value) {
      const text = value as unknown as CatchTableCellText;
      return <span className={styles.text} data-tone={text.tone}>{text.text}</span>;
    }
    return value as ReactNode;
  };
  const plain = (node: ReactNode) => (typeof node === "string" || typeof node === "number" ? String(node) : undefined);

  if (sizeClass === "compact") {
    const [first, second] = columns;
    const last = columns.length > 2 ? columns[columns.length - 1] : undefined;
    return (
      <div aria-label={label} className={styles.list} role="list">
        {rows.map((row, index) => {
          const value = first ? (row as Record<string, unknown>)[first.key] : null;
          const titled = first?.kind === "title" && isRecord(value);
          const title = titled ? (value as unknown as CatchTableCellTitle) : null;
          return (
            <div key={keys[index]} role="listitem">
              <CatchIndexRow
                onTap={onRowPressed ? () => onRowPressed(row) : undefined}
                selected={selectedKey === keys[index]}
                subtitle={plain(title ? title.subtitle : second ? cell(row, second) : null)}
                title={plain(title ? title.title : first ? cell(row, first) : null) ?? ""}
                trailing={last ? cell(row, last) : undefined}
              />
            </div>
          );
        })}
      </div>
    );
  }

  const alignOf = (column: CatchTableColumn<T>) =>
    column.align ?? (column.kind === "number" ? "end" : column.kind === "marker" ? "center" : undefined);
  const all = keys.length > 0 && keys.every((key) => checked.includes(key));
  const toggle = (key: string) => onChecked?.(checked.includes(key) ? checked.filter((entry) => entry !== key) : [...checked, key]);
  return (
    // A named, focusable region, so a table wider than its pane scrolls from the keyboard.
    <div aria-label={label} className={styles.wrap} data-density={density} role="region" tabIndex={0}>
      {selectable && checked.length > 0 && bulk ? (
        <div className={styles.bulk} role="toolbar" aria-label={`${checked.length} selected`}>
          <span className={styles.bulkCount}>{checked.length} selected</span>
          {bulk.map((action) => (
            <CatchButton key={action.label} label={action.label} onPressed={action.onPressed} size="sm" variant={action.variant ?? "secondary"} />
          ))}
        </div>
      ) : null}
      <table aria-label={label} className={styles.table}>
        <thead>
          <tr>
            {selectable ? (
              <th className={styles.check}>
                <input
                  aria-label="Select all"
                  checked={all}
                  onChange={() => onChecked?.(all ? [] : [...keys])}
                  ref={(element) => { if (element) element.indeterminate = !all && checked.length > 0; }}
                  type="checkbox"
                />
              </th>
            ) : null}
            {columns.map((column) => (
              <th
                aria-sort={column.sort === "asc" ? "ascending" : column.sort === "desc" ? "descending" : undefined}
                data-align={alignOf(column)}
                key={column.key}
                scope="col"
                style={column.width ? {width: column.width} : undefined}
              >
                {column.label}
                {column.sort ? <span aria-hidden="true" className={styles.sort}>{column.sort === "asc" ? " ↑" : " ↓"}</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const key = keys[index];
            return (
              <tr
                aria-selected={selectedKey != null ? selectedKey === key : undefined}
                data-checked={checked.includes(key) ? "" : undefined}
                data-pressable={onRowPressed ? "" : undefined}
                key={key}
                onClick={onRowPressed ? () => onRowPressed(row) : undefined}
                onKeyDown={onRowPressed ? (event) => {
                  if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onRowPressed(row);
                  }
                } : undefined}
                tabIndex={onRowPressed ? 0 : undefined}
              >
                {selectable ? (
                  <td className={styles.check} onClick={(event) => event.stopPropagation()}>
                    <input aria-label="Select row" checked={checked.includes(key)} onChange={() => toggle(key)} type="checkbox" />
                  </td>
                ) : null}
                {columns.map((column) => <td data-align={alignOf(column)} key={column.key}>{cell(row, column)}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
