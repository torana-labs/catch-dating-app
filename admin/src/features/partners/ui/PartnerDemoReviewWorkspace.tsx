import {CatchText, CatchField} from "@catch/web-ui";
import {ClipboardList} from "lucide-react";
import {useEffect, useState} from "react";
import {AdminButton, AdminForm, CheckboxField, EmptyState, Panel, StateRow} from "../../../shared/ui/AdminPrimitives";
import {useAdminOperationPending} from "../../../shared/pendingOperation";
import {usePartnerDemoReviewController} from "../controllers/usePartnerDemoReviewController";
import type {PartnerDemoReviewApi} from "../api/partnerDemoReview";
import type {PartnerDemoReviewRow, DemoReviewWording} from "../../../shared/domain/salesDemoReview";
export function PartnerDemoReviewWorkspace(props: {actorUid: string; organizerId: string; assignmentRevision: number;
  accessExpiresAt: string; isCurrentSession: () => boolean; parentAccessCurrent?: boolean;
  onRecoveryChange?: (scope: string, unresolved: boolean) => void; api?: PartnerDemoReviewApi}) {
  return <ReviewBody key={`${props.actorUid}:${props.organizerId}:${props.assignmentRevision}`} {...props} />;
}
function ReviewBody(props: Parameters<typeof PartnerDemoReviewWorkspace>[0]) {
  const c = usePartnerDemoReviewController(props); const operationPending = useAdminOperationPending();
  const recoveryScope = `demo:${props.actorUid}:${props.organizerId}:${props.assignmentRevision}`;
  useEffect(() => {props.onRecoveryChange?.(recoveryScope, Boolean(c.ticket));}, [c.ticket, props.onRecoveryChange, recoveryScope]);
  useEffect(() => () => {props.onRecoveryChange?.(recoveryScope, false);}, [props.onRecoveryChange, recoveryScope]);
  const visible = props.parentAccessCurrent !== false;
  const retained = props.isCurrentSession() && c.query.data?.organizerId === props.organizerId &&
    c.query.data.assignmentRevision === props.assignmentRevision ? c.query.data : null;
  return <>{visible && <Panel title="Private synthetic preview" icon={<ClipboardList />}>
    <CatchText as="p" variant="supporting">Review the sample and propose wording for Owner review. This review creates no invitation or organizer control.</CatchText>
    {c.error && <CatchText as="p" variant="supporting" role="alert">{c.error}</CatchText>}{c.notice && <CatchText as="p" variant="supporting" role="status">{c.notice}</CatchText>}
    <AdminButton disabled={operationPending || c.busy} onClick={() => void c.refresh()}>Refresh private previews</AdminButton>
    {c.ticket && <AdminButton disabled={operationPending || c.busy || !c.data} onClick={() => void c.retry()}>Retry unchanged preview proposal</AdminButton>}
    {!c.data || !c.data.rows.length ? <EmptyState>No current preview has been separately shared with you.</EmptyState> : null}
  </Panel>}
    {retained?.rows.map((row) => <PreviewEditor key={`${row.blueprintId}:${row.previewHash}:${row.proposalRevision}`} row={row}
      visible={visible && !!c.data} disabled={operationPending || c.busy || !!c.ticket} propose={c.propose} />)}
  </>;
}
function PreviewEditor({row, visible, disabled, propose}: {row: PartnerDemoReviewRow; visible: boolean; disabled: boolean;
  propose: (row: PartnerDemoReviewRow, wording: DemoReviewWording) => Promise<boolean>}) {
  const [wording, setWording] = useState<DemoReviewWording>(row.proposedWording ?? {headline: row.preview.headline, scenario: row.preview.scenario, cta: row.preview.cta});
  const [reviewed, setReviewed] = useState(false);
  const edit = (patch: Partial<DemoReviewWording>) => {setWording((v) => ({...v, ...patch})); setReviewed(false);};
  const valid = Object.values(wording).every((v) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= 160 && !/[<>\u0000-\u001f]/u.test(v));
  if (!visible) return null;
  return <Panel title="Review shared composition" icon={<ClipboardList />}><AdminForm onSubmit={(e) => {e.preventDefault(); if (reviewed && valid && !disabled) void propose(row, {
    headline: wording.headline.trim(), scenario: wording.scenario.trim(), cta: wording.cta.trim()});}}>
    <CatchText as="h3" variant="sectionTitle">{row.preview.brandName}</CatchText><StateRow label="Approved headline" value={row.preview.headline} />
    <CatchText as="p" variant="supporting">{row.preview.scenario}</CatchText><ol>{row.preview.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
    {row.preview.retainedTools.map((tool, i) => <CatchText as="p" variant="supporting" key={i}>Keep: {tool}</CatchText>)}
    {row.preview.limitations.map((limit, i) => <CatchText as="p" variant="supporting" key={i}>{limit}</CatchText>)}
    <CatchText as="p" variant="supporting">Approved call to action: {row.preview.cta}</CatchText><CatchText as="p" variant="supporting">Sample only. No guests, messages or admissions are real.</CatchText>
    {row.proposedWording && <CatchText as="p" variant="supporting" role="status">Your wording is awaiting Owner review. The approved preview remains above.</CatchText>}
    <CatchField
      recipe="input"
      title="Proposed headline"
      value={wording.headline}
      inputMode={disabled ? "inactive" : "editable"}
      onChanged={(headline) => edit({headline})}
    />
    <CatchField
      recipe="input"
      maxLines={2}
      title="Proposed scenario"
      value={wording.scenario}
      inputMode={disabled ? "inactive" : "editable"}
      onChanged={(scenario) => edit({scenario})}
    />
    <CatchField
      recipe="input"
      title="Proposed call to action"
      value={wording.cta}
      inputMode={disabled ? "inactive" : "editable"}
      onChanged={(cta) => edit({cta})}
    />
    <CheckboxField label="I reviewed the wording and kept the simulation limitations truthful" checked={reviewed} disabled={disabled} onChange={setReviewed} />
    <AdminButton type="submit" disabled={disabled || !reviewed || !valid}>Propose wording for Owner review</AdminButton>
  </AdminForm></Panel>;
}
