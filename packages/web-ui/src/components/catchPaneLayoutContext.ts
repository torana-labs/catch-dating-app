import {createContext, useContext} from "react";

export type CatchPaneSlot = "main" | "detail" | "aside";

export interface CatchPaneState {
  /** The slot this content sits in, or null outside a CatchPaneLayout. */
  slot: CatchPaneSlot | null;
  /** Whether the panes sit side by side rather than one replacing the other. */
  split: boolean;
}

export const CatchPaneContext = createContext<CatchPaneState>({slot: null, split: false});

/** Which pane of the nearest CatchPaneLayout this content is in. */
export function useCatchPane(): CatchPaneState {
  return useContext(CatchPaneContext);
}
