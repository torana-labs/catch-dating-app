import {CatchText, CatchField} from "@catch/web-ui";
import {useEffect, useLayoutEffect, useRef, useState} from "react";
import {ClipboardList, Sparkles} from "lucide-react";
import {
  AdminButton,
  AdminEditorSection,
  AdminForm,
  CheckboxField,
  EmptyState,
  Panel,
  selectOptions,
  StateRow,
} from "../../../shared/ui/AdminPrimitives";
import type {ApprovedClause, IntelligenceApi,
  IntelligenceFactor, IntelligencePolicy,
  EvidenceClaim} from "../api/salesIntelligenceTypes";
import {useSalesIntelligenceController} from
  "../controllers/useSalesIntelligenceController";
import {salesOutreachCompositionReview} from
  "./SalesOutreachCompositionReview";

type Controller = ReturnType<typeof useSalesIntelligenceController>;
function label(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/gu,
    (letter) => letter.toUpperCase());
}
function date(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Date unavailable" :
    parsed.toLocaleDateString(undefined, {day: "numeric", month: "short",
      year: "numeric"});
}
function QueryProblem({message, retry}: {message: string; retry: () => void}) {
  return <p role="alert">{message} <AdminButton onClick={retry}>Try again</AdminButton></p>;
}

const claimOptions: Array<{value: EvidenceClaim; label: string}> = [
  {value: "identity", label: "Identity"},
  {value: "recurrence", label: "Repeat activity"},
  {value: "operation", label: "Current operations"},
  {value: "stack", label: "Current tools"},
  {value: "other", label: "Other reviewed evidence"},
];
type PolicyForm = {status: IntelligencePolicy["status"];
  high: string; medium: string; factors: Array<{
    name: string; weight: string; maxAgeDays: string;
    claimKeys: EvidenceClaim[]}>};
function blankPolicyForm(): PolicyForm {
  return {status: "paused", high: "", medium: "",
    factors: Array.from({length: 7}, () => ({name: "", weight: "",
      maxAgeDays: "", claimKeys: []}))};
}
function formFromPolicy(policy: IntelligencePolicy): PolicyForm {
  return {status: policy.status, high: String(policy.priorityBands.high),
    medium: String(policy.priorityBands.medium), factors: policy.factors.map(
      (factor) => ({name: label(factor.id), weight: String(factor.weight),
        maxAgeDays: String(factor.maxAgeDays), claimKeys: [...factor.claimKeys]}))};
}
function factorId(name: string): string {
  return name.normalize("NFKD").replace(/[^A-Za-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "").toLowerCase().slice(0, 96);
}
function resolvedFactorId(name: string, originalId?: string): string {
  return originalId && name === label(originalId) ? originalId : factorId(name);
}
function policyFromForm(form: PolicyForm, existing: IntelligencePolicy | null,
  newPolicyId: string, expectedRevision: number): Omit<IntelligencePolicy,
    "revision"> | null {
  const factors = form.factors.map((row, index) => ({id: resolvedFactorId(
    row.name, existing?.factors[index]?.id),
    weight: Number(row.weight), maxAgeDays: Number(row.maxAgeDays),
    claimKeys: [...row.claimKeys]}));
  const high = Number(form.high); const medium = Number(form.medium);
  if (factors.length !== 7 ||
      new Set(factors.map((row) => row.id)).size !== 7 ||
      factors.some((row) => !row.id || !Number.isInteger(row.weight) ||
        row.weight < 1 || row.weight > 100 ||
        !Number.isInteger(row.maxAgeDays) || row.maxAgeDays < 1 ||
        row.maxAgeDays > 365 || row.claimKeys.length < 1) ||
      factors.reduce((sum, row) => sum + row.weight, 0) !== 100 ||
      !Number.isFinite(high) || !Number.isFinite(medium) ||
      high > 100 || high <= medium || medium < 0 ||
      !form.high.trim() || !form.medium.trim()) return null;
  return {policyId: existing?.policyId ?? newPolicyId,
    version: `revision_${expectedRevision + 1}`, status: form.status,
    factors, priorityBands: {high, medium},
    promptVersion: existing?.promptVersion ?? "zero_model_v1",
    playbookVersion: existing?.playbookVersion ?? "reviewed_v1"};
}

/** Mount in a host detail tab; all authority remains in the callable services. */
export function SalesIntelligenceWorkspace({organizerId, organizerName,
  currentUserUid, isAdminOwner, api}: {organizerId: string;
    organizerName: string; currentUserUid: string; isAdminOwner: boolean;
    api?: IntelligenceApi}) {
  return <IntelligenceBody key={`${currentUserUid}:${organizerId}`}
    organizerId={organizerId} organizerName={organizerName}
    currentUserUid={currentUserUid} isAdminOwner={isAdminOwner} api={api} />;
}

function IntelligenceBody({organizerId, organizerName, currentUserUid,
  isAdminOwner, api}: {organizerId: string; organizerName: string;
    currentUserUid: string; isAdminOwner: boolean; api?: IntelligenceApi}) {
  const c = useSalesIntelligenceController({actorUid: currentUserUid,
    organizerId, api});
  return <>
    <Panel title="Fit and private outreach" icon={<Sparkles size={18} />}>
      <CatchText as="p" variant="supporting">Evidence, reviewed wording and current contact restrictions decide what
        can be drafted for {organizerName}. Nothing here sends a message.</CatchText>
      {c.error ? <CatchText as="p" variant="supporting" role="alert">{c.error}</CatchText> : null}
      {c.notice ? <CatchText as="p" variant="supporting" role="status">{c.notice}</CatchText> : null}
      {c.pending ? <AdminButton disabled={c.busy}
        onClick={() => void c.retry()}>Retry unchanged request</AdminButton> : null}
      <AdminButton disabled={c.busy || Boolean(c.pending)}
        onClick={() => void c.refresh()}>Refresh current source</AdminButton>
    </Panel>
    {isAdminOwner ? <PolicyPanel c={c} /> : null}
    <FitPanel c={c} organizerId={organizerId} />
    <WordingPanel c={c} isAdminOwner={isAdminOwner} />
    <DraftPanel c={c} organizerId={organizerId} />
  </>;
}

function PolicyPanel({c}: {c: Controller}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PolicyForm>(blankPolicyForm);
  const [formRevision, setFormRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [newPolicyId] = useState(() =>
    `policy_${crypto.randomUUID().replaceAll("-", "")}`);
  const existing = c.catalog.data?.policy ?? null;
  useEffect(() => {
    if (!existing || dirty || (c.confirmedPolicy &&
        existing.revision < c.confirmedPolicy.revision)) return;
    setForm(formFromPolicy(existing)); setFormRevision(existing.revision);
  }, [existing, dirty, c.confirmedPolicy]);
  useEffect(() => {
    if (!c.confirmedPolicy) return;
    setFormRevision(c.confirmedPolicy.revision);
    setDirty(false); setEditing(false);
  }, [c.confirmedPolicy]);
  const changeFactor = (index: number,
    patch: Partial<PolicyForm["factors"][number]>) => {
    setForm((prior) => ({...prior, factors: prior.factors.map((row, at) =>
      at === index ? {...row, ...patch} : row)}));
    setDirty(true);
  };
  const update = (patch: Partial<PolicyForm>) => {
    setForm((prior) => ({...prior, ...patch})); setDirty(true);
  };
  const candidate = policyFromForm(form, existing, newPolicyId, formRevision);
  const stale = Boolean(existing && existing.revision > formRevision);
  const save = async () => {
    if (!candidate || stale || c.busy || c.pending) return;
    await c.savePolicy(candidate, formRevision);
  };
  return <Panel title="Private fit policy" icon={<Sparkles size={18} />}>
    <CatchText as="p" variant="supporting">An Admin owner sets the seven reviewed factors, evidence kinds and
      thresholds. No weights or host strategy are supplied by this page.</CatchText>
    {existing ? <StateRow label="Current policy"
      value={`${label(existing.status)} · revision ${existing.revision}`} /> :
      <CatchText as="p" variant="supporting">No private fit policy has been saved yet.</CatchText>}
    {stale ? <CatchText as="p" variant="supporting" role="alert">This policy changed since it was opened.
      Refresh and compare before saving.</CatchText> : null}
    {!editing ? <AdminButton disabled={c.busy || Boolean(c.pending)}
      onClick={() => setEditing(true)}>{existing ? "Review policy settings" :
        "Set up private fit policy"}</AdminButton> : null}
    {editing ? <AdminForm onSubmit={(event) => {event.preventDefault(); void save();}}>
      <CatchText as="h3" variant="sectionTitle">Seven factors</CatchText>
      {form.factors.map((row, index) => <AdminEditorSection key={index}>
        <legend>Factor {index + 1}</legend>
        <CatchField
          recipe="input"
          title={`Factor ${index + 1} name`}
          value={row.name}
          onChanged={(name) => changeFactor(index, {name})}
          inputMode={c.busy || Boolean(c.pending) ? "inactive" : "editable"}
        />
        <CatchField
          recipe="input"
          title={`Factor ${index + 1} weight out of 100`}
          min="1"
          max="100"
          value={row.weight}
          onChanged={(weight) => changeFactor(index, {weight})}
          inputMode={c.busy || Boolean(c.pending) ? "inactive" : "editable"}
          keyboardType="number"
        />
        <CatchField
          recipe="input"
          title={`Factor ${index + 1} evidence age limit in days`}
          min="1"
          max="365"
          value={row.maxAgeDays}
          onChanged={(maxAgeDays) => changeFactor(index, {maxAgeDays})}
          inputMode={c.busy || Boolean(c.pending) ? "inactive" : "editable"}
          keyboardType="number"
        />
        <CatchText as="p" variant="supporting">Evidence kinds for factor {index + 1}</CatchText>
        {claimOptions.map((option) => <CheckboxField
          key={`${index}-${option.value}`} checked={row.claimKeys.includes(option.value)}
          disabled={c.busy || Boolean(c.pending)}
          label={`${option.label} · factor ${index + 1}`}
          onChange={(checked) => changeFactor(index, {claimKeys: checked ?
            [...row.claimKeys, option.value] : row.claimKeys.filter((key) =>
              key !== option.value)})} />)}
      </AdminEditorSection>)}
      <CatchText as="p" variant="supporting">Weights must total 100. Current total: {form.factors.reduce((sum,
        row) => sum + (Number(row.weight) || 0), 0)}.</CatchText>
      <CatchField
        recipe="input"
        title="High priority begins at"
        min="0"
        max="100"
        value={form.high}
        onChanged={(high) => update({high})}
        inputMode={c.busy || Boolean(c.pending) ? "inactive" : "editable"}
        keyboardType="number"
      />
      <CatchField
        recipe="input"
        title="Medium priority begins at"
        min="0"
        max="100"
        value={form.medium}
        onChanged={(medium) => update({medium})}
        inputMode={c.busy || Boolean(c.pending) ? "inactive" : "editable"}
        keyboardType="number"
      />
      <CatchField
        recipe="select"
        title="Policy availability"
        value={form.status}
        onChanged={(status) => update({status: (status ?? "") as PolicyForm["status"]})}
        inputMode={c.busy || Boolean(c.pending) ? "inactive" : "editable"}
        {...selectOptions([
          {value: "paused", label: "Paused · no scoring or drafting"},
          {value: "active", label: "Active after owner review"},
        ])}
      />
      {existing && form.factors.some((row, index) => resolvedFactorId(
        row.name, existing.factors[index]?.id) !==
        existing.factors[index]?.id) ? <CatchText as="p" variant="supporting" role="alert">Changing a factor name
        creates a new factor. Its previous ratings will not carry over.</CatchText> : null}
      {!candidate ? <CatchText as="p" variant="supporting" role="alert">Enter seven distinct factor names,
        evidence kinds, freshness limits and weights totaling 100. High
        priority must be above medium priority.</CatchText> : null}
      <AdminButton type="submit" variant="primary" disabled={!candidate ||
        stale || c.busy || Boolean(c.pending) || (Boolean(existing) && !dirty)}>
        Save reviewed policy</AdminButton>
      <AdminButton disabled={c.busy || Boolean(c.pending)}
        onClick={() => {setEditing(false); setDirty(false);
          if (existing) {setForm(formFromPolicy(existing));
            setFormRevision(existing.revision);} else setForm(blankPolicyForm());}}>
        Cancel changes</AdminButton>
    </AdminForm> : null}
  </Panel>;
}

function FitPanel({c, organizerId}: {c: Controller; organizerId: string}) {
  const [factorId, setFactorId] = useState("");
  const [reviewedRevision, setReviewedRevision] = useState(0);
  const [reviewedPolicyRevision, setReviewedPolicyRevision] = useState(0);
  const [state, setState] = useState<"known" | "unknown" | "disputed">("unknown");
  const [rating, setRating] = useState("3");
  const [evidenceId, setEvidenceId] = useState("");
  const [reason, setReason] = useState("");
  const policy = c.catalog.data?.policy;
  const factor = policy?.factors.find((item) => item.id === factorId);
  const assessment = c.catalog.data?.assessments.find((item) =>
    item.factorId === factorId);
  const stale = Boolean(factorId && ((assessment?.revision ?? 0) !==
    reviewedRevision || (policy?.revision ?? 0) !== reviewedPolicyRevision));
  const evidenceRows = c.evidence.data?.rows ?? [];
  const relevant = factor ? evidenceRows.filter((row) =>
    row.organizerId === organizerId && !row.contactId &&
    factor.claimKeys.includes(row.claimKey) &&
    (!row.validThrough || Date.parse(row.validThrough) > Date.now())) : [];
  const score = c.score.data?.snapshot;
  const selectFactor = (next: string) => {
    setFactorId(next); setEvidenceId(""); setReason("");
    const found = c.catalog.data?.assessments.find((item) => item.factorId === next);
    setReviewedRevision(found?.revision ?? 0);
    setReviewedPolicyRevision(policy?.revision ?? 0);
    setState(found?.state ?? "unknown"); setRating(String(found?.value ?? 3));
    setReason(found?.reason ?? "");
    setEvidenceId(found?.evidenceIds[0] ?? "");
  };
  const save = async () => {
    if (!factor || stale || c.busy || c.pending) return;
    if (state === "known" && (!evidenceId || !Number.isInteger(Number(rating)))) return;
    if (state !== "known" && !reason.trim()) return;
    await c.assess({factorId: factor.id, expectedRevision: reviewedRevision,
      state, value: state === "known" ? Number(rating) : null,
      evidenceIds: state === "known" ? [evidenceId] : [],
      reason: state === "known" ? null : reason.trim()});
  };
  return <Panel title="Evidence-backed fit" icon={<ClipboardList size={18} />}>
    {c.catalog.isPending || c.score.isPending ? <CatchText as="p" variant="supporting">Checking current fit…</CatchText> : null}
    {c.catalog.isError ? <QueryProblem message="Current fit policy could not load."
      retry={() => void c.catalog.refetch()} /> : null}
    {c.score.isError ? <QueryProblem message="Current fit could not be evaluated."
      retry={() => void c.score.refetch()} /> : null}
    {!policy && !c.catalog.isPending && !c.catalog.isError ?
      <EmptyState>An Admin owner must add a reviewed private fit policy before
        this host can be scored.</EmptyState> : null}
    {policy ? <>
      <StateRow label="Policy" value={`${policy.version} · ${label(policy.status)}`} />
      <StateRow label="Current fit" value={score?.score === null ||
        score?.score === undefined ? "Unknown · more reviewed evidence needed" :
        `${score.score.toFixed(1)} / 100 · ${label(score.priority)} priority`} />
      {score?.status === "review_required" ? <CatchText as="p" variant="supporting" role="alert">A factor needs
        review before a priority can be assigned.</CatchText> : null}
      {policy.factors.map((item: IntelligenceFactor) => {
        const current = c.catalog.data?.assessments.find((row) =>
          row.factorId === item.id);
        return <StateRow key={item.id} label={label(item.id)} value={
          current?.state === "known" ? `${current.value} of 5 · reviewed` :
            current?.state === "disputed" ? "Disputed · review needed" :
              "Unknown · evidence needed"} />;
      })}
      <AdminForm onSubmit={(event) => {event.preventDefault(); void save();}}>
        <CatchText as="h3" variant="sectionTitle">Review one fit factor</CatchText>
        {stale ? <p role="alert">This factor or policy changed during your review.
          Your edits are retained. Compare the current review before saving.
          <AdminButton onClick={() => selectFactor(factorId)}>
            Use current factor review</AdminButton>
        </p> : null}
        <CatchField
          recipe="select"
          title="Factor"
          value={factorId}
          onChanged={(value) => selectFactor(value ?? "")}
          {...selectOptions([{value: "", label: "Choose factor"},
            ...policy.factors.map((item) => ({value: item.id,
              label: label(item.id)}))])}
        />
        {factor ? <>
          <CatchField
            recipe="select"
            title="What is known?"
            value={state}
            onChanged={(value) => setState((value ?? "") as typeof state)}
            {...selectOptions([
              {value: "unknown", label: "Not known yet"},
              {value: "known", label: "Supported by evidence"},
              {value: "disputed", label: "Conflicting evidence"},
            ])}
          />
          {state === "known" ? <>
            <CatchField
              recipe="select"
              title="Rating"
              value={rating}
              onChanged={(value) => setRating(value ?? "")}
              {...selectOptions([0, 1, 2, 3, 4, 5].map((value) => ({
                value: String(value), label: `${value} of 5`})))}
            />
            <CatchField
              recipe="select"
              title="Reviewed host evidence on this page"
              value={evidenceId}
              onChanged={(value) => setEvidenceId(value ?? "")}
              {...selectOptions([
                {value: "", label: "Choose evidence"}, ...relevant.map((row) => ({
                  value: row.evidenceId, label: `${label(row.claimKey)} · ${row.sourceRef}`})),
              ])}
            />
          </> : <CatchField
            recipe="input"
            title="Why is this unknown or disputed?"
            maxLines={2}
            value={reason}
            onChanged={setReason}
          />}
          <AdminButton type="submit" variant="primary" disabled={c.busy ||
            Boolean(c.pending) || stale || (state === "known" ? !evidenceId :
            !reason.trim())}>Record review</AdminButton>
        </> : null}
      </AdminForm>
    </> : null}
    {c.evidence.data?.nextCursor ? <AdminButton onClick={() =>
      c.nextEvidencePage(c.evidence.data!.nextCursor!)}>More evidence</AdminButton> : null}
    {c.evidenceHistory.length ? <AdminButton onClick={c.previousEvidencePage}>
      Previous evidence</AdminButton> : null}
    {c.evidence.isError ? <QueryProblem message="Evidence could not load."
      retry={() => void c.evidence.refetch()} /> : null}
  </Panel>;
}

function WordingPanel({c, isAdminOwner}: {c: Controller; isAdminOwner: boolean}) {
  const [kind, setKind] = useState<ApprovedClause["kind"]>("observation");
  const [wording, setWording] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [expires, setExpires] = useState("");
  const [citationSelections, setCitationSelections] = useState<Record<string, string[]>>({});
  const catalog = c.catalog.data;
  const save = async () => {
    const expiry = new Date(expires);
    if (!wording.trim() || Number.isNaN(expiry.getTime()) ||
        expiry.getTime() <= Date.now() || (kind !== "cta" && !evidenceId)) return;
    const result = await c.saveClause({kind, text: wording.trim(),
      evidenceIds: evidenceId ? [evidenceId] : [],
      validUntil: expiry.toISOString()});
    if (result) {setWording(""); setEvidenceId(""); setExpires("");}
  };
  return <Panel title="Reviewed wording" icon={<ClipboardList size={18} />}>
    <CatchText as="p" variant="supporting">Only approved, current sentences can appear in a draft. A reference
      needs explicit private-mention permission.</CatchText>
    {catalog?.clauses.length ? catalog.clauses.map((row) =>
      <StateRow key={row.clauseId} label={`${label(row.kind)} · ${row.text}`}
        value={<>{label(row.state)} · valid until {date(row.validUntil)}{" "}
          {isAdminOwner && row.state === "draft" ? (row.partnerCitationOptions ?? []).map((citation) => {
            const selectionKey = `${row.clauseId}:${row.revision}`;
            const selected = citationSelections[selectionKey] ?? [];
            return <CheckboxField key={`${citation.evidenceId}:${citation.sourceHash}`}
              label={`Share this exact public citation with assigned partners: ${citation.sourceRef}. Excerpt: ${citation.excerpt ?? "No excerpt"}`}
              checked={selected.includes(citation.sourceHash)} disabled={c.busy || Boolean(c.pending)}
              onChange={(checked) => setCitationSelections((current) => ({...current,
                [selectionKey]: checked ? [...(current[selectionKey] ?? []), citation.sourceHash] :
                  (current[selectionKey] ?? []).filter((value) => value !== citation.sourceHash)}))} />;
          }) : null}
          {isAdminOwner && row.state === "draft" ? <AdminButton
            disabled={c.busy || Boolean(c.pending)} onClick={() => void
              c.reviewClause(row.clauseId, row.revision, "approve",
                (row.partnerCitationOptions ?? []).filter((citation) =>
                  (citationSelections[`${row.clauseId}:${row.revision}`] ?? []).includes(citation.sourceHash))
                  .map((citation) => ({evidenceId: citation.evidenceId, sourceHash: citation.sourceHash})))}>
              Approve wording</AdminButton> : null}
          {isAdminOwner && row.state === "approved" ? <AdminButton
            disabled={c.busy || Boolean(c.pending)} onClick={() => void
              c.reviewClause(row.clauseId, row.revision, "withdraw")}>
              Withdraw wording</AdminButton> : null}</>} />) :
      <EmptyState>No reviewed wording is available for this host.</EmptyState>}
    {isAdminOwner ? <AdminForm onSubmit={(event) => {event.preventDefault(); void save();}}>
      <CatchText as="h3" variant="sectionTitle">Prepare an exact sentence for review</CatchText>
      <CatchField
        recipe="select"
        title="Sentence purpose"
        value={kind}
        onChanged={(value) => setKind((value ?? "") as typeof kind)}
        {...selectOptions([
          {value: "observation", label: "Host observation"},
          {value: "capability", label: "Catch capability"},
          {value: "reference", label: "Private reference"},
          {value: "cta", label: "Question or next step"},
        ])}
      />
      <CatchField
        recipe="input"
        title="Exact wording"
        maxLines={3}
        value={wording}
        onChanged={setWording}
      />
      <CatchField
        recipe="select"
        title="Reviewed evidence on this page"
        value={evidenceId}
        onChanged={(value) => setEvidenceId(value ?? "")}
        {...selectOptions([
          {value: "", label: kind === "cta" ? "No evidence needed" :
            "Choose evidence"}, ...(c.evidence.data?.rows ?? []).map((row) => ({
            value: row.evidenceId, label: `${label(row.claimKey)} · ${row.sourceRef}`})),
        ])}
      />
      <CatchField
        recipe="input"
        title="Valid until"
        value={expires}
        onChanged={setExpires}
        keyboardType="datetime"
      />
      <AdminButton type="submit" disabled={c.busy || Boolean(c.pending) ||
        !wording.trim() || !expires || (kind !== "cta" && !evidenceId)}>
        Save sentence for approval</AdminButton>
    </AdminForm> : null}
  </Panel>;
}

function DraftPanel({c, organizerId}: {c: Controller; organizerId: string}) {
  const copyEpoch = useRef(0);
  useLayoutEffect(() => {
    copyEpoch.current += 1;
    return () => {copyEpoch.current += 1;};
  }, []);
  const [factsChecked, setFactsChecked] = useState(false);
  const [acknowledgedDraftKey, setAcknowledgedDraftKey] = useState("");
  const [toneChecked, setToneChecked] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const account = c.account.data?.account;
  const now = c.catalog.data?.evaluatedAt ?? new Date().toISOString();
  const eligible = account?.researchStatus === "qualified" &&
    account.suppressionStatus !== "held" &&
    account.suppressionStatus !== "suppressed" &&
    c.catalog.data?.policy?.status === "active";
  const selected = c.draft.data;
  const reviewKey = selected ? `${selected.draftId}:${selected.draft.contentHash}` : "";
  useEffect(() => {
    setFactsChecked(false); setToneChecked(false); setCopyStatus("");
    setAcknowledgedDraftKey("");
  }, [selected?.draftId, selected?.draft.contentHash]);
  const copy = async () => {
    const epoch = copyEpoch.current;
    if (!selected || selected.status !== "approved") return;
    const receipt = await c.copy(selected.draftId, selected.draft.contentHash);
    if (!receipt || copyEpoch.current !== epoch) return;
    try {
      await navigator.clipboard.writeText(
        [receipt.subject, receipt.text].filter(Boolean).join("\n\n"));
      setCopyStatus("Reviewed text copied. Sending, if appropriate, is a separate manual action.");
    } catch {
      setCopyStatus("Copy was reviewed, but the browser clipboard failed. Select the text below manually.");
    }
  };
  return <Panel title="Draft for manual review" icon={<ClipboardList size={18} />}>
    {c.account.isError ? <QueryProblem message="Host details could not load."
      retry={() => void c.account.refetch()} /> : null}
    {c.contacts.isError ? <QueryProblem message="Contacts could not load."
      retry={() => void c.contacts.refetch()} /> : null}
    {salesOutreachCompositionReview({organizerId, evaluatedAt: now,
      eligible: Boolean(eligible), blocked: c.busy || Boolean(c.pending),
      contacts: c.contacts.data?.rows ?? [],
      opportunities: c.account.data?.opportunities ?? [],
      clauses: c.catalog.data?.clauses ?? [],
      nextContactCursor: c.contacts.data?.nextCursor ?? null,
      hasPreviousContacts: c.contactHistory.length > 0,
      onNextContacts: c.nextContactPage,
      onPreviousContacts: c.previousContactPage,
      onGenerate: c.generate})}
    {c.jobRequestId ? <p role="status">Preparation status: {
      c.job.data?.status === "completed" ? "Ready for review" :
        c.job.data?.status === "running" ? "Still preparing" :
          c.job.isError ? "Could not confirm status" : "Checking"}{" "}
      <AdminButton onClick={() => void c.job.refetch()}>Check again</AdminButton></p> : null}
    <CatchText as="h3" variant="sectionTitle">Saved drafts</CatchText>
    {c.drafts.isError ? <QueryProblem message="Saved drafts could not load."
      retry={() => void c.drafts.refetch()} /> : null}
    {c.drafts.data?.rows.length ? c.drafts.data.rows.map((row) =>
      <StateRow key={row.draftId} label={row.subject ?? "Message draft"}
        value={<>{label(row.status)} · {date(row.createdAt)}{" "}
          <AdminButton disabled={c.busy || Boolean(c.pending)}
            onClick={() => {c.setSelectedDraftId(row.draftId);
              setFactsChecked(false); setToneChecked(false); setCopyStatus("");}}>
              Open draft</AdminButton></>} />) :
      <EmptyState>No drafts have been prepared for this host.</EmptyState>}
    {c.draft.isError ? <QueryProblem message="This draft is no longer current."
      retry={() => void c.draft.refetch()} /> : null}
    {selected ? <>
      <CatchText as="h3" variant="sectionTitle">Review exact draft</CatchText>
      {selected.draft.subject ? <StateRow label="Subject"
        value={selected.draft.subject} /> : null}
      <CatchField
        recipe="input"
        title="Draft text"
        maxLines={8}
        value={selected.draft.text}
        onChanged={() => undefined}
        inputMode="readOnly"
      />
      <StateRow label="Source" value="Reviewed evidence and approved wording" />
      <StateRow label="Model use" value="None · deterministic wording" />
      <StateRow label="Status" value={label(selected.status)} />
      {selected.status === "pending_review" ? <>
        <CheckboxField checked={factsChecked && acknowledgedDraftKey === reviewKey}
          onChange={(checked) => {setFactsChecked(checked); setAcknowledgedDraftKey(reviewKey);}}
          label="I checked every factual claim against the current source." />
        <CheckboxField checked={toneChecked && acknowledgedDraftKey === reviewKey}
          onChange={(checked) => {setToneChecked(checked); setAcknowledgedDraftKey(reviewKey);}}
          label="I approve the tone and understand this is manual copy only." />
        <AdminButton disabled={!factsChecked || !toneChecked || acknowledgedDraftKey !== reviewKey ||
          c.busy || Boolean(c.pending)} onClick={() => void c.review(
          selected.draftId, selected.draft.contentHash)}>
          Approve exact draft</AdminButton>
      </> : <AdminButton disabled={c.busy || Boolean(c.pending)}
        onClick={() => void copy()}>Copy approved text</AdminButton>}
      {copyStatus ? <CatchText as="p" variant="supporting" role="status">{copyStatus}</CatchText> : null}
    </> : null}
  </Panel>;
}
