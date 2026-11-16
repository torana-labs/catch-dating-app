"use client";
import type {PlaybookPageDocument} from "../../content/playbook/playbookContract";
import {PlaybookPage} from "../../features/playbook/PlaybookPage";
import {playbookStructuredData} from "../../features/playbook/playbookStructuredData";
import {MarketingConsentBanner} from "../../features/marketing/MarketingConsentBanner";
import {publicJsonLd} from "../../shared/next/publicJsonLd";
import {PageShell} from "../../shared/site";
import {useLocation} from "react-router";
import {marketingCaptures} from "../marketingCaptures";
import {pageClassFor} from "../pageMeta";
import {useHashScroll, useMarketingAnalytics} from "../usePageLifecycle";

/**
 * A redesign page on the Next render: the copy is in the server HTML, with
 * its FAQPage and BreadcrumbList structured data. The server resolved and
 * validated the page (resolvePublicRoute), so a page without content never
 * reaches here.
 */
export function PlaybookPublicPage({page, canonicalPath}: {page: PlaybookPageDocument; canonicalPath: string}) {
  const location = useLocation();
  useHashScroll("playbook", location.hash);
  useMarketingAnalytics("playbook", location.pathname);
  const structured = playbookStructuredData(page, canonicalPath);
  return (
    <PageShell pageClassName={pageClassFor("playbook")}>
      {structured ? <script type="application/ld+json" dangerouslySetInnerHTML={{__html: publicJsonLd(structured)}} /> : null}
      <PlaybookPage captures={marketingCaptures} page={page} />
      <MarketingConsentBanner serverRendered />
    </PageShell>
  );
}
