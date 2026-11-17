import type {ReactNode} from "react";
import type {CatchKickerAccent} from "./CatchBandHeader";
import type {CatchSurfaceColor} from "./catchCoreVocabulary";
import {CatchButton, type CatchButtonSize, type CatchButtonVariant} from "./CatchButton";
import {CatchStack} from "./CatchStack";
import type {CatchWebBandColor} from "./CatchSurface";
import type {Ground} from "./palette";
import styles from "./catchBandParts.module.css";

/**
 * The vocabulary the website section components share (the playbook kit's
 * `btns`, links, footnote marks and tones). Plain data and render helpers,
 * no component of its own: each section draws through the library pieces.
 */

/** A call to action in a section, drawn as a D20 CatchButton. Resolved copy. */
export interface CatchBandAction {
  label: string;
  /** Renders a link with the button's look. */
  href?: string;
  /** A button without an href; null disables it, as in CatchButton. */
  onPressed?: (() => void) | null;
  /** Defaults to primary for the first action and secondary after it. */
  variant?: CatchButtonVariant;
  /** Opens the link in a new tab, without an opener. */
  newTab?: boolean;
}

/** A plain link: a label and where it goes. Resolved copy. */
export interface CatchBandLink {
  label: string;
  href: string;
}

/**
 * A footnote mark after a claim, such as "1". With an href (usually the
 * footnote's id, "#footnote-1") the mark links to the footnote.
 */
export interface CatchBandFootnote {
  label: string;
  href?: string;
}

/**
 * The CatchSurface band colour each Website v2 ground takes: the accents are
 * the format colours that share their fill (coral is run, pink dinner, yellow
 * games, mint courts, magenta nights out), indigo is the web band colour,
 * paper is the tile band and white the plain ground.
 */
const bandColors: Readonly<Record<Ground, CatchSurfaceColor | CatchWebBandColor | undefined>> = {
  white: undefined,
  paper: "tile",
  ink: "ink",
  coral: "run",
  pink: "dinner",
  yellow: "games",
  mint: "courts",
  indigo: "indigo",
  magenta: "nightsOut",
};

/**
 * A section's kicker accent: the one asked for, else coral on the ink ground
 * (the canvas's night panels) and the section's own kit accent elsewhere. A
 * colour ground draws any accent in its secondary ink.
 */
export function catchBandKickerAccent(accent: CatchKickerAccent | undefined, ground: Ground | undefined, fallback: CatchKickerAccent): CatchKickerAccent {
  return accent ?? (ground === "ink" ? "coral" : fallback);
}

/** The band colour of a section's ground; no ground is the plain band. */
export function catchBandColor(ground: Ground | undefined): CatchSurfaceColor | CatchWebBandColor | undefined {
  return ground ? bandColors[ground] : undefined;
}

/**
 * A wrapping row of D20 buttons, 12px apart: the first primary and the rest
 * secondary unless an action names its variant; on phones they stack, full
 * width, as the kit's .btns do. Nothing when there are none.
 */
export function catchBandActions(actions: readonly CatchBandAction[] | undefined, size: CatchButtonSize = "lg"): ReactNode {
  if (!actions || actions.length === 0) return null;
  return (
    <CatchStack align="center" className={styles.actions} direction="row" gap={12} wrap>
      {actions.map((action, index) => (
        <CatchButton
          href={action.href}
          key={`${index}:${action.label}`}
          label={action.label}
          newTab={action.newTab}
          onPressed={action.onPressed}
          size={size}
          variant={action.variant ?? (index === 0 ? "primary" : "secondary")}
        />
      ))}
    </CatchStack>
  );
}

/** A superscript footnote mark, a link when it has an href. Nothing without one. */
export function catchBandFootnoteMark(footnote: CatchBandFootnote | undefined): ReactNode {
  if (!footnote) return null;
  return <sup>{footnote.href ? <a href={footnote.href}>{footnote.label}</a> : footnote.label}</sup>;
}
