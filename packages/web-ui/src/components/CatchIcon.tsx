import type {SVGAttributes} from "react";
import {useCatchIconGlyph} from "../icons/catchIconGlyphLoader";
import {catchIconStrokeWidth, type CatchIconName} from "../icons/catchIconRoles";
import type {CatchIconSizeStep} from "./catchCoreVocabulary";
import styles from "./CatchIcon.module.css";

export interface CatchIconProps extends Omit<SVGAttributes<SVGSVGElement>, "name"> {
  /** A role from design/tokens/catch.icons.json (back, close, ticket…), never a raw glyph name. */
  name: CatchIconName;
  /** 16, 18, 20 or 24 pixels. Defaults to 20. */
  size?: CatchIconSizeStep;
  /** Read aloud. Without it the icon is decorative and hidden from screen readers. */
  label?: string;
}

/**
 * The roles that point a direction and mirror in right-to-left layouts: the
 * mirrorInRtl roles of design/tokens/catch.icons.json (the icon test pins the
 * two).
 */
export const catchMirroredIconNames: ReadonlySet<CatchIconName> = new Set<CatchIconName>(["back", "forward", "disclosure"]);

/** The stroke thins as the icon grows, so lines look the same weight at every size. */
export function catchIconStrokeFor(size: CatchIconSizeStep): number {
  return size <= 20 ? catchIconStrokeWidth : 1.75;
}

/** catch.icon: a Lucide icon chosen by role. It takes the colour of the text around it. */
export function CatchIcon({name, size = 20, label, className, ...rest}: CatchIconProps) {
  const Glyph = useCatchIconGlyph(name);
  return (
    <Glyph
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={className ? `${styles.icon} ${className}` : styles.icon}
      data-mirror={catchMirroredIconNames.has(name) ? "" : undefined}
      focusable="false"
      role={label ? "img" : undefined}
      {...rest}
      height={size}
      strokeWidth={catchIconStrokeFor(size)}
      width={size}
    />
  );
}
