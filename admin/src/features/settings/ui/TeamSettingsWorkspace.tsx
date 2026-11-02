import {
  CatchButton,
  CatchChoiceTile,
  CatchField,
  CatchGap,
  CatchIndexRow,
  CatchSheet,
  CatchText,
  CatchWorkspaceHeader,
} from "@catch/web-ui";
import {useState} from "react";
import {jobOf, jobTitle, TEAM_JOBS} from "../controllers/teamJobs";
import type {TeamController} from "../controllers/useTeamController";

/**
 * Settings → Team and roles (board AdminSettingsTeam): who has an Admin job
 * and what each job can do. Change opens a sheet to pick the job with a
 * review note; Invite opens someone by their Catch user id.
 */
export function TeamSettingsWorkspace({
  onClosePerson,
  onOpenPerson,
  team,
}: {
  onClosePerson: () => void;
  onOpenPerson: (uid: string) => void;
  team: TeamController;
}) {
  const [inviteUid, setInviteUid] = useState("");
  const person = team.selected;
  const name = person?.displayName ?? person?.email ?? person?.targetUid ??
    "";
  return (
    <>
      <CatchWorkspaceHeader kicker="Settings" title="Team and roles" />
      <CatchGap size="section">
        <CatchGap size="related">
          <CatchText as="h2" variant="sectionTitle">
            {`People · ${team.members.length}`}
          </CatchText>
          {team.loadState === "loading" ? (
            <CatchText as="p" color="ink2" variant="bodyM">
              Loading the team
            </CatchText>
          ) : team.members.map((member) => (
            <CatchIndexRow
              key={member.targetUid}
              onTap={() => onOpenPerson(member.targetUid)}
              subtitle={[jobTitle(jobOf(member.roles)), member.email]
                .filter(Boolean).join(" · ")}
              title={member.displayName ?? member.email ?? member.targetUid}
              trailing={<CatchText as="span" color="ink2"
                variant="supporting">Change</CatchText>}
            />
          ))}
        </CatchGap>
        <CatchGap size="related">
          <CatchText as="h2" variant="sectionTitle">Invite someone</CatchText>
          <CatchField
            helperText="Their Catch user id. They sign in with their own phone."
            onChanged={setInviteUid}
            recipe="input"
            title="User id"
            value={inviteUid}
          />
          <CatchButton
            label="Choose their job"
            onPressed={inviteUid.trim() ?
              () => onOpenPerson(inviteUid.trim()) : null}
            size="sm"
            variant="secondary"
          />
        </CatchGap>
        <CatchGap size="related">
          <CatchText as="h2" variant="sectionTitle">
            What each role can do
          </CatchText>
          {TEAM_JOBS.filter((job) => job.job !== "none").map((job) => (
            <CatchIndexRow key={job.job} subtitle={job.subtitle}
              title={job.title} />
          ))}
        </CatchGap>
      </CatchGap>
      <CatchSheet
        footer={
          <CatchButton
            label={team.isSaving ? "Saving" : "Save role change"}
            onPressed={team.isSaving || team.validationIssue ? null :
              () => void team.save()}
          />
        }
        onClose={onClosePerson}
        open={team.selectedUid !== null}
        recipe="standard"
        subtitle={person?.email ?? team.selectedUid ?? undefined}
        title={person ? `${name}'s job` : "Loading"}
      >
        <CatchGap size="section">
          <CatchGap size="related">
            {TEAM_JOBS.map((job) => (
              <CatchChoiceTile
                key={job.job}
                onTap={person ? () => team.setJob(job.job) : null}
                selected={team.job === job.job}
                subtitle={job.subtitle}
                title={job.title}
              />
            ))}
          </CatchGap>
          <CatchField
            maxLength={1000}
            maxLines={3}
            onChanged={team.setNote}
            recipe="input"
            title="Review note"
            value={team.note}
          />
          {team.validationIssue && team.note ? (
            <CatchText as="p" color="danger" variant="bodyS">
              {team.validationIssue}
            </CatchText>
          ) : null}
        </CatchGap>
      </CatchSheet>
    </>
  );
}
