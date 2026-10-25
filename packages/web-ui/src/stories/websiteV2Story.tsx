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

/** Full-width story canvas: a page frame that fills the story viewport. */
export function StoryPage({children}: {children: ReactNode}) {
  return <PageFrame width="fill">{children}</PageFrame>;
}
