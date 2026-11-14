"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {catchAnchoredPanelGap, catchAnchoredPlacement, catchAnchoredViewportInset} from "./catchAnchoredPlacement";
import {CatchDialog} from "./CatchDialog";
import {CatchSheet} from "./CatchSheet";
import {CatchText} from "./CatchText";
import styles from "./CatchAdaptiveSheet.module.css";

/** At this width and wider, a sheet becomes a dropdown or a dialog. */
export const catchAdaptiveSheetWideMin = 900;

/** What a sheet becomes at 900px and wider. */
export type CatchAdaptiveSheetWide = "dropdown" | "dialog";

/** What actually draws: under 900px always the sheet. */
export type CatchAdaptiveSheetSurface = "sheet" | CatchAdaptiveSheetWide;

export interface CatchAdaptiveSheetProps {
  open: boolean;
  /** The reader dismissed it: Escape, the backdrop, an outside press or the close button. */
  onClose: () => void;
  children: ReactNode;
  title: string;
  subtitle?: string;
  /** Quiet copy under the content: the sheet's footer, the dropdown's footnote, under the dialog's body. */
  footer?: ReactNode;
  /**
   * What wide screens get. dropdown: a panel under `anchor`, for content
   * opened from a top-bar control; dialog: a centred dialog, for page content
   * too big for a dropdown.
   */
  wide: CatchAdaptiveSheetWide;
  /**
   * The control that opens it, such as a CatchButton. It is drawn in place,
   * and the dropdown hangs from it.
   */
  trigger?: ReactNode;
  /**
   * The element the dropdown hangs from when it is not `trigger`. Without an
   * anchor on screen (a collapsed menu) the dropdown is a dialog.
   */
  anchor?: RefObject<HTMLElement | null>;
  /** Which edge of the anchor the dropdown lines up with. */
  align?: "start" | "end";
  /** The dropdown's width in px (the dialog is 440px). */
  width?: number;
  /** Names the dialog's close button; the sheet and the dropdown have none. */
  closeLabel: string;
}

const wideQuery = `(min-width: ${catchAdaptiveSheetWideMin}px)`;

function subscribeWide(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => undefined;
  const query = window.matchMedia(wideQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function wideNow() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(wideQuery).matches;
}

/**
 * Which surface an adaptive sheet draws at the current width: "sheet" under
 * 900px (phones, phones in landscape), otherwise `wide`. It follows the
 * window as it resizes; a server render is narrow.
 */
export function useCatchAdaptiveSheetSurface(wide: CatchAdaptiveSheetWide): CatchAdaptiveSheetSurface {
  const isWide = useSyncExternalStore(subscribeWide, wideNow, () => false);
  return isWide ? wide : "sheet";
}

const focusableSelector = [
  "a[href]", "button:not(:disabled)", "input:not(:disabled):not([type=hidden])", "select:not(:disabled)",
  "textarea:not(:disabled)", "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusables(panel: HTMLElement | null) {
  // In document order, whatever order a selector engine returns them in.
  return panel ? [...panel.querySelectorAll<HTMLElement>(focusableSelector)]
    .sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1) : [];
}

/** Shows or hides a popover; one already in that state, or a browser without popovers, is left alone. */
function topLayer(element: HTMLElement | null, action: "show" | "hide") {
  const method = action === "show" ? element?.showPopover : element?.hidePopover;
  if (typeof method !== "function") return;
  try {
    method.call(element);
  } catch {
    // InvalidStateError: already shown or hidden.
  }
}

function anchorOnScreen(anchor: RefObject<HTMLElement | null> | undefined) {
  const box = anchor?.current?.getBoundingClientRect();
  return Boolean(box && (box.width > 0 || box.height > 0));
}

/**
 * The one sheet the website opens, adapting to the width: a CatchSheet under
 * 900px, exactly as on phones; at 900px and wider, content opened from a
 * top-bar control drops down from that control, and page content too big for
 * a dropdown opens as a centred CatchDialog. Each feature declares its title,
 * content and footer once.
 *
 * The dropdown is non-modal: the page stays live and undimmed. Escape or a
 * press outside closes it; focus moves into the panel when it opens, Tab
 * cycles inside it, and Escape returns focus to the anchor. It sits in the
 * top layer, 8px under the anchor (over it when there is more room above),
 * 16px inside the viewport, and scrolls inside itself when the window is
 * short. The caller owns the content's state, so a draft survives closing.
 */
export function CatchAdaptiveSheet(props: CatchAdaptiveSheetProps) {
  const surface = useCatchAdaptiveSheetSurface(props.wide);
  const {open, onClose, children, title, subtitle, footer, closeLabel, trigger} = props;
  const wrapper = useRef<HTMLSpanElement>(null);
  const anchor = props.anchor ?? (trigger != null ? wrapper : undefined);
  // Measured as it opens: an anchor that is not on screen (a collapsed menu) makes it a dialog.
  const [anchorMissing, setAnchorMissing] = useState(false);
  useLayoutEffect(() => {
    if (open && surface === "dropdown") setAnchorMissing(!anchorOnScreen(anchor));
  }, [open, surface, anchor]);
  const dropdown = surface === "dropdown" && anchor != null && !anchorMissing;
  let overlay: ReactNode;
  if (surface === "sheet") {
    overlay = (
      <CatchSheet footer={footer} onClose={onClose} open={open} recipe="standard" subtitle={subtitle} title={title}>
        {children}
      </CatchSheet>
    );
  } else if (!dropdown) {
    overlay = (
      <CatchDialog closeLabel={closeLabel} onClose={onClose} open={open} recipe="content" subtitle={subtitle} title={title}>
        {children}
        {footer != null ? <div className={styles.dialogFooter}>{footer}</div> : null}
      </CatchDialog>
    );
  } else {
    overlay = open ? <Dropdown {...props} anchor={anchor} /> : null;
  }
  if (trigger == null) return overlay;
  return <span className={styles.anchor} ref={wrapper}>{trigger}{overlay}</span>;
}

/** The anchor itself when it takes focus, else the first control inside it (a trigger's button). */
function focusTarget(anchor: HTMLElement | null | undefined) {
  if (!anchor) return null;
  if (anchor.matches(focusableSelector)) return anchor;
  return focusables(anchor).find((element) => !element.closest("[role=dialog], dialog")) ?? null;
}

interface Position {
  top?: number;
  bottom?: number;
  left: number;
  maxHeight: number;
}

function Dropdown({anchor, align = "start", children, footer, onClose, subtitle, title, width = 380}: CatchAdaptiveSheetProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const subtitleId = useId();
  const [position, setPosition] = useState<Position | null>(null);

  // The latest onClose, so a caller's inline callback never re-runs the effects.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const close = useCallback((returnFocus: boolean) => {
    closeRef.current();
    if (returnFocus) focusTarget(anchor?.current)?.focus();
  }, [anchor]);

  const place = useCallback(() => {
    const element = panel.current;
    const rect = anchor?.current?.getBoundingClientRect();
    if (!element || !rect) return;
    const viewport = {height: window.innerHeight, width: window.innerWidth};
    const panelWidth = Math.min(width, viewport.width - 2 * catchAnchoredViewportInset);
    const left = align === "end" ? rect.right - panelWidth : rect.left;
    const {maxHeight, place: side, shiftX} = catchAnchoredPlacement(rect, element.scrollHeight, viewport,
      {left, right: left + panelWidth, width: panelWidth});
    setPosition(side === "above" ?
      {bottom: viewport.height - rect.top + catchAnchoredPanelGap, left: left + shiftX, maxHeight} :
      {left: left + shiftX, maxHeight, top: rect.bottom + catchAnchoredPanelGap});
  }, [align, anchor, width]);

  useLayoutEffect(() => {
    const element = panel.current;
    // The top layer escapes the header's stacking context and any clipping
    // ancestor; a browser without popovers still draws the fixed panel.
    topLayer(element, "show");
    place();
    return () => topLayer(element, "hide");
  }, [place]);

  const placed = position != null;
  useEffect(() => {
    // Focus moves in once, as soon as the placed panel is visible: the
    // autofocus field, else the first field or control.
    if (!placed) return;
    const element = panel.current;
    const autofocus = element?.querySelector<HTMLElement>("[autofocus], input:not(:disabled):not([type=hidden])");
    (autofocus ?? focusables(element)[0] ?? element)?.focus();
  }, [placed]);

  useEffect(() => {
    const element = panel.current;
    // A dropdown open on its first render measures again here: a trigger
    // wrapper's ref attaches after this panel's layout effect.
    place();
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      // The trigger toggles the dropdown itself; a press on it is not outside.
      if (element?.contains(target) || anchor?.current?.contains(target)) return;
      close(false);
    };
    let frame = 0;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", follow);
    window.addEventListener("scroll", follow, {capture: true, passive: true});
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", follow);
      window.removeEventListener("scroll", follow, {capture: true});
    };
  }, [anchor, close, place]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key !== "Tab") return;
    const rows = focusables(panel.current);
    if (rows.length === 0) return;
    const first = rows[0];
    const last = rows[rows.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      aria-describedby={subtitle ? subtitleId : undefined}
      aria-labelledby={titleId}
      className={styles.dropdown}
      data-placed={position ? true : undefined}
      onKeyDown={onKeyDown}
      popover="manual"
      ref={panel}
      role="dialog"
      style={{
        bottom: position?.bottom,
        left: position?.left,
        maxHeight: position?.maxHeight,
        top: position?.top,
        width: `min(${width}px, calc(100vw - ${2 * catchAnchoredViewportInset}px))`,
      }}
      tabIndex={-1}
    >
      <div className={styles.pad}>
        <div className={styles.heading}>
          <CatchText as="h2" id={titleId} variant="title-bar">{title}</CatchText>
          {subtitle ? <CatchText as="p" id={subtitleId} tone="secondary" variant="body-small">{subtitle}</CatchText> : null}
        </div>
        {children}
      </div>
      {footer != null ? <div className={styles.footnote}>{footer}</div> : null}
    </div>
  );
}
