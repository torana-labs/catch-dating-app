import {CatchText} from "./CatchText";
import styles from "./CatchConsentNote.module.css";

export interface CatchConsentNoteProps {
  /** What sending the form agrees to, such as "From Catch. Stop any time." */
  text: string;
  /** The link at the end of the line, such as "Privacy". */
  linkLabel: string;
  href: string;
}

/**
 * A form's consent line (issue #2144): one short secondary sentence with the
 * policy link inline at its end, rather than a button beside it. The link
 * takes the line's colour and an underline, so it reads on any ground.
 */
export function CatchConsentNote({text, linkLabel, href}: CatchConsentNoteProps) {
  return (
    <CatchText as="p" tone="secondary" variant="body-meta">
      {text} <a className={styles.link} href={href}>{linkLabel}</a>
    </CatchText>
  );
}
