import {createContext, createElement, useContext, useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode} from "react";
import {createTryItCommandClient} from "../../shared/api/tryItCommands";
import {createGuestImportFlow, type GuestImportFile, type GuestImportFlow, type GuestImportFlowDeps, type GuestImportFlowState} from "./guestImportFlow";
import {guestFileBase64} from "./guestImportModel";

/** A file the browser chose, read as base64 only when the flow sends it. */
export function browserGuestFile(file: File): GuestImportFile {
  return {
    name: file.name,
    size: file.size,
    read: async () => guestFileBase64(new Uint8Array(await file.arrayBuffer())),
  };
}

/** What the tool runs against: the site's command client unless a story or test provides another. */
export type GuestImportToolDeps = Partial<GuestImportFlowDeps>;
const guestImportDepsContext = createContext<GuestImportToolDeps>({});

/** Gives every guest-list tool inside `children` these dependencies (Storybook and tests answer the commands themselves). */
export function provideGuestImportDeps(deps: GuestImportToolDeps, children: ReactNode): ReactNode {
  return createElement(guestImportDepsContext.Provider, {value: deps}, children);
}

/**
 * Owns one guest-list tool on a page: its flow (./guestImportFlow), made
 * once and dropped with the component, and the form handlers the view binds.
 */
export function useGuestImportController() {
  const deps = useContext(guestImportDepsContext);
  const [flow] = useState<GuestImportFlow>(() => createGuestImportFlow({...deps, client: deps.client ?? createTryItCommandClient()}));
  useEffect(() => {
    flow.resume();
    return () => flow.dispose();
  }, [flow]);
  const state: GuestImportFlowState = useSyncExternalStore(flow.subscribe, flow.getState, flow.getState);
  const submitWith = (work: () => Promise<void>) => (event?: FormEvent) => {
    event?.preventDefault();
    void work();
  };
  return {
    state,
    flow,
    chooseFile: (file: File | null) => flow.setFile(file ? browserGuestFile(file) : null),
    submit: submitWith(() => flow.submit()),
    continueAccount: submitWith(() => flow.continueAccount()),
    submitMapping: submitWith(() => flow.submitMapping()),
  };
}
export type GuestImportController = ReturnType<typeof useGuestImportController>;
