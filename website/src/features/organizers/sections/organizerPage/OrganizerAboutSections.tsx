import {CatchAvatar, CatchButton, CatchIndexRow, CatchMetricTile, CatchSection, CatchStack, CatchSurface, CatchText} from "@catch/web-ui";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import type {OrganizerPageController} from "../../useOrganizerPageController";

/** About: in the organiser's words, the formats, the facts as Stats, and who runs it. */
export function OrganizerAboutSection({controller}: {controller: OrganizerPageController}) {
  const {about} = controller.view;
  if (!about.text && !about.facts.length && !about.host) return null;
  return (
    <CatchStack gap={0} id="about">
      <CatchSection dividers="none" title={copy.aboutTitle}>
        <CatchStack gap={16}>
          {about.text ? <CatchText as="p" variant="body">{about.text}</CatchText> : null}
          {about.formats ? <CatchText as="p" tone="secondary" variant="label-action">{about.formats}</CatchText> : null}
          {about.facts.length ? (
            <CatchStack gap={8}>
              {about.facts.map((fact) => <CatchMetricTile key={`${fact.label}-${fact.value}`} label={fact.label} layout="fact" value={fact.value} />)}
            </CatchStack>
          ) : null}
          {about.host ? (
            <CatchSection>
              <CatchIndexRow density="compact" leading={<CatchAvatar initials={about.host.initials} name={about.host.name} size={36} />}
                subtitle={about.host.role} title={about.host.name} />
            </CatchSection>
          ) : null}
        </CatchStack>
      </CatchSection>
    </CatchStack>
  );
}

/**
 * Generated pages only: what claiming the page gives the organiser, with the
 * people already waiting, on a spotlight above the calendar.
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
    <CatchSurface aria-labelledby="organizer-claim-title" as="section" block="spotlight" color="courts" id="claim">
      <CatchText variant="label-kicker">{pitch.label}</CatchText>
      <CatchText as="h2" id="organizer-claim-title" variant="display-sm">{pitch.title}</CatchText>
      <CatchText as="p" variant="body">{waiting ? `${waiting}. ${claim.built}` : claim.built}</CatchText>
      <CatchSection container="tile">
        {pitch.points.map((point) => <CatchIndexRow density="compact" key={point.title} subtitle={point.body} title={point.title} wrap />)}
      </CatchSection>
      <CatchStack align="start" gap={8}>
        {claim.href ? <CatchButton href={claim.href} label={pitch.action} onPressed={controller.openClaim} /> : null}
        {claim.pending ? <CatchText as="p" variant="label-action">{pitch.pending}</CatchText> : null}
      </CatchStack>
    </CatchSurface>
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
