import {
  CatchAvatar,
  CatchBadge,
  CatchBandHeader,
  CatchButton,
  CatchFactTile,
  CatchGrid,
  CatchGroundCard,
  CatchIndexRow,
  CatchStack,
  CatchText,
} from "@catch/web-ui";
import {useId} from "react";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import type {OrganizerPageController} from "../../useOrganizerPageController";

/** About: in the organiser's words, the formats as tags, the facts as paper tiles, and who runs it. */
export function OrganizerAboutSection({controller}: {controller: OrganizerPageController}) {
  const {about} = controller.view;
  const titleId = `${useId()}-title`;
  if (!about.text && !about.facts.length && !about.host) return null;
  return (
    <CatchStack aria-labelledby={titleId} as="section" gap={16} id="about">
      <CatchBandHeader lead={about.text || undefined} size="profile" title={copy.aboutTitle} titleId={titleId} />
      {about.formats.length ? (
        <CatchStack direction="row" gap={8} wrap>
          {about.formats.map((format) => <CatchBadge key={format} label={format} size="md" tone="neutral" />)}
        </CatchStack>
      ) : null}
      {about.facts.length ? (
        <CatchGrid columns={2} compactColumns={1}>
          {about.facts.map((fact) => <CatchFactTile ground="paper" key={`${fact.label}-${fact.value}`} label={fact.label} value={fact.value} />)}
        </CatchGrid>
      ) : null}
      {about.host ? (
        <CatchStack align="start">
          <CatchGroundCard ground="white" outlined padding="compact">
            <CatchIndexRow density="compact" leading={<CatchAvatar initials={about.host.initials} name={about.host.name} size={40} />}
              subtitle={about.host.role} title={about.host.name} />
          </CatchGroundCard>
        </CatchStack>
      ) : null}
    </CatchStack>
  );
}

/**
 * Generated pages only, at the top of the main column: a plain card on
 * indigo that says what claiming does and offers the other way out, asking
 * for the page to come down (listings plan B4, 19 Nov 2026), then the way
 * into the claim flow on /claim/ (or that a claim is being reviewed).
 */
export function OrganizerClaimSection({controller}: {controller: OrganizerPageController}) {
  const {claim} = controller.view;
  const titleId = `${useId()}-title`;
  if (!claim) return null;
  const words = copy.claim;
  return (
    <CatchGroundCard aria-labelledby={titleId} as="section" ground="indigo" id="claim" padding="spacious">
      <CatchStack gap={16}>
        <CatchBandHeader ground="indigo" lead={words.body} size="profile" title={words.title} titleId={titleId} />
        {claim.pending ? <CatchText as="p" variant="label-action">{words.pending}</CatchText> : null}
        <CatchStack align="center" direction="row" gap={12} wrap>
          {claim.href ? <CatchButton href={claim.href} label={words.action} onPressed={controller.openClaim} size="lg" /> : null}
          <CatchButton href={claim.removeHref} label={words.remove} size="lg" variant="secondary" />
        </CatchStack>
      </CatchStack>
    </CatchGroundCard>
  );
}

/**
 * The end of the main column: "Made with Catch" and "Make a page like
 * this" on a claimed page, then its report link; on a generated page, where
 * it came from and a link to the listing request form, whose report link
 * already sits beside the page's tag.
 */
export function OrganizerPageFooter({controller}: {controller: OrganizerPageController}) {
  const {footer, kind, report} = controller.view;
  return (
    // Not a <footer>: the site footer is the page's one contentinfo landmark.
    <CatchStack gap={4}>
      <CatchStack align="center" direction="row" dividerAbove gap={12} justify="between" wrap>
        <CatchText tone="secondary" variant="body-small">{footer.line}</CatchText>
        <CatchButton href={footer.href} label={footer.link} size="sm" variant="quiet" />
      </CatchStack>
      {kind === "claimed" ? (
        <CatchStack align="start">
          <CatchButton href={report.href} label={report.label} recipe="text" tone="neutral" />
        </CatchStack>
      ) : null}
    </CatchStack>
  );
}
