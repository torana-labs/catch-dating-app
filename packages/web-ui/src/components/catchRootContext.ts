"use client";

import {createContext, useContext} from "react";
import type {CatchFormat, CatchGround, CatchRegister, CatchSizeClass, CatchThemeMode} from "./catchCoreVocabulary";

/** What CatchRoot provides, and what a Surface re-provides to everything inside it. */
export interface CatchContextValue {
  theme: CatchThemeMode;
  register: CatchRegister;
  sizeClass: CatchSizeClass;
  /** What the component sits on. */
  ground: CatchGround;
  /** The event this content is about: accent parts pick up its colour. */
  format?: CatchFormat;
  reducedMotion: boolean;
}

/** Outside any CatchRoot: a day, app-register, compact screen on the white ground. */
export const catchContextDefaults: CatchContextValue = {
  theme: "day",
  register: "app",
  sizeClass: "compact",
  ground: "ground",
  reducedMotion: false,
};

export const CatchContext = createContext<CatchContextValue>(catchContextDefaults);

/** The theme, register, size class, ground, format and motion preference of the nearest CatchRoot or Surface. */
export function useCatch(): CatchContextValue {
  return useContext(CatchContext);
}

/** The ground the component sits on. */
export function useGround(): CatchGround {
  return useContext(CatchContext).ground;
}

/** The generated sheet switches theme on this attribute: day is its light theme, night its dark one. */
export function catchThemeAttribute(theme: CatchThemeMode): "light" | "dark" {
  return theme === "night" ? "dark" : "light";
}
