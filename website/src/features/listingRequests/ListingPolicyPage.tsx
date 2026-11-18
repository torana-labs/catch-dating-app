import {CatchBand, CatchBanner, CatchButton, CatchGroundCard, CatchRoot, CatchStack, CatchText} from "@catch/web-ui";
import {listingPolicyContent, listingPolicyCopy, type ListingPolicyPage as PolicyPage} from "@content/listingPolicies";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {LegalDocument, type LegalDocumentSection} from "../../shared/ui/primitives";

export type ListingPolicyKey = keyof typeof listingPolicyContent.pages;

function sectionId(heading: string, index: number) {
  const slug = heading.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  return `${slug || "section"}-${index + 1}`;
}

/**
 * /listings/policy/ and /listings/notice-and-takedown/: the Listing Policy
 * and the Notice and Takedown Policy as drafts for counsel review. Each
 * draws the legal article template under a draft banner; the routes stay
 * noindex, out of the sitemap and unlinked until counsel approves them.
 */
export function ListingPolicyPage({policy}: {policy: ListingPolicyKey}) {
  const page: PolicyPage = listingPolicyContent.pages[policy];
  const draft = listingPolicyContent.status === "draft";
  const sections: LegalDocumentSection[] = page.sections.map((section, index) => ({
    id: sectionId(section.heading, index),
    title: section.heading,
    paragraphs: section.paragraphs,
    list: section.bullets,
  }));
  return (
    <CatchRoot theme="day">
      <PublicSiteHeader />
      <WebsitePageMain id="top">
        {draft ? (
          <CatchBand as="div" pb="none" pt="compact" width="content">
            <CatchBanner message={listingPolicyContent.banner.body} title={listingPolicyContent.banner.title} tone="warning" />
          </CatchBand>
        ) : null}
        <LegalDocument
          aside={(
            <CatchGroundCard as="aside" ground="mint">
              <CatchStack gap={12}>
                <CatchText as="h2" variant="title-row">{listingPolicyCopy.requestPrompt}</CatchText>
                <CatchStack align="start">
                  <CatchButton href="/listings/request/" label={listingPolicyCopy.requestAction} size="md" variant="primary" />
                </CatchStack>
              </CatchStack>
            </CatchGroundCard>
          )}
          kicker={page.eyebrow}
          lead={page.summary}
          meta={draft ? listingPolicyCopy.draftMeta : ""}
          sections={sections}
          title={page.title}
          tocLabel={listingPolicyCopy.tocLabel}
        />
      </WebsitePageMain>
      <PublicSiteFooter />
    </CatchRoot>
  );
}
