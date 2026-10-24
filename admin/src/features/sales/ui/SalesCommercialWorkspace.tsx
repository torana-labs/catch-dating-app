import {CatchText, CatchField} from "@catch/web-ui";
import {useEffect, useRef, useState} from "react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {ClipboardList} from "lucide-react";
import {
  AdminButton,
  AdminForm,
  EmptyState,
  Panel,
  selectOptions,
  StateRow,
} from "../../../shared/ui/AdminPrimitives";
import {useAdminFeedback} from "../../../shared/feedback/AdminFeedbackContext";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {dataMode} from "../../../shared/api/dataMode";
import {salesErrorMessage, toLocalDateTimeInput} from
  "../controllers/useSalesWorkspaceController";
import {getCommercialDetail, listCommercialReport, upsertCommercialPilot,
  reviseCommercialQuote, approveCommercialQuote, acceptCommercialQuote,
  attestHostSettlement, closeWonWithFinance} from
  "../api/salesCommercialRepository";
import type {CommercialDetail, CommercialPilotInput, CommercialQuoteInput,
  CommercialDecisionInput, CommercialStatus, CommercialTerms,
  CommercialSettlementInput, CommercialCloseInput} from
  "../api/salesCommercialTypes";
import type {SalesAccountDetail, SalesEvidence} from "../api/salesTypes";

function dateInput(value: string | null): string {
  return value ? toLocalDateTimeInput(new Date(value)) : "";
}
function iso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function evidenceOptions(rows: SalesEvidence[]) {
  return [{value: "", label: "Choose recorded evidence"}, ...rows.map((row) => ({
    value: row.evidenceId,
    label: `${row.claimKey}: ${row.sourceRef}`,
  }))];
}

type Save = (action: string, material: unknown,
  invoke: (requestId: string) => Promise<unknown>, notice: string) => Promise<boolean>;
export function renderSalesCommercialWorkspace(detail: SalesAccountDetail,
  evidence: SalesEvidence[], isAdminOwner: boolean) {
  return <SalesCommercialWorkspace detail={detail} evidence={evidence}
    isAdminOwner={isAdminOwner} />;
}

function SalesCommercialWorkspace({detail, evidence, isAdminOwner}: {
  detail: SalesAccountDetail; evidence: SalesEvidence[];
  isAdminOwner: boolean;
}) {
  const organizerId = detail.account.organizerId;
  const [opportunityId, setOpportunityId] = useState(
    detail.opportunities[0]?.opportunityId ?? "");
  const [cursor, setCursor] = useState<string | undefined>();
  const [previous, setPrevious] = useState<Array<string | undefined>>([]);
  const [saving, setSaving] = useState(false);
  const pendingIds = useRef(new Map<string, string>());
  const {setError, setNotice} = useAdminFeedback();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const queryClient = useQueryClient();
  const live = dataMode() !== "sample";
  const record = useQuery({queryKey: ["sales", "commercial", organizerId,
    opportunityId], queryFn: () => getCommercialDetail(organizerId, opportunityId),
  enabled: live && Boolean(opportunityId)});
  const report = useQuery({queryKey: ["sales", "commercial-report", organizerId,
    cursor], queryFn: () => listCommercialReport(organizerId, cursor), enabled: live});
  const selectableOpportunities = [...detail.opportunities,
    ...(report.data?.rows ?? []).filter((row) => !detail.opportunities.some(
      (item) => item.opportunityId === row.opportunityId)).map((row) => ({
        opportunityId: row.opportunityId, motion: "Other opportunity", stage: row.stage,
      }))];
  useEffect(() => {setCursor(undefined); setPrevious([]);}, [organizerId]);
  const save: Save = async (action, material, invoke, notice) => {
    const token = beginOperation();
    if (!token) return false;
    const key = `${action}:${JSON.stringify(material)}`;
    const requestId = pendingIds.current.get(key) ?? crypto.randomUUID();
    pendingIds.current.set(key, requestId);
    setSaving(true); setError(null);
    try {
      await invoke(requestId);
      pendingIds.current.delete(key);
      setNotice(notice);
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ["sales", "commercial", organizerId]}),
        queryClient.invalidateQueries({queryKey: ["sales", "commercial-report", organizerId]}),
        queryClient.invalidateQueries({queryKey: ["sales", "account", organizerId]}),
        queryClient.invalidateQueries({queryKey: ["sales", "opportunities"]}),
      ]);
      return true;
    } catch (error) {
      setError(salesErrorMessage(error));
      if (/aborted|revision mismatch|record changed since review/iu.test(
        error instanceof Error ? error.message : String(error))) {
        void record.refetch();
      }
      return false;
    } finally {setSaving(false); endOperation(token);}
  };
  if (!live) return <Panel title="Pilots and commercial terms" icon={<ClipboardList size={18} />}>
    <CatchText as="p" variant="supporting">Commercial approvals require live Sales records. Sample hosts are not approval evidence.</CatchText>
  </Panel>;
  return <>
    <Panel title="Pilots and commercial terms" icon={<ClipboardList size={18} />}>
      <CatchText as="p" variant="supporting">Record a reviewed pilot and quote for this host. Accepted terms,
        manual host collection and opportunity close are separate reviews.</CatchText>
      <CatchField
        recipe="select"
        title="Opportunity"
        value={opportunityId}
        onChanged={(value) => setOpportunityId(value ?? "")}
        {...selectOptions(selectableOpportunities.map((item) => ({
          value: item.opportunityId,
          label: `${item.motion.replaceAll("_", " ")} · ${item.stage.replaceAll("_", " ")}`,
        })))}
      />
      {!selectableOpportunities.length ? <EmptyState>Create an opportunity first.</EmptyState> : null}
      {record.isPending && opportunityId ? <EmptyState>Loading commercial record…</EmptyState> : null}
      {record.error ? <EmptyState>Commercial record could not be loaded.
        <AdminButton onClick={() => void record.refetch()}>Try again</AdminButton>
      </EmptyState> : null}
    </Panel>
    {record.data ? <>
      <PilotEditor key={`pilot:${opportunityId}`} organizerId={organizerId}
        opportunityId={opportunityId} record={record.data} evidence={evidence}
        saving={saving} save={save} />
      <QuoteEditor key={`quote:${opportunityId}`} organizerId={organizerId}
        opportunityId={opportunityId} record={record.data} evidence={evidence}
        saving={saving} save={save} />
      <FinanceCloseEditor key={`finance:${opportunityId}`} organizerId={organizerId}
        opportunityId={opportunityId} record={record.data} evidence={evidence}
        isAdminOwner={isAdminOwner} saving={saving} save={save} />
      <StageHistory record={record.data} />
    </> : null}
    <Panel title="Host commercial report" icon={<ClipboardList size={18} />}>
      <CatchText as="p" variant="supporting">One server page of this host’s opportunities. Booked host revenue stays unset
        until finance-owned reconciliation.</CatchText>
      {report.isPending ? <EmptyState>Loading report…</EmptyState> :
        report.error ? <EmptyState>Report could not be loaded.
          <AdminButton onClick={() => void report.refetch()}>Try again</AdminButton>
        </EmptyState> : report.data?.rows.length ? report.data.rows.map((row) =>
          <StateRow key={row.opportunityId} label={row.stage.replaceAll("_", " ")}
            value={`Pilot: ${row.pilotStatus ?? "none"} · Quote: ${row.quoteStatus ??
              "none"} · Host collection: ${row.manuallyAttestedHostRevenue ?
              `${row.manuallyAttestedHostRevenue.currency} ` +
              `${(row.manuallyAttestedHostRevenue.amountMinor / 100).toFixed(2)} ` +
              "manually attested" : "unknown"}`} />) :
          <EmptyState>No commercial records.</EmptyState>}
      <AdminButton disabled={!previous.length} onClick={() => {
        const stack = [...previous]; setCursor(stack.pop()); setPrevious(stack);
      }}>Previous page</AdminButton>{" "}
      <AdminButton disabled={!report.data?.nextCursor} onClick={() => {
        setPrevious((stack) => [...stack, cursor]);
        setCursor(report.data?.nextCursor ?? undefined);
      }}>Next page</AdminButton>
    </Panel>
  </>;
}

function PilotEditor({organizerId, opportunityId, record, evidence, saving, save}: {
  organizerId: string; opportunityId: string; record: CommercialDetail;
  evidence: SalesEvidence[]; saving: boolean; save: Save;
}) {
  const pilot = record.pilotPlan;
  const [baseRevision, setBaseRevision] = useState(pilot?.revision ?? 0);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<CommercialStatus>(pilot?.status ?? "draft");
  const [workflowId, setWorkflowId] = useState(pilot?.workflowId ?? "");
  const [objective, setObjective] = useState(pilot?.objective ?? "");
  const [measures, setMeasures] = useState(pilot?.successMeasures.join("\n") ?? "");
  const [startsAt, setStartsAt] = useState(dateInput(pilot?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(dateInput(pilot?.endsAt ?? null));
  const [reviewEvidence, setReviewEvidence] = useState(
    pilot?.reviewEvidence?.evidenceId ?? "");
  const [outcomeEvidence, setOutcomeEvidence] = useState(
    pilot?.outcomeEvidence?.evidenceId ?? "");
  const [localError, setLocalError] = useState("");
  const refresh = () => {
    setBaseRevision(pilot?.revision ?? 0); setDirty(false);
    setStatus(pilot?.status ?? "draft"); setWorkflowId(pilot?.workflowId ?? "");
    setObjective(pilot?.objective ?? "");
    setMeasures(pilot?.successMeasures.join("\n") ?? "");
    setStartsAt(dateInput(pilot?.startsAt ?? null));
    setEndsAt(dateInput(pilot?.endsAt ?? null));
    setReviewEvidence(pilot?.reviewEvidence?.evidenceId ?? "");
    setOutcomeEvidence(pilot?.outcomeEvidence?.evidenceId ?? "");
  };
  useEffect(() => {if (!dirty) refresh();}, [pilot?.revision]);
  const changed = (pilot?.revision ?? 0) !== baseRevision;
  const submit = async () => {
    const successMeasures = measures.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!workflowId.trim() || !objective.trim() || !successMeasures.length ||
      startsAt && !iso(startsAt) || endsAt && !iso(endsAt)) {
      setLocalError("Enter a workflow key, objective, measure and valid dates."); return;
    }
    const input: Omit<CommercialPilotInput, "requestId"> = {organizerId,
      opportunityId, expectedRevision: baseRevision, plan: {status,
        workflowId: workflowId.trim(), objective: objective.trim(), successMeasures,
        startsAt: iso(startsAt), endsAt: iso(endsAt),
        reviewEvidence: reviewEvidence ? {evidenceId: reviewEvidence} : null,
        outcomeEvidence: outcomeEvidence ? {evidenceId: outcomeEvidence} : null}};
    setLocalError("");
    if (await save("pilot", input, (requestId) => upsertCommercialPilot(
      {...input, requestId}), "Pilot plan saved.")) setDirty(false);
  };
  return <Panel title="Pilot plan" icon={<ClipboardList size={18} />}>
    <CatchText as="p" variant="supporting">Review evidence before starting a pilot; record outcome evidence before
      marking it complete. An active or finished pilot cannot restart.</CatchText>
    <AdminForm onSubmit={(event) => {event.preventDefault(); void submit();}}>
      <CatchField
        recipe="select"
        title="Pilot status"
        value={status}
        onChanged={(value) => {
        setStatus((value ?? "") as CommercialStatus); setDirty(true);
      }}
        {...selectOptions(["draft", "reviewed", "active", "completed", "cancelled"].map(
        (value) => ({value, label: value})))}
      />
      <CatchField
        recipe="input"
        title="Workflow key"
        value={workflowId}
        onChanged={(value) => {
        setWorkflowId(value); setDirty(true);
      }}
        required
      />
      <CatchField
        recipe="input"
        title="Objective"
        maxLines={2}
        value={objective}
        onChanged={(value) => {
        setObjective(value); setDirty(true);
      }}
        required
      />
      <CatchField
        recipe="input"
        title="Success measures, one per line"
        maxLines={3}
        value={measures}
        onChanged={(value) => {setMeasures(value); setDirty(true);}}
        required
      />
      <CatchField
        recipe="input"
        title="Start"
        value={startsAt}
        onChanged={(value) => {setStartsAt(value); setDirty(true);}}
        keyboardType="datetime"
      />
      <CatchField
        recipe="input"
        title="End"
        value={endsAt}
        onChanged={(value) => {setEndsAt(value); setDirty(true);}}
        keyboardType="datetime"
      />
      <CatchField
        recipe="select"
        title="Reviewed plan evidence"
        value={reviewEvidence}
        onChanged={(value) => {setReviewEvidence((value ?? "")); setDirty(true);}}
        {...selectOptions(evidenceOptions(evidence))}
      />
      {status === "completed" ? <CatchField
        recipe="select"
        title="Outcome evidence"
        value={outcomeEvidence}
        onChanged={(value) => {
          setOutcomeEvidence((value ?? "")); setDirty(true);
        }}
        {...selectOptions(evidenceOptions(evidence))}
      /> : null}
      {changed ? <p role="alert">Pilot changed since you opened this form.
        Compare it before saving. <AdminButton type="button" onClick={refresh}>
          Use latest pilot</AdminButton></p> : null}
      {localError ? <CatchText as="p" variant="supporting" role="alert">{localError}</CatchText> : null}
      <AdminButton type="submit" disabled={saving || changed}>Save pilot plan</AdminButton>
    </AdminForm>
  </Panel>;
}

function QuoteEditor({organizerId, opportunityId, record, evidence, saving, save}: {
  organizerId: string; opportunityId: string; record: CommercialDetail;
  evidence: SalesEvidence[]; saving: boolean; save: Save;
}) {
  const quote = record.quote;
  const terms = record.quoteVersion?.terms;
  const [baseRevision, setBaseRevision] = useState(quote?.revision ?? 0);
  const [dirty, setDirty] = useState(false);
  const [currency, setCurrency] = useState(terms?.currency ?? "INR");
  const [amount, setAmount] = useState(terms ? String(terms.amountMinor / 100) : "");
  const [cadence, setCadence] = useState<CommercialTerms["billingCadence"]>(
    terms?.billingCadence ?? "one_time");
  const [scope, setScope] = useState(terms?.scope ?? "");
  const [validUntil, setValidUntil] = useState(dateInput(terms?.validUntil ?? null));
  const [facts, setFacts] = useState<string[]>(terms?.sourceFactRefs ?? []);
  const [factToAdd, setFactToAdd] = useState("");
  const [decisionEvidence, setDecisionEvidence] = useState("");
  const [localError, setLocalError] = useState("");
  const refresh = () => {
    setBaseRevision(quote?.revision ?? 0); setDirty(false);
    setCurrency(terms?.currency ?? "INR");
    setAmount(terms ? String(terms.amountMinor / 100) : "");
    setCadence(terms?.billingCadence ?? "one_time");
    setScope(terms?.scope ?? ""); setValidUntil(dateInput(terms?.validUntil ?? null));
    setFacts(terms?.sourceFactRefs ?? []); setDecisionEvidence("");
  };
  useEffect(() => {if (!dirty) refresh();}, [quote?.revision]);
  const changed = (quote?.revision ?? 0) !== baseRevision;
  const revise = async () => {
    const amountMinor = Math.round(Number(amount) * 100);
    const expiry = iso(validUntil);
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 0 || !scope.trim() ||
      !expiry || !facts.length) {
      setLocalError("Enter an amount, scope, valid-until date and source facts.");
      return;
    }
    const input: Omit<CommercialQuoteInput, "requestId"> = {organizerId,
      opportunityId, expectedRevision: baseRevision, terms: {currency,
        amountMinor, billingCadence: cadence, scope: scope.trim(),
        validUntil: expiry, sourceFactRefs: facts}};
    setLocalError("");
    if (await save("quote-revise", input, (requestId) =>
      reviseCommercialQuote({...input, requestId}), "Quote version recorded."))
      setDirty(false);
  };
  const decide = async (kind: "approve" | "accept") => {
    if (!quote || !decisionEvidence) {setLocalError("Choose review evidence."); return;}
    const input: Omit<CommercialDecisionInput, "requestId"> = {organizerId,
      opportunityId, expectedRevision: baseRevision,
      termVersion: quote.termVersion, evidence: {evidenceId: decisionEvidence}};
    setLocalError("");
    if (await save(`quote-${kind}`, input, (requestId) => kind === "approve" ?
      approveCommercialQuote({...input, requestId}) :
      acceptCommercialQuote({...input, requestId}), kind === "approve" ?
      "Quote approved for review." : "Terms acceptance recorded; payment is unknown."))
      setDirty(false);
  };
  return <Panel title="Quote and terms" icon={<ClipboardList size={18} />}>
    <CatchText as="p" variant="supporting">Source facts must be recorded evidence for this host. Approval and acceptance
      each need their own evidence. No charge or payment confirmation occurs here.</CatchText>
    <StateRow label="Current quote" value={quote ?
      `Version ${quote.termVersion} · ${quote.status.replaceAll("_", " ")}` :
      "No quote recorded"} />
    {terms ? <StateRow label="Saved terms under review" value={
      `${terms.currency} ${(terms.amountMinor / 100).toFixed(2)} · ${terms.scope} · ` +
      `valid until ${new Date(terms.validUntil).toLocaleString()}`} /> : null}
    <AdminForm onSubmit={(event) => {event.preventDefault(); void revise();}}>
      <CatchField
        recipe="select"
        title="Currency"
        value={currency}
        onChanged={(value) => {
        setCurrency((value ?? "")); setDirty(true);
      }}
        {...selectOptions([{value: "INR", label: "INR"}, {value: "USD", label: "USD"}])}
      />
      <CatchField
        recipe="input"
        title="Amount in currency units"
        value={amount}
        onChanged={(value) => {setAmount(value); setDirty(true);}}
        required
        keyboardType="number"
      />
      <CatchField
        recipe="select"
        title="Billing cadence"
        value={cadence}
        onChanged={(value) => {
        setCadence((value ?? "") as CommercialTerms["billingCadence"]); setDirty(true);
      }}
        {...selectOptions(["one_time", "monthly", "annual", "usage_based"].map(
        (value) => ({value, label: value.replaceAll("_", " ")})))}
      />
      <CatchField
        recipe="input"
        title="Exact scope"
        maxLines={3}
        value={scope}
        onChanged={(value) => {setScope(value); setDirty(true);}}
        required
      />
      <CatchField
        recipe="input"
        title="Valid until"
        value={validUntil}
        onChanged={(value) => {setValidUntil(value); setDirty(true);}}
        required
        keyboardType="datetime"
      />
      <CatchField
        recipe="select"
        title="Recorded source fact"
        value={factToAdd}
        onChanged={(value) => setFactToAdd(value ?? "")}
        {...selectOptions(evidenceOptions(evidence))}
      />
      <AdminButton type="button" disabled={!factToAdd || facts.includes(factToAdd)}
        onClick={() => {setFacts((ids) => [...ids, factToAdd]); setFactToAdd("");
          setDirty(true);}}>Add source fact</AdminButton>
      {facts.map((id) => <StateRow key={id} label={evidence.find((row) =>
        row.evidenceId === id)?.sourceRef ?? "Recorded evidence"} value={
        <AdminButton type="button" onClick={() => {setFacts((ids) => ids.filter(
          (value) => value !== id)); setDirty(true);}}>Remove</AdminButton>} />)}
      {changed ? <p role="alert">Quote changed since you opened this form.
        Compare it before saving. <AdminButton type="button" onClick={refresh}>
          Use latest quote</AdminButton></p> : null}
      {localError ? <CatchText as="p" variant="supporting" role="alert">{localError}</CatchText> : null}
      <AdminButton type="submit" disabled={saving || changed ||
        quote?.status === "accepted_reviewed"}>Record new quote version</AdminButton>
    </AdminForm>
    {quote ? <AdminForm onSubmit={(event) => {event.preventDefault();
      void decide(quote.status === "draft" ? "approve" : "accept");}}>
      <CatchText as="h3" variant="sectionTitle">{quote.status === "draft" ? "Approve quote" : "Review accepted terms"}</CatchText>
      <CatchText as="p" variant="supporting">Choose evidence that supports this exact saved version.
        Acceptance evidence must be separate from approval evidence.</CatchText>
      <CatchField
        recipe="select"
        title="Distinct review evidence"
        value={decisionEvidence}
        onChanged={(value) => setDecisionEvidence(value ?? "")}
        {...selectOptions(evidenceOptions(evidence))}
      />
      <AdminButton type="submit" disabled={saving || changed || dirty || !decisionEvidence ||
        quote.status === "accepted_reviewed"}>
        {quote.status === "draft" ? "Approve exact quote" :
          "Record terms acceptance"}
      </AdminButton>
    </AdminForm> : null}
    <StateRow label="Host collection" value={record.settlementAttestation ?
      "Manually attested; provider unconfirmed" :
      "Unknown — finance review is separate"} />
  </Panel>;
}

function FinanceCloseEditor({organizerId, opportunityId, record, evidence,
  isAdminOwner, saving, save}: {
  organizerId: string; opportunityId: string; record: CommercialDetail;
  evidence: SalesEvidence[]; isAdminOwner: boolean;
  saving: boolean; save: Save;
}) {
  const quote = record.quote;
  const terms = record.quoteVersion?.terms;
  const attestation = record.settlementAttestation;
  const [receivedAt, setReceivedAt] = useState("");
  const [method, setMethod] = useState<CommercialSettlementInput["settlementMethod"]>(
    "bank_transfer");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [proofId, setProofId] = useState("");
  const [settlementReference, setSettlementReference] = useState("");
  const [recipientAccountScope, setRecipientAccountScope] = useState("");
  const [reviewedKey, setReviewedKey] = useState("");
  const [localError, setLocalError] = useState("");
  const eligibleEvidence = evidence.filter((row) =>
    row.sourceType === "first_party" || row.sourceType === "import_artifact");
  const recurring = terms?.billingCadence === "monthly" ||
    terms?.billingCadence === "annual";
  const reviewKey = `${quote?.quoteId}:${quote?.revision}:` +
    `${attestation?.attestationId}:${record.opportunity.revision}`;
  const submitAttestation = async () => {
    const received = iso(receivedAt);
    const servicePeriod = recurring ? {
      startsAt: iso(periodStart), endsAt: iso(periodEnd),
    } : null;
    if (!quote || !terms || !received || !proofId ||
      settlementReference.trim().length < 6 ||
      recipientAccountScope.trim().length < 3 ||
      recurring && (!servicePeriod?.startsAt || !servicePeriod.endsAt)) {
      setLocalError("Enter a payment date, settlement reference, recipient " +
        "ledger scope and reviewed source evidence" +
        (recurring ? ", plus the service period." : "."));
      return;
    }
    const input: Omit<CommercialSettlementInput, "requestId"> = {
      organizerId, opportunityId, expectedQuoteRevision: quote.revision,
      termVersion: quote.termVersion, amountMinor: terms.amountMinor,
      currency: terms.currency, purpose: "host_subscription",
      receivedAt: received, settlementMethod: method,
      settlementReference: settlementReference.trim(),
      recipientAccountScope: recipientAccountScope.trim(),
      servicePeriod: servicePeriod as CommercialSettlementInput["servicePeriod"],
      evidence: {evidenceId: proofId},
    };
    setLocalError("");
    if (await save("finance-attest", input, (requestId) =>
      attestHostSettlement({...input, requestId}),
    "Manual host collection attested. Provider confirmation remains unknown.")) {
      setProofId(""); setReviewedKey("");
    }
  };
  const close = async () => {
    if (!attestation || reviewedKey !== reviewKey ||
      record.opportunity.stage === "closed_won") return;
    const input: Omit<CommercialCloseInput, "requestId"> = {organizerId,
      opportunityId, expectedRevision: record.opportunity.revision,
      financeAttestationId: attestation.attestationId, fields: {
        motion: record.opportunity.motion, stage: "closed_won",
        ownerUid: record.opportunity.ownerUid,
        nextStep: null, nextStepAt: null,
      }};
    if (await save("finance-close", input, (requestId) =>
      closeWonWithFinance({...input, requestId}),
    "Opportunity closed won with manual finance proof; provider unconfirmed."))
      setReviewedKey("");
  };
  return <Panel title="Host collection and close" icon={<ClipboardList size={18} />}>
    <CatchText as="p" variant="supporting">Only an Admin Owner can attest one host subscription period received elsewhere.
      This does not charge a card, confirm a provider settlement or count guest
      booking payments.</CatchText>
    {attestation ? <>
      <StateRow label="Manual host collection" value={
        `${attestation.currency} ${(attestation.amountMinor / 100).toFixed(2)} · ` +
        `received ${new Date(attestation.receivedAt).toLocaleDateString()} · ` +
        `${attestation.settlementMethod.replaceAll("_", " ")}`} />
      <StateRow label="Reviewed source" value={attestation.evidence.sourceRef} />
      <StateRow label="Settlement reference" value={
        attestation.settlementReference} />
      <StateRow label="Recipient ledger scope" value={
        attestation.recipientAccountScope} />
      <StateRow label="Provider confirmation" value="Not confirmed" />
    </> : <StateRow label="Host collection" value="Not recorded" />}
    {isAdminOwner && quote?.status === "accepted_reviewed" && terms &&
      !attestation ? <AdminForm onSubmit={(event) => {
        event.preventDefault(); void submitAttestation();
      }}>
        <CatchText as="h3" variant="sectionTitle">Attest manual host collection</CatchText>
        <CatchText as="p" variant="supporting">Exact accepted amount: {terms.currency} {(
          terms.amountMinor / 100).toFixed(2)}. Record a real first-party
          settlement source; a human note alone is not accepted as proof.</CatchText>
        <CatchField
          recipe="input"
          title="Received on"
          value={receivedAt}
          onChanged={setReceivedAt}
          required
          keyboardType="datetime"
        />
        <CatchField
          recipe="select"
          title="Settlement method"
          value={method}
          onChanged={(value) => setMethod((value ?? "") as typeof method)}
          {...selectOptions([
            {value: "bank_transfer", label: "Bank transfer"},
            {value: "cash", label: "Cash"},
            {value: "other_external", label: "Other external method"},
          ])}
        />
        <CatchField
          recipe="input"
          title="External settlement reference"
          value={settlementReference}
          onChanged={setSettlementReference}
          required
        />
        <CatchField
          recipe="input"
          title="Recipient ledger or account label"
          value={recipientAccountScope}
          onChanged={setRecipientAccountScope}
          required
        />
        {recurring ? <>
          <CatchField
            recipe="input"
            title="Service period start"
            value={periodStart}
            onChanged={setPeriodStart}
            required
            keyboardType="datetime"
          />
          <CatchField
            recipe="input"
            title="Service period end"
            value={periodEnd}
            onChanged={setPeriodEnd}
            required
            keyboardType="datetime"
          />
        </> : null}
        <CatchField
          recipe="select"
          title="Reviewed settlement evidence"
          value={proofId}
          onChanged={(value) => setProofId(value ?? "")}
          {...selectOptions(evidenceOptions(eligibleEvidence))}
        />
        {localError ? <CatchText as="p" variant="supporting" role="alert">{localError}</CatchText> : null}
        <AdminButton type="submit" disabled={saving || !proofId}>
          Record manual host collection</AdminButton>
      </AdminForm> : null}
    {isAdminOwner && attestation &&
      record.opportunity.stage !== "closed_won" ? <>
        <CatchText as="p" variant="supporting">Closing won records the opportunity outcome against this exact accepted
          quote and finance attestation. It does not confirm provider settlement
          or activate a product entitlement.</CatchText>
        <AdminButton type="button" onClick={() => setReviewedKey(reviewKey)}>
          Review current quote and finance proof</AdminButton>{" "}
        <AdminButton type="button" disabled={saving || reviewedKey !== reviewKey}
          onClick={() => void close()}>Mark closed won</AdminButton>
      </> : null}
    {record.opportunity.stage === "closed_won" ? <StateRow
      label="Opportunity" value="Closed won with finance proof" /> : null}
  </Panel>;
}

function StageHistory({record}: {record: CommercialDetail}) {
  return <Panel title="Stage history" icon={<ClipboardList size={18} />}>
    {record.history.length ? record.history.map((entry, index) =>
      <StateRow key={`${entry.changedAt}:${index}`}
        label={`${entry.fromStage ?? "New"} → ${entry.toStage}`}
        value={`${new Date(entry.changedAt).toLocaleString()} · ${entry.reason ??
          "No reason required"}`} />) : <EmptyState>No stage changes recorded yet.</EmptyState>}
    {record.historyTruncated ? <CatchText as="p" variant="supporting">Only the first 25 stage changes are shown.</CatchText> : null}
  </Panel>;
}
