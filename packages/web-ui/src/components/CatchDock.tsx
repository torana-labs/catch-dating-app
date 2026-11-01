import {useId, type CSSProperties, type ReactNode} from "react";
import {CatchButton, type CatchButtonMode} from "./CatchButton";
import styles from "./CatchDock.module.css";

/** Flutter's utility `CatchDock`: persistent controls the caller arranges. */
export interface CatchDockUtilityProps {
  recipe?: "utility";
  children: ReactNode;
  /** Flutter's padding, as a CSS padding; 12px by 16px by default. */
  padding?: CSSProperties["padding"];
  includeSafeArea?: boolean;
}

interface CatchDockAction {
  label: string;
  /** Null disables the action, as in Flutter. */
  onPressed: (() => void) | null;
  leading?: ReactNode;
  isLoading?: boolean;
  /** A CSS colour for the primary button's activity pigment. */
  buttonAccentColor?: string;
  buttonMode?: CatchButtonMode;
  /** A short uppercase line above the action. */
  catchLine?: string;
  catchLineAccent?: string;
  /** A small note under the action. */
  footnote?: string;
}

/** `CatchDock.primary`: one full-width action on anchored chrome. */
export interface CatchDockPrimaryProps extends CatchDockAction {
  recipe: "primary";
  backgroundColor?: string;
  dividerColor?: string;
}

/** `CatchDock.pageAction`: one page action on the page background without chrome. */
export interface CatchDockPageActionProps extends Pick<CatchDockAction, "isLoading" | "label" | "onPressed"> {
  recipe: "pageAction";
}

/** `CatchDock.primaryContent`: the action body when the caller owns the surface. */
export interface CatchDockPrimaryContentProps extends CatchDockAction {
  recipe: "primaryContent";
  /** Flutter's bottomPadding in px; 12 by default. */
  bottomPadding?: number;
}

export interface CatchDockPaneAction {
  label: string;
  /** Null disables the action. */
  onPressed: (() => void) | null;
  isLoading?: boolean;
}

/**
 * `CatchDock.pane`: the decision bar at the foot of a detail pane (a review, a claim, a report).
 * It stays in view while the pane scrolls.
 */
export interface CatchDockPaneProps {
  recipe: "pane";
  primary: CatchDockPaneAction;
  secondary?: CatchDockPaneAction;
  /** The refusing action (Reject, Decline), drawn as a quiet danger button before the secondary. */
  danger?: CatchDockPaneAction;
  /** A one-line note field above the actions ("Why? Only your team sees this"). */
  note?: {label: string; placeholder?: string; value: string; onChanged: (value: string) => void; required?: boolean};
  /** What happens after the decision ("Then: Harbor Social · 3 left"). */
  next?: ReactNode;
  /** Left of the actions when there is no next line: a price, a count. */
  summary?: ReactNode;
}

export type CatchDockProps =
  | CatchDockPaneProps
  | CatchDockUtilityProps
  | CatchDockPrimaryProps
  | CatchDockPageActionProps
  | CatchDockPrimaryContentProps;

// Lucide "sparkle" (ISC).
const sparkle = (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
    <path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z" />
  </svg>
);

/**
 * Flutter's CatchDock on the web: a persistent control surface on anchored
 * chrome. The utility recipe holds the caller's controls above a hairline;
 * the action recipes draw one full-width D20 large button, with an optional
 * line above and footnote below. The caller places the dock.
 */
export function CatchDock(props: CatchDockProps) {
  if (props.recipe === "pane") return <PaneDock {...props} />;
  if (props.recipe === undefined || props.recipe === "utility") {
    return (
      <div className={styles.dock} data-recipe="utility" data-safe-area={props.includeSafeArea === false ? undefined : true}
        style={props.padding === undefined ? undefined : {padding: props.padding}}>
        {props.children}
      </div>
    );
  }
  const action = props as Exclude<CatchDockProps, CatchDockUtilityProps | CatchDockPaneProps>;
  const line = action.recipe !== "pageAction" ? action.catchLine : undefined;
  const footnote = action.recipe !== "pageAction" ? action.footnote : undefined;
  const leading = action.recipe !== "pageAction" ? action.leading : undefined;
  const style = {
    ...(action.recipe === "primary" && action.backgroundColor ? {"--catch-dock-bg": action.backgroundColor} : {}),
    ...(action.recipe === "primary" && action.dividerColor ? {"--catch-dock-divider": action.dividerColor} : {}),
    ...(action.recipe === "primaryContent" && action.bottomPadding !== undefined ? {"--catch-dock-bottom": `${action.bottomPadding}px`} : {}),
    ...(line && action.recipe !== "pageAction" && action.catchLineAccent ? {"--catch-dock-line-accent": action.catchLineAccent} : {}),
  } as CSSProperties;
  return (
    <div className={styles.dock} data-recipe={action.recipe} style={style}>
      {line ? <p className={styles.line}><span aria-hidden="true" className={styles.sparkle}>{sparkle}</span><span>{line}</span></p> : null}
      <div className={styles.action}>
        <div className={styles.row}>
          {leading != null ? <span className={styles.leading}>{leading}</span> : null}
          <CatchButton
            accentColor={action.recipe !== "pageAction" ? action.buttonAccentColor : undefined}
            fullWidth
            label={action.label}
            mode={action.recipe !== "pageAction" ? action.buttonMode : undefined}
            onPressed={action.onPressed}
            size="lg"
            status={action.isLoading ? "loading" : "idle"}
          />
        </div>
        {footnote ? <p className={styles.footnote}>{footnote}</p> : null}
      </div>
    </div>
  );
}

function PaneDock({primary, secondary, danger, note, next, summary}: CatchDockPaneProps) {
  const noteId = useId();
  return (
    <div className={styles.dock} data-recipe="pane">
      {note ? (
        <label className={styles.note} htmlFor={noteId}>
          <span className={styles.noteLabel}>{note.label}</span>
          <input
            className={styles.noteInput}
            id={noteId}
            onChange={(event) => note.onChanged(event.currentTarget.value)}
            placeholder={note.placeholder}
            required={note.required}
            type="text"
            value={note.value}
          />
        </label>
      ) : null}
      <div className={styles.paneRow}>
        {next ? <span className={styles.next}>{next}</span> : summary ? <div className={styles.summary}>{summary}</div> : <span />}
        <span className={styles.paneActions}>
          {danger ? (
            <CatchButton label={danger.label} onPressed={danger.isLoading ? null : danger.onPressed} recipe="text" tone="danger" />
          ) : null}
          {secondary ? (
            <CatchButton label={secondary.label} onPressed={secondary.onPressed} size="md" status={secondary.isLoading ? "loading" : "idle"} variant="secondary" />
          ) : null}
          <CatchButton label={primary.label} onPressed={primary.onPressed} size="md" status={primary.isLoading ? "loading" : "idle"} />
        </span>
      </div>
    </div>
  );
}
