"use client";

import {useState} from "react";
import {CatchText} from "./CatchText";
import styles from "./MapPreview.module.css";

export interface MapPreviewCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapPreviewProps {
  coordinate?: MapPreviewCoordinate | null;
  /** Names the place: the map's alternative text, and the fallback's label. */
  fallbackLabel: string;
  /**
   * Web only: a static map of the coordinate, drawn by the caller's map
   * provider with its marker, route and zoom. Without one, or when it fails
   * to load, the fallback shows.
   */
  imageUrl?: string;
  /** Web only: frames the map as a page card, 5:2 at radius lg (2:1 below 840px). */
  framed?: boolean;
}

// Lucide "map" (ISC).
const mapGlyph = (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
    <path d="M14.1 5.55a2 2 0 0 0 1.8 0l3.65-1.83A1 1 0 0 1 21 4.62v12.76a1 1 0 0 1-.55.9l-4.55 2.27a2 2 0 0 1-1.8 0l-4.2-2.1a2 2 0 0 0-1.8 0l-3.65 1.83A1 1 0 0 1 3 19.38V6.62a1 1 0 0 1 .55-.9L8.1 3.45a2 2 0 0 1 1.8 0zM15 5.76v15M9 3.24v15" />
  </svg>
);

/**
 * Flutter's MapPreview: a read-only map of a place, or a quiet fallback with a
 * map glyph and the place's label when there is no coordinate or map. The
 * label takes ink2 here: Flutter's ink3 measures under 4.5:1 on bg.
 */
export function MapPreview({coordinate, fallbackLabel, imageUrl, framed = false}: MapPreviewProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const requested = imageUrl?.trim();
  // A map that failed to load falls back until the caller passes another.
  const src = requested === failedSrc ? undefined : requested;
  const label = fallbackLabel.trim();
  return (
    <span className={styles.preview} data-framed={framed || undefined}>
      {coordinate != null && src ? (
        <img alt={label} className={styles.map} onError={() => setFailedSrc(src)} src={src} />
      ) : (
        <span className={styles.fallback}>
          {mapGlyph}
          {label ? <CatchText as="span" color="ink2" maxLines={2} textAlign="center" variant="supporting">{label}</CatchText> : null}
        </span>
      )}
    </span>
  );
}
