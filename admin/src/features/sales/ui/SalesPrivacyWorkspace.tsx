import {CatchButton, CatchCheckboxInput, CatchEmptyState, CatchField, CatchGap, CatchIndexRow, CatchSection, CatchText} from "@catch/web-ui";
import {useQuery} from "@tanstack/react-query";
import {useEffect, useRef, useState} from "react";
import {FilePickerButton} from "../../../shared/ui/AdminPrimitives";
import {dataMode} from "../../../shared/api/dataMode";
import {useAdminOperationPending} from "../../../shared/pendingOperation";
import {searchCanonicalOrganizers} from "../api/salesRepository";
import type {PrivacyApi, PrivacyBlocker} from "../api/salesPrivacyTypes";
import {useSalesPrivacyController} from
  "../controllers/useSalesPrivacyController";

function blockerLabel(code: string): string {
  const known: Record<string, string> = {
    external_exports_unverified: "External exports need separate review",
    upstream_intake_unverified: "Original intake records need separate review",
    product_forms_untouched: "Product organizer and Forms records stay untouched",
    assistant_shared_client_scope_unverified: "Shared assistant client scope needs separate review",
    assistant_budget_metadata_unverified: "Assistant usage metadata needs separate review",
    assistant_scope_retirement_required: "Assistant delegation needs separate retirement",
    mixed_assistant_scope: "Assistant delegation also covers another host",
    assistant_receipt_unattributed: "Assistant receipt cannot be safely assigned",
    mixed_organizers: "A record includes more than one host",
    unattributed_record: "A record has no reliable host identity",
    scan_overflow: "The bounded scan could not finish",
    inventory_overflow: "More records than one plan can safely review",
  };
  return known[code] ?? "A source needs separate identity or retention review";
}
function Blockers({rows}: {rows: PrivacyBlocker[]}) {
  const grouped = [...new Set(rows.map((row) => blockerLabel(row.code)))];
  return grouped.length ? <ul>{grouped.map((label) =>
    <li key={label}>{label}</li>)}</ul> : <CatchText as="p" variant="supporting">No unresolved sources in this inventory.</CatchText>;
}

/** An owner may mount this for a selected host or as a Settings lookup. */
export function renderSalesPrivacyWorkspace({actorUid, isAdminOwner,
  organizerId, organizerName, api}: {actorUid: string;
  isAdminOwner: boolean; organizerId?: string; organizerName?: string;
  api?: PrivacyApi}) {
  if (!isAdminOwner) return null;
  if (dataMode() === "sample") return <CatchEmptyState title="Private Sales privacy"
    message="This owner-only workflow requires live Admin records. Sample hosts cannot be restricted or processed." />;
  return <PrivacyEntry actorUid={actorUid} organizerId={organizerId}
    organizerName={organizerName} api={api} />;
}

function PrivacyEntry({actorUid, organizerId, organizerName, api}: {
  actorUid: string; organizerId?: string; organizerName?: string;
  api?: PrivacyApi}) {
  const [searchText, setSearchText] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState<{
    id: string; name: string} | null>(null);
  const [retryRequired, setRetryRequired] = useState(false);
  const operationPending = useAdminOperationPending();
  const selectionLocked = operationPending || retryRequired;
  const matches = useQuery({queryKey: ["sales-privacy-lookup", actorUid,
    submitted], queryFn: () => searchCanonicalOrganizers(submitted),
  enabled: !organizerId && submitted.length >= 2, retry: false});
  const id = organizerId ?? selected?.id;
  const name = organizerName ?? selected?.name ?? "this organizer";
  return <>
    {!organizerId ? <CatchSection title="Find a host privacy case" dividers="none">
      <CatchGap size="related">
        <CatchText as="p" variant="supporting">Search canonical organizers, including hosts no longer in the Sales
          directory. Choosing one only opens its private case.</CatchText>
        <CatchField recipe="input" title="Host name" value={searchText} onChanged={setSearchText} minLength={2} required
          inputMode={selectionLocked ? "inactive" : "editable"} />
        <CatchButton label="Search hosts" variant="secondary" size="sm"
          onPressed={selectionLocked || searchText.trim().length < 2 ? null : () => setSubmitted(searchText.trim())} />
        {matches.isPending && submitted ? <CatchText as="p" variant="supporting">Searching hosts…</CatchText> : null}
        {matches.isError ? <CatchEmptyState title="Host search failed"
          actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={() => void matches.refetch()} />} /> : null}
        {matches.data?.length === 0 ? <CatchEmptyState title="No matching hosts" /> : null}
        {matches.data?.map((row) => <CatchIndexRow key={row.organizerId} title={row.name} titleVariant="bodyM"
          {...(row.cityName ? {subtitle: row.cityName} : {})}
          trailing={<CatchButton label="Open" variant="secondary" size="sm"
            onPressed={selectionLocked ? null : () => setSelected({id: row.organizerId, name: row.name})} />} />)}
      </CatchGap>
    </CatchSection> : null}
    {id ? <OwnerPrivacyCase key={`${actorUid}:${id}`} actorUid={actorUid}
      organizerId={id} organizerName={name} api={api}
      onRetryRequired={setRetryRequired} /> : null}
  </>;
}

function OwnerPrivacyCase({actorUid, organizerId, organizerName, api,
  onRetryRequired}: {
  actorUid: string; organizerId: string; organizerName: string;
  api?: PrivacyApi; onRetryRequired?: (required: boolean) => void;
}) {
  const c = useSalesPrivacyController({actorUid, organizerId, api});
  useEffect(() => {
    onRetryRequired?.(Boolean(c.pending));
  }, [c.pending, onRetryRequired]);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [policyReference, setPolicyReference] = useState("");
  const [policyHash, setPolicyHash] = useState("");
  const [policyFile, setPolicyFile] = useState("");
  const [hashingBusy, setHashingBusy] = useState(false);
  const [financeReason, setFinanceReason] = useState("");
  const [auditReason, setAuditReason] = useState("");
  const [reviewedPlanKey, setReviewedPlanKey] = useState<string | null>(null);
  const [policyEditRevision, setPolicyEditRevision] = useState<number | null>(null);
  const fileSelectionEpoch = useRef(0);
  const referenceAutoFilled = useRef(true);
  const lastConfirmedPolicySaveId = useRef<string | null>(null);
  const ownerCase = c.caseQuery.data;
  const plan = ownerCase?.plan;
  const planKey = plan ? `${plan.planId}:${plan.cursor}` : "";
  const canEdit = !c.busy && !c.pending;
  function resetPolicyDraft(revision: number | null) {
    fileSelectionEpoch.current += 1;
    referenceAutoFilled.current = true;
    setHashingBusy(false);
    setPolicyReference(""); setPolicyHash(""); setPolicyFile("");
    setFinanceReason(""); setAuditReason("");
    setPolicyEditRevision(revision);
  }
  useEffect(() => () => {fileSelectionEpoch.current += 1;}, []);
  useEffect(() => {
    if (!c.confirmedPolicySaveId ||
        c.confirmedPolicySaveId === lastConfirmedPolicySaveId.current) return;
    lastConfirmedPolicySaveId.current = c.confirmedPolicySaveId;
    resetPolicyDraft(null);
  }, [c.confirmedPolicySaveId]);
  function touchPolicy() {
    if (policyEditRevision === null) {
      setPolicyEditRevision(ownerCase?.policy?.revision ?? 0);
    }
  }
  async function readPolicyFile(file: File | undefined) {
    if (!file) return;
    touchPolicy();
    const epoch = ++fileSelectionEpoch.current;
    setPolicyHash(""); setPolicyFile(""); setHashingBusy(true);
    try {
      const bytes = await file.arrayBuffer();
      if (epoch !== fileSelectionEpoch.current) return;
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      if (epoch !== fileSelectionEpoch.current) return;
      setPolicyHash([...new Uint8Array(digest)].map((n) =>
        n.toString(16).padStart(2, "0")).join(""));
      setPolicyFile(file.name);
      if (referenceAutoFilled.current) setPolicyReference(file.name);
    } catch {
      if (epoch === fileSelectionEpoch.current) {
        setPolicyFile("Could not read the selected file. Choose it again.");
      }
    } finally {
      if (epoch === fileSelectionEpoch.current) setHashingBusy(false);
    }
  }
  async function discardAndReviewCurrentPolicy() {
    if (!canEdit) return;
    const current = await c.reviewCurrentPolicy();
    if (current) resetPolicyDraft(current.revision);
  }
  function submitPolicy() {
    if (!policyHash || hashingBusy) return;
    void c.reviewPolicy({expectedRevision: policyEditRevision ??
      ownerCase?.policy?.revision ?? 0,
      sourceReference: policyReference.trim(), sourceHash: policyHash,
      financeReason: financeReason.trim(), auditReason: auditReason.trim()});
  }
  return <CatchSection title={`Private Sales privacy · ${organizerName}`} dividers="none">
    <CatchGap size="section">
      <CatchText as="p" variant="supporting">This workflow restricts private Sales processing and reviews an internal
        cleanup. It does not delete product organizers, Forms, finance evidence,
        audit records, external exports, or copies held by other systems.</CatchText>
      {c.caseQuery.isPending ? <CatchText as="p" variant="supporting">Loading the current privacy case…</CatchText> : null}
      {c.caseQuery.isError ? <CatchEmptyState title="The current case could not be loaded"
        actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={() => void c.caseQuery.refetch()} />} /> : null}
      {c.error ? <CatchText as="p" variant="supporting" role="alert">{c.error}</CatchText> : null}
      {c.notice ? <CatchText as="p" variant="supporting" role="status">{c.notice}</CatchText> : null}
      {c.pending ? <CatchGap size="inline">
        <CatchText as="p" variant="bodyM" role="alert">Outcome unconfirmed.</CatchText>
        <CatchButton label="Retry the same request" variant="secondary" size="sm" onPressed={c.busy ? null : () => void c.retryPending()} />
      </CatchGap> : null}
      {ownerCase && !ownerCase.restricted ? <CatchSection title="1. Restrict private Sales processing" dividers="none">
        <CatchGap size="related">
          <CatchText as="p" variant="supporting">This permanent Sales restriction blocks private Sales reads and writes,
            including retries of older requests. It does not alter the public
            organizer or ownership claim.</CatchText>
          <CatchField recipe="input" title="Reason for restriction" maxLines={3} value={reason} onChanged={setReason} required maxLength={500}
            inputMode={!canEdit ? "inactive" : "editable"} />
          <CatchField recipe="input" title={`Type “${organizerName}” to confirm`} value={confirm} onChanged={setConfirm} required
            inputMode={!canEdit ? "inactive" : "editable"} />
          <CatchButton label="Restrict private Sales processing"
            onPressed={!canEdit || confirm !== organizerName || !reason.trim() ? null : () => void c.restrict(reason.trim())} />
        </CatchGap>
      </CatchSection> : null}
      {ownerCase?.restricted ? <CatchText as="p" variant="supporting" role="status">Private Sales processing is
        restricted. Current state: {ownerCase.restriction?.status ===
          "internal_processed_with_unresolved" ?
          "Internal cleanup processed; unresolved sources remain" :
          ownerCase.restriction?.status === "processing" ?
            "Cleanup in progress" : "Restricted"}.</CatchText> : null}
      {ownerCase?.restricted ? <>
        <CatchSection title="2. Review retention decision" dividers="none">
          <CatchGap size="related">
            {ownerCase.policy ? <CatchText as="p" variant="supporting">Current reviewed policy: {ownerCase.policy.sourceReference}
              {" · "}revision {ownerCase.policy.revision}. Finance and audit records
              remain held for separate review.</CatchText> : <CatchText as="p" variant="supporting">No reviewed retention policy is
              recorded. Inventory planning is blocked until an Admin owner reviews one.</CatchText>}
            {c.policyConflict ? <CatchText as="p" variant="supporting" role="alert">Another owner changed the retention
              decision. Your draft is still here but cannot be submitted against the
              new version. Discard it and review the current policy before editing.</CatchText> : null}
            {(policyEditRevision !== null || c.policyConflict) ? <CatchButton label="Discard draft and review current policy" variant="secondary" size="sm"
              onPressed={!canEdit || c.caseQuery.isFetching ? null : () => void discardAndReviewCurrentPolicy()} /> : null}
            <CatchField recipe="input" title="Reviewed policy reference" value={policyReference}
              onChanged={(value) => {
                touchPolicy(); referenceAutoFilled.current = !value.trim();
                setPolicyReference(value);
              }}
              required maxLength={240} inputMode={!canEdit ? "inactive" : "editable"} />
            <FilePickerButton inputLabel="Choose reviewed policy file" disabled={!canEdit}
              onChange={(event) => void readPolicyFile(event.target.files?.[0])}>
              Choose reviewed policy file
            </FilePickerButton>
            <CatchText as="p" variant="supporting">{hashingBusy ? "Reading the selected policy file locally…" :
              policyFile ? `${policyFile} · SHA-256 checked locally; file not uploaded.` :
              "Choose the exact reviewed policy file. Only its fingerprint is saved."}</CatchText>
            <CatchField recipe="input" title="Why finance records remain held for review" maxLines={2} value={financeReason}
              onChanged={(value) => {touchPolicy(); setFinanceReason(value);}}
              required maxLength={500} inputMode={!canEdit ? "inactive" : "editable"} />
            <CatchField recipe="input" title="Why audit records remain held for review" maxLines={2} value={auditReason}
              onChanged={(value) => {touchPolicy(); setAuditReason(value);}}
              required maxLength={500} inputMode={!canEdit ? "inactive" : "editable"} />
            <CatchButton label="Save reviewed retention decision" variant="secondary" size="sm"
              onPressed={!canEdit || hashingBusy || c.policyConflict || !policyHash || !policyReference.trim() || !financeReason.trim() ||
                !auditReason.trim() ? null : submitPolicy} />
          </CatchGap>
        </CatchSection>
        <CatchSection title="3. Review exact private inventory" dividers="none">
          <CatchGap size="related">
            <CatchButton label={c.previewBusy ? "Reviewing inventory…" : "Preview internal cleanup"} variant="secondary" size="sm"
              onPressed={!canEdit || !ownerCase.policy || c.previewBusy ? null : () => void c.loadPreview()} />
            {c.preview ? <>
              <CatchText as="p" variant="supporting" role="status">This preview found {c.preview.counts.deletable}
                {" "}private records eligible for internal cleanup,
                {" "}{c.preview.counts.retained} records held for separate review,
                and {c.preview.counts.unresolved} unresolved sources.</CatchText>
              <Blockers rows={c.preview.blockers} />
              {c.preview.overflow ? <CatchText as="p" variant="supporting" role="alert">The inventory exceeded its safe
                bound. No plan can be approved from this preview.</CatchText> :
                plan?.inventoryHash === c.preview.inventoryHash &&
                plan.policyHash === c.preview.policyHash ?
                  <CatchText as="p" variant="supporting" role="status">The current reviewed plan matches this inventory.
                    Continue from its saved batch position.</CatchText> :
                <CatchButton label={plan ? "Replace stale plan with this reviewed inventory" : "Review this exact plan"} variant="secondary" size="sm"
                  onPressed={!canEdit || c.preview.counts.deletable + c.preview.counts.retained === 0 ? null : () => {
                    setReviewedPlanKey(null); void c.reviewPlan();
                  }} />}
            </> : null}
          </CatchGap>
        </CatchSection>
        {plan ? <CatchSection title="4. Apply reviewed plan in small batches" dividers="none">
          <CatchGap size="related">
            <CatchText as="p" variant="supporting">{plan.cursor} of {plan.itemCount} internal records processed.
              {" "}{plan.retainedCount} are held, and {plan.unresolvedCount} sources
              need separate review. No complete-erasure claim is made.</CatchText>
            <Blockers rows={plan.blockers} />
            {plan.cursor < plan.itemCount ? <>
              <CatchCheckboxInput value={reviewedPlanKey === planKey}
                onChanged={canEdit ? (checked) => setReviewedPlanKey(checked ? planKey : null) : null}
                label="I reviewed this plan and understand retained and unverified copies remain." />
              <CatchButton label="Apply next batch of up to 20 records"
                onPressed={!canEdit || reviewedPlanKey !== planKey ? null : () => {setReviewedPlanKey(null); void c.applyBatch();}} />
            </> : <CatchText as="p" variant="supporting" role="status">Internal cleanup batches finished. Finance,
              audit, assistant scope, and external copies still need separate review.</CatchText>}
          </CatchGap>
        </CatchSection> : null}
      </> : null}
    </CatchGap>
  </CatchSection>;
}
