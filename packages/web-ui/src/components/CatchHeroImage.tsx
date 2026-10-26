"use client";

import {useState} from "react";
import styles from "./CatchHeroImage.module.css";

export interface CatchHeroImageProps {
  imageUrl?: string | null;
  /** The photo's alternative text. Without one the photo is decorative. */
  semanticLabel?: string;
  showScrim?: boolean;
  /**
   * Web only: frames the image as a detail page's media, 16:10 at radius lg
   * (4:3 below 840px), instead of filling the caller's box.
   */
  framed?: boolean;
}

/**
 * Flutter's CatchHeroImage: a graded photo that fills its box, or the branded
 * no-photo gradient when there is no photo or it fails to load, under the
 * detail-hero scrim. The caller sizes the box unless it is framed.
 */
export function CatchHeroImage({imageUrl, semanticLabel, showScrim = true, framed = false}: CatchHeroImageProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = imageUrl?.trim();
  const hasImage = Boolean(src) && failedUrl !== src;
  return (
    <span className={styles.hero} data-framed={framed || undefined} data-scrim={showScrim || undefined}>
      {hasImage ? (
        <span className={styles.graded}>
          <img alt={semanticLabel ?? ""} className={styles.photo} onError={() => setFailedUrl(src ?? null)} src={src} />
        </span>
      ) : (
        <span aria-hidden="true" className={styles.fallback} />
      )}
    </span>
  );
}
