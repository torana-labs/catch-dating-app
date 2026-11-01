import {createContext, useContext, type UIEvent} from "react";

/** Size classes, as Flutter's CatchViewport names them: under 600, 600 to 839, and 840 up. */
export type CatchViewportSizeClass = "compact" | "medium" | "expanded";

/**
 * app: the apps and the website. quiet: Admin, the quietest register: plain-type headings and numbers,
 * neutral badges, one-line table cells and a text sidebar. Parts read it from CSS (`data-register`),
 * so a screen never restyles a shared part itself.
 */
export type CatchViewportRegister = "app" | "quiet";

export interface CatchViewportState {
  sizeClass: CatchViewportSizeClass;
  register: CatchViewportRegister;
  /** Whether the shell body has scrolled, so a top bar can show its line. */
  scrolled: boolean;
  inShell: boolean;
  onBodyScroll?: (event: UIEvent<HTMLElement>) => void;
}

export const CatchViewportContext = createContext<CatchViewportState>({
  sizeClass: "expanded",
  register: "app",
  scrolled: false,
  inShell: false,
});

/** The size class, register and scroll state of the nearest CatchViewport. */
export function useCatchViewport(): CatchViewportState {
  return useContext(CatchViewportContext);
}

export function catchViewportSizeClassFor(width: number): CatchViewportSizeClass {
  return width >= 840 ? "expanded" : width >= 600 ? "medium" : "compact";
}
