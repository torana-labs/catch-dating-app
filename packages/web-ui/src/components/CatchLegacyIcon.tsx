import {useCatchIconGlyph} from "../icons/catchIconGlyphLoader";
import {catchIconStrokeWidth, type CatchIconName} from "../icons/catchIconRoles";
import styles from "./CatchLegacyIcon.module.css";

/**
 * Icon extents, named after the Flutter `CatchIconSize` constants. Each name
 * resolves to the same pixel extent as its Flutter constant.
 * @deprecated Legacy: use CatchIcon's size (16, 18, 20 or 24); deleted in P7.
 */
export const catchIconSizes = {
  micro: 11,
  sm: 14,
  xs: 16,
  md: 18,
  control: 20,
  row: 22,
  lg: 24,
  tile: 28,
  emptyState: 34,
  hero: 36,
} as const;

/** @deprecated Legacy: use CatchIcon's size; deleted in P7. */
export type CatchIconSizeName = keyof typeof catchIconSizes;

/**
 * Semantic ink the glyph draws in; `inherit` uses the surrounding text color.
 * @deprecated Legacy: CatchIcon takes the colour of the text around it; deleted in P7.
 */
export type CatchIconTone = "inherit" | "ink" | "muted" | "primary" | "success" | "warning" | "danger";

/** @deprecated Legacy: use CatchIcon (name, size, label); deleted in P7. */
export interface CatchLegacyIconProps {
  /** A role from design/tokens/catch.icons.json. */
  icon: CatchIconName;
  size?: CatchIconSizeName;
  tone?: CatchIconTone;
  /**
   * Accessible name. Without one the icon is decorative and hidden from
   * assistive technology, as Flutter's `Icon` is without a semantic label.
   */
  semanticLabel?: string;
}

/**
 * Draws one icon role at a token size and tone.
 * @deprecated Legacy: use CatchIcon; deleted in P7.
 */
export function CatchLegacyIcon({icon, size = "md", tone = "inherit", semanticLabel}: CatchLegacyIconProps) {
  const Glyph = useCatchIconGlyph(icon);
  const extent = catchIconSizes[size];
  return (
    <Glyph
      aria-hidden={semanticLabel ? undefined : true}
      aria-label={semanticLabel}
      className={styles.icon}
      data-tone={tone}
      focusable="false"
      height={extent}
      role={semanticLabel ? "img" : undefined}
      strokeWidth={catchIconStrokeWidth}
      width={extent}
    />
  );
}
