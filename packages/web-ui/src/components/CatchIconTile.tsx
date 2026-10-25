import type {ReactNode} from "react";
import type {CatchTextColor} from "./CatchText";
import styles from "./CatchIconTile.module.css";

export type CatchIconTileVariant = "tile" | "plain" | "bubble" | "error";
export type CatchIconTileProps =
  | {recipe?: "tile"; icon: ReactNode; iconColor: CatchTextColor}
  | {recipe: "empty"; icon: ReactNode; variant?: "plain" | "bubble"}
  | {recipe: "error"; icon?: ReactNode};
const colors = new Set<CatchTextColor>(["ink", "ink2", "ink3", "primary", "danger", "positiveText", "attentionText", "inherit"]);
// The catalog's error role is circle-alert; surrounding recovery content owns copy.
const errorGlyph = <svg data-catch-icon-role="error" aria-hidden="true" focusable="false" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
</svg>;
/** Non-interactive library material. Canonical geometry is selected by the native recipe. */
export function CatchIconTile(props: CatchIconTileProps) {
  const recipe = props.recipe ?? "tile";
  const variant: CatchIconTileVariant = props.recipe === "empty" ? props.variant ?? "plain" : recipe === "error" ? "error" : "tile";
  if (props.recipe === "empty" && variant !== "plain" && variant !== "bubble") throw new TypeError("CatchIconTile.empty variant must be plain or bubble");
  const color = props.recipe === "empty" ? variant === "plain" ? "ink3" : "primary" : props.recipe === "error" ? "danger" : props.iconColor;
  if (!colors.has(color)) throw new TypeError("CatchIconTile iconColor must name a theme role");
  const icon = props.recipe === "error" ? props.icon ?? errorGlyph : props.icon;
  const glyph = <span className={styles.glyph}>{icon}</span>;
  return <span className={`${styles.root}${variant === "error" ? ` ${styles.center}` : ""}`}
    data-recipe={recipe} data-variant={variant} data-color={color} aria-hidden="true">
    {variant === "plain" ? glyph : <span className={styles.material}>{glyph}</span>}
  </span>;
}
