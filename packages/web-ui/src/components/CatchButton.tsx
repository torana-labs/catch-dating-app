"use client";

import type {CSSProperties, MouseEvent, ReactNode} from "react";
import styles from "./CatchButton.module.css";

/** Flutter `CatchButtonVariant`, with the D20 names. */
export type CatchButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "light";
/** Flutter `CatchButtonSize`, the D20 sizes: sm 32px, md 40px, lg 48px (the default). */
export type CatchButtonSize = "sm" | "md" | "lg";
/** Flutter `CatchButtonMode`, retiring: under D20 both draw 4px corners. */
export type CatchButtonMode = "pill" | "rounded";
export type CatchButtonStatus = "idle" | "loading";
/** The text recipe's label colour. */
export type CatchButtonTone = "primary" | "neutral" | "danger";
/** The sheet recipe's purpose: commit is primary, the rest secondary. */
export type CatchButtonEmphasis = "dismiss" | "alternative" | "commit";

interface CatchButtonWeb {
  /** Web only: renders a link with the button's look. */
  href?: string;
  /** Web only: opens the link in a new tab, without an opener. */
  newTab?: boolean;
  /** Web only: the native button type; defaults to button. */
  type?: "button" | "submit" | "reset";
}

interface CatchButtonAction extends CatchButtonWeb {
  label: string;
  /** Null disables the button, as in Flutter. */
  onPressed: (() => void) | null;
}

interface CatchButtonColours {
  backgroundColor?: string;
  borderColor?: string;
  foregroundColor?: string;
}

/** Flutter's default `CatchButton`: the D20 call to action. */
export interface CatchButtonDefaultProps extends CatchButtonAction, CatchButtonColours {
  /** A primary button's activity pigment, paired with white. */
  accentColor?: string;
  fullWidth?: boolean;
  /** False draws a non-interactive button-shaped label. */
  isInteractive?: boolean;
  leading?: ReactNode;
  mode?: CatchButtonMode;
  recipe?: "default";
  semanticsLabel?: string;
  size?: CatchButtonSize;
  status?: CatchButtonStatus;
  /** Web addition: a glyph after the label, such as an outward arrow. */
  trailing?: ReactNode;
  variant?: CatchButtonVariant;
}

/** `CatchButton.sheet`: a full-width sheet action whose purpose sets its hierarchy. */
export interface CatchButtonSheetProps extends CatchButtonAction {
  leading?: ReactNode;
  recipe: "sheet";
  role: CatchButtonEmphasis;
  status?: CatchButtonStatus;
}

/** `CatchButton.selection`: a bounded current-value trigger with a tooltip. */
export interface CatchButtonSelectionProps extends CatchButtonAction, CatchButtonColours {
  leading?: ReactNode;
  recipe: "selection";
  semanticsLabel?: string;
  tooltip?: string;
}

/** `CatchButton.command`: an unboxed toolbar command. */
export interface CatchButtonCommandProps extends CatchButtonAction {
  leading?: ReactNode;
  recipe: "command";
  semanticsLabel?: string;
  trailing?: ReactNode;
}

/** `CatchButton.floating`: a raised pill with optional value text and a count. */
export interface CatchButtonFloatingProps extends CatchButtonWeb {
  count?: number;
  icon?: ReactNode;
  label: string;
  onPressed: () => void;
  recipe: "floating";
  semanticsLabel?: string;
  value?: string;
}

/** `CatchButton.text`: an inline or dialog text action. */
export interface CatchButtonTextProps extends CatchButtonAction {
  backgroundColor?: string;
  disabledBackgroundColor?: string;
  disabledForegroundColor?: string;
  foregroundColor?: string;
  leading?: ReactNode;
  leadingGap?: number;
  minimumSize?: {width: number; height: number};
  padding?: CSSProperties["padding"];
  recipe: "text";
  side?: CSSProperties["border"];
  textStyle?: CSSProperties;
  tone?: CatchButtonTone;
}

export type CatchButtonProps =
  | CatchButtonDefaultProps
  | CatchButtonSheetProps
  | CatchButtonSelectionProps
  | CatchButtonCommandProps
  | CatchButtonFloatingProps
  | CatchButtonTextProps;

const countLabel = (count: number) => (count > 99 ? "99+" : String(count));

/**
 * Flutter's `CatchButton` drawn to D20: 4px corners, primary, secondary,
 * quiet, danger and light fills, three sizes, a label-colour overlay on
 * hover and press, a 2px ring outside the button on keyboard focus, 40%
 * opacity when disabled and three dots, with busy semantics, while loading.
 */
export function CatchButton(props: CatchButtonProps) {
  const recipe = props.recipe ?? "default";
  const loading = (props.recipe === undefined || props.recipe === "default" || props.recipe === "sheet") &&
    props.status === "loading";
  const interactive = props.recipe === undefined || props.recipe === "default" ? props.isInteractive !== false : true;
  const action = props.onPressed ?? undefined;
  const enabled = interactive && action !== undefined && !loading;

  let variant: CatchButtonVariant = "primary";
  let size: CatchButtonSize = "lg";
  let fullWidth = false;
  let leading: ReactNode;
  let trailing: ReactNode;
  let ariaLabel: string | undefined;
  let title: string | undefined;
  let style: CSSProperties | undefined;
  switch (props.recipe) {
    case undefined:
    case "default":
      variant = props.variant ?? "primary";
      size = props.size ?? "lg";
      fullWidth = props.fullWidth ?? false;
      ({leading, trailing} = props);
      ariaLabel = props.semanticsLabel;
      style = colourOverrides(props, variant === "primary" ? props.accentColor : undefined);
      break;
    case "sheet":
      variant = props.role === "commit" ? "primary" : "secondary";
      fullWidth = true;
      leading = props.leading;
      break;
    case "selection":
      variant = "secondary";
      size = "md";
      leading = props.leading;
      ariaLabel = props.semanticsLabel;
      title = props.tooltip ?? props.label;
      style = colourOverrides(props);
      break;
    case "command":
      ({leading, trailing} = props);
      ariaLabel = props.semanticsLabel;
      break;
    case "floating":
      leading = props.icon;
      ariaLabel = props.semanticsLabel;
      break;
    case "text":
      leading = props.leading;
      style = textOverrides(props);
      break;
  }

  const content = (
    <>
      <span className={styles.content}>
        {leading ? <span aria-hidden="true" className={styles.glyph}>{leading}</span> : null}
        <span className={styles.label}>{props.label}</span>
        {props.recipe === "floating" && props.value
          ? <><span aria-hidden="true" className={styles.dot}>·</span><span className={styles.value}>{props.value}</span></>
          : null}
        {trailing ? <span aria-hidden="true" className={styles.glyph}>{trailing}</span> : null}
      </span>
      {loading ? (
        <span aria-hidden="true" className={styles.dots}><span /><span /><span /></span>
      ) : null}
      {props.recipe === "floating" && (props.count ?? 0) > 0 ? (
        <span aria-hidden="true" className={styles.count}>{countLabel(props.count ?? 0)}</span>
      ) : null}
    </>
  );

  const shared = {
    "aria-busy": loading || undefined,
    // The dots hide the label, so a loading button keeps its name explicitly.
    "aria-label": ariaLabel ?? (loading ? props.label : undefined),
    className: styles.button,
    "data-full-width": fullWidth || undefined,
    "data-loading": loading || undefined,
    "data-recipe": recipe,
    "data-size": size,
    "data-tone": props.recipe === "text" ? props.tone ?? "primary" : undefined,
    "data-variant": variant,
    style,
    title,
  };

  if (!interactive) return <span {...shared} data-static="">{content}</span>;

  const onClick = (event: MouseEvent) => {
    if (!enabled) {
      event.preventDefault();
      return;
    }
    action?.();
  };

  if (props.href !== undefined) {
    return (
      <a
        {...shared}
        aria-disabled={!enabled || undefined}
        href={enabled ? props.href : undefined}
        onClick={onClick}
        rel={props.newTab ? "noopener noreferrer" : undefined}
        target={props.newTab ? "_blank" : undefined}
      >
        {content}
      </a>
    );
  }
  return (
    <button
      {...shared}
      aria-disabled={loading || undefined}
      disabled={!enabled && !loading}
      onClick={onClick}
      type={props.type ?? "button"}
    >
      {content}
    </button>
  );
}

function colourOverrides(colours: CatchButtonColours, accent?: string): CSSProperties | undefined {
  const values: Record<string, string | undefined> = {
    "--catch-button-bg": colours.backgroundColor ?? accent,
    "--catch-button-border": colours.borderColor ?? (accent ? "transparent" : undefined),
    "--catch-button-fg": colours.foregroundColor ?? (accent ? "var(--catch-palette-white)" : undefined),
  };
  const set = Object.entries(values).filter(([, value]) => value !== undefined);
  return set.length ? (Object.fromEntries(set) as CSSProperties) : undefined;
}

function textOverrides(props: CatchButtonTextProps): CSSProperties | undefined {
  const style: Record<string, unknown> = {
    ...props.textStyle,
    ...(props.padding === undefined ? {} : {padding: props.padding}),
    ...(props.side === undefined ? {} : {border: props.side}),
    ...(props.minimumSize ? {minHeight: props.minimumSize.height, minWidth: props.minimumSize.width} : {}),
    ...(props.leadingGap === undefined ? {} : {"--catch-button-gap": `${props.leadingGap}px`}),
    ...(props.foregroundColor ? {"--catch-button-fg": props.foregroundColor} : {}),
    ...(props.backgroundColor ? {"--catch-button-bg": props.backgroundColor} : {}),
    ...(props.disabledForegroundColor ? {"--catch-button-disabled-fg": props.disabledForegroundColor} : {}),
    ...(props.disabledBackgroundColor ? {"--catch-button-disabled-bg": props.disabledBackgroundColor} : {}),
  };
  return Object.keys(style).length ? (style as CSSProperties) : undefined;
}
