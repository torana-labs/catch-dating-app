// Slightly above the family target because the generic decision footer shares the review form-state types.
import type {InputHTMLAttributes, ReactNode} from "react";
import {
  CatchAdminIntakeDecisionActions,
  CatchAdminIntakeDecisionState,
  CatchField,
  CheckboxControl,
} from "@catch/web-ui";
import {CheckCircle2, FileWarning} from "lucide-react";

import {
  classNames,
  type ReviewDecisionHandler,
  type ReviewDecisionResponse,
  type PanelProps,
} from "./shared";

import {AlertRow, Panel} from "./data";
import {AdminDecisionFooterShell} from "./intake";
import {AdminButton} from "./overview";

export {selectOptions} from "./shared";

export {StateRow} from "./data";

export function AdminEditorPanel({
  className = "",
  ...props
}: PanelProps) {
  return (
    <Panel
      {...props}
      className={classNames("publishing-editor-panel", className)}
    />
  );
}

export function AdminStateRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="state-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function CheckboxField({
  checked,
  className = "check-row",
  label,
  onChange,
  ...props
}: {
  checked: boolean;
  className?: string;
  label: ReactNode;
  onChange: (checked: boolean) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "checked" | "className" | "onChange" | "type">) {
  return (
    <label className={className}>
      <CheckboxControl
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

export function AdminOrganizerIntakeCheckboxField({
  className = "",
  ...props
}: Parameters<typeof CheckboxField>[0]) {
  return (
    <CheckboxField
      {...props}
      className={classNames("intake-checkbox-row", className)}
    />
  );
}

export function DecisionFooter<TTargetType extends string = string>({
  approvalDisabledReason,
  compact = false,
  defaultNote,
  edits,
  inFlight,
  localDecision,
  note,
  showExportReady = false,
  targetId,
  targetType,
  onDecision,
  onNoteChange,
}: {
  approvalDisabledReason?: string;
  compact?: boolean;
  defaultNote: string;
  edits: Record<string, unknown>;
  inFlight?: boolean;
  localDecision?: ReviewDecisionResponse;
  note: string;
  showExportReady?: boolean;
  targetId: string;
  targetType: TTargetType;
  onDecision: (
    input: Omit<Parameters<ReviewDecisionHandler>[0], "targetType"> & {
      targetType: TTargetType;
    }
  ) => Promise<unknown>;
  onNoteChange: (value: string) => void;
}) {
  const approveDisabled = Boolean(inFlight || approvalDisabledReason);
  return (
    <AdminDecisionFooterShell compact={compact}>
      {localDecision ? (
        <CatchAdminIntakeDecisionState>
          <CheckCircle2 size={16} strokeWidth={1.9} />
          <div>
            <strong>{localDecision.decisionStatus.replaceAll("_", " ")}</strong>
            <span>{localDecision.decisionPath}</span>
          </div>
        </CatchAdminIntakeDecisionState>
      ) : (
        <>
          <CatchField
            recipe="input"
            title="Review note"
            maxLines={compact ? 2 : 3}
            value={note}
            onChanged={onNoteChange}
          />
          <CatchAdminIntakeDecisionActions>
            <AdminButton
              disabled={approveDisabled}
              onClick={() => onDecision({
                targetType,
                targetId,
                decision: "approve",
                edits,
                defaultNote,
              })}
              variant="primary"
            >
              {inFlight ? "Saving" : "Approve"}
            </AdminButton>
            <AdminButton
              disabled={inFlight}
              onClick={() => onDecision({
                targetType,
                targetId,
                decision: "needs_changes",
                edits,
                defaultNote,
              })}
            >
              Needs changes
            </AdminButton>
            <AdminButton
              disabled={inFlight}
              onClick={() => onDecision({
                targetType,
                targetId,
                decision: "hold",
                edits,
                defaultNote,
              })}
            >
              Hold
            </AdminButton>
            <AdminButton
              disabled={inFlight}
              onClick={() => onDecision({
                targetType,
                targetId,
                decision: "reject",
                edits,
                defaultNote,
              })}
            >
              Reject
            </AdminButton>
            {showExportReady ? (
              <AdminButton
                disabled={approveDisabled}
                onClick={() => onDecision({
                  targetType,
                  targetId,
                  decision: "export_ready",
                  edits,
                  defaultNote,
                })}
              >
                Export ready
              </AdminButton>
            ) : null}
          </CatchAdminIntakeDecisionActions>
          {approvalDisabledReason ? (
            <AlertRow
              icon={<FileWarning size={16} strokeWidth={1.9} />}
              title="Approval blocked"
              tone="warning"
            >
              {approvalDisabledReason}
            </AlertRow>
          ) : null}
        </>
      )}
    </AdminDecisionFooterShell>
  );
}
