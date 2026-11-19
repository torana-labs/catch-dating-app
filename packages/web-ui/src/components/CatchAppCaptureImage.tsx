import type {ReactNode} from "react";
import {CatchDeviceFrame, type CatchDeviceFrameKind} from "./CatchDeviceFrame";
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
 * The device a capture is drawn in. The exporter writes every capture as the
 * screen alone, so the website draws the one frame (CatchDeviceFrame).
 */
export type CatchAppCaptureImageDevice = Extract<CatchDeviceFrameKind, "phone" | "android" | "tablet">;

export interface CatchAppCaptureImageProps {
  /** A rendered app capture: the screen alone, with no device frame. */
  src: string;
  alt: string;
  /** Intrinsic pixel size, so the page reserves the image's space. */
  width: number;
  height: number;
  caption?: ReactNode;
  /** `eager` for a capture above the fold. */
  loading?: "eager" | "lazy";
  /**
   * Runs the device off the bottom edge of the band it sits in, as
   * CatchDeviceFrame's bleed (proposal L3); the band clips it. A capture that
   * bleeds draws no caption.
   */
  bleed?: boolean;
  /**
   * Draws the screen in this device's frame (CatchDeviceFrame), the only
   * frame a capture gets. Without it the screen draws bare, as a card's
   * cover does.
   */
  device?: CatchAppCaptureImageDevice;
  /** Defaults to fill. */
  size?: CatchAppCaptureImageSize;
  /** Defaults to none. */
  tilt?: CatchAppCaptureImageTilt;
}

/**
 * An app capture, in its device's frame when `device` is given, with an
 * optional caption. Draws only: callers choose the capture and arrange the
 * layout around it.
 */
export function CatchAppCaptureImage({
  src,
  alt,
  width,
  height,
  caption,
  loading = "lazy",
  bleed = false,
  device,
  size = "fill",
  tilt = "none",
}: CatchAppCaptureImageProps) {
  const hasCaption = !bleed && caption != null;
  const image = (
    <img
      className={device ? undefined : styles.image}
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
    <figure className={styles.capture} data-bleed={bleed ? "" : undefined} data-device={device} data-size={size} data-tilt={tilt}>
      {device ? <CatchDeviceFrame kind={device} tilt={tilt}>{image}</CatchDeviceFrame> : image}
      {hasCaption ? (
        <figcaption className={styles.caption}>
          <CatchLegacyText as="span" variant="supporting">{caption}</CatchLegacyText>
        </figcaption>
      ) : null}
    </figure>
  );
}
