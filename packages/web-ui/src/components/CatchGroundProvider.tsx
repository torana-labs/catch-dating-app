"use client";

import {useContext, useMemo, type ReactNode} from "react";
import type {CatchFormat, CatchGround, CatchThemeMode} from "./catchCoreVocabulary";
import {CatchContext, catchThemeAttribute, useCatch, type CatchContextValue} from "./catchRootContext";
import styles from "./CatchGroundProvider.module.css";

/** The ground the component sits on: what the nearest Surface (or CatchRoot) tells it. */
export function useGround(): CatchGround {
  return useContext(CatchContext).ground;
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
 * theme changes and resets the text colour to the new ground's ink. Web-only:
 * Flutter's scope does the same without a wrapper.
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
