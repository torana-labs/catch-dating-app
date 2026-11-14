/**
 * Where an anchored panel opens: the placement CatchMenu.anchored and the
 * CatchAdaptiveSheet dropdown share. The panel opens 8px from its trigger, on
 * the side with more room when it does not fit below, and stays 16px inside
 * the viewport, so a short window scrolls the panel instead of the page.
 */

// Flutter's CatchLayout.menuViewportInset and the gap under the trigger.
export const catchAnchoredViewportInset = 16;
export const catchAnchoredPanelGap = 8;

export interface CatchAnchoredRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface CatchAnchoredPlacement {
  place: "below" | "above";
  /** The panel's height limit: the room on its side, less the gap. */
  maxHeight: number;
  /** How far to move the panel sideways to keep it inside the viewport inset. */
  shiftX: number;
}

/**
 * The side and height limit for a panel `needed` px tall under or over
 * `anchor`, and the sideways shift that brings an already-placed `panel` box
 * back inside the viewport. A panel that has not been laid out (no box, or a
 * zero width) is not shifted.
 */
export function catchAnchoredPlacement(
  anchor: CatchAnchoredRect,
  needed: number,
  viewport: {width: number; height: number},
  panel?: Pick<CatchAnchoredRect, "left" | "right"> & {width: number},
): CatchAnchoredPlacement {
  const inset = catchAnchoredViewportInset;
  const below = viewport.height - anchor.bottom - inset;
  const above = anchor.top - inset;
  const place = needed > below && above > below ? "above" : "below";
  const shiftX = !panel || panel.width === 0 ? 0 : panel.left < inset ? inset - panel.left :
    panel.right > viewport.width - inset ? viewport.width - inset - panel.right : 0;
  return {maxHeight: Math.max(0, (place === "above" ? above : below) - catchAnchoredPanelGap), place, shiftX};
}
