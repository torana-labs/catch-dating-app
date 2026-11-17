import styles from "./CatchSiteDock.module.css";

/** One link in the dock. Resolved copy. */
export interface CatchSiteDockAction {
  label: string;
  href: string;
  /** Called before navigation, such as for click tracking. */
  onClick?: () => void;
}

export interface CatchSiteDockProps {
  /** The dock's accessible name, such as "Quick actions". */
  label: string;
  /** The filled pill, in coral (the kit's default) or pink (the homepage). */
  primary: CatchSiteDockAction & {accent?: "coral" | "pink"};
  /** An outlined pill beside it, such as "See plans". */
  secondary?: CatchSiteDockAction;
  /** A round WhatsApp button at the end; its label is read, not shown. */
  whatsapp?: CatchSiteDockAction;
}

function ChatGlyph() {
  return (
    <svg aria-hidden="true" className={styles.glyph} fill="none" focusable="false" stroke="currentColor" strokeLinecap="round"
      strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.7z" />
    </svg>
  );
}

/**
 * The website's phone action bar (the playbook kit's .mbar): a dark pill that
 * stays 8px above the bottom of the screen with the page's main action, an
 * optional second action and an optional WhatsApp button. It shows only on a
 * phone-width page and sits last on the page, so it rides the screen's foot
 * while the page scrolls and comes to rest under the footer.
 */
export function CatchSiteDock({label, primary, secondary, whatsapp}: CatchSiteDockProps) {
  return (
    <div aria-label={label} className={styles.dock} role="group">
      <a className={styles.action} data-accent={primary.accent ?? "coral"} data-kind="primary" href={primary.href} onClick={primary.onClick}>
        {primary.label}
      </a>
      {secondary ? (
        <a className={styles.action} data-kind="secondary" href={secondary.href} onClick={secondary.onClick}>{secondary.label}</a>
      ) : null}
      {whatsapp ? (
        <a aria-label={whatsapp.label} className={styles.whatsapp} href={whatsapp.href} onClick={whatsapp.onClick} rel="noopener noreferrer" target="_blank">
          <ChatGlyph />
        </a>
      ) : null}
    </div>
  );
}
