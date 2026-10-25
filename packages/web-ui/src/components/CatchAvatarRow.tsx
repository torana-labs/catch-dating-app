import type {CSSProperties} from "react";
import {CatchAvatar, type CatchAvatarColors} from "./CatchAvatar";
import styles from "./CatchAvatarRow.module.css";

/** Flutter `CatchPersonAvatarItem`. */
export interface CatchPersonAvatarItem {
  imageUrl?: string;
  initials?: string;
  name: string;
}

export interface CatchAvatarRowProps {
  /** Ring width in px; defaults to 2. */
  borderWidth?: number;
  /** Ring colour; defaults to the theme surface. */
  borderColor?: string;
  /** Formats the overflow count, such as "+20". */
  countLabelBuilder: (count: number) => string;
  items: readonly CatchPersonAvatarItem[];
  /** Identity slots shown; defaults to 4. */
  limit?: number;
  obscured?: boolean;
  /** Overlap between avatars in px; defaults to 9. */
  overlap?: number;
  /** Defaults to true. */
  showOverflowCount?: boolean;
  /** Avatar size in px; defaults to 32. */
  size?: number;
  /** The real total when it exceeds the items given. */
  totalCount?: number;
  /** Anonymous slots after the named ones. */
  veiledCount?: number;
  /** Required when veiledCount is above zero. */
  veiledColors?: CatchAvatarColors;
}

/**
 * Flutter's `CatchAvatarRow`: overlapping avatars, then anonymous slots, then
 * a caller-formatted overflow count. Later avatars sit over earlier ones.
 */
export function CatchAvatarRow({
  borderColor = "var(--catch-theme-surface)",
  borderWidth = 2,
  countLabelBuilder,
  items,
  limit = 4,
  obscured = false,
  overlap = 9,
  showOverflowCount = true,
  size = 32,
  totalCount,
  veiledColors,
  veiledCount = 0,
}: CatchAvatarRowProps) {
  const shown = items.slice(0, limit);
  const count = totalCount ?? items.length;
  const remainingSlots = Math.max(0, limit - shown.length);
  const shownVeiled = veiledColors ? Math.min(Math.max(0, veiledCount), remainingSlots) : 0;
  const overflow = count - (shown.length + shownVeiled);
  const frame = {borderColor, borderWidth, size};
  const avatars = [
    ...shown.map((item, index) => (
      <CatchAvatar {...frame} imageUrl={item.imageUrl} initials={item.initials} key={`person-${index}`} name={item.name} obscured={obscured} />
    )),
    ...Array.from({length: shownVeiled}, (_, index) => (
      <CatchAvatar {...frame} colors={veiledColors!} key={`veiled-${index}`} recipe="veiled" />
    )),
    ...(showOverflowCount && overflow > 0
      ? [<CatchAvatar {...frame} count={overflow} countLabelBuilder={countLabelBuilder} key="count" recipe="count" />]
      : []),
  ];
  if (avatars.length === 0) return null;
  return (
    <span aria-hidden="true" className={styles.row} style={{"--catch-avatar-overlap": `${overlap}px`} as CSSProperties}>
      {avatars}
    </span>
  );
}
