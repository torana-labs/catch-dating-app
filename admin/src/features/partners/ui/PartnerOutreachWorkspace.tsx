import {CatchText, CatchField} from "@catch/web-ui";
import {AlertCircle, ClipboardList} from "lucide-react";
import {useEffect, useState} from "react";
import {
  AdminButton,
  AdminForm,
  CheckboxField,
  EmptyState,
  Panel,
  selectOptions,
  StateRow,
  StatusBanner,
} from "../../../shared/ui/AdminPrimitives";
import {useAdminOperationPending} from "../../../shared/pendingOperation";
import {usePartnerOutreachController} from "../controllers/usePartnerOutreachController";
import type {PartnerOutreachApi} from "../api/partnerOutreachTypes";

export function PartnerOutreachWorkspace(props: {actorUid: string; organizerId: string;
  assignmentRevision: number; accessExpiresAt: string; channel: string | null;
  isCurrentSession: () => boolean; parentAccessCurrent?: boolean; onRecoveryChange?: (scope: string, unresolved: boolean) => void; api?: PartnerOutreachApi}) {
  return <OutreachBody key={`${props.actorUid}:${props.organizerId}:${props.assignmentRevision}`} {...props} />;
}
function OutreachBody(props: Parameters<typeof PartnerOutreachWorkspace>[0]) {
  const c = usePartnerOutreachController(props);
  const recoveryScope = `${props.actorUid}:${props.organizerId}:${props.assignmentRevision}`;
  useEffect(() => {props.onRecoveryChange?.(recoveryScope, Boolean(c.ticket));},
    [c.ticket, props.onRecoveryChange, recoveryScope]);
  useEffect(() => () => {props.onRecoveryChange?.(recoveryScope, false);},
    [props.onRecoveryChange, recoveryScope]);
  const operationPending = useAdminOperationPending();
  const [contactId, setContactId] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [reviewedHash, setReviewedHash] = useState<string | null>(null);
  const [sentHash, setSentHash] = useState<string | null>(null);
  const [occurredAt, setOccurredAt] = useState("");
  const prepared = c.prepared;
  const draft = c.currentDraft;
  const reviewKey = draft ? `${draft.draftId}:${draft.draft.contentHash}` : null;
  const pending = operationPending || c.busy;
  const blocked = pending || !!c.ticket;
  const selections = prepared?.clauses.filter((row) => chosen[row.clauseId] === row.revision) ?? [];
  const ids = (kind: "observation" | "capability" | "reference" | "cta") =>
    selections.filter((row) => row.kind === kind).map((row) => row.clauseId);
  const channel = props.channel === "email" ? "email" : "message";
  const canGenerate = prepared?.researchStatus === "qualified" && prepared.contacts.some((row) => row.contactId === contactId) &&
    prepared.opportunities.some((row) => row.opportunityId === opportunityId) &&
    ["email", "whatsapp", "other"].includes(props.channel ?? "") &&
    ids("observation").length > 0 && ids("capability").length > 0 && ids("cta").length > 0 &&
    ids("observation").length <= 12 && ids("capability").length <= 12 &&
    ids("reference").length <= 8 && ids("cta").length <= 8;
  if (props.parentAccessCurrent === false) return null;
  return <Panel icon={<ClipboardList />} title="Private preparation and manual outreach">
    {c.error && <StatusBanner tone="error" icon={<AlertCircle />}>{c.error}</StatusBanner>}
    {c.notice && <CatchText as="p" variant="supporting" role="status">{c.notice}</CatchText>}
    <AdminButton disabled={pending} onClick={() => void c.refresh()}>Refresh preparation and access</AdminButton>
    {c.ticket && <AdminButton disabled={pending || !prepared} onClick={() => void c.retry()}>Retry unchanged outreach action</AdminButton>}
    {!prepared ? <EmptyState>Current preparation is unavailable. Refresh this lead to check access and source freshness.</EmptyState> : <>
      <StateRow label="Research status" value={prepared.researchStatus.replaceAll("_", " ")} />
      <CatchText as="p" variant="supporting">Choose reviewed wording and confirm its facts before using it. Source details appear only when separately approved for partner sharing.</CatchText>
      <AdminForm onSubmit={(event) => {event.preventDefault(); if (!canGenerate) return;
        void c.generate({organizerId: props.organizerId, contactId, opportunityId,
          observationIds: ids("observation"), capabilityIds: ids("capability"),
          referenceIds: ids("reference"), ctaIds: ids("cta"), channel, purpose: "first_message"});
      }}>
        <CatchField
          recipe="select"
          title="Current contact"
          value={contactId}
          onChanged={(value) => setContactId(value ?? "")}
          inputMode={blocked ? "inactive" : "editable"}
          {...selectOptions([{value: "", label: "Choose a contact"}, ...prepared.contacts.map((row) =>
            ({value: row.contactId, label: `${row.displayName} · ${row.role}`}))])}
        />
        <CatchField
          recipe="select"
          title="Opportunity"
          value={opportunityId}
          onChanged={(value) => setOpportunityId(value ?? "")}
          inputMode={blocked ? "inactive" : "editable"}
          {...selectOptions([{value: "", label: "Choose an opportunity"}, ...prepared.opportunities.map((row) =>
            ({value: row.opportunityId, label: `${row.motion} · ${row.stage.replaceAll("_", " ")}`}))])}
        />
        {prepared.clauses.map((row) => <div key={`${row.clauseId}:${row.revision}`}>
          <CheckboxField label={`${row.kind}: ${row.text}`} checked={chosen[row.clauseId] === row.revision}
            disabled={blocked} onChange={(checked) => setChosen((old) => ({...old, [row.clauseId]: checked ? row.revision : 0}))} />
          {row.evidence.map((source) => <div key={source.evidenceId}>
            <StateRow label="Approved source" value={source.sourceRef} />
            <StateRow label="Observed" value={`${new Date(source.observedAt).toLocaleDateString()} · ${source.confidence} confidence`} />
            {source.excerpt && <CatchText as="p" variant="supporting">{source.excerpt}</CatchText>}
          </div>)}
        </div>)}
        <AdminButton type="submit" variant="primary" disabled={blocked || !canGenerate}>Prepare draft from selected wording</AdminButton>
      </AdminForm>
      {draft && <>
        {draft.draft.subject && <CatchField
          recipe="input"
          title="Reviewed draft subject"
          value={draft.draft.subject}
          onChanged={() => {}}
          inputMode="readOnly"
        />}
        <CatchField
          recipe="input"
          title="Exact draft wording"
          value={draft.draft.text}
          onChanged={() => {}}
          maxLines={8}
          inputMode="readOnly"
        />
        <CatchText as="p" variant="supporting">Select different approved wording to prepare another draft.</CatchText>
        {draft.status === "pending_review" && <>
          <CheckboxField label="I verified these facts, the tone and my established contact channel."
            checked={reviewedHash === reviewKey} disabled={blocked}
            onChange={(checked) => setReviewedHash(checked ? reviewKey : null)} />
          <AdminButton disabled={blocked || reviewedHash !== reviewKey} onClick={() => void c.review()}>Confirm exact composition review</AdminButton>
        </>}
        {draft.status === "approved" && <>
          <AdminButton disabled={blocked} onClick={() => void c.copy()}>Prepare exact wording for manual copy</AdminButton>
          <CatchText as="p" variant="supporting">Copy the reviewed text above into your established contact channel and send it yourself.</CatchText>
          <AdminForm onSubmit={(event) => {event.preventDefault();
            if (sentHash !== reviewKey || !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/u.test(occurredAt)) return;
            const date = new Date(`${occurredAt}:00.000Z`);
            if (!Number.isFinite(date.getTime()) || !["email", "whatsapp", "other"].includes(props.channel ?? "")) return;
            void c.record(props.channel as "email" | "whatsapp" | "other", date.toISOString());
          }}>
            <CatchField
              recipe="input"
              title="When you manually sent it (UTC)"
              value={occurredAt}
              onChanged={setOccurredAt}
              inputMode={blocked ? "inactive" : "editable"}
              keyboardType="datetime"
            />
            <CheckboxField label="I manually sent this exact reviewed draft."
              checked={sentHash === reviewKey} disabled={blocked}
              onChange={(checked) => setSentHash(checked ? reviewKey : null)} />
            <AdminButton type="submit" disabled={blocked || sentHash !== reviewKey || !occurredAt}>Record my manual-send attestation</AdminButton>
          </AdminForm>
        </>}
      </>}
    </>}
  </Panel>;
}
