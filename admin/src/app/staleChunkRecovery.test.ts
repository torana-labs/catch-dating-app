import {afterEach, describe, expect, it, vi} from "vitest";
import {
  installStaleChunkRecovery,
  isStaleChunkError,
  isStaleChunkReloadPending,
  reloadOnceForStaleChunk,
  resetStaleChunkRecoveryForTests,
} from "./staleChunkRecovery";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe("stale chunk recovery", () => {
  afterEach(resetStaleChunkRecoveryForTests);

  it.each([
    "Failed to fetch dynamically imported module: https://admin.example/assets/AdminShellFrame-CKNW4ne_.js",
    "error loading dynamically imported module: https://admin.example/assets/a.js",
    "Importing a module script failed.",
    "Unable to preload CSS for /assets/a.css",
  ])("recognizes %s", (message) => {
    expect(isStaleChunkError(new TypeError(message))).toBe(true);
  });

  it("leaves other errors to the error page", () => {
    expect(isStaleChunkError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isStaleChunkError(null)).toBe(false);
  });

  it("reloads once and not again while the first reload is recent", () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    expect(reloadOnceForStaleChunk({storage, now: 1_000_000, reload})).toBe(true);
    expect(isStaleChunkReloadPending()).toBe(true);
    expect(reload).toHaveBeenCalledOnce();

    // The page that came back from the reload has fresh module state.
    resetStaleChunkRecoveryForTests();
    expect(reloadOnceForStaleChunk({storage, now: 1_030_000, reload})).toBe(false);
    expect(isStaleChunkReloadPending()).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("recovers again from a later deploy in the same tab", () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    reloadOnceForStaleChunk({storage, now: 1_000_000, reload});
    resetStaleChunkRecoveryForTests();
    expect(reloadOnceForStaleChunk({storage, now: 1_060_000, reload})).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("doesn't reload twice from one page", () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    expect(reloadOnceForStaleChunk({storage, now: 1_000_000, reload})).toBe(true);
    expect(reloadOnceForStaleChunk({storage, now: 1_000_001, reload})).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("doesn't reload without storage to remember the attempt", () => {
    const reload = vi.fn();
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => undefined,
    };
    expect(reloadOnceForStaleChunk({storage, reload})).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("stops Vite rethrowing only when it is reloading", () => {
    const target = new EventTarget();
    const fire = () => {
      const event = new Event("vite:preloadError", {cancelable: true});
      target.dispatchEvent(event);
      return event.defaultPrevented;
    };
    const recover = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    installStaleChunkRecovery(target as unknown as Window, recover);
    expect(fire()).toBe(true);
    expect(fire()).toBe(false);
  });
});
