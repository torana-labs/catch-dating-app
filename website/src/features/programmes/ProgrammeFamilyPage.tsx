import {CatchBadge, CatchChip, CatchIndexRow, CatchMetricTile, CatchSection, CatchStack, CatchSurface, CatchText} from "@catch/web-ui";
import {getProgramFamilyView, type ProgramFamilyViewCallableResponse} from "../../firebase";
import {programmeFamilyCopy as copy, programmeLinkCopy} from "../../content/programmes";
import {ProgrammeLinkFrame} from "./ProgrammeLinkFrame";
import {programmeFormat} from "./programmeBrandingModel";
import {programmeDay, programmeDaysToGo, programmeDayTime, programmeTime, type ProgrammeLinkCredential, type ProgrammeLinkScreen} from "./programmeLinkModel";
import {useProgrammeLinkRead} from "./useProgrammeLinkRead";

export type FamilyView = ProgramFamilyViewCallableResponse;

export function ProgrammeFamilyPage({credential}: {credential: ProgrammeLinkCredential | null}) {
  const read = useProgrammeLinkRead("family", credential, getProgramFamilyView);
  return <ProgrammeFamilyView {...read} />;
}

/**
 * The family's view-only link (web only), drawn as the RbHostProgramShare
 * board: Shared by your planner and View only, the spotlight in the
 * programme's colour with the dates and when it was counted, guests and
 * households replied, who is coming to each function, heads for the
 * caterer, and how many households have still to reply. The read carries
 * counts and function names only: no guest names, phone numbers or rooms.
 */
export function ProgrammeFamilyView({screen, refresh, refreshing}: {
  screen: ProgrammeLinkScreen<FamilyView>;
  refresh: () => void;
  refreshing: boolean;
}) {
  const view = screen.kind === "ready" ? screen.view : null;
  return (
    <ProgrammeLinkFrame actions={<CatchBadge label={programmeLinkCopy.viewOnly} />} branding={view?.branding}
      refresh={refresh} refreshing={refreshing} screen={screen} title={view?.programTitle ?? null}>
      {(family) => {
        const zone = family.timezone || undefined;
        const waiting = Math.max(family.householdCount - family.householdsRepliedCount, 0);
        const dates = copy.dates(programmeDay(family.startsAtMillis, zone), programmeDay(family.endsAtMillis, zone));
        return (
          <>
            <CatchText tone="secondary" variant="label-action">{copy.sharedBy}</CatchText>
            <CatchSurface block="spotlight" color={programmeFormat(family.branding)}>
              <CatchStack gap={8}>
                <CatchText variant="label-kicker">{copy.kicker(dates, programmeDaysToGo(family.serverTimeMillis, family.startsAtMillis, zone))}</CatchText>
                <CatchText as="h1" variant="display-lg">{family.programTitle}</CatchText>
                <CatchText variant="body">{copy.updated(programmeTime(family.serverTimeMillis, zone))}</CatchText>
              </CatchStack>
            </CatchSurface>
            <CatchStack direction="row" equal gap={12}>
              <CatchMetricTile label={copy.guests} note={copy.guestsNote(family.householdCount)} value={family.guestCount} />
              <CatchMetricTile label={copy.replied} note={copy.repliedNote(waiting)}
                noteTone={waiting === 0 ? "success" : "secondary"} value={family.householdsRepliedCount} />
            </CatchStack>
            <CatchSection empty={copy.noFunctions} title={copy.coming}>
              {family.functions.map((fn) => (
                <CatchIndexRow density="compact" key={fn.functionId}
                  progress={fn.invitedCount === 0 ? undefined :
                    {value: fn.rsvpAttending, max: fn.invitedCount, label: copy.comingProgress(fn.name, fn.rsvpAttending, fn.invitedCount)}}
                  subtitle={copy.comingLine(programmeDayTime(fn.startsAtMillis, zone), fn.venueName)}
                  title={fn.name} value={String(fn.rsvpAttending)} />
              ))}
            </CatchSection>
            {family.functions.length > 0 ? (
              <CatchSurface block="tile">
                <CatchStack gap={8}>
                  <CatchText as="h2" variant="title-row">{copy.caterer}</CatchText>
                  <CatchStack direction="row" gap={6} wrap>
                    {family.functions.map((fn) => (
                      <CatchChip count={fn.expectedHeads} key={fn.functionId} kind="tag" label={copy.heads(fn.name)} size="sm" />
                    ))}
                  </CatchStack>
                </CatchStack>
              </CatchSurface>
            ) : null}
            <CatchSection dividers="none" title={copy.waiting}>
              <CatchText variant="body">{copy.waitingLine(waiting)}</CatchText>
              <CatchText tone="secondary" variant="body-small">{copy.numbersOnly}</CatchText>
            </CatchSection>
          </>
        );
      }}
    </ProgrammeLinkFrame>
  );
}
