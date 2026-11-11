import styles from "./CatchStoreButton.module.css";

/** The app store a badge links to. */
export type CatchStoreButtonStore = "appStore" | "googlePlay";

/** Badge heights: l is 48px, m is 40px (the D20 large and medium heights). */
export type CatchStoreButtonSize = "m" | "l";

export interface CatchStoreButtonProps {
  /**
   * The store's own badge artwork, unaltered: Apple's black "Download on the
   * App Store" SVG or Google's "Get it on Google Play" PNG with its transparent
   * padding cropped. The site hosts the files (the library ships no store
   * artwork); see website/public/assets/store-badges.
   */
  badgeSrc: string;
  /**
   * The store page. Without one the store is not live yet: the badge stays
   * on the page as a button and only reports the press, so the click can be
   * recorded.
   */
  href?: string;
  /** The badge's words, its accessible name: "Download on the App Store" or "Get it on Google Play". */
  label: string;
  /** Called before navigation, such as for click tracking, or on a press while pending. */
  onClick?: () => void;
  /** Defaults to l. */
  size?: CatchStoreButtonSize;
  store: CatchStoreButtonStore;
}

/**
 * Each badge's intrinsic width over height, so the image reserves its space
 * before it loads: Apple's SVG is 119.66407 × 40 and Google's cropped PNG is
 * 564 × 168.
 */
export const catchStoreBadgeAspect: Record<CatchStoreButtonStore, number> = {
  appStore: 119.66407 / 40,
  googlePlay: 564 / 168,
};

const heights: Record<CatchStoreButtonSize, number> = {l: 48, m: 40};

/**
 * A link to the app in the App Store or Google Play, drawn with the store's
 * official badge (proposal L8): Apple's and Google's badge guidelines do not
 * allow a drawn button. The badge is never recoloured, stretched, tilted or
 * overlaid; it keeps its own height at either size, and the focus ring sits
 * outside it. A store that is not live yet draws the same badge, as a button.
 */
export function CatchStoreButton({badgeSrc, href, label, onClick, size = "l", store}: CatchStoreButtonProps) {
  const height = heights[size];
  const badge = (
    <img
      alt={label}
      className={styles.badge}
      decoding="async"
      height={height}
      src={badgeSrc}
      width={Math.round(height * catchStoreBadgeAspect[store])}
    />
  );
  if (!href) {
    return (
      <button className={styles.button} data-size={size} data-store={store} onClick={onClick} type="button">
        {badge}
      </button>
    );
  }
  return (
    <a className={styles.button} data-size={size} data-store={store} href={href} onClick={onClick}>
      {badge}
    </a>
  );
}
