import {CatchButton} from "./CatchButton";
import {CatchText, type CatchTextAccent} from "./CatchText";
import type {Ground, PaletteAccent} from "./palette";
import styles from "./CatchPreviewCard.module.css";

/** `feature` is the organiser page's "Next up" card: a larger title and a roomier card. */
export type CatchPreviewCardSize = "default" | "feature";

export interface CatchPreviewCardProps {
  href: string;
  /** The line above the title, such as the date and time. */
  label: string;
  /** Colours the label with a palette accent, as a coloured sentence-case label. */
  labelAccent?: CatchTextAccent;
  title: string;
  /** A line under the title, such as when and where. */
  detail?: string;
  /** The line at the card's foot, such as the price and where to book. */
  meta?: string;
  /** A button-shaped label at the foot, such as "Book". The whole card stays one link. */
  action?: string;
  /** Fills the action with this accent and ink text; defaults to the primary button. */
  actionAccent?: PaletteAccent;
  /** A small neutral note across from the label, such as where the event is sold. */
  tag?: string;
  ground?: Ground;
  size?: CatchPreviewCardSize;
  onClick?: () => void;
}

/**
 * Website v2 preview card: a link on a ground with a label, a display title,
 * and a meta line held to the card's foot. A card can add a tag beside the
 * label, a detail line and a button-shaped action label.
 */
export function CatchPreviewCard({
  href,
  label,
  labelAccent,
  title,
  detail,
  meta,
  action,
  actionAccent,
  tag,
  ground = "paper",
  size = "default",
  onClick,
}: CatchPreviewCardProps) {
  const feature = size === "feature";
  const labelText = <CatchText as="span" color={labelAccent} variant="statusLabel">{label}</CatchText>;
  return (
    <a
      className={styles.card}
      data-catch-theme={ground === "ink" ? "dark" : "light"}
      data-ground={ground}
      data-size={size}
      href={href}
      onClick={onClick}
    >
      {tag ? (
        <span className={styles.top}>
          {labelText}{" "}
          <span className={styles.tag}><CatchText as="span" color="inherit" variant="statusLabel">{tag}</CatchText></span>
        </span>
      ) : labelText}{" "}
      <CatchText as="span" maxLines={3} variant={feature ? "displayM" : "displayXs"}>{title}</CatchText>
      {detail ? <>{" "}<CatchText as="span" color="ink2" variant={feature ? "bodyL" : "bodyM"}>{detail}</CatchText></> : null}
      {meta || action ? (
        <>
          {" "}
          <span className={styles.meta}>
            {meta ? <CatchText as="span" variant="supportingStrong">{meta}</CatchText> : null}
            {action ? (
              <>
                {" "}
                <CatchButton
                  backgroundColor={actionAccent ? `var(--catch-palette-${actionAccent})` : undefined}
                  foregroundColor={actionAccent ? "var(--catch-palette-ink)" : undefined}
                  isInteractive={false}
                  label={action}
                  onPressed={null}
                  size="md"
                />
              </>
            ) : null}
          </span>
        </>
      ) : null}
    </a>
  );
}
