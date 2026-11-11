import {useSyncExternalStore, type ComponentType} from "react";
import type {LucideProps} from "lucide-react";
import type {catchIconGlyphs} from "./catchIconGlyphs";
import type {CatchIconName} from "./catchIconRoles";

/** Every Catch icon role and the Lucide component that draws it. */
export type CatchIconGlyphs = typeof catchIconGlyphs;

// The glyph map imports a component for every role (about 50 KB), more than
// an app's whole first screen needs, so it is its own chunk. The first icon to
// mount starts the download; until it arrives each icon is an empty box of
// its final size, so nothing moves when the glyphs draw.
let glyphs: CatchIconGlyphs | undefined;
let loading: Promise<CatchIconGlyphs> | undefined;
const listeners = new Set<() => void>();

/** Loads the glyph map once; a failed load is retried by the next caller. */
export function loadCatchIconGlyphs(): Promise<CatchIconGlyphs> {
  loading ??= import("./catchIconGlyphs").then(
    (module) => {
      glyphs = module.catchIconGlyphs;
      for (const listener of listeners) listener();
      return glyphs;
    },
    (error: unknown) => {
      loading = undefined;
      throw error;
    },
  );
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // An icon has no error state to show; it stays an empty box and the next
  // icon to mount tries again.
  loadCatchIconGlyphs().catch(() => undefined);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => glyphs;

function pendingGlyph({strokeWidth, ...rest}: LucideProps) {
  return (
    <svg
      {...rest}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    />
  );
}

/** The component that draws a role: its glyph once loaded, an empty box of the same size before. */
export function useCatchIconGlyph(name: CatchIconName): ComponentType<LucideProps> {
  const loaded = useSyncExternalStore(subscribe, snapshot, snapshot);
  return loaded?.[name] ?? pendingGlyph;
}
