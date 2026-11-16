import {CatchButton, CatchRoot} from "@catch/web-ui";
import type {PlaybookPageDocument} from "../../content/playbook/playbookContract";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import {PublicPageFooter, PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {playbookLeadForms} from "./playbookLeadForms";
import {playbookSectionNode} from "./PlaybookSections";
import {useFoundingHostOffer} from "./useFoundingHostOffer";
import {usePlaybookPageController, type PlaybookLeadFormSlots, type PlaybookPageController} from "./usePlaybookPageController";

/**
 * The site header in the page's variant (guest, host or the one-job
 * minimal), with its breadcrumb row, the page's own primary action when it
 * names one, and the founding-host offer strip while that market's counter
 * is open.
 */
function PlaybookHeader({header, controller}: {header: PlaybookPageDocument["header"]; controller: PlaybookPageController}) {
  const offerOpen = useFoundingHostOffer(header.offer?.market);
  const action = header.action ? controller.action(header.action, "header") : undefined;
  return (
    <PublicSiteHeader
      actions={action ? <CatchButton href={action.href} label={action.label} onPressed={action.onPressed} size="sm" /> : undefined}
      breadcrumbs={header.breadcrumbs ? {
        current: header.breadcrumbs.current,
        links: header.breadcrumbs.links.map((link) => ({label: link.label, href: controller.href(link.to)})),
      } : undefined}
      offer={header.offer && offerOpen ? {
        lead: header.offer.lead,
        body: header.offer.body,
        action: header.offer.action ? controller.link(header.offer.action) : undefined,
      } : undefined}
      variant={header.variant}
    />
  );
}

/**
 * A page of the website redesign, drawn from its content file: the site
 * header in the page's variant, its sections in order through the kit's
 * components (./PlaybookSections), then the site footer in the page's
 * variant with the page's numbered notes. `page` is validated and has its
 * brand tokens resolved (loadPlaybookPage); `captures` are the marketing
 * capture slots its media names.
 */
export function PlaybookPage({page, captures, leadForms = playbookLeadForms}: {
  page: PlaybookPageDocument;
  captures: CaptureSlots;
  leadForms?: PlaybookLeadFormSlots;
}) {
  const controller = usePlaybookPageController(page, leadForms);
  const context = {page, controller, captures};
  const footnotes = page.footer.footnotes?.map((footnote, index) => `${index + 1}. ${footnote.text}`);
  return (
    <CatchRoot theme="day">
      <PlaybookHeader controller={controller} header={page.header} />
      <WebsitePageMain>
        {page.sections.map((section) => playbookSectionNode(section, context))}
      </WebsitePageMain>
      {page.footer.variant === "minimal" ? <PublicPageFooter /> : <PublicSiteFooter footnotes={footnotes} variant={page.footer.variant} />}
    </CatchRoot>
  );
}
