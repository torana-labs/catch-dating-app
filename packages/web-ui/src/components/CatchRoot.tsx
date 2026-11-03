"use client";

import {useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode} from "react";
import {
  catchSizeClassForWidth,
  type CatchFormat,
  type CatchGround,
  type CatchRegister,
  type CatchSizeClass,
  type CatchThemeMode,
} from "./catchCoreVocabulary";
import {CatchContext, catchThemeAttribute, useCatch, type CatchContextValue} from "./catchRootContext";
import styles from "./CatchRoot.module.css";

export interface CatchRootProps {
  /** Day screens are white; night is for the door, the live console and staff screens. Defaults to day. */
  theme?: CatchThemeMode;
  /**
   * The size class. `auto` (the default) measures the root's own width; the
   * server render and the first client render are compact, so hydration never
   * mismatches. Pages that know their width pass it.
   */
  size?: CatchSizeClass | "auto";
  /** The event this screen is about: accent buttons, markers and badges pick up its colour. */
  format?: CatchFormat;
  /** quiet for Admin. Parts read it from CSS (data-register), so screens never restyle them. Defaults to app. */
  register?: CatchRegister;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * catch.root: sets the theme, size class, format, register and motion
 * preference for everything inside it. Wrap each screen (or the whole app)
 * once. It paints the theme's ground and ink in the body role.
 */
export function CatchRoot({theme = "day", size = "auto", format, register = "app", children, className, style}: CatchRootProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<CatchSizeClass>("compact");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (size !== "auto" || !element) return;
    const update = () => setMeasured(catchSizeClassForWidth(element.getBoundingClientRect().width));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [size]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  const sizeClass = size === "auto" ? measured : size;
  const value = useMemo<CatchContextValue>(
    () => ({theme, register, sizeClass, ground: theme === "night" ? "night" : "ground", format, reducedMotion}),
    [theme, register, sizeClass, format, reducedMotion],
  );
  return (
    <CatchContext.Provider value={value}>
      <div
        className={className ? `${styles.root} ${className}` : styles.root}
        data-catch-theme={catchThemeAttribute(theme)}
        data-format={format}
        data-register={register}
        data-size={sizeClass}
        ref={ref}
        style={style}
      >
        {children}
      </div>
    </CatchContext.Provider>
  );
}

export interface CatchGroundProviderProps {
  ground: CatchGround;
  /** Defaults to the parent's format. */
  format?: CatchFormat;
  /** A theme change flips the token variables beneath it. Defaults to the parent's theme. */
  theme?: CatchThemeMode;
  children?: ReactNode;
}

/**
 * Re-provides the context with a new ground (and optionally a format or
 * theme), the way a Surface tells its children what they sit on. Its wrapper
 * draws no box (`display: contents`); it carries the theme attribute when the
 * theme changes and resets the text colour to the new ground's ink.
 */
export function CatchGroundProvider({ground, format, theme, children}: CatchGroundProviderProps) {
  const parent = useCatch();
  const value = useMemo<CatchContextValue>(
    () => ({...parent, ground, format: format ?? parent.format, theme: theme ?? parent.theme}),
    [parent, ground, format, theme],
  );
  return (
    <CatchContext.Provider value={value}>
      <div
        className={styles.ground}
        data-catch-theme={theme ? catchThemeAttribute(theme) : undefined}
        data-format={value.format}
        data-ground={ground}
      >
        {children}
      </div>
    </CatchContext.Provider>
  );
}
