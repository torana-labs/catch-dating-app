import {
  catchIconGlyphs,
  catchIconStrokeWidth,
  type CatchIconName,
} from "../icons/catchIconGlyphs.generated";
import styles from "./CatchIcon.module.css";

/**
 * Icon extents, named after the Flutter `CatchIconSize` constants. Each name
 * resolves to the same pixel extent as its Flutter constant.
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

export type CatchIconSizeName = keyof typeof catchIconSizes;

/** Semantic ink the glyph draws in; `inherit` uses the surrounding text color. */
export type CatchIconTone = "inherit" | "ink" | "muted" | "primary" | "success" | "warning" | "danger";

export interface CatchIconProps {
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

/** Draws one icon role at a token size and tone. */
export function CatchIcon({icon, size = "md", tone = "inherit", semanticLabel}: CatchIconProps) {
  const Glyph = catchIconGlyphs[icon];
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
