import {useEffect, useState} from "react";

/** What a live read shows: pending until the first value, then the latest value or the error. */
export type LiveRead<T> =
  | {status: "pending"; data: undefined; error: null}
  | {status: "success"; data: T; error: null}
  | {status: "error"; data: undefined; error: Error};

/** Starts a listener; resolves to its stop. */
export type LiveSubscribe<T> = (onValue: (value: T) => void, onError: (error: Error) => void) =>
  Promise<() => void> | (() => void);

const pending = {status: "pending", data: undefined, error: null} as const;

/**
 * Keeps one Firestore listener (or any subscription) open while `key` is
 * non-null, restarting it when `key` changes. A listener's first value ends
 * the loading state; later values replace it in place. Results are tagged
 * with their key, so a reader never sees the previous key's value.
 */
export function useLiveRead<T>(key: string | null, subscribe: LiveSubscribe<T>): LiveRead<T> {
  const [state, setState] = useState<{key: string; read: LiveRead<T>} | null>(null);
  useEffect(() => {
    if (key === null) return;
    let stopped = false;
    let stop: (() => void) | null = null;
    const set = (read: LiveRead<T>) => {
      if (!stopped) setState({key, read});
    };
    set(pending);
    Promise.resolve()
      .then(() => subscribe((data) => set({status: "success", data, error: null}),
        (error) => set({status: "error", data: undefined, error})))
      .then((unsubscribe) => {
        if (stopped) unsubscribe(); else stop = unsubscribe;
      }, (error: unknown) => set({status: "error", data: undefined,
        error: error instanceof Error ? error : new Error(String(error))}));
    return () => {
      stopped = true;
      stop?.();
    };
    // The key names the subscription; a new subscribe closure for the same key is the same read.
  }, [key]);
  return state && state.key === key ? state.read : pending;
}

/** Firestore and callable errors carry a code; permission-denied means rules refused the reader. */
export function liveReadErrorCode(error: unknown): string | null {
  const code = (error as {code?: unknown} | null)?.code;
  return typeof code === "string" ? code.replace(/^(functions|firestore)\//u, "") : null;
}
