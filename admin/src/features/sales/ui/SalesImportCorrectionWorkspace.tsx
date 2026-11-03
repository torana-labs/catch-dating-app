import {
  CatchButton, CatchCheckboxInput, CatchEmptyState, CatchField, CatchGap, CatchIndexRow, CatchSection, CatchSheet, CatchText,
} from "@catch/web-ui";
import type {SalesImportCompensationInput} from "../api/salesTypes";
import {salesErrorMessage, selectChoices} from "../controllers/salesLabels";
import {salesCorrectionBlocker, type SalesImportGroup} from "../controllers/salesImports";
import {useSalesImportCorrectionController} from "../controllers/useSalesImportCorrectionController";

const reasonLimit = 2000;

/** Corrects one host from an import. The original import record and its source rows stay in place. */
export function SalesImportCorrectionWorkspace({applyCorrection, group, isSaving, onClose}: {
  applyCorrection: (input: SalesImportCompensationInput & {previewHash: string; reason: string}) => Promise<boolean>;
  group: SalesImportGroup;
  isSaving: boolean;
  onClose: () => void;
}) {
  const c = useSalesImportCorrectionController({group, applyCorrection});
  const plan = c.plan.data;
  const ready = c.canApply && c.reviewed && c.reason.trim().length > 0 && c.reason.trim().length <= reasonLimit;
  return (
    <CatchSheet recipe="standard" pinFooter open onClose={onClose} title="Correct an import" subtitle={group.name}
      footer={<CatchButton fullWidth label="Apply correction" onPressed={ready && !isSaving ? () => {
        void c.apply().then((saved) => { if (saved) onClose(); });
      } : null} />}>
      <CatchGap size="formField">
        <CatchText as="p" variant="supporting">
          Correct one host at a time. The original import record and its source rows stay in place.
        </CatchText>
        {c.hostsFailed ? <CatchEmptyState title="This import's hosts could not be loaded"
          actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={c.retryHosts} />} /> : null}
        {c.isLoadingHosts ? <CatchText as="p" variant="supporting" role="status">Loading this import's hosts…</CatchText> : null}
        {!c.isLoadingHosts && !c.hostsFailed && !c.hosts.length ? <CatchEmptyState title="This import added or updated no hosts" /> : null}
        {c.hosts.length ? <CatchField recipe="select" title="Host" value={c.selected}
          inputMode={isSaving ? "inactive" : "editable"} onChanged={(value) => c.setSelected(value ?? "")}
          {...selectChoices(c.hosts.map((host) => ({value: c.hostKey(host), label: host.name})))} /> : null}
        {c.plan.isFetching && !plan ? <CatchText as="p" variant="supporting" role="status">Planning the correction…</CatchText> : null}
        {c.plan.isError ? <CatchEmptyState title="The correction could not be planned" message={salesErrorMessage(c.plan.error)}
          actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={() => void c.plan.refetch()} />} /> : null}
        {plan?.alreadyCompensated ? <CatchText as="p" variant="supporting" role="status">
          This host is already corrected. Refresh their Sales record to see where it stands.</CatchText> : null}
        {plan?.mode === "archive_companion" && !plan.alreadyCompensated ? <CatchText as="p" variant="supporting">
          This archives the host's untouched private Sales record and holds outreach. The Catch organizer and the import's
          evidence remain.</CatchText> : null}
        {plan?.mode === "remove_cohorts" && !plan.alreadyCompensated ? <CatchText as="p" variant="supporting">
          Only the cohorts this import added will be removed: {plan.cohortIdsRemoved.join(", ")}. Later work on the host
          remains.</CatchText> : null}
        {plan?.blockers.length ? <CatchSection title="Can't be corrected" count={plan.blockers.length}>
          {plan.blockers.map((blocker) => <CatchIndexRow key={blocker} title={salesCorrectionBlocker(blocker)} titleVariant="bodyM" />)}
        </CatchSection> : null}
        {c.canApply ? <>
          <CatchField recipe="input" title="Reason for correction" maxLines={2} value={c.reason} onChanged={c.setReason}
            inputMode={isSaving ? "inactive" : "editable"} />
          {c.reason.trim().length > reasonLimit ? <CatchText as="p" variant="supporting" role="alert">
            Keep the reason under {reasonLimit} characters.</CatchText> : null}
          <CatchCheckboxInput label="I reviewed this plan" value={c.reviewed} onChanged={isSaving ? null : c.setReviewed} />
        </> : null}
      </CatchGap>
    </CatchSheet>
  );
}
