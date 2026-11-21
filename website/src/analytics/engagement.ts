/**
 * Scroll depth and per-section reading time for one page visit. It reads
 * only layout: how far the page is scrolled and which `section[id]` bands
 * are on screen while the tab is visible. It never reads text or answers.
 * The caller decides where the events go (`analytics.ts` forwards them to
 * Google Analytics after the analytics choice).
 */
export type EngagementEvent =
  | {name: "scroll_depth"; parameters: {percent_scrolled: 25 | 50 | 75 | 90}}
  | {name: "section_read"; parameters: {section_id: string; engaged_seconds: number}};

export const scrollDepthThresholds = [25, 50, 75, 90] as const;
/** A band counts as read while at least this share of it, or of the screen, is in view. */
const visibleShare = 0.5;
/** Shorter glances are not reading. */
const minimumSeconds = 2;
const maximumSeconds = 1800;
const sectionId = /^[a-z0-9][a-z0-9_-]{0,79}$/u;

/** The share of the page seen so far, from 0 to 100. A page that fits the screen counts as fully seen. */
export function scrolledPercent(scrollTop: number, viewportHeight: number, pageHeight: number): number {
  if (!(pageHeight > 0) || !(viewportHeight > 0)) return 0;
  if (pageHeight <= viewportHeight) return 100;
  return Math.min(100, Math.max(0, ((scrollTop + viewportHeight) / pageHeight) * 100));
}

/**
 * Starts tracking the current page visit and returns its stop, which reports
 * the reading time gathered so far. Each scroll threshold reports once per
 * visit; each section reports its total visible time once, when the visit
 * ends or the tab is hidden, if it reached two seconds.
 */
export function startEngagementTracking(send: (event: EngagementEvent) => void,
  now: () => number = () => Date.now()): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => undefined;
  const reached = new Set<number>();
  const visibleSince = new Map<string, number>();
  const totals = new Map<string, number>();
  let frame = 0;

  const measureScroll = () => {
    frame = 0;
    const root = document.documentElement;
    const percent = scrolledPercent(window.scrollY ?? root.scrollTop, window.innerHeight, root.scrollHeight);
    // A page that fits the screen without scrolling says nothing about scrolling.
    if (root.scrollHeight <= window.innerHeight) return;
    for (const threshold of scrollDepthThresholds) {
      if (percent >= threshold && !reached.has(threshold)) {
        reached.add(threshold);
        send({name: "scroll_depth", parameters: {percent_scrolled: threshold}});
      }
    }
  };
  const onScroll = () => {
    if (!frame) frame = window.requestAnimationFrame(measureScroll);
  };

  const pauseSection = (id: string) => {
    const since = visibleSince.get(id);
    if (since === undefined) return;
    totals.set(id, (totals.get(id) ?? 0) + Math.max(0, now() - since));
    visibleSince.delete(id);
  };
  const flush = () => {
    for (const id of [...visibleSince.keys()]) pauseSection(id);
    for (const [id, milliseconds] of totals) {
      const seconds = Math.min(maximumSeconds, Math.round(milliseconds / 1000));
      if (seconds >= minimumSeconds) send({name: "section_read", parameters: {section_id: id, engaged_seconds: seconds}});
    }
    totals.clear();
  };

  const sections = Array.from(document.querySelectorAll<HTMLElement>("section[id]")).filter((section) => sectionId.test(section.id));
  const inView = new Set<string>();
  const observer = typeof IntersectionObserver === "function" && sections.length ? new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const id = (entry.target as HTMLElement).id;
      const screenShare = entry.rootBounds?.height ? entry.intersectionRect.height / entry.rootBounds.height : 0;
      const visible = entry.isIntersecting && (entry.intersectionRatio >= visibleShare || screenShare >= visibleShare);
      if (visible) {
        inView.add(id);
        if (!document.hidden && !visibleSince.has(id)) visibleSince.set(id, now());
      } else {
        inView.delete(id);
        pauseSection(id);
      }
    }
  }, {threshold: [0, 0.25, 0.5, 0.75, 1]}) : null;
  for (const section of sections) observer?.observe(section);

  const onVisibility = () => {
    if (document.hidden) flush();
    else for (const id of inView) if (!visibleSince.has(id)) visibleSince.set(id, now());
  };

  window.addEventListener("scroll", onScroll, {passive: true});
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", flush);
  measureScroll();

  return () => {
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", flush);
    if (frame) window.cancelAnimationFrame(frame);
    observer?.disconnect();
    flush();
  };
}
