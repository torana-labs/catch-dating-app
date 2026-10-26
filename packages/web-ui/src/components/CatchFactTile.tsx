import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchFactTile.module.css";

export type CatchFactTileEmphasis = "fact" | "stat";
export type CatchFactTileNoteTone = "neutral" | "positive";

export interface CatchFactTileProps {
  label: string;
  value: string;
  /** A line under the value, such as a time range or a change. */
  note?: string;
  noteTone?: CatchFactTileNoteTone;
  /** A fact sets its value as a name; a stat sets it on the displayS step. */
  emphasis?: CatchFactTileEmphasis;
  ground?: Ground;
}

/**
 * Website v2 fact tile: a label, its value and an optional note on a ground.
 * The event page's When, Where and Price are facts; the owner's last-30-days
 * numbers are stats.
 */
export function CatchFactTile({label, value, note, noteTone = "neutral", emphasis = "fact", ground = "paper"}: CatchFactTileProps) {
  const stat = emphasis === "stat";
  return (
    <div className={styles.tile} data-emphasis={emphasis} data-ground={ground}>
      <CatchText as="span" color="ink2" variant="bodyS">{label}</CatchText>{" "}
      <CatchText as="span" variant={stat ? "displayS" : "sectionTitle"}>{value}</CatchText>
      {note ? (
        <>
          {" "}
          <CatchText as="span" color={noteTone === "positive" ? "positiveText" : "ink"} variant={stat ? "statusLabel" : "bodyM"}>{note}</CatchText>
        </>
      ) : null}
    </div>
  );
}
