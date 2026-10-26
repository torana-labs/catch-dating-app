import {CatchHeroImage} from "./CatchHeroImage";
import {CatchText} from "./CatchText";
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
}

/**
 * Website v2 photo tile: a past moment as a graded photo under a scrim, or a
 * ground when there is no photo, with an optional figure, a title and a
 * caption at its foot.
 */
export function CatchPhotoTile({title, caption, figure, imageUrl, imageAlt, ground = "paper"}: CatchPhotoTileProps) {
  const photo = Boolean(imageUrl?.trim());
  return (
    <figure className={styles.tile} data-ground={photo ? undefined : ground} data-photo={photo || undefined}>
      {photo ? <span className={styles.media}><CatchHeroImage imageUrl={imageUrl} semanticLabel={imageAlt} /></span> : null}
      <figcaption className={styles.copy}>
        {figure ? <><CatchText as="span" variant="displayXl">{figure}</CatchText>{" "}</> : null}
        <CatchText as="span" variant="titleS">{title}</CatchText>
        {caption ? <>{" "}<CatchText as="span" color="ink2" variant="supporting">{caption}</CatchText></> : null}
      </figcaption>
    </figure>
  );
}
