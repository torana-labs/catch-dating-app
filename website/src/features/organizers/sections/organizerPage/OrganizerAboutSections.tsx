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
      <CatchBandHeader lead={about.text || undefined} size="feature" title={copy.aboutTitle} titleId={titleId} />
      {about.formats.length ? (
        <CatchStack aria-label={copy.formatsLabel} as="ul" direction="row" gap={8} wrap>
          {about.formats.map((format) => <li key={format}><CatchBadge label={format} size="md" tone="neutral" /></li>)}
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
 * Generated pages only, at the top of the main column: the board's claim
 * card on indigo, with the people already waiting, what claiming gives the
 * organiser, and the way into the claim flow on /claim/ (or that a claim is
 * being reviewed).
 */
export function OrganizerClaimSection({controller}: {controller: OrganizerPageController}) {
  const {claim} = controller.view;
  const titleId = `${useId()}-title`;
  if (!claim) return null;
  const pitch = copy.claim;
  const waiting = [
    claim.followers ? `${claim.followers} ${pitch.followers}` : null,
    claim.reviewers ? `${claim.reviewers} ${claim.reviewVerb}` : null,
  ].filter(Boolean).join(pitch.and);
  return (
    <CatchGroundCard aria-labelledby={titleId} as="section" ground="indigo" id="claim" padding="spacious">
      <CatchStack gap={16}>
        <CatchBandHeader ground="indigo" kicker={pitch.label} lead={waiting ? `${waiting}. ${claim.built}` : claim.built}
          size="feature" title={pitch.title} titleId={titleId} />
        <CatchGrid as="ul" columns={2} compactColumns={1}>
          {pitch.points.map((point) => (
            <li key={point.title}>
              <CatchGroundCard ground="white" padding="compact">
                <CatchText as="p" variant="body">
                  <strong>{point.title}</strong>{` ${point.body}`}
                </CatchText>
              </CatchGroundCard>
            </li>
          ))}
        </CatchGrid>
        {claim.pending ? <CatchText as="p" variant="label-action">{pitch.pending}</CatchText> : null}
        {claim.href ? (
          <CatchStack align="start">
            <CatchButton href={claim.href} label={pitch.action} onPressed={controller.openClaim} size="lg" />
          </CatchStack>
        ) : null}
      </CatchStack>
    </CatchGroundCard>
  );
}

/**
 * The end of the main column: "Made with Catch" and "Make a page like
 * this" on a claimed page, or on a generated page where it came from and how
 * to report a mistake.
 */
export function OrganizerPageFooter({controller}: {controller: OrganizerPageController}) {
  const {footer} = controller.view;
  return (
    // Not a <footer>: the site footer is the page's one contentinfo landmark.
    <CatchStack align="center" direction="row" gap={12} justify="between" wrap>
      <CatchText tone="secondary" variant="body-small">{footer.line}</CatchText>
      <CatchButton href={footer.href} label={footer.link} size="sm" variant="quiet" />
    </CatchStack>
  );
}
