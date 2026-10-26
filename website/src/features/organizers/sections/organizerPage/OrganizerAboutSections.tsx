import {
  CatchAvatar,
  CatchButton,
  CatchFactTile,
  CatchGap,
  CatchGrid,
  CatchGroundCard,
  CatchText,
} from "@catch/web-ui";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import type {OrganizerPageController} from "../../useOrganizerPageController";
import {organizerSectionHeading} from "./organizerSectionHeading";

/** In the organiser's words, with formats, facts and who runs it. */
export function OrganizerAboutSection({controller}: {controller: OrganizerPageController}) {
  const {about, header} = controller.view;
  if (!about.text && !about.facts.length && !about.host) return null;
  return (
    <CatchGap aria-labelledby="organizer-about-title" as="section" id="about" size="formField">
      {organizerSectionHeading({id: "organizer-about-title", title: copy.aboutTitle})}
      {about.text ? <CatchText variant="bodyL">{about.text}</CatchText> : null}
      {about.formats ? <CatchText color="ink2" variant="supportingStrong">{about.formats}</CatchText> : null}
      {about.facts.length ? (
        <CatchGrid columns={2} compactColumns={1}>
          {about.facts.map((fact) => <CatchFactTile key={`${fact.label}-${fact.value}`} label={fact.label} value={fact.value} />)}
        </CatchGrid>
      ) : null}
      {about.host ? (
        <CatchGap crossAxisAlignment="center" direction="horizontal" size="related">
          <CatchAvatar ground={header.accent} initials={about.host.initials} name={about.host.name} recipe="monogram" size={40} />
          <CatchGap size="headerTitleToSubtitle">
            <CatchText variant="sectionTitle">{about.host.name}</CatchText>
            <CatchText color="ink2" variant="bodyS">{about.host.role}</CatchText>
          </CatchGap>
        </CatchGap>
      ) : null}
    </CatchGap>
  );
}

/** Generated pages only: what claiming the page gives the organiser, with the people already waiting. */
export function OrganizerClaimSection({controller}: {controller: OrganizerPageController}) {
  const {claim} = controller.view;
  if (!claim) return null;
  const pitch = copy.claim;
  return (
    <CatchGroundCard aria-labelledby="organizer-claim-title" as="section" ground="indigo" id="claim" padding="spacious">
      <CatchGap size="formField">
        <CatchText color="inherit" variant="titleS">{pitch.label}</CatchText>
        <CatchText as="h2" id="organizer-claim-title" variant="displayM">{pitch.title}</CatchText>
        <CatchText variant="bodyL">
          {claim.followers ? <><CatchText as="strong" variant="sectionTitle">{claim.followers}</CatchText>{` ${pitch.followers}`}</> : null}
          {claim.followers && claim.reviewers ? pitch.and : null}
          {claim.reviewers ? <><CatchText as="strong" variant="sectionTitle">{claim.reviewers}</CatchText>{` ${claim.reviewVerb}`}</> : null}
          {claim.followers || claim.reviewers ? ". " : null}
          {claim.built}
        </CatchText>
        <CatchGrid as="ul" columns={2} compactColumns={1} gap="related">
          {pitch.points.map((point) => (
            <CatchGroundCard ground="white" key={point.title} padding="compact">
              <CatchText variant="bodyM">
                <CatchText as="strong" variant="titleS">{point.title}</CatchText>{` ${point.body}`}
              </CatchText>
            </CatchGroundCard>
          ))}
        </CatchGrid>
        <CatchGap crossAxisAlignment="start" size="inline">
          {claim.href ? <CatchButton href={claim.href} label={pitch.action} onPressed={controller.openClaim} /> : null}
          {claim.pending ? <CatchText variant="supportingStrong">{pitch.pending}</CatchText> : null}
        </CatchGap>
      </CatchGap>
    </CatchGroundCard>
  );
}

/** "Made with Catch", or on a generated page where it came from and how to report a mistake. */
export function OrganizerPageFooter({controller}: {controller: OrganizerPageController}) {
  const {footer} = controller.view;
  return (
    <CatchGap as="footer" crossAxisAlignment="center" direction="horizontal" mainAxisAlignment="spaceBetween" size="related" wrap>
      <CatchText color="ink2" variant="bodyM">{footer.line}</CatchText>
      <CatchButton href={footer.href} label={footer.link} onPressed={() => undefined} recipe="text" tone="neutral" />
    </CatchGap>
  );
}
