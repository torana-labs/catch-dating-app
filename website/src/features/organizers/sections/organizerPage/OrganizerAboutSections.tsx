import {
  CatchAvatar,
  CatchBand,
  CatchBandHeader,
  CatchButton,
  CatchFactTile,
  CatchGrid,
  CatchIndexRow,
  CatchSplitSection,
  CatchStack,
  CatchText,
} from "@catch/web-ui";
import {useId} from "react";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import type {OrganizerPageController} from "../../useOrganizerPageController";

/** About: in the organiser's words, the formats, the facts as paper tiles, and who runs it. */
export function OrganizerAboutSection({controller}: {controller: OrganizerPageController}) {
  const {about} = controller.view;
  const titleId = `${useId()}-title`;
  if (!about.text && !about.facts.length && !about.host) return null;
  return (
    <CatchBand aria-labelledby={titleId} as="section" id="about" width="content">
      <CatchStack gap={24}>
        <CatchBandHeader lead={about.text || undefined} title={copy.aboutTitle} titleId={titleId} />
        {about.formats ? <CatchText as="p" tone="secondary" variant="label-action">{about.formats}</CatchText> : null}
        {about.facts.length ? (
          <CatchGrid columns={3} compactColumns={1}>
            {about.facts.map((fact) => <CatchFactTile ground="paper" key={`${fact.label}-${fact.value}`} label={fact.label} value={fact.value} />)}
          </CatchGrid>
        ) : null}
        {about.host ? (
          <CatchStack align="start">
            <CatchIndexRow density="compact" leading={<CatchAvatar initials={about.host.initials} name={about.host.name} size={40} />}
              subtitle={about.host.role} title={about.host.name} />
          </CatchStack>
        ) : null}
      </CatchStack>
    </CatchBand>
  );
}

/**
 * Generated pages only: the board's claim panel on the indigo ground, with
 * the people already waiting, what claiming gives the organiser, and the way
 * into the claim flow on /claim/ (or that a claim is being reviewed).
 */
export function OrganizerClaimSection({controller}: {controller: OrganizerPageController}) {
  const {claim} = controller.view;
  if (!claim) return null;
  const pitch = copy.claim;
  const waiting = [
    claim.followers ? `${claim.followers} ${pitch.followers}` : null,
    claim.reviewers ? `${claim.reviewers} ${claim.reviewVerb}` : null,
  ].filter(Boolean).join(pitch.and);
  return (
    <CatchSplitSection
      actions={claim.href ? [{href: claim.href, label: pitch.action, onPressed: controller.openClaim}] : undefined}
      body={claim.pending ? pitch.pending : undefined}
      checks={pitch.points.map((point) => ({title: point.title, body: point.body}))}
      ground="indigo"
      id="claim"
      kicker={pitch.label}
      lead={waiting ? `${waiting}. ${claim.built}` : claim.built}
      title={pitch.title}
    />
  );
}

/** "Made with Catch · Make a page like this", or on a generated page where it came from and how to report a mistake. */
export function OrganizerPageFooter({controller}: {controller: OrganizerPageController}) {
  const {footer} = controller.view;
  return (
    // Not a <footer>: the site footer is the page's one contentinfo landmark.
    <CatchStack align="center" direction="row" gap={8} justify="center" wrap>
      <CatchText tone="secondary" variant="label-action">{footer.line}</CatchText>
      <CatchButton href={footer.href} label={footer.link} size="sm" variant="quiet" />
    </CatchStack>
  );
}
