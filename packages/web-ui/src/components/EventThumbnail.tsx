import {useState} from "react";
import type {CatchActivityKind} from "./activityArtwork";
import {EventBackdropImage} from "./EventBackdropImage";
import styles from "./EventThumbnail.module.css";

export interface EventThumbnailProps {
  /** The event's uploaded poster or photo; it wins whenever it loads. */
  photoUrl?: string | null;
  activityKind: CatchActivityKind;
  /** Describes the photo; the artwork fallback is decorative. */
  semanticLabel?: string;
  dense?: boolean;
  loading?: "eager" | "lazy";
}

/**
 * Event media: the uploaded photo, or the activity artwork (G6) when there is
 * none or it fails to load. Never a stand-in photo. Fills its container.
 */
export function EventThumbnail({photoUrl, activityKind, semanticLabel = "", dense, loading = "lazy"}: EventThumbnailProps) {
  const url = photoUrl?.trim();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (url && failedUrl !== url) {
    return (
      <img className={styles.photo} src={url} alt={semanticLabel} loading={loading} decoding="async"
        fetchPriority={loading === "eager" ? "high" : undefined} onError={() => setFailedUrl(url)} />
    );
  }
  return <EventBackdropImage activityKind={activityKind} dense={dense} />;
}
