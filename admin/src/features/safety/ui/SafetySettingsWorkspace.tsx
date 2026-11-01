import {
  CatchButton,
  CatchCheckboxInput,
  CatchGap,
  CatchIndexRow,
  CatchText,
  CatchWorkspaceHeader,
} from "@catch/web-ui";
import {useState} from "react";
import type {SafetySettingsUpdate} from "../api/accountSafetyRepository";
import {ACTION_STEPS} from "../controllers/safetyActionSheet";
import type {SafetySettingsController} from
  "../controllers/useSafetySettingsController";

function Row({title, value, subtitle}: {title: string; value: string;
  subtitle?: string}) {
  return (
    <CatchIndexRow subtitle={subtitle} title={title} titleVariant="supporting"
      trailing={<CatchText as="span" variant="supportingStrong">{value}
      </CatchText>} />
  );
}

function Section({title, children}: {title: string;
  children: React.ReactNode}) {
  return (
    <CatchGap size="related">
      <CatchText as="h2" variant="sectionTitle">{title}</CatchText>
      {children}
    </CatchGap>
  );
}

/**
 * Settings → Safety (board AdminSettingsSafety): the steps and who may take
 * them, the rules, the deadlines the queue counts down to, the report
 * reasons, the grievance officer and how long records are kept. Only the
 * owner changes the rules and reasons.
 */
export function SafetySettingsWorkspace({
  settings,
}: {
  settings: SafetySettingsController;
}) {
  const snapshot = settings.snapshot;
  const [draft, setDraft] = useState<SafetySettingsUpdate | null>(null);
  if (!snapshot) {
    return (
      <>
        <CatchWorkspaceHeader kicker="Settings" title="Safety" />
        <CatchText as="p" color="ink2" variant="bodyM">
          {settings.loadState === "error" ? "Safety settings didn't load." :
            "Loading safety settings"}
        </CatchText>
      </>
    );
  }
  const current: SafetySettingsUpdate = draft ?? {
    reasons: snapshot.settings.reasons,
    restrictOnSevereReport: snapshot.settings.restrictOnSevereReport,
    organizerBlockLists: snapshot.settings.organizerBlockLists,
    organizerReports: snapshot.settings.organizerReports,
  };
  const edit = settings.canEdit ?
    (patch: Partial<SafetySettingsUpdate>) =>
      setDraft({...current, ...patch}) : null;
  const {deadlines, stepRoles} = snapshot;
  return (
    <>
      <CatchWorkspaceHeader
        actions={settings.canEdit ? (
          <CatchButton
            label={settings.isSaving ? "Saving" : "Save"}
            onPressed={draft && !settings.isSaving ? async () => {
              if (await settings.save(draft)) setDraft(null);
            } : null}
            size="sm"
          />
        ) : undefined}
        kicker="Settings"
        note={settings.canEdit ? undefined : "Only the owner changes these"}
        title="Safety"
      />
      <CatchGap size="section">
        <Section title="Steps, and who may take them">
          {ACTION_STEPS.map((step) => (
            <Row key={step.kind} subtitle={step.subtitle} title={step.title}
              value={stepRoles[step.kind] === "owner" ? "Owner" :
                "Ops or owner"} />
          ))}
          <CatchText as="p" color="ink2" variant="bodyS">
            Appeals go to whoever did not decide.
          </CatchText>
        </Section>
        <Section title="Rules">
          <CatchCheckboxInput
            description={"Assault, stalking, threats, intimate images, " +
              "anything involving a minor, fraud. The account is restricted " +
              "while someone reviews it."}
            label="Restrict at once on a severe report"
            onChanged={edit && ((value) =>
              edit({restrictOnSevereReport: value}))}
            value={current.restrictOnSevereReport}
          />
          <CatchCheckboxInput
            description={"They can stop someone booking their events " +
              "without a reason or a review. It affects no one else."}
            label="Organizers keep their own block list"
            onChanged={edit && ((value) =>
              edit({organizerBlockLists: value}))}
            value={current.organizerBlockLists}
          />
          <CatchCheckboxInput
            description="It lands in the Safety queue."
            label="Organizers and their team can report guests"
            onChanged={edit && ((value) => edit({organizerReports: value}))}
            value={current.organizerReports}
          />
        </Section>
        <Section title="Deadlines">
          <Row subtitle="An automatic reply the moment a report arrives"
            title="Acknowledge" value="At once" />
          <Row title="First look"
            value={`Within ${deadlines.firstLookHours} hours`} />
          <Row title="Resolve" value={`Within ${deadlines.resolveDays} days`} />
          <Row subtitle="Taken down" title="Intimate images"
            value={`Within ${deadlines.takedownHours} hours`} />
        </Section>
        <Section title="Report reasons">
          {current.reasons.map((reason, index) => (
            <CatchCheckboxInput
              description={[reason.severe ? "Severe" : "Standard",
                reason.takedown ? "taken down within 24 hours" : null]
                .filter(Boolean).join(" · ")}
              key={reason.code}
              label={reason.label}
              onChanged={edit && ((value) => edit({reasons:
                current.reasons.map((item, at) => at === index ?
                  {...item, active: value} : item)}))}
              value={reason.active}
            />
          ))}
        </Section>
        <Section title="Grievance officer">
          <Row subtitle="grievance@ · on the website and in the app's terms"
            title="The owner" value="Named in the terms" />
        </Section>
        <Section title="Records">
          <Row title="Case records after an account is deleted"
            value={`${snapshot.retentionDaysAfterDeletion} days`} />
        </Section>
        <CatchText as="p" color="attentionText" variant="bodyS">
          The deadlines and the grievance wording follow our reading of
          India&apos;s IT Rules; a lawyer confirms them before launch.
        </CatchText>
      </CatchGap>
    </>
  );
}
