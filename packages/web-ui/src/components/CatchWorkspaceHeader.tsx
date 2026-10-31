import type {ChangeEvent, ReactNode} from "react";
import {CatchIcon} from "./CatchIcon";
import {useCatchPane} from "./catchPaneLayoutContext";
import styles from "./CatchWorkspaceHeader.module.css";

/** A labelled action: a link with href, or a button with onPressed. */
export interface CatchWorkspaceHeaderAction {
  label: string;
  href?: string;
  onPressed?: () => void;
}

export interface CatchWorkspaceHeaderBack extends CatchWorkspaceHeaderAction {
  close?: boolean;
}

/** Where this item sits in its list ("1 of 23"), with previous and next. */
export interface CatchWorkspaceHeaderPosition {
  label: string;
  previous?: CatchWorkspaceHeaderAction;
  next?: CatchWorkspaceHeaderAction;
}

export interface CatchWorkspaceHeaderView {
  value: string;
  label: string;
  count?: number;
}

/** The view of a list (waiting, mine, done), as a small select in the bar. */
export interface CatchWorkspaceHeaderViews {
  items: readonly CatchWorkspaceHeaderView[];
  value: string;
  /** The select's accessible name; "Show" by default. */
  label?: string;
  onChanged?: (value: string) => void;
}

export interface CatchWorkspaceHeaderFilterChip {
  label: string;
  count?: number;
  selected?: boolean;
  onPressed?: () => void;
}

/** The second row of every queue and directory: filter chips with counts, and search. */
export interface CatchWorkspaceHeaderFilters {
  chips?: readonly CatchWorkspaceHeaderFilterChip[];
  search?: {placeholder: string; value?: string; onChanged?: (value: string) => void};
}

export interface CatchWorkspaceHeaderProps {
  title: ReactNode;
  /** A breadcrumb before the title: the list this item belongs to. */
  kicker?: ReactNode;
  /** Shown after the title, muted: how many rows the pane holds. */
  count?: number;
  /** A muted summary after the title ("oldest 3 days · 6 ready to decide"). */
  note?: ReactNode;
  back?: CatchWorkspaceHeaderBack;
  position?: CatchWorkspaceHeaderPosition;
  views?: CatchWorkspaceHeaderViews;
  filters?: CatchWorkspaceHeaderFilters;
  /** Small actions on the right. */
  actions?: ReactNode;
}

function IconAction({action, icon}: {action: CatchWorkspaceHeaderAction; icon: "back" | "close" | "moveUp" | "moveDown"}) {
  const content = <CatchIcon icon={icon} size="control" />;
  return action.href
    ? <a aria-label={action.label} className={styles.iconButton} href={action.href} onClick={action.onPressed}>{content}</a>
    : (
      <button aria-label={action.label} className={styles.iconButton} disabled={!action.onPressed} onClick={action.onPressed} type="button">
        {content}
      </button>
    );
}

/**
 * The header of one pane, or of a whole page when placed straight in the viewport body. Every
 * workspace header is the same 56px row, in the same type and on the same line as the
 * navigation's header, with one hairline under all of them. Views, filters and position are data,
 * so no screen builds its own queue header. A detail pane beside its list shows no back arrow and
 * no breadcrumb; the list is the context.
 */
export function CatchWorkspaceHeader({title, kicker, count, note, back, position, views, filters, actions}: CatchWorkspaceHeaderProps) {
  const {slot, split} = useCatchPane();
  const beside = slot === "detail" && split;
  const hasActions = position || views || actions;
  return (
    <>
      <header className={styles.bar} data-catch-workspace-header="" data-filtered={filters ? "" : undefined}>
        {back && !beside ? <IconAction action={back} icon={back.close ? "close" : "back"} /> : null}
        <span className={styles.title}>
          {kicker && !beside ? <span className={styles.kicker}>{kicker}</span> : null}
          <h1 className={styles.name}>
            {title}
            {count != null ? <span className={styles.count}> {count}</span> : null}
          </h1>
          {note ? <span className={styles.note}>{note}</span> : null}
        </span>
        {hasActions ? (
          <span className={styles.actions}>
            {position ? <span className={styles.position}>{position.label}</span> : null}
            {position ? <IconAction action={position.previous ?? {label: "Previous"}} icon="moveUp" /> : null}
            {position ? <IconAction action={position.next ?? {label: "Next"}} icon="moveDown" /> : null}
            {views ? (
              <select
                aria-label={views.label ?? "Show"}
                className={styles.views}
                {...(views.onChanged
                  ? {onChange: (event: ChangeEvent<HTMLSelectElement>) => views.onChanged?.(event.currentTarget.value), value: views.value}
                  : {defaultValue: views.value})}
              >
                {views.items.map((view) => (
                  <option key={view.value} value={view.value}>{view.count != null ? `${view.label} · ${view.count}` : view.label}</option>
                ))}
              </select>
            ) : null}
            {actions}
          </span>
        ) : null}
      </header>
      {filters ? (
        <div className={styles.filters}>
          {filters.chips && filters.chips.length > 0 ? (
            <div aria-label="Filters" className={styles.chips} role="group">
              {filters.chips.map((chip) => (
                <button aria-label={chip.count != null ? `${chip.label} ${chip.count}` : undefined} aria-pressed={chip.selected ?? false} className={styles.chip} key={chip.label} onClick={chip.onPressed} type="button">
                  {chip.label}
                  {chip.count != null ? <span className={styles.chipCount}>{chip.count}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
          {filters.search ? (
            <label className={styles.search}>
              <CatchIcon icon="search" size="xs" tone="muted" />
              <input
                aria-label={filters.search.placeholder}
                placeholder={filters.search.placeholder}
                type="search"
                {...(filters.search.onChanged
                  ? {onChange: (event: ChangeEvent<HTMLInputElement>) => filters.search?.onChanged?.(event.currentTarget.value), value: filters.search.value ?? ""}
                  : {defaultValue: filters.search.value})}
              />
            </label>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
