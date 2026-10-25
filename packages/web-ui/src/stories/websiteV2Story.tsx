import type {CSSProperties, ReactNode} from "react";
import {CatchGap} from "../components/CatchGap";
import {CatchText} from "../components/CatchText";
import type {Ground} from "../components/palette";
import {PageFrame} from "./referenceScreens";

/**
 * Story-only stand-ins for the Website v2 parts that later CAT-249 slices
 * build in the library. They draw with tokens so the layout stories read like
 * the boards; no page may import them.
 */

const groundStyle = (ground: Ground): CSSProperties => ({
  background: `var(--catch-ground-${ground}-fill)`,
  borderRadius: "var(--catch-radius-lg)",
  boxSizing: "border-box",
  color: `var(--catch-ground-${ground}-ink)`,
  display: "flex",
  flexDirection: "column",
  gap: "var(--catch-space-s2)",
  height: "100%",
  padding: "var(--catch-space-s5)",
});

/** A ground-filled tile with a kicker, a display title and supporting copy. */
export function StoryTile({
  body,
  ground = "paper",
  kicker,
  minHeight,
  title,
}: {
  body?: string;
  ground?: Ground;
  kicker?: string;
  minHeight?: number;
  title: string;
}) {
  return (
    <div data-catch-theme={ground === "ink" ? "dark" : "light"} style={{...groundStyle(ground), minHeight}}>
      {kicker ? <CatchText as="span" color="inherit" variant="supportingStrong">{kicker}</CatchText> : null}
      <CatchText as="h3" color="inherit" variant="displayXs">{title}</CatchText>
      {body ? <CatchText as="p" color="inherit" variant="bodyM">{body}</CatchText> : null}
    </div>
  );
}

/** A section opening: eyebrow, display headline and lead. */
export function StoryHeading({eyebrow, lead, title}: {eyebrow?: string; lead?: string; title: string}) {
  return (
    <CatchGap size="related">
      {eyebrow ? <CatchText as="span" variant="supportingStrong">{eyebrow}</CatchText> : null}
      <CatchText as="h2" variant="displayL">{title}</CatchText>
      {lead ? <CatchText as="p" color="ink2" variant="bodyL">{lead}</CatchText> : null}
    </CatchGap>
  );
}

/** A photo filling its cell at the given aspect ratio. */
export function StoryPhoto({alt, aspectRatio = "4 / 3", src}: {alt: string; aspectRatio?: string; src: string}) {
  return (
    <img
      alt={alt}
      src={src}
      style={{aspectRatio, borderRadius: "var(--catch-radius-lg)", display: "block", objectFit: "cover", width: "100%"}}
    />
  );
}

/** An app capture in a plain device outline. */
export function StoryPhone({alt, src}: {alt: string; src: string}) {
  return (
    <span
      style={{
        background: "var(--catch-palette-night-surface)",
        borderRadius: "var(--catch-space-s9)",
        boxShadow: "var(--catch-elevation-overlay)",
        display: "block",
        overflow: "hidden",
        padding: "var(--catch-space-micro10)",
      }}
    >
      <img alt={alt} src={src} style={{borderRadius: "var(--catch-space-s7)", display: "block", width: "100%"}} />
    </span>
  );
}

/** A round monogram, standing in for CatchAvatar until it has a React twin. */
export function StoryMonogram({ground, initials, size = 36}: {ground: Ground; initials: string; size?: number}) {
  return (
    <span
      aria-hidden="true"
      style={{
        alignItems: "center",
        background: `var(--catch-ground-${ground}-fill)`,
        borderRadius: "var(--catch-radius-pill)",
        color: `var(--catch-ground-${ground}-ink)`,
        display: "inline-flex",
        flex: "none",
        fontFamily: "var(--catch-font-function), system-ui, sans-serif",
        fontSize: "var(--catch-typography-web-context-size)",
        fontWeight: 700,
        height: size,
        justifyContent: "center",
        width: size,
      }}
    >
      {initials}
    </span>
  );
}

/** A small status pill, standing in for CatchBadge until it has a React twin. */
export function StoryBadge({label, tone}: {label: string; tone: "verified" | "neutral" | "catch" | "luma"}) {
  const palette = {
    catch: ["var(--catch-palette-coral)", "var(--catch-palette-coral-ink)"],
    luma: ["var(--catch-palette-indigo)", "var(--catch-palette-indigo-ink)"],
    neutral: ["var(--catch-palette-ink)", "var(--catch-palette-ink-secondary)"],
    verified: ["var(--catch-palette-mint)", "var(--catch-palette-mint-ink)"],
  }[tone];
  return (
    <span
      style={{
        alignItems: "center",
        background: `color-mix(in srgb, ${palette[0]} ${tone === "neutral" ? 6 : 18}%, var(--catch-palette-white))`,
        borderRadius: "var(--catch-radius-pill)",
        color: palette[1],
        display: "inline-flex",
        fontFamily: "var(--catch-font-function), system-ui, sans-serif",
        fontSize: "var(--catch-typography-web-status-size)",
        fontWeight: 600,
        height: "var(--catch-space-s6)",
        padding: "0 var(--catch-space-s2)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

/** Lucide glyph paths (ISC) for the link and social stand-ins in stories. */
const glyphs = {
  bag: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  chat: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
  coffee: "M10 2v2M14 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1M6 2v2",
  instagram: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5ZM16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37ZM17.5 6.5h.01",
  route: "M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15M6 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM24 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  ticket: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2ZM13 5v2M13 17v2M13 11v2",
} as const;

/** A 22px outline glyph for story stand-ins. */
export function StoryGlyph({name}: {name: keyof typeof glyphs}) {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d={glyphs[name]} />
    </svg>
  );
}

/** Full-width story canvas: a page frame that fills the story viewport. */
export function StoryPage({children}: {children: ReactNode}) {
  return <PageFrame width="fill">{children}</PageFrame>;
}
