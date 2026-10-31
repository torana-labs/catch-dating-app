import type {ReactNode} from "react";
import {CatchIcon} from "./CatchIcon";
import {useCatchViewport} from "./catchViewportContext";
import styles from "./CatchTopBar.module.css";

/** A labelled action: a link with href, or a button with onPressed. */
export interface CatchTopBarAction {
  label: string;
  href?: string;
  onPressed?: () => void;
}

export interface CatchTopBarBack extends CatchTopBarAction {
  /** Draw a close mark instead of a back arrow. */
  close?: boolean;
}

/**
 * tab-home: a tab's own screen. tool: a sub-screen with back. step: a step in a flow, with
 * progress. live: a live console with its badge. moment: a full-screen moment with close only.
 */
export type CatchTopBarVariant = "tab-home" | "tool" | "step" | "live" | "moment";

export interface CatchTopBarProps {
  variant?: CatchTopBarVariant;
  title?: ReactNode;
  /** A muted line above the title; on wide screens a breadcrumb before it. */
  kicker?: ReactNode;
  back?: CatchTopBarBack;
  /** A text action on the right ("Reset", "Preview", "Save"). */
  action?: CatchTopBarAction;
  /** Small icon buttons or a button on the right. */
  actions?: ReactNode;
  /** step: where the flow is. */
  step?: {index: number; total: number};
  /** live: the badge, such as "Live · 9:04 PM". */
  live?: ReactNode;
}

function BarIconButton({action, icon}: {action: CatchTopBarAction; icon: "back" | "close"}) {
  const content = <CatchIcon icon={icon} size="control" />;
  return action.href
    ? <a aria-label={action.label} className={styles.iconButton} href={action.href} onClick={action.onPressed}>{content}</a>
    : <button aria-label={action.label} className={styles.iconButton} onClick={action.onPressed} type="button">{content}</button>;
}

function TextAction({action}: {action: CatchTopBarAction}) {
  return action.href
    ? <a className={styles.textAction} href={action.href} onClick={action.onPressed}>{action.label}</a>
    : <button className={styles.textAction} onClick={action.onPressed} type="button">{action.label}</button>;
}

/**
 * Flutter's CatchTopBar on the web: the top of a screen. On tablets and desktops every variant is
 * the same 56px row (back, a one-line title with its kicker as a breadcrumb, small actions) that
 * lines up with the navigation's header and every pane header. On phones the variants keep their
 * own shapes. Inside CatchViewport it gains a hairline once the body scrolls.
 */
export function CatchTopBar({variant = "tool", title, kicker, back, action, actions, step, live}: CatchTopBarProps) {
  const {scrolled, sizeClass} = useCatchViewport();
  const stepLabel = step ? `Step ${step.index} of ${step.total}` : undefined;
  const liveBadge = live ? <span className={styles.live}><span aria-hidden="true" className={styles.liveDot} />{live}</span> : null;
  const trailing = liveBadge || action || actions
    ? <span className={styles.actions}>{liveBadge}{action ? <TextAction action={action} /> : null}{actions}</span>
    : null;
  const backButton = back ? <BarIconButton action={back} icon={back.close || variant === "moment" ? "close" : "back"} /> : null;

  if (variant === "moment") {
    return <header className={styles.bar} data-variant="moment"><span className={styles.spacer} />{backButton}</header>;
  }

  if (sizeClass !== "compact") {
    const crumb = variant === "step" ? stepLabel ?? kicker : kicker;
    return (
      <header className={styles.bar} data-scrolled={scrolled ? "" : undefined} data-variant={variant} data-wide="">
        {backButton}
        <span className={styles.title}>
          {crumb ? <span className={styles.kicker}>{crumb}</span> : null}
          {title ? <h1 className={styles.name}>{title}</h1> : null}
        </span>
        {trailing}
      </header>
    );
  }

  if (variant === "tab-home") {
    return (
      <header className={styles.bar} data-scrolled={scrolled ? "" : undefined} data-variant="tab-home">
        <span className={styles.titles}>
          {kicker ? <span className={styles.compactKicker}>{kicker}</span> : null}
          {title ? <h1 className={styles.homeName}>{title}</h1> : null}
        </span>
        {trailing}
      </header>
    );
  }

  if (variant === "step") {
    return (
      <header className={styles.bar} data-scrolled={scrolled ? "" : undefined} data-variant="step">
        <span className={styles.row}>{backButton}<span className={styles.compactKicker}>{stepLabel ?? kicker}</span></span>
        {step ? (
          <span aria-label={stepLabel} className={styles.segments} role="img">
            {Array.from({length: step.total}, (_, index) => <span data-done={index < step.index ? "" : undefined} key={index} />)}
          </span>
        ) : null}
        {title ? <h1 className={styles.homeName}>{title}</h1> : null}
      </header>
    );
  }

  return (
    <header className={styles.bar} data-scrolled={scrolled ? "" : undefined} data-variant={variant}>
      <span className={styles.grid}>
        {backButton ?? <span />}
        <span className={styles.titles}>
          {kicker ? <span className={styles.compactKicker}>{kicker}</span> : null}
          {title ? <h1 className={styles.compactName}>{title}</h1> : null}
        </span>
        {trailing ?? <span />}
      </span>
    </header>
  );
}
