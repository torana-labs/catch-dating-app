import type {CSSProperties, ReactNode} from "react";

/**
 * Story support for the Website v2 components: the approved board captures in
 * design/reference_screens (#907), cropped to one part, beside the library
 * component rendered in a page frame of the capture's width.
 *
 * Each URL is a literal so Vite can resolve and bundle only the captures a
 * story imports.
 */
const captures = {
  "event/catch_bare/1280": new URL("../../../../design/reference_screens/screen.website.event/catch_bare_1280.png", import.meta.url).href,
  "event/catch_bare/390": new URL("../../../../design/reference_screens/screen.website.event/catch_bare_390.png", import.meta.url).href,
  "event/catch_full/1280": new URL("../../../../design/reference_screens/screen.website.event/catch_full_1280.png", import.meta.url).href,
  "event/catch_full/390": new URL("../../../../design/reference_screens/screen.website.event/catch_full_390.png", import.meta.url).href,
  "event/luma_import/1280": new URL("../../../../design/reference_screens/screen.website.event/luma_import_1280.png", import.meta.url).href,
  "event/luma_import/390": new URL("../../../../design/reference_screens/screen.website.event/luma_import_390.png", import.meta.url).href,
  "home/mumbai_live/1280": new URL("../../../../design/reference_screens/screen.website.home/mumbai_live_1280.png", import.meta.url).href,
  "home/mumbai_live/390": new URL("../../../../design/reference_screens/screen.website.home/mumbai_live_390.png", import.meta.url).href,
  "host_landing/default/1280": new URL("../../../../design/reference_screens/screen.website.host_landing/default_1280.png", import.meta.url).href,
  "host_landing/default/390": new URL("../../../../design/reference_screens/screen.website.host_landing/default_390.png", import.meta.url).href,
  "organizer/generated/1280": new URL("../../../../design/reference_screens/screen.website.organizer/generated_1280.png", import.meta.url).href,
  "organizer/generated/390": new URL("../../../../design/reference_screens/screen.website.organizer/generated_390.png", import.meta.url).href,
  "organizer/guest/1280": new URL("../../../../design/reference_screens/screen.website.organizer/guest_1280.png", import.meta.url).href,
  "organizer/guest/390": new URL("../../../../design/reference_screens/screen.website.organizer/guest_390.png", import.meta.url).href,
  "organizer/owner/1280": new URL("../../../../design/reference_screens/screen.website.organizer/owner_1280.png", import.meta.url).href,
  "organizer/owner/390": new URL("../../../../design/reference_screens/screen.website.organizer/owner_390.png", import.meta.url).href,
} as const;

export type ReferenceCapture = keyof typeof captures;

/** One region of a capture, in the capture's own CSS pixels. */
export interface ReferenceRegion {
  capture: ReferenceCapture;
  /** Top edge of the region. */
  y: number;
  height: number;
  /** Left edge; defaults to the capture's left edge. */
  x?: number;
  /** Defaults to the rest of the capture's width. */
  width?: number;
}

const captureWidth = (capture: ReferenceCapture) => (capture.endsWith("/390") ? 390 : 1280);

const caption: CSSProperties = {
  color: "var(--catch-theme-ink2)",
  fontFamily: "var(--catch-font-function), system-ui, sans-serif",
  fontSize: "var(--catch-typography-web-context-size)",
  fontWeight: 600,
  lineHeight: "var(--catch-typography-web-context-line-height)",
};

const figure: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flex: "none",
  gap: "var(--catch-space-s2)",
  margin: 0,
};

/** The board capture, cropped to one region. */
export function ReferenceCrop({region, label}: {region: ReferenceRegion; label: string}) {
  const x = region.x ?? 0;
  const width = region.width ?? captureWidth(region.capture) - x;
  return (
    <figure style={figure}>
      <span style={{display: "block", height: region.height, overflow: "hidden", position: "relative", width}}>
        <img
          alt={`Approved board: ${label}`}
          src={captures[region.capture]}
          style={{left: -x, maxWidth: "none", position: "absolute", top: -region.y, width: captureWidth(region.capture)}}
        />
      </span>
      <figcaption style={caption}>{`Board · ${region.capture.replaceAll("/", " · ")}`}</figcaption>
    </figure>
  );
}

/**
 * A page of the given width. It declares the `catch-page` container that the
 * Website v2 layouts query, and it contains fixed-position descendants, so a
 * 390px frame inside a wide story shows the phone arrangement.
 */
export function PageFrame({children, width}: {children: ReactNode; width: number | "fill"}) {
  return (
    <div
      style={{
        background: "var(--catch-palette-white)",
        color: "var(--catch-palette-ink)",
        container: "catch-page / inline-size",
        flex: "none",
        outline: "var(--catch-stroke-hairline) solid var(--catch-theme-line2)",
        position: "relative",
        transform: "translateZ(0)",
        width: width === "fill" ? "100%" : width,
      }}
    >
      {children}
    </div>
  );
}

/**
 * The library rendering for one region: a page frame at the capture's width,
 * clipped to the region, with the rendering placed where the region sits. A
 * component inside therefore sees the page width the board was drawn at.
 *
 * Each rendering repeats a state story, which owns its accessibility and
 * interaction checks, so the copy is inert: out of the tab order and the
 * accessibility tree, where its landmarks would duplicate the other width's.
 */
export function FramedRendering({children, region}: {children: ReactNode; region: ReferenceRegion}) {
  const pageWidth = captureWidth(region.capture);
  const x = region.x ?? 0;
  const width = region.width ?? pageWidth - x;
  return (
    <figure style={figure}>
      {/* clip, not hidden: a scroll container here would stop sticky parts sticking. */}
      <span style={{display: "block", overflow: "clip", width}}>
        <span style={{display: "block", marginLeft: -x, width: pageWidth}}>
          <PageFrame width={pageWidth}>
            <div inert style={{marginLeft: x, width}}>{children}</div>
          </PageFrame>
        </span>
      </span>
      <figcaption style={caption}>{`@catch/web-ui · on a ${pageWidth}px page`}</figcaption>
    </figure>
  );
}

/**
 * Shows the board's crop at 1280 and at 390 beside the library rendering on a
 * page of the same width. Full-width parts render in a CatchBand; a part that
 * sits in a column renders bare, so the frame is its page.
 */
export function ReferenceComparison({
  desktop,
  label,
  phone,
  render,
}: {
  desktop?: ReferenceRegion;
  label: string;
  phone?: ReferenceRegion;
  render: (pageWidth: number) => ReactNode;
}) {
  const rows = [desktop, phone].filter((region): region is ReferenceRegion => region !== undefined);
  return (
    <div style={{display: "flex", flexDirection: "column", gap: "var(--catch-space-s12)", padding: "var(--catch-space-s6)"}}>
      {rows.map((region) => (
        <section
          aria-label={`${label} on a ${captureWidth(region.capture)}px page`}
          key={region.capture}
          style={{alignItems: "flex-start", display: "flex", flexWrap: "wrap", gap: "var(--catch-space-s6)"}}
        >
          <ReferenceCrop label={label} region={region} />
          <FramedRendering region={region}>{render(captureWidth(region.capture))}</FramedRendering>
        </section>
      ))}
    </div>
  );
}
