"use client";

import {useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode} from "react";
import {
  catchSizeClassForWidth,
  type CatchFormat,
  type CatchRegister,
  type CatchSizeClass,
  type CatchThemeMode,
} from "./catchCoreVocabulary";
import {CatchContext, catchThemeAttribute, type CatchContextValue} from "./catchRootContext";
import styles from "./CatchRoot.module.css";

export interface CatchRootProps {
  /**
   * Day screens are white; night is for the door, the live console and staff
   * screens. `auto` (the default) follows the person's colour scheme
   * (prefers-color-scheme) and its changes; the server render and the first
   * client render are day, so hydration never mismatches. A page that must
   * not flash sets data-catch-theme before hydration. day and night force a
   * theme.
   */
  theme?: CatchThemeMode | "auto";
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
 * once. It paints the theme's ground and ink in the body role. A Surface (or
 * CatchGroundProvider) re-provides the ground beneath it.
 */
export function CatchRoot({theme: themeProp = "auto", size = "auto", format, register = "app", children, className, style}: CatchRootProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<CatchSizeClass>("compact");
  const [preferred, setPreferred] = useState<CatchThemeMode>("day");
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
    if (themeProp !== "auto") return;
    return followMediaQuery("(prefers-color-scheme: dark)", (dark) => setPreferred(dark ? "night" : "day"));
  }, [themeProp]);

  useEffect(() => followMediaQuery("(prefers-reduced-motion: reduce)", setReducedMotion), []);

  const theme = themeProp === "auto" ? preferred : themeProp;
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

/** Calls back with a media query's match now and on every change; returns the cleanup. */
function followMediaQuery(media: string, onMatch: (matches: boolean) => void): (() => void) | undefined {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
  const query = window.matchMedia(media);
  const update = () => onMatch(query.matches);
  update();
  query.addEventListener?.("change", update);
  return () => query.removeEventListener?.("change", update);
}
