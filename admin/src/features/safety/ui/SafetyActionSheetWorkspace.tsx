import {
  CatchButton,
  CatchCheckboxInput,
  CatchChoiceTile,
  CatchField,
  CatchGap,
  CatchSheet,
  CatchText,
} from "@catch/web-ui";
import {
  ACTION_STEPS,
  actionButtonLabel,
  canTakeStep,
  durationLabel,
  type ActionDuration,
  type SafetyJob,
  type SafetyReason,
} from "../controllers/safetyActionSheet";
import type {SafetyActionSheetController} from
  "../controllers/useSafetyActionSheetController";

/**
 * Acting on an account (board AdminSafetyAction): the four steps, how long,
 * the rule broken, the message the person sees, whether the reporter hears
 * it was handled and whether they may appeal. Suspend and ban show as
 * owner-only for ops.
 */
export function SafetyActionSheetWorkspace({
  job,
  sheet,
  isSaving,
}: {
  job: SafetyJob;
  sheet: SafetyActionSheetController;
  isSaving: boolean;
}) {
  const {target, draft} = sheet;
  const step = ACTION_STEPS.find((item) => item.kind === draft.kind);
  const name = target?.displayName ?? target?.uid ?? "";
  return (
    <CatchSheet
      footer={
        <CatchButton
          label={isSaving ? "Saving" : actionButtonLabel(draft)}
          onPressed={isSaving ? null : () => void sheet.submit()}
          variant={draft.kind === "ban" || draft.kind === "suspend" ?
            "danger" : "primary"}
        />
      }
      onClose={sheet.close}
      open={target !== null}
      recipe="standard"
      subtitle={target?.caseTitle ? `Safety · ${target.caseTitle}` :
        "Safety"}
      title={`Act on ${name}`}
    >
      <CatchGap size="section">
        <CatchGap size="related">
          {ACTION_STEPS.map((item) => (
            <CatchChoiceTile
              key={item.kind}
              onTap={canTakeStep(job, item.kind) ?
                () => sheet.setKind(item.kind) : null}
              selected={draft.kind === item.kind}
              subtitle={item.ownerOnly ?
                `${item.subtitle} Owner only.` : item.subtitle}
              title={item.title}
            />
          ))}
        </CatchGap>
        {step && step.durations.length > 1 ? (
          <CatchField<ActionDuration>
            itemLabelBuilder={durationLabel}
            itemValueBuilder={(value) => String(value)}
            onChanged={(value) => sheet.setDuration(value ?? null)}
            recipe="select"
            title="For"
            value={draft.durationDays}
            values={step.durations}
          />
        ) : null}
        <CatchField<SafetyReason>
          itemLabelBuilder={(reason) => reason.label}
          itemValueBuilder={(reason) => reason.code}
          onChanged={(reason) => reason && sheet.setReason(reason.code)}
          recipe="select"
          title="Rule broken"
          value={sheet.reasons.find((reason) =>
            reason.code === draft.reasonCode) ?? null}
          values={sheet.reasons}
        />
        <CatchField
          helperText="Plain words. Never name who reported them."
          maxLength={1000}
          maxLines={5}
          onChanged={sheet.setMessage}
          recipe="input"
          title={`Message to ${name}`}
          value={draft.messageToUser}
        />
        <CatchField
          helperText="Only your team sees this."
          maxLength={1000}
          maxLines={3}
          onChanged={sheet.setNote}
          recipe="input"
          title="What you decided and why"
          value={draft.note}
        />
        {target?.caseTargetPath ? (
          <CatchCheckboxInput
            description="They are not told what we did."
            label="Tell the reporter it was handled"
            onChanged={sheet.setNotifyReporter}
            value={draft.notifyReporter}
          />
        ) : null}
        <CatchCheckboxInput
          description="Someone who did not decide this reviews it."
          label={`${name} can appeal once`}
          onChanged={sheet.setAppealable}
          value={draft.appealable}
        />
        {sheet.error ? (
          <CatchText as="p" color="danger" variant="bodyS">
            {sheet.error}
          </CatchText>
        ) : null}
      </CatchGap>
    </CatchSheet>
  );
}
