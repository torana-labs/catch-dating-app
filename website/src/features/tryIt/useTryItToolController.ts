import {createContext, createElement, useContext, useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode} from "react";
import {createTryItCommandClient} from "../../shared/api/tryItCommands";
import {createTryItFlow, type TryItDraftEvent, type TryItFlow, type TryItFlowDeps, type TryItFlowState} from "./tryItFlow";
import type {TryItToolKind} from "./tryItModel";

const rememberedKey = "catch.tryIt.draftEvent";

/**
 * The draft event this tab's event import made, so the kit can use it. A
 * per-viewer convenience in sessionStorage: it holds ids the visitor's own
 * account can read, never a credential, and the kit checks the account.
 */
export const tryItSessionDraft: NonNullable<TryItFlowDeps["remembered"]> = {
  read() {
    try {
      const value = JSON.parse(window.sessionStorage.getItem(rememberedKey) ?? "null") as Partial<TryItDraftEvent> | null;
      return value && typeof value.eventId === "string" && typeof value.uid === "string" && typeof value.name === "string" &&
        typeof value.localDate === "string" && typeof value.localStartTime === "string" ? value as TryItDraftEvent : null;
    } catch {
      return null;
    }
  },
  write(draft) {
    try {
      window.sessionStorage.setItem(rememberedKey, JSON.stringify(draft));
    } catch {
      // Private windows only lose the shortcut.
    }
  },
};

/** What a try-it tool runs against: the site's command client unless a story or test provides another. */
export type TryItToolDeps = Omit<TryItFlowDeps, "client"> & Partial<Pick<TryItFlowDeps, "client">>;
const tryItDepsContext = createContext<TryItToolDeps>({remembered: tryItSessionDraft});

/** Gives every try-it tool inside `children` these dependencies (Storybook answers the commands itself). */
export function provideTryItDeps(deps: TryItToolDeps, children: ReactNode): ReactNode {
  return createElement(tryItDepsContext.Provider, {value: deps}, children);
}

/**
 * Owns one try-it tool on a page: its flow (./tryItFlow), made once and
 * dropped with the component, and the form handlers the view binds.
 */
export function useTryItToolController(tool: TryItToolKind) {
  const deps = useContext(tryItDepsContext);
  const [flow] = useState<TryItFlow>(() => createTryItFlow(tool, {...deps, client: deps.client ?? createTryItCommandClient()}));
  useEffect(() => () => flow.dispose(), [flow]);
  const state: TryItFlowState = useSyncExternalStore(flow.subscribe, flow.getState, flow.getState);
  const submitWith = (work: () => Promise<void>) => (event?: FormEvent) => {
    event?.preventDefault();
    void work();
  };
  return {
    state,
    flow,
    submit: submitWith(() => flow.submit()),
    continueAccount: submitWith(() => flow.continueAccount()),
    makeLinks: submitWith(() => flow.makeLinks()),
  };
}
export type TryItToolController = ReturnType<typeof useTryItToolController>;
