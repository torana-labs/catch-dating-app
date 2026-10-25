"use client";

import type {ReactNode} from "react";
import styles from "./CatchSurface.module.css";

export type CatchSurfaceTone = "surface" | "raised" | "primarySoft" | "transparent";
export type CatchSurfaceEmphasis = "flat" | "subtle" | "raised" | "floating";
interface SurfaceContent {child: ReactNode}
interface SurfaceAction {onTap?: () => void; onFocusChange?: (value: boolean) => void}
/** Native geometry overrides stay native-only; compose web padding with CatchInset. */
export type CatchSurfaceProps =
  | (SurfaceContent & SurfaceAction & {recipe?: "surface"; tone?: CatchSurfaceTone; emphasis?: CatchSurfaceEmphasis})
  | (SurfaceContent & SurfaceAction & {recipe: "card"; tone?: CatchSurfaceTone})
  | (SurfaceContent & {recipe: "tinted"});

/** Flutter's surface/card/tinted recipes. A callback gives the surface native button semantics. */
export function CatchSurface(props: CatchSurfaceProps) {
  const recipe = props.recipe ?? "surface";
  const tone = props.recipe === "tinted" ? "primarySoft" : props.tone ?? "surface";
  const emphasis = props.recipe === "card" ? "subtle" : props.recipe === "tinted" ? "flat" : props.emphasis ?? "flat";
  const action = props.recipe === "tinted" ? undefined : props.onTap;
  const attributes = {className: styles.surface, "data-recipe": recipe, "data-tone": tone, "data-emphasis": emphasis};
  return action ? <button {...attributes} type="button" onClick={action}
    onFocus={() => props.recipe !== "tinted" && props.onFocusChange?.(true)}
    onBlur={() => props.recipe !== "tinted" && props.onFocusChange?.(false)}>{props.child}</button>
    : <div {...attributes}>{props.child}</div>;
}
