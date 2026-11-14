"use client";

import {CatchAvatar} from "./CatchAvatar";
import styles from "./CatchAccountButton.module.css";

export interface CatchAccountButtonProps {
  /** The signed-in reader's name; its initials draw the avatar. */
  name: string;
  /** The button's accessible name, such as "Account, Aanya Mehta". */
  label: string;
  onPressed: () => void;
  /** Whether the account menu it opens is showing. */
  expanded?: boolean;
  /** What it opens: a menu (the wide dropdown) or a dialog (the phone sheet). */
  popup?: "menu" | "dialog";
}

/**
 * The website top bar's signed-in account control: a 32px initials avatar in
 * CatchAvatar's person style that opens the account menu. While the menu
 * shows, an ink ring sits 2px outside it; keyboard focus draws the focus ring.
 */
export function CatchAccountButton({name, label, onPressed, expanded = false, popup = "menu"}: CatchAccountButtonProps) {
  return (
    <button aria-expanded={expanded} aria-haspopup={popup} aria-label={label} className={styles.button} onClick={onPressed} type="button">
      <CatchAvatar name={name} size={32} />
    </button>
  );
}
