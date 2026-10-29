"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {CatchText} from "./CatchText";
import styles from "./CatchMenu.module.css";

export type CatchMenuItemVariant = "action" | "choice";

/** Flutter `CatchMenuItem`. */
export interface CatchMenuItem<T> {
  value: T;
  label: string;
  sublabel?: string;
  icon?: ReactNode;
  /** Only choice rows can be selected. */
  selected?: boolean;
  danger?: boolean;
  enabled?: boolean;
  variant?: CatchMenuItemVariant;
  /** Draws a divider above this row. */
  startsSection?: boolean;
  onSelected?: (value: T) => void;
}

/** What `CatchMenu.anchored`'s builder receives, in place of Flutter's MenuController. */
export interface CatchMenuController {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Web only: spread on the trigger button for its popup semantics, ref and keys. */
  triggerProps: {
    "aria-controls": string;
    "aria-expanded": boolean;
    "aria-haspopup": "listbox" | "menu";
    onClick: () => void;
    onKeyDown: (event: KeyboardEvent) => void;
    ref: Ref<HTMLButtonElement>;
  };
}

interface CatchMenuBase<T> {
  items: readonly CatchMenuItem<T>[];
  onSelected?: (value: T, item: CatchMenuItem<T>) => void;
  /** The panel width in px; an anchored menu is otherwise at least as wide as its trigger. */
  width?: number;
  /** Web only: names the menu or listbox for assistive technology. */
  label: string;
}

/** Flutter's `CatchMenu`: the panel on its own. */
export interface CatchMenuPanelProps<T> extends CatchMenuBase<T> {
  recipe?: "panel";
}

/** `CatchMenu.anchored`: a panel that opens from a trigger the caller builds. */
export interface CatchMenuAnchoredProps<T> extends CatchMenuBase<T> {
  recipe: "anchored";
  builder: (controller: CatchMenuController) => ReactNode;
  /** Moves the panel from its anchored place, in px, as Flutter's alignmentOffset. */
  alignmentOffset?: {x: number; y: number};
  /** Web only: which trigger edge the panel lines up with. */
  align?: "start" | "end";
}

export type CatchMenuProps<T> = CatchMenuPanelProps<T> | CatchMenuAnchoredProps<T>;

// Lucide "check" (ISC).
const checkGlyph = (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>
);

// Flutter's CatchLayout.menuViewportInset and the gap under the trigger.
const viewportInset = 16;
const panelGap = 8;

function focusable(panel: HTMLElement | null) {
  return panel ? [...panel.querySelectorAll<HTMLButtonElement>("button[data-row]:not(:disabled)")] : [];
}

interface PanelProps<T> extends CatchMenuBase<T> {
  id: string;
  place?: "below" | "above";
  onDone?: (returnFocus: boolean) => void;
  panelRef?: Ref<HTMLDivElement>;
  style?: CSSProperties;
}

function Panel<T>({id, items, label, onDone, onSelected, panelRef, place, style, width}: PanelProps<T>) {
  const listbox = items.every((item) => item.variant === "choice");
  // One row takes Tab focus: the selected row, else the first enabled one.
  const selectedIndex = items.findIndex((item) => item.selected && item.enabled !== false);
  const tabIndex = selectedIndex >= 0 ? selectedIndex : items.findIndex((item) => item.enabled !== false);
  const select = (item: CatchMenuItem<T>) => {
    item.onSelected?.(item.value);
    onSelected?.(item.value, item);
    onDone?.(true);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const rows = focusable(event.currentTarget);
    const index = rows.indexOf(document.activeElement as HTMLButtonElement);
    const move = (to: number) => {
      event.preventDefault();
      rows[(to + rows.length) % rows.length]?.focus();
    };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(rows.length - 1);
    else if (event.key === "Escape" && onDone) {
      event.preventDefault();
      onDone(true);
    } else if (event.key === "Tab" && onDone) onDone(false);
  };
  return (
    <div
      aria-label={label}
      className={styles.panel}
      data-place={place}
      id={id}
      onKeyDown={onKeyDown}
      ref={panelRef}
      role={listbox ? "listbox" : "menu"}
      style={{...style, ...(width ? {width} : {})}}
    >
      {items.map((item, index) => {
        const enabled = item.enabled ?? true;
        const choice = item.variant === "choice";
        const role = listbox ? "option" : choice ? "menuitemradio" : "menuitem";
        const selectedState = listbox ? {"aria-selected": Boolean(item.selected)} : choice ? {"aria-checked": Boolean(item.selected)} : {};
        return (
          <button
            {...selectedState}
            className={styles.row}
            data-danger={item.danger || undefined}
            data-row=""
            data-section={index > 0 && item.startsSection ? true : undefined}
            disabled={!enabled}
            key={`${index}-${item.label}`}
            onClick={() => select(item)}
            role={role}
            tabIndex={index === tabIndex ? 0 : -1}
            type="button"
          >
            {item.icon != null ? <span aria-hidden="true" className={styles.icon}>{item.icon}</span> : null}
            <span className={styles.copy}>
              <CatchText as="span" color="inherit" maxLines={2} variant="titleS">{item.label}</CatchText>
              {item.sublabel?.trim() ? <>{" "}<CatchText as="span" color="ink2" maxLines={2} variant="bodyS">{item.sublabel}</CatchText></> : null}
            </span>
            {item.selected ? <span className={styles.check}>{checkGlyph}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Flutter's CatchMenu on the web: a floating panel of action or choice rows,
 * on its own or anchored to a trigger the caller renders. A menu of choices
 * is a listbox of options; otherwise it is a menu of items. Arrow keys, Home
 * and End move between rows; Escape and Tab close an anchored menu.
 */
export function CatchMenu<T>(props: CatchMenuProps<T>) {
  const id = useId();
  if (props.recipe !== "anchored") {
    return <Panel {...props} id={id} panelRef={undefined} />;
  }
  return <AnchoredMenu {...props} id={id} />;
}

function AnchoredMenu<T>({align = "start", alignmentOffset, builder, id, items, label, onSelected, width}: CatchMenuAnchoredProps<T> & {id: string}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<{place: "below" | "above"; maxHeight?: number}>({place: "below"});
  const anchor = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const listbox = items.every((item) => item.variant === "choice");

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    // Open on the side with more room, as Flutter's anchored menu does, and
    // keep the panel 16px inside the viewport.
    const rect = anchor.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom - viewportInset;
      const above = rect.top - viewportInset;
      const needed = panel.current?.scrollHeight ?? 0;
      const place = needed > below && above > below ? "above" : "below";
      setPlacement({maxHeight: Math.max(0, (place === "above" ? above : below) - panelGap), place});
    }
    const rows = focusable(panel.current);
    (rows.find((row) => row.getAttribute("aria-selected") === "true" || row.getAttribute("aria-checked") === "true") ?? rows[0])?.focus();
    const outside = (event: PointerEvent) => {
      if (!anchor.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, close]);

  const controller: CatchMenuController = {
    close: () => close(true),
    isOpen: open,
    open: () => setOpen(true),
    toggle: () => setOpen((value) => !value),
    triggerProps: {
      "aria-controls": `${id}-panel`,
      "aria-expanded": open,
      "aria-haspopup": listbox ? "listbox" : "menu",
      onClick: () => setOpen((value) => !value),
      onKeyDown: (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setOpen(true);
        }
      },
      ref: button,
    },
  };
  const offset = alignmentOffset && (alignmentOffset.x || alignmentOffset.y)
    ? {transform: `translate(${alignmentOffset.x}px, ${alignmentOffset.y}px)`}
    : {};

  return (
    <div className={styles.anchor} data-align={align} ref={anchor}>
      {builder(controller)}
      {open ? (
        <Panel
          id={`${id}-panel`}
          items={items}
          label={label}
          onDone={close}
          onSelected={onSelected}
          panelRef={panel}
          place={placement.place}
          style={{...offset, ...(placement.maxHeight === undefined ? {} : {maxHeight: placement.maxHeight})}}
          width={width}
        />
      ) : null}
    </div>
  );
}
