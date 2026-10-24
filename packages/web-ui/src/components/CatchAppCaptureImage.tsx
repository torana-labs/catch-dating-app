import type {ReactNode} from "react";
import {CatchText} from "./CatchText";
import styles from "./CatchAppCaptureImage.module.css";

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
}: CatchAppCaptureImageProps) {
  const hasCaption = caption != null || disclosure != null;
  return (
    <figure className={styles.capture}>
      <img
        className={styles.image}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        fetchPriority={loading === "eager" ? "high" : undefined}
      />
      {hasCaption ? (
        <figcaption className={styles.caption}>
          {caption != null ? <CatchText as="span" variant="supporting">{caption}</CatchText> : null}
          {disclosure != null ? <CatchText as="small" color="ink2" variant="recordContext">{disclosure}</CatchText> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
