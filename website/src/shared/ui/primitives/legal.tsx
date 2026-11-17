import {CatchArticleBody, type CatchArticleBodySection} from "@catch/web-ui";
import type {ReactNode} from "react";

export type LegalDocumentSection = CatchArticleBodySection;

/**
 * A published legal, help or contact document as the playbook kit's article
 * (the LiveLegal board): the head with the effective date as its meta line,
 * the anchored sections, and beside them the contents and the contact card.
 * It draws CatchArticleBody; the page supplies resolved copy.
 */
export function LegalDocument({kicker, title, lead, meta, sections, tocLabel, aside}: {
  kicker: string;
  title: string;
  lead: string;
  meta: string;
  sections: readonly LegalDocumentSection[];
  tocLabel: string;
  aside: ReactNode;
}) {
  return <CatchArticleBody aside={aside} kicker={kicker} kickerTone="success" lead={lead} meta={meta} sections={sections} title={title} tocLabel={tocLabel} />;
}
