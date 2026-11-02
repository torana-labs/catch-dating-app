const reloadedAtKey = "catch-admin:stale-chunk-reloaded-at";
/** A second failure this soon after reloading means reloading did not help. */
const reloadCooldownMs = 60_000;

let reloadPending = false;

/**
 * Every deploy replaces Admin's hashed chunks, so a tab opened before it can
 * ask for one that no longer exists. These are the messages Chrome, Firefox,
 * Safari and Vite give for that.
 */
export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /dynamically imported module|importing a module script failed|unable to preload/iu.test(message);
}

export function isStaleChunkReloadPending(): boolean {
  return reloadPending;
}

/**
 * Reloads to pick up the new deploy, at most once a minute so a chunk that
 * stays missing shows the error page instead of looping. Without storage to
 * remember the attempt, it doesn't reload at all.
 */
export function reloadOnceForStaleChunk({
  storage = window.sessionStorage,
  now = Date.now(),
  reload = () => window.location.reload(),
}: {storage?: Pick<Storage, "getItem" | "setItem">; now?: number; reload?: () => void} = {}): boolean {
  if (reloadPending) return true;
  try {
    const last = Number(storage.getItem(reloadedAtKey) ?? 0);
    if (now - last < reloadCooldownMs) return false;
    storage.setItem(reloadedAtKey, String(now));
  } catch {
    return false;
  }
  reloadPending = true;
  reload();
  return true;
}

/** Recovers from a failed chunk preload before the route error page has to. */
export function installStaleChunkRecovery(
  target: Pick<Window, "addEventListener"> = window,
  recover: () => boolean = reloadOnceForStaleChunk,
): void {
  target.addEventListener("vite:preloadError", (event) => {
    if (recover()) event.preventDefault();
  });
}

export function resetStaleChunkRecoveryForTests(): void {
  reloadPending = false;
}
