import {createContext, createElement, useContext, useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode} from "react";
import {createTryItCommandClient} from "../../shared/api/tryItCommands";
import {createPastSalesFlow, type PastSalesFlow, type PastSalesFlowDeps, type PastSalesFlowState} from "./pastSalesFlow";

/** What the report tool runs against: the site's command client unless a story or test provides another. */
export type PastSalesToolDeps = Omit<PastSalesFlowDeps, "client"> & Partial<Pick<PastSalesFlowDeps, "client">>;
const pastSalesDepsContext = createContext<PastSalesToolDeps>({});

/** Gives the report tool inside `children` these dependencies (Storybook answers the commands itself). */
export function providePastSalesDeps(deps: PastSalesToolDeps, children: ReactNode): ReactNode {
  return createElement(pastSalesDepsContext.Provider, {value: deps}, children);
}

/**
 * Owns Reports' export upload on the page: its flow (./pastSalesFlow), made
 * once and dropped with the component, and the form handlers the view binds.
 */
export function usePastSalesToolController() {
  const deps = useContext(pastSalesDepsContext);
  const [flow] = useState<PastSalesFlow>(() => createPastSalesFlow({...deps, client: deps.client ?? createTryItCommandClient()}));
  useEffect(() => {
    flow.resume();
    return () => flow.dispose();
  }, [flow]);
  const state: PastSalesFlowState = useSyncExternalStore(flow.subscribe, flow.getState, flow.getState);
  const submitWith = (work: () => Promise<void>) => (event?: FormEvent) => {
    event?.preventDefault();
    void work();
  };
  return {
    state,
    flow,
    submit: submitWith(() => flow.submit()),
    continueAccount: submitWith(() => flow.continueAccount()),
    submitMapping: submitWith(() => flow.submitMapping()),
  };
}
export type PastSalesToolController = ReturnType<typeof usePastSalesToolController>;
