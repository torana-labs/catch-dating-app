"use client";

import type {AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes} from "react";
import {
  catchGroundIsNight,
  type CatchFormat,
  type CatchGround,
  type CatchSurfaceBlock,
  type CatchSurfaceColor,
  type CatchSurfacePadding,
  type CatchThemeMode,
} from "./catchCoreVocabulary";
import {useCatch} from "./catchRootContext";
import {CatchGroundProvider} from "./CatchRoot";
import styles from "./CatchSurface.module.css";

export type CatchSurfaceElement = "div" | "section" | "article" | "aside" | "li";

export interface CatchSurfaceProps extends Omit<HTMLAttributes<HTMLElement>, "color"> {
  /**
   * plain: no box. tile: the grey block (the default). spotlight: one per
   * screen, in a format colour or ink. floating: over other things, with a
   * shadow. band: a full-width web page section with its content held to the
   * page width.
   */
  block?: CatchSurfaceBlock;
  /** Spotlight: a format or ink. Band: a format, ink or tile. Ignored for other blocks. */
  color?: CatchSurfaceColor;
  /** sm 12, md 16, lg 20 or none. Defaults by block: plain none, spotlight and floating lg, a nested tile sm, else md; a band's is vertical. */
  padding?: CatchSurfacePadding;
  /** Makes the whole block a button (type button) with press feedback. */
  onPress?: () => void;
  /** Makes the whole block a link with press feedback. */
  href?: string;
  as?: CatchSurfaceElement;
  /** Width over height: the block holds a fixed shape and its content sits at the bottom. */
  aspect?: number;
}

interface Resolved {
  childGround: CatchGround;
  theme?: CatchThemeMode;
  format?: CatchFormat;
  nested: boolean;
}

/** What a block tells its children they sit on, from the system's Surface. */
export function catchSurfaceChildGround(block: CatchSurfaceBlock, color: CatchSurfaceColor | undefined, ground: CatchGround): Resolved {
  const night = catchGroundIsNight(ground);
  const format = color === "ink" || color === "tile" ? undefined : color;
  switch (block) {
    case "tile": {
      const nested = ground === "tile" || ground === "colour" || ground === "night-tile";
      return {childGround: nested ? (night ? "night" : "nested") : night ? "night-tile" : "tile", nested};
    }
    case "spotlight":
      // "tile" is not a spotlight colour; like no colour it draws the ink spotlight.
      return format
        ? {childGround: "colour", format, theme: "day", nested: false}
        : {childGround: "night", theme: "night", nested: false};
    case "floating":
      return {childGround: night ? "night-tile" : "ground", nested: false};
    case "band":
      if (color === "ink") return {childGround: "night", theme: "night", nested: false};
      if (color === "tile") return {childGround: "tile", nested: false};
      if (format) return {childGround: "colour", format, theme: "day", nested: false};
      return {childGround: ground, nested: false};
    default:
      return {childGround: ground, nested: false};
  }
}

function defaultPadding(block: CatchSurfaceBlock, nested: boolean): CatchSurfacePadding {
  if (block === "plain") return "none";
  if (block === "spotlight" || block === "floating" || block === "band") return "lg";
  return nested ? "sm" : "md";
}

/**
 * catch.surface: the blocks every screen is built from, and the only thing
 * that draws a filled box. It tells its children what they sit on: a tile in
 * a tile is a nested block, a coloured spotlight sets the format and the day
 * theme, an ink spotlight or band the night theme.
 */
export function CatchSurface({
  block = "tile",
  color,
  padding,
  onPress,
  href,
  as = "div",
  aspect,
  className,
  children,
  style,
  ...rest
}: CatchSurfaceProps) {
  const {ground} = useCatch();
  const resolved = catchSurfaceChildGround(block, color, ground);
  const pressable = onPress !== undefined || href !== undefined;
  const classes = [styles.surface, pressable && styles.pressable, className].filter(Boolean).join(" ");
  const attributes = {
    ...rest,
    className: classes,
    "data-aspect": aspect ? "" : undefined,
    "data-band": block === "band" ? color ?? "ground" : undefined,
    "data-block": block,
    "data-format": block === "spotlight" || block === "band" ? resolved.format : undefined,
    "data-nested": resolved.nested ? "" : undefined,
    "data-on": ground,
    "data-pad": padding ?? defaultPadding(block, resolved.nested),
    style: aspect ? {...style, aspectRatio: String(aspect)} : style,
  };
  const body = (
    <CatchGroundProvider format={resolved.format} ground={resolved.childGround} theme={resolved.theme}>
      {children}
    </CatchGroundProvider>
  );
  if (href !== undefined) {
    return <a {...(attributes as AnchorHTMLAttributes<HTMLAnchorElement>)} href={href}>{body}</a>;
  }
  if (onPress !== undefined) {
    return <button {...(attributes as ButtonHTMLAttributes<HTMLButtonElement>)} onClick={onPress} type="button">{body}</button>;
  }
  const Element = as;
  return <Element {...attributes}>{body}</Element>;
}
