import {CatchHeroImage} from "./CatchHeroImage";
import {CatchLegacyText} from "./CatchLegacyText";
import type {Ground} from "./palette";
import styles from "./CatchPhotoTile.module.css";

export interface CatchPhotoTileProps {
  title: string;
  caption?: string;
  /** A large figure above the title, such as a count. */
  figure?: string;
  imageUrl?: string | null;
  /** The photo's alternative text. Without one the photo is decorative. */
  imageAlt?: string;
  /** The tile's ground when it has no photo. */
  ground?: Ground;
  /** An empty slot a photo will fill, outlined on white, such as before a page is claimed. */
  placeholder?: boolean;
}

/**
 * Website v2 photo tile: a past moment as a graded photo under a scrim, or a
 * ground when there is no photo, with an optional figure, a title and a
 * caption at its foot. A placeholder marks where a photo will go.
 */
export function CatchPhotoTile({title, caption, figure, imageUrl, imageAlt, ground = "paper", placeholder = false}: CatchPhotoTileProps) {
  const photo = !placeholder && Boolean(imageUrl?.trim());
  return (
    <figure
      className={styles.tile}
      data-ground={photo ? undefined : placeholder ? "white" : ground}
      data-photo={photo || undefined}
      data-placeholder={placeholder || undefined}
    >
      {photo ? <span className={styles.media}><CatchHeroImage imageUrl={imageUrl} semanticLabel={imageAlt} /></span> : null}
      <figcaption className={styles.copy}>
        {figure ? <><CatchLegacyText as="span" variant="displayXl">{figure}</CatchLegacyText>{" "}</> : null}
        <CatchLegacyText as="span" variant="titleS">{title}</CatchLegacyText>
        {caption ? <>{" "}<CatchLegacyText as="span" color="ink2" variant="supporting">{caption}</CatchLegacyText></> : null}
      </figcaption>
    </figure>
  );
}
