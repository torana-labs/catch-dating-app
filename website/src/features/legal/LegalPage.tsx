import type {PublishedLegalPage} from "../../content/types";
import {publishedLegalContent} from "../../content/legal";
import {fallbackPublicContact, renderContactText, type PublicContact} from "../../content/publicContact";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {
  LegalDocument,
  LegalDocumentContact,
  LegalDocumentEffective,
  LegalDocumentEyebrow,
  LegalDocumentHeader,
  LegalDocumentSections,
  LegalDocumentSummary,
  PlainLink,
} from "../../shared/ui/primitives";

export function LegalPage({page, effectiveDate, contact = fallbackPublicContact}: {
  page: PublishedLegalPage;
  effectiveDate: string;
  contact?: PublicContact;
}) {
  const {ui} = publishedLegalContent;
  return (
    <>
      <PublicSiteHeader />
      <WebsitePageMain id="top">
        <LegalDocument>
          <LegalDocumentHeader>
            <LegalDocumentEyebrow>{page.eyebrow}</LegalDocumentEyebrow>
            <h1>{page.title}</h1>
            <LegalDocumentSummary>{page.summary}</LegalDocumentSummary>
            <LegalDocumentEffective>{ui.effectivePrefix} {effectiveDate}</LegalDocumentEffective>
          </LegalDocumentHeader>
          <LegalDocumentSections>
            {page.sections.map((section) => (
              <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{renderContactText(paragraph, contact)}</p>
                ))}
                {section.bullets ? (
                  <ul>
                    {section.bullets.map((bullet) => <li key={bullet}>{renderContactText(bullet, contact)}</li>)}
                  </ul>
                ) : null}
                {section.links ? (
                  <ul>
                    {section.links.map((link) => (
                      <li key={link.href}><PlainLink href={link.href}>{link.label}</PlainLink></li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </LegalDocumentSections>
          <LegalDocumentContact>
            <p>{ui.contactPrompt}</p>
            <PlainLink href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</PlainLink>
          </LegalDocumentContact>
        </LegalDocument>
      </WebsitePageMain>
      <PublicSiteFooter />
    </>
  );
}
