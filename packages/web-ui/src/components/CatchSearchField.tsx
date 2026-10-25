"use client";

import {type KeyboardEvent, useEffect, useRef, useState} from "react";
import styles from "./CatchSearchField.module.css";

export type CatchSearchFieldStatus = "collapsed" | "expanded";
/** The Flutter toolbar's named visual extent; arbitrary lengths stay native-only. */
export type CatchSearchFieldExtent = "nav";
export interface CatchSearchFieldCopy {
  searchLabel: string;
  clearTooltip: (placeholder: string) => string;
  closeSearchLabel: string;
}
export interface CatchSearchFieldCommonProps {
  copy: CatchSearchFieldCopy;
  value?: string;
  placeholder?: string;
  onChanged?: (value: string) => void;
  autofocus?: boolean;
  enabled?: boolean;
  onSubmitted?: (value: string) => void;
  onFocusChanged?: (focused: boolean) => void;
  semanticLabel?: string;
}
export interface CatchSearchFieldExpandingProps extends CatchSearchFieldCommonProps {
  recipe: "expanding";
  status?: CatchSearchFieldStatus;
  onOpenSearch?: () => void;
  onCloseSearch?: () => void;
  tooltip?: string;
  collapsedExtent?: CatchSearchFieldExtent;
}

export type CatchSearchFieldProps =
  | (CatchSearchFieldCommonProps & {recipe?: "field" | "expanded"})
  | CatchSearchFieldExpandingProps;
const searchGlyph = <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
  <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" />
</svg>;
const clearGlyph = <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" />
</svg>;
const closeGlyph = <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
  <path d="m6 6 12 12m0-12L6 18" />
</svg>;

/** Flutter named constructors map to React's typed recipe prop (D9). */
export function CatchSearchField(props: CatchSearchFieldProps) {
  const {
    copy, value = "", placeholder = copy.searchLabel, onChanged, autofocus = false,
    enabled = true, onSubmitted, onFocusChanged, semanticLabel,
  } = props;
  const transient = props.recipe === "expanding" ? props : undefined;
  const mode = props.recipe ?? "field";
  const status = transient?.status ?? "expanded";
  const onOpenSearch = transient?.onOpenSearch;
  const onCloseSearch = transient?.onCloseSearch;
  const tooltip = transient?.tooltip ?? copy.searchLabel;
  const collapsedExtent = transient?.collapsedExtent ?? "nav";
  const [query, setQuery] = useState(value);
  const input = useRef<HTMLInputElement>(null);
  const collapsed = mode === "expanding" && status === "collapsed";
  // The native component owns a text controller and accepts subsequent external
  // query changes. Typing still works when the caller does not bind onChanged.
  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => {
    if (autofocus && enabled && !collapsed) input.current?.focus();
  }, [autofocus, enabled, collapsed]);

  function clear() {
    setQuery("");
    onChanged?.("");
    input.current?.focus();
  }
  function submit(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    onSubmitted?.(event.currentTarget.value);
    event.currentTarget.blur();
  }
  const action = query.length > 0 ? clear : mode === "expanding" ? onCloseSearch : undefined;
  const actionLabel = query.length > 0 ? copy.clearTooltip(placeholder) : copy.closeSearchLabel;

  return (
    <span className={styles.search} data-mode={mode} data-status={collapsed ? "collapsed" : "expanded"}
      data-extent={collapsedExtent} data-disabled={!enabled || undefined}>
      {collapsed ? (
        <button className={styles.trigger} type="button" disabled={!enabled}
          aria-label={semanticLabel ?? tooltip} title={tooltip} onClick={onOpenSearch}>
          {searchGlyph}
        </button>
      ) : (
        <span className={styles.field}>
          <span className={styles.leading}>{searchGlyph}</span>
          <input ref={input} className={styles.input} type="search" disabled={!enabled}
            aria-label={semanticLabel ?? placeholder} placeholder={placeholder} value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              onChanged?.(event.currentTarget.value);
            }}
            onFocus={() => onFocusChanged?.(true)} onBlur={() => onFocusChanged?.(false)}
            onKeyDown={submit} />
          {action ? (
            <button className={styles.action} type="button" disabled={!enabled}
              aria-label={actionLabel} title={actionLabel} onClick={action}>
              {query.length > 0 ? clearGlyph : closeGlyph}
            </button>
          ) : <span className={styles.actionSpace} aria-hidden="true" />}
        </span>
      )}
    </span>
  );
}
