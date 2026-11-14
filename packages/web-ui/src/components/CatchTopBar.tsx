import type {ReactNode} from "react";
import {CatchButton} from "./CatchButton";
import {CatchLegacyIcon} from "./CatchLegacyIcon";
import {CatchMenu} from "./CatchMenu";
import {CatchWordmark} from "./CatchWordmark";
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
 * site: the website header, with the wordmark (title), page links and actions such as "Get the app".
 */
export type CatchTopBarVariant = "tab-home" | "tool" | "step" | "live" | "moment" | "site";

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
  /** site: page links beside the wordmark; they fold away on phones. */
  links?: readonly CatchTopBarAction[];
  /** site: where the wordmark goes. */
  homeHref?: string;
  /** site: the links' accessible name. */
  linksLabel?: string;
  /** site: the phone menu's button label; under 600px the links move into this menu. */
  menuLabel?: string;
  /** site: a product line after the wordmark, such as "for hosts". */
  subBrand?: ReactNode;
  /**
   * site: the visitor's account entry ("Sign in" or "Account"), the last item
   * of the left group after the links. Only the page's actions sit on the right.
   */
  account?: ReactNode;
  /** site: the signed-in account control at the right end, after the actions, from 600px (Website account proposal). */
  accountEnd?: ReactNode;
  /** site: entries the phone menu adds after the links, such as the account entry the bar drops under 600px. */
  menuExtras?: readonly CatchTopBarAction[];
  /**
   * site: a whole phone menu (under 600px) in place of the built-in Menu
   * dropdown, such as a signed-in reader's account sheet that also lists the
   * links. menuExtras is ignored when it is given.
   */
  siteMenu?: ReactNode;
}

function BarIconButton({action, icon}: {action: CatchTopBarAction; icon: "back" | "close"}) {
  const content = <CatchLegacyIcon icon={icon} size="control" />;
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
export function CatchTopBar({variant = "tool", title, kicker, back, action, actions, step, live, links, homeHref, linksLabel = "Site", menuLabel = "Menu", subBrand, account, accountEnd, menuExtras = [], siteMenu}: CatchTopBarProps) {
  const menuItems = [...(links ?? []), ...menuExtras];
  const {scrolled, sizeClass} = useCatchViewport();
  if (variant === "site") {
    return (
      <header className={styles.bar} data-variant="site">
        <span className={styles.siteRow}>
          <span className={styles.site}>
            <CatchWordmark href={homeHref ?? "/"} subBrand={subBrand}>{title ?? "Catch"}</CatchWordmark>
            {links && links.length > 0 ? (
              <nav aria-label={linksLabel} className={styles.links}>
                {links.map((link) => <CatchButton href={link.href} key={link.label} label={link.label} onPressed={link.onPressed} size="sm" variant="quiet" />)}
              </nav>
            ) : null}
            {account ? <span className={styles.account}>{account}</span> : null}
          </span>
          <span className={styles.actions}>
            {actions}
            {accountEnd ? <span className={styles.account}>{accountEnd}</span> : null}
            {siteMenu != null ? <span className={styles.siteMenu}>{siteMenu}</span> : menuItems.length > 0 ? (
              <span className={styles.siteMenu}>
                <CatchMenu
                  align="end"
                  builder={(menu) => <CatchButton {...menu.triggerProps} label={menuLabel} onPressed={menu.toggle} size="sm" variant="secondary" />}
                  items={menuItems.map((link) => ({value: link.label, label: link.label}))}
                  label={linksLabel}
                  onSelected={(value) => {
                    const link = menuItems.find((item) => item.label === value);
                    link?.onPressed?.();
                    if (link?.href) window.location.assign(link.href);
                  }}
                  recipe="anchored"
                  width={240}
                />
              </span>
            ) : null}
          </span>
        </span>
      </header>
    );
  }
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
