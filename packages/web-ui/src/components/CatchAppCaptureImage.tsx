import type {CSSProperties, ReactNode} from "react";
import {CatchLegacyText} from "./CatchLegacyText";
import styles from "./CatchAppCaptureImage.module.css";

/** A slight turn, as the boards set devices at an angle. */
export type CatchAppCaptureImageTilt = "none" | "left" | "right";

/**
 * The capture's width: sm 280px, md 330px, lg 380px, fill (the column), or
 * hero, the canvas hero phone (website.hero.phoneWidth: 360px, 230px on
 * phones), which runs further off the band's edge when it bleeds.
 */
export type CatchAppCaptureImageSize = "sm" | "md" | "lg" | "fill" | "hero";

/**
 * The framed phone capture the exporter writes (tool/marketing/lib/
 * capture_devices.mjs, generic-phone): a 402×874 point screen at 2x inside a
 * 12-point bezel and a 32-point margin, so 980×1924 pixels with the screen
 * 88 pixels in from every edge.
 */
const framedPhone = {width: 980, height: 1924, inset: 88} as const;

const share = (part: number, whole: number) => `${Number(((part / whole) * 100).toFixed(4))}%`;

/**
 * Where a framed phone capture's screen sits, as custom properties for the
 * screen box (which keeps the screen's aspect) and the image inside it; null
 * for a capture of any other size, which then draws as it is.
 */
function screenCrop(width: number, height: number): CSSProperties | null {
  if (width !== framedPhone.width || height !== framedPhone.height) return null;
  const screenWidth = width - 2 * framedPhone.inset;
  const screenHeight = height - 2 * framedPhone.inset;
  return {
    "--catch-capture-screen-aspect": `${screenWidth} / ${screenHeight}`,
    "--catch-capture-crop-left": share(-framedPhone.inset, screenWidth),
    "--catch-capture-crop-top": share(-framedPhone.inset, screenHeight),
    "--catch-capture-crop-width": share(width, screenWidth),
    "--catch-capture-crop-height": share(height, screenHeight),
  } as CSSProperties;
}

export interface CatchAppCaptureImageProps {
  /** A rendered app capture. The PNG already carries its device frame. */
  src: string;
  alt: string;
  /** Intrinsic pixel size, so the page reserves the image's space. */
  width: number;
  height: number;
  caption?: ReactNode;
  /** Says the screen shows sample data, e.g. "Fictional app preview." */
  disclosure?: ReactNode;
  /** `eager` for a capture above the fold. */
  loading?: "eager" | "lazy";
  /**
   * Runs the device off the bottom edge of the band it sits in, as
   * CatchDeviceFrame's bleed (proposal L3); the band clips it. A capture that
   * bleeds draws no caption.
   */
  bleed?: boolean;
  /**
   * Redraws a framed phone capture in the canvas's phone (playbook-panels.css
   * .pg .phone): the capture is cut to its screen and set in the website
   * bezel (website.color.deviceBezel, website.radius.device, an 8px rim) with
   * the canvas's shadow (website.shadow.device). Only the exporter's framed
   * phone captures (980×1924) are cut; any other capture draws as it is.
   */
  bezel?: boolean;
  /** Defaults to fill. */
  size?: CatchAppCaptureImageSize;
  /** Defaults to none. */
  tilt?: CatchAppCaptureImageTilt;
}

/**
 * A device-framed app capture with an optional caption and disclosure line.
 * Draws only: callers choose the capture and arrange the layout around it.
 */
export function CatchAppCaptureImage({
  src,
  alt,
  width,
  height,
  caption,
  disclosure,
  loading = "lazy",
  bleed = false,
  bezel = false,
  size = "fill",
  tilt = "none",
}: CatchAppCaptureImageProps) {
  const hasCaption = !bleed && (caption != null || disclosure != null);
  const crop = bezel ? screenCrop(width, height) : null;
  const image = (
    <img
      className={crop ? styles.screenImage : styles.image}
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      fetchPriority={loading === "eager" ? "high" : undefined}
    />
  );
  return (
    <figure className={styles.capture} data-bezel={crop ? "" : undefined} data-bleed={bleed ? "" : undefined} data-size={size} data-tilt={tilt}>
      {crop ? <span className={styles.phone}><span className={styles.screen} style={crop}>{image}</span></span> : image}
      {hasCaption ? (
        <figcaption className={styles.caption}>
          {caption != null ? <CatchLegacyText as="span" variant="supporting">{caption}</CatchLegacyText> : null}
          {disclosure != null ? <CatchLegacyText as="small" color="ink2" variant="bodyS">{disclosure}</CatchLegacyText> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
