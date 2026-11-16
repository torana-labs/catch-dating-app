import {CatchBand, CatchBreadcrumbRow, CatchButton, CatchRoot, CatchStack, CatchText} from "@catch/web-ui";
import {hostLandingCopy} from "../../content/hostLanding";
import type {PlaybookPageDocument} from "../../content/playbook/playbookContract";
import {playbookCopy} from "../../content/playbook/playbookCopy";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import {PublicPageFooter, PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {slugForTracking, trackSiteCtaClick} from "../../shared/site/siteTracking";
import {playbookLeadForms} from "./playbookLeadForms";
import {siteRouteHrefs} from "./playbookRoutes";
import {playbookSectionNode} from "./PlaybookSections";
import {usePlaybookPageController, type PlaybookLeadFormSlots, type PlaybookPageController} from "./usePlaybookPageController";

/**
 * The page's header variant on today's site chrome. guest: the main site's
 * bar. host: the same bar with the free trial as its one primary action, as
 * the host landing does (a host page never leads with the guest app).
 * minimal: the wordmark alone. The breadcrumb row sits under the bar.
 */
function PlaybookHeader({header, controller}: {header: PlaybookPageDocument["header"]; controller: PlaybookPageController}) {
  const trial = `${siteRouteHrefs.host}#start`;
  return (
    <>
      {header.variant === "host" ? (
        <PublicSiteHeader actions={<CatchButton href={trial} label={hostLandingCopy.sections.start} size="sm" />} />
      ) : header.variant === "minimal" ? (
        <PublicSiteHeader actions={null} links={[]} />
      ) : (
        <PublicSiteHeader />
      )}
      {header.breadcrumbs ? (
        <CatchBand as="div" pb="compact" pt="compact">
          <CatchBreadcrumbRow
            current={header.breadcrumbs.current}
            label={playbookCopy.breadcrumbLabel}
            links={header.breadcrumbs.links.map((link) => ({label: link.label, href: controller.href(link.to)}))}
            onLinkPressed={(link) => trackSiteCtaClick(`breadcrumb_${slugForTracking(link.label)}`, link.href)}
          />
        </CatchBand>
      ) : null}
    </>
  );
}

/** The page's numbered notes: the sources of the numbers it states, each with the anchor its mark links to. */
function PlaybookFootnotes({footnotes}: {footnotes: PlaybookPageDocument["footer"]["footnotes"]}) {
  if (!footnotes?.length) return null;
  return (
    <CatchBand aria-label={playbookCopy.footnotesLabel} as="aside" pb="compact" pt="compact">
      <CatchStack gap={4}>
        {footnotes.map((footnote, index) => (
          <CatchText id={`footnote-${footnote.id}`} key={footnote.id} tone="secondary" variant="body-meta">
            {`${index + 1}. ${footnote.text}`}
          </CatchText>
        ))}
      </CatchStack>
    </CatchBand>
  );
}

/**
 * A page of the website redesign, drawn from its content file: the site
 * header in the page's variant, its sections in order through the kit's
 * components (./PlaybookSections), its footnotes, then the site footer.
 * `page` is validated and has its brand tokens resolved (loadPlaybookPage);
 * `captures` are the marketing capture slots its media names.
 */
export function PlaybookPage({page, captures, leadForms = playbookLeadForms}: {
  page: PlaybookPageDocument;
  captures: CaptureSlots;
  leadForms?: PlaybookLeadFormSlots;
}) {
  const controller = usePlaybookPageController(page, leadForms);
  const context = {page, controller, captures};
  return (
    <CatchRoot theme="day">
      <PlaybookHeader controller={controller} header={page.header} />
      <WebsitePageMain>
        {page.sections.map((section) => playbookSectionNode(section, context))}
        <PlaybookFootnotes footnotes={page.footer.footnotes} />
      </WebsitePageMain>
      {page.footer.variant === "minimal" ? <PublicPageFooter /> : <PublicSiteFooter />}
    </CatchRoot>
  );
}
