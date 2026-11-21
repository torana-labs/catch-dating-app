import {CatchButton, CatchGroundCard, CatchLinkedText, CatchStack, CatchText, type CatchLinkedTextPart} from "@catch/web-ui";
import type {PublishedLegalPage, PublishedLegalSection} from "../../content/types";
import {legalPageCopy, publishedLegalContent} from "../../content/legal";
import {fallbackPublicContact, renderContactText, type PublicContact} from "../../content/publicContact";
import {siteFooterCopy, whatsappChatCopy, whatsappChatHref} from "../../content/site";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {linkedParts} from "../../shared/text/linkedParts";
import {LegalDocument, type LegalDocumentSection} from "../../shared/ui/primitives";

const contactPath = "/contact/";

/** A stable anchor for each section: its fixed anchor when other pages link to it, else its heading, lowercased, and its place. */
function sectionId(section: PublishedLegalSection, index: number) {
  if (section.anchor) return section.anchor;
  const slug = section.heading.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  return `${slug || "section"}-${index + 1}`;
}

/** Each section's related pages, once each, in the order the document names them. */
function relatedLinks(page: PublishedLegalPage) {
  const seen = new Set<string>();
  return page.sections.flatMap((section) => section.links ?? []).filter((link) => {
    if (seen.has(link.href) || link.href === page.path) return false;
    seen.add(link.href);
    return true;
  });
}

/**
 * /privacy/, /terms/, /help/, /refunds/, /delete-account/ and /contact/ on
 * the LiveLegal board: one article template. The sections and their lists
 * come from the published document; beside them, the contents and a card
 * with the reply line, a person on WhatsApp, the support email and the
 * document's related pages. /contact/ leads with the WhatsApp button.
 */
/** The other ways in, under the WhatsApp button: the email, and the contact page unless this is it. */
function LegalContactLine({contactPath, email}: {contactPath?: string; email: string}) {
  const links: Record<string, CatchLinkedTextPart> = {
    email: {label: email, href: `mailto:${email}`},
    ...(contactPath ? {contact: {label: legalPageCopy.contactPage, href: contactPath}} : {}),
  };
  return <CatchLinkedText parts={linkedParts(contactPath ? legalPageCopy.contactLine : legalPageCopy.contactLineHere, links)} tone="primary" />;
}

export function LegalPage({page, effectiveDate, contact = fallbackPublicContact}: {
  page: PublishedLegalPage;
  effectiveDate: string;
  contact?: PublicContact;
}) {
  const {ui} = publishedLegalContent;
  const sections: LegalDocumentSection[] = page.sections.map((section, index) => ({
    id: sectionId(section, index),
    title: section.heading,
    paragraphs: section.paragraphs.map((paragraph) => renderContactText(paragraph, contact)),
    list: section.bullets?.map((bullet) => renderContactText(bullet, contact)),
  }));
  const related = relatedLinks(page);
  const onContactPage = page.path === contactPath;
  return (
    <>
      <PublicSiteHeader />
      <WebsitePageMain id="top">
        <LegalDocument
          aside={(
            <CatchGroundCard as="aside" ground="mint">
              <CatchStack gap={12}>
                <CatchText as="h2" variant="title-row">{ui.contactPrompt}</CatchText>
                <CatchText as="p" variant="body-small">{siteFooterCopy.helpBand.title}</CatchText>
                {/* A person on WhatsApp, not only an email (leak 7): the one button; the other routes are a sentence. */}
                <CatchStack align="start">
                  <CatchButton href={whatsappChatHref(whatsappChatCopy.generalMessage)} label={whatsappChatCopy.chat}
                    newTab size="md" variant="primary" />
                </CatchStack>
                <LegalContactLine contactPath={onContactPage ? undefined : contactPath} email={contact.supportEmail} />
                {related.length ? (
                  <CatchStack gap={4}>
                    <CatchText as="h3" tone="secondary" variant="label-kicker">{legalPageCopy.related}</CatchText>
                    {related.map((link) => (
                      <CatchLinkedText key={link.href} parts={[{label: link.label, href: link.href, arrow: true}]} tone="primary" />
                    ))}
                  </CatchStack>
                ) : null}
              </CatchStack>
            </CatchGroundCard>
          )}
          kicker={page.eyebrow}
          lead={page.summary}
          meta={`${ui.effectivePrefix} ${page.effectiveDate ?? effectiveDate}`}
          sections={sections}
          title={page.title}
          tocLabel={legalPageCopy.tocLabel}
        />
      </WebsitePageMain>
      <PublicSiteFooter />
    </>
  );
}
