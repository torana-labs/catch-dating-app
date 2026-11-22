import {createContext, createElement, useContext, useMemo, type ReactNode} from "react";
import {siteWalkthroughClient, visitorTimeZone, type WalkthroughClient} from "./walkthroughModel";

/** What the walkthrough booking runs against; a story or test may answer the calls itself or fix the visitor's zone. */
export interface WalkthroughDeps {
  client?: Partial<WalkthroughClient>;
  /** The visitor's IANA zone; null hides the local-time line. Defaults to the browser's. */
  timeZone?: string | null;
}

const walkthroughDepsContext = createContext<WalkthroughDeps>({});

/** Gives the walkthrough booking and manage views inside `children` these dependencies. */
export function provideWalkthroughDeps(deps: WalkthroughDeps, children: ReactNode): ReactNode {
  return createElement(walkthroughDepsContext.Provider, {value: deps}, children);
}

/** The client and visitor zone in effect: the provided ones, else the site's callables and the browser's zone. */
export function useWalkthroughDeps(): {client: WalkthroughClient; timeZone: string | null} {
  const deps = useContext(walkthroughDepsContext);
  return useMemo(() => ({
    client: {...siteWalkthroughClient, ...deps.client},
    timeZone: deps.timeZone === undefined ? visitorTimeZone() : deps.timeZone,
  }), [deps]);
}
