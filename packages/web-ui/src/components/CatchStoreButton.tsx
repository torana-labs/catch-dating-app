import styles from "./CatchStoreButton.module.css";

/** The app store a button links to. */
export type CatchStoreButtonStore = "appStore" | "googlePlay";

/** D20 heights: l is 48px, m is 40px. */
export type CatchStoreButtonSize = "m" | "l";

export interface CatchStoreButtonProps {
  /** The full link name when the visible text is short, such as "Download on the App Store". */
  accessibleLabel?: string;
  href: string;
  /** A small line above the label, such as "Download on the". */
  kicker?: string;
  /** The visible store name, such as "App Store". */
  label: string;
  /** Called before navigation, such as for click tracking. */
  onClick?: () => void;
  /** Defaults to l. */
  size?: CatchStoreButtonSize;
  store: CatchStoreButtonStore;
}

// Plain marks drawn for Catch, as the boards do; the stores' own logos are not used.
const marks: Record<CatchStoreButtonStore, {path: string; outline: boolean}> = {
  appStore: {outline: true, path: "M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5ZM9 16l3-8 3 8M10 13.5h4"},
  googlePlay: {outline: false, path: "M5 3.5v17a1 1 0 0 0 1.5.86l14-8.5a1 1 0 0 0 0-1.72l-14-8.5A1 1 0 0 0 5 3.5z"},
};

/**
 * A link to the app in the App Store or Google Play, drawn as a D20 primary
 * action: the theme primary fill with 4px corners, inverting on the ink ground.
 */
export function CatchStoreButton({accessibleLabel, href, kicker, label, onClick, size = "l", store}: CatchStoreButtonProps) {
  const mark = marks[store];
  return (
    <a aria-label={accessibleLabel} className={styles.button} data-size={size} data-store={store} href={href} onClick={onClick}>
      <svg aria-hidden="true" className={styles.mark} data-outline={mark.outline || undefined} focusable="false" viewBox="0 0 24 24">
        <path d={mark.path} />
      </svg>
      <span className={styles.copy}>
        {kicker ? <span className={styles.kicker}>{kicker}</span> : null}
        <span className={styles.label}>{label}</span>
      </span>
    </a>
  );
}
