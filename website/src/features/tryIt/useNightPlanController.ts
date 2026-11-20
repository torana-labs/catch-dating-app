import {createContext, createElement, useContext, useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode} from "react";
import {createTryItCommandClient} from "../../shared/api/tryItCommands";
import {tryItSessionDraft} from "./useTryItToolController";
import {createNightPlanFlow, siteNightRehearsal, type NightPlanFlow, type NightPlanFlowDeps, type NightPlanFlowState} from "./nightPlanFlow";

/** What the tool runs against: the site's command client and practice session starter unless a story or test provides others. */
export type NightPlanDeps = Partial<NightPlanFlowDeps>;
const nightPlanDepsContext = createContext<NightPlanDeps>({});

/** Gives the plan-a-night tool inside `children` these dependencies (Storybook and tests answer the calls themselves). */
export function provideNightPlanDeps(deps: NightPlanDeps, children: ReactNode): ReactNode {
  return createElement(nightPlanDepsContext.Provider, {value: deps}, children);
}

/**
 * Owns the plan-a-night tool on a page: its flow (./nightPlanFlow), made
 * once and dropped with the component, and the form handlers the view binds.
 */
export function useNightPlanController() {
  const deps = useContext(nightPlanDepsContext);
  const [flow] = useState<NightPlanFlow>(() => createNightPlanFlow({
    ...deps,
    client: deps.client ?? createTryItCommandClient(),
    rehearse: deps.rehearse ?? siteNightRehearsal,
    remembered: deps.remembered ?? tryItSessionDraft,
  }));
  useEffect(() => {
    flow.resume();
    return () => flow.dispose();
  }, [flow]);
  const state: NightPlanFlowState = useSyncExternalStore(flow.subscribe, flow.getState, flow.getState);
  const submitWith = (work: () => Promise<void>) => (event?: FormEvent) => {
    event?.preventDefault();
    void work();
  };
  return {
    state,
    flow,
    submit: submitWith(() => flow.submit()),
    continueAccount: submitWith(() => flow.continueAccount()),
  };
}
export type NightPlanController = ReturnType<typeof useNightPlanController>;
