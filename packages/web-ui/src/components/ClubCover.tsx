import {useState} from "react";
import {ClubPlaceholderCover} from "./ClubPlaceholderCover";
import styles from "./EventThumbnail.module.css";

export interface ClubCoverProps {
  /** The organiser's own cover or event photo; it wins whenever it loads. */
  photoUrl?: string | null;
  name: string;
  city?: string | null;
  /** A stored activity value for the placeholder cover. */
  activityKind: string;
  compact?: boolean;
  /** Describes the photo; the placeholder cover is decorative. */
  semanticLabel?: string;
}

/**
 * Organiser cover: the organiser's photo, or the typographic placeholder
 * cover (G7) when there is none or it fails to load. Never a stand-in photo
 * or a grey box. Fills its container.
 */
export function ClubCover({photoUrl, name, city, activityKind, compact, semanticLabel = ""}: ClubCoverProps) {
  const url = photoUrl?.trim();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (url && failedUrl !== url) {
    return (
      <img className={styles.photo} src={url} alt={semanticLabel} loading="lazy" decoding="async"
        onError={() => setFailedUrl(url)} />
    );
  }
  return <ClubPlaceholderCover name={name} city={city} activityKind={activityKind} compact={compact} />;
}
