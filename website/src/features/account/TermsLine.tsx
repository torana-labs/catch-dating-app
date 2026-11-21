import {CatchLinkedText} from "@catch/web-ui";
import {accountCopy} from "../../content/account";
import {linkedParts} from "../../shared/text/linkedParts";

/**
 * The one legal line where someone signs up, linked to the terms and the
 * privacy policy (which covers ad measurement). The apps say the same words
 * (authLegalAgreement).
 */
export function TermsLine() {
  return <CatchLinkedText parts={linkedParts(accountCopy.terms, {
    terms: {label: accountCopy.termsLink, href: "/terms/"},
    privacy: {label: accountCopy.privacyLink, href: "/privacy/"},
  })} />;
}
