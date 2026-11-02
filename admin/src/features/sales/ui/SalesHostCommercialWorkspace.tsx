import {
  CatchButton,
  CatchCheckboxInput,
  CatchEmptyState,
  CatchField,
  CatchGap,
  CatchIndexRow,
  CatchMetaRow,
  CatchSection,
  CatchSheet,
  CatchText,
} from "@catch/web-ui";
import {useState, type ReactNode} from "react";
import type {
  CommercialDetail,
  CommercialReportRow,
  CommercialSettlementInput,
  CommercialStatus,
  CommercialTerms,
} from "../api/salesCommercialTypes";
import type {SalesEvidence, SalesOpportunity} from "../api/salesTypes";
import {
  billingCadenceLabels,
  evidenceClaimLabels,
  isoFrom,
  localInput,
  moneyLabel,
  pilotStatusLabels,
  quoteStatusLabels,
  settlementMethodLabels,
  stageLabel,
} from "../controllers/salesLabels";
import type {SalesHostCommercialController} from "../controllers/useSalesHostCommercialController";

export type SalesHostCommercialModel = Omit<SalesHostCommercialController, "dealId"> & {dealId: string | null};
interface Shared {
  model: SalesHostCommercialModel;
  record: CommercialDetail;
  evidence: SalesEvidence[];
  hasMoreEvidence: boolean;
  moreEvidence: () => void;
  onClose: () => void;
}

const keysOf = <T extends string>(labels: Record<T, unknown>) => Object.keys(labels) as T[];
const day = (value: string) => new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short", year: "numeric"}).format(new Date(value));
const inputDate = (value: string | null | undefined) => value ? localInput(new Date(value)) : "";
const validDate = (value: string) => !value || isoFrom(value) !== null;
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const LEDGER_TEXT = /^[A-Za-z0-9][A-Za-z0-9 ./_-]*$/u;

function EvidenceSelect({title, value, onChanged, evidence, hasMoreEvidence, moreEvidence, helperText}: {
  title: string;
  value: string;
  onChanged: (value: string) => void;
  evidence: SalesEvidence[];
  hasMoreEvidence: boolean;
  moreEvidence: () => void;
  helperText?: string;
}) {
  return (
    <>
      <CatchField recipe="select" title={title} value={value} values={["", ...evidence.map((item) => item.evidenceId)]}
        itemLabelBuilder={(id) => {
          const item = evidence.find((entry) => entry.evidenceId === id);
          return item ? `${evidenceClaimLabels[item.claimKey]}: ${item.sourceRef}` : "Choose evidence";
        }}
        {...(helperText ? {helperText} : {})}
        onChanged={(next) => onChanged(next ?? "")} />
      {hasMoreEvidence ? <CatchButton label="Show more evidence" variant="secondary" size="sm" onPressed={moreEvidence} /> : null}
    </>
  );
}

/** A sheet bound to what the person opened: if the record moves meanwhile, it says so and offers the latest in place of saving. */
function BoundSheet({title, changed, changedText, onUseLatest, saveLabel, onSave, onClose, children}: {
  title: string;
  changed: boolean;
  changedText: string;
  onUseLatest: () => void;
  saveLabel: string;
  onSave: (() => void) | null;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <CatchSheet recipe="standard" pinFooter open onClose={onClose} title={title} subtitle="Deal"
      footer={changed ? <CatchButton label="Use the latest" variant="secondary" onPressed={onUseLatest} /> :
        <CatchButton label={saveLabel} onPressed={onSave} />}>
      <CatchGap size="related">
        {changed ? <CatchText as="p" variant="bodyM" role="alert">{changedText}</CatchText> : null}
        {children}
      </CatchGap>
    </CatchSheet>
  );
}

function pilotDraft(pilot: CommercialDetail["pilotPlan"]) {
  return {
    revision: pilot?.revision ?? 0, status: pilot?.status ?? "draft" as CommercialStatus, workflowId: pilot?.workflowId ?? "",
    objective: pilot?.objective ?? "", measures: pilot?.successMeasures.join("\n") ?? "", startsAt: inputDate(pilot?.startsAt),
    endsAt: inputDate(pilot?.endsAt), reviewEvidence: pilot?.reviewEvidence?.evidenceId ?? "", outcomeEvidence: pilot?.outcomeEvidence?.evidenceId ?? "",
  };
}

function PilotSheet({model, record, evidence, hasMoreEvidence, moreEvidence, onClose}: Shared) {
  const [draft, setDraft] = useState(() => pilotDraft(record.pilotPlan));
  const set = (patch: Partial<typeof draft>) => setDraft((current) => ({...current, ...patch}));
  const changed = (record.pilotPlan?.revision ?? 0) !== draft.revision;
  const successMeasures = draft.measures.split("\n").map((line) => line.trim()).filter(Boolean);
  const ready = KEY.test(draft.workflowId.trim()) && draft.objective.trim() && successMeasures.length >= 1 && successMeasures.length <= 8 &&
    validDate(draft.startsAt) && validDate(draft.endsAt);
  const submit = async () => {
    const done = await model.savePilot({expectedRevision: draft.revision, plan: {status: draft.status, workflowId: draft.workflowId.trim(),
      objective: draft.objective.trim(), successMeasures, startsAt: isoFrom(draft.startsAt), endsAt: isoFrom(draft.endsAt),
      reviewEvidence: draft.reviewEvidence ? {evidenceId: draft.reviewEvidence} : null,
      outcomeEvidence: draft.outcomeEvidence ? {evidenceId: draft.outcomeEvidence} : null}});
    if (done) onClose();
  };
  return (
    <BoundSheet title={record.pilotPlan ? "Edit the pilot" : "Plan a pilot"} changed={changed} onClose={onClose}
      changedText="This pilot changed since you opened this. Check the latest before you save."
      onUseLatest={() => setDraft(pilotDraft(record.pilotPlan))} saveLabel={model.isSaving ? "Saving" : "Save"}
      onSave={ready && !model.isSaving ? () => void submit() : null}>
      <CatchField recipe="select" title="Status" value={draft.status} values={keysOf(pilotStatusLabels)}
        itemLabelBuilder={(value) => pilotStatusLabels[value as CommercialStatus]}
        helperText="Review evidence comes before starting. Outcome evidence comes before finishing. A running or finished pilot can't restart."
        onChanged={(value) => set({status: (value ?? draft.status) as CommercialStatus})} />
      <CatchField recipe="input" title="Workflow key" maxLength={96} value={draft.workflowId} onChanged={(workflowId) => set({workflowId})}
        helperText="A short name with no spaces, like guest-applications." />
      <CatchField recipe="input" title="What it should show" maxLines={2} maxLength={1000} value={draft.objective} onChanged={(objective) => set({objective})} />
      <CatchField recipe="input" title="How we'll know, one per line" maxLines={3} value={draft.measures} onChanged={(measures) => set({measures})}
        helperText="Up to eight." />
      <CatchField recipe="input" title="Starts" keyboardType="datetime" value={draft.startsAt} onChanged={(startsAt) => set({startsAt})} />
      <CatchField recipe="input" title="Ends" keyboardType="datetime" value={draft.endsAt} onChanged={(endsAt) => set({endsAt})} />
      <EvidenceSelect title="Evidence the plan was reviewed" value={draft.reviewEvidence} onChanged={(reviewEvidence) => set({reviewEvidence})}
        evidence={evidence} hasMoreEvidence={hasMoreEvidence} moreEvidence={moreEvidence} />
      {draft.status === "completed" ? <EvidenceSelect title="Evidence of the outcome" value={draft.outcomeEvidence}
        onChanged={(outcomeEvidence) => set({outcomeEvidence})} evidence={evidence} hasMoreEvidence={false} moreEvidence={moreEvidence} /> : null}
    </BoundSheet>
  );
}

function quoteDraft(record: CommercialDetail) {
  const terms = record.quoteVersion?.terms;
  return {
    revision: record.quote?.revision ?? 0, currency: terms?.currency ?? "INR", amount: terms ? String(terms.amountMinor / 100) : "",
    cadence: terms?.billingCadence ?? "one_time" as CommercialTerms["billingCadence"], scope: terms?.scope ?? "",
    validUntil: inputDate(terms?.validUntil), facts: terms?.sourceFactRefs ?? [] as string[],
  };
}

function QuoteSheet({model, record, evidence, hasMoreEvidence, moreEvidence, onClose}: Shared) {
  const [draft, setDraft] = useState(() => quoteDraft(record));
  const set = (patch: Partial<typeof draft>) => setDraft((current) => ({...current, ...patch}));
  const changed = (record.quote?.revision ?? 0) !== draft.revision;
  const amountMinor = Math.round(Number(draft.amount) * 100);
  const validUntil = isoFrom(draft.validUntil);
  const ready = draft.amount.trim() && Number.isSafeInteger(amountMinor) && amountMinor >= 0 && draft.scope.trim() && validUntil &&
    draft.facts.length >= 1 && draft.facts.length <= 20;
  const submit = async () => {
    if (!validUntil) return;
    const done = await model.reviseQuote({expectedRevision: draft.revision, terms: {currency: draft.currency, amountMinor,
      billingCadence: draft.cadence, scope: draft.scope.trim(), validUntil, sourceFactRefs: draft.facts}});
    if (done) onClose();
  };
  return (
    <BoundSheet title={record.quote ? "New quote version" : "Write a quote"} changed={changed} onClose={onClose}
      changedText="This quote changed since you opened this. Check the latest before you save."
      onUseLatest={() => setDraft(quoteDraft(record))} saveLabel={model.isSaving ? "Saving" : "Save version"}
      onSave={ready && !model.isSaving ? () => void submit() : null}>
      <CatchField recipe="select" title="Currency" value={draft.currency} values={["INR", "USD"]} itemLabelBuilder={(value) => value} onChanged={(value) => set({currency: value ?? draft.currency})} />
      <CatchField recipe="input" title="Amount" keyboardType="number" value={draft.amount} onChanged={(amount) => set({amount})} />
      <CatchField recipe="select" title="Billed" value={draft.cadence} values={keysOf(billingCadenceLabels)}
        itemLabelBuilder={(value) => billingCadenceLabels[value as CommercialTerms["billingCadence"]]}
        onChanged={(value) => set({cadence: (value ?? draft.cadence) as CommercialTerms["billingCadence"]})} />
      <CatchField recipe="input" title="Exactly what's included" maxLines={3} maxLength={2000} value={draft.scope} onChanged={(scope) => set({scope})} />
      <CatchField recipe="input" title="Valid until" keyboardType="datetime" value={draft.validUntil} onChanged={(next) => set({validUntil: next})} />
      <CatchSection title="What it's based on" dividers="none" note="Choose recorded evidence about this host."
        empty={<CatchEmptyState title="No evidence yet" message="Add evidence on Overview first." />}>
        {evidence.map((item) => <CatchCheckboxInput key={item.evidenceId} label={`${evidenceClaimLabels[item.claimKey]}: ${item.sourceRef}`}
          value={draft.facts.includes(item.evidenceId)}
          onChanged={(on) => set({facts: on ? [...draft.facts, item.evidenceId] : draft.facts.filter((id) => id !== item.evidenceId)})} />)}
      </CatchSection>
      {hasMoreEvidence ? <CatchButton label="Show more evidence" variant="secondary" size="sm" onPressed={moreEvidence} /> : null}
    </BoundSheet>
  );
}

/** Approving and recording acceptance each name their own evidence for this exact saved version. */
function QuoteDecisionSheet({model, record, evidence, hasMoreEvidence, moreEvidence, onClose}: Shared) {
  const quote = record.quote;
  const terms = record.quoteVersion?.terms;
  const [revision, setRevision] = useState(quote?.revision ?? 0);
  const [evidenceId, setEvidenceId] = useState("");
  if (!quote || !terms) return null;
  const approving = quote.status === "draft";
  const changed = quote.revision !== revision;
  const usable = approving ? evidence : evidence.filter((item) => item.evidenceId !== record.approvedDecision?.evidence.evidenceId);
  const submit = async () => {
    const input = {expectedRevision: revision, termVersion: quote.termVersion, evidence: {evidenceId}};
    if (await (approving ? model.approveQuote(input) : model.acceptQuote(input))) onClose();
  };
  return (
    <BoundSheet title={approving ? "Approve this quote" : "Record acceptance"} changed={changed} onClose={onClose}
      changedText="This quote changed since you opened this. Check the latest before you decide."
      onUseLatest={() => { setRevision(quote.revision); setEvidenceId(""); }} saveLabel={model.isSaving ? "Saving" : approving ? "Approve" : "Record acceptance"}
      onSave={evidenceId && !model.isSaving ? () => void submit() : null}>
      <CatchMetaRow columns={2} entries={[
        {label: "Version", value: String(quote.termVersion)},
        {label: "Amount", value: `${moneyLabel(terms.amountMinor, terms.currency)}, ${billingCadenceLabels[terms.billingCadence].toLowerCase()}`},
        {label: "Includes", value: terms.scope, wide: true},
      ]} />
      <EvidenceSelect title="Evidence for this version" value={evidenceId} onChanged={setEvidenceId} evidence={usable}
        hasMoreEvidence={hasMoreEvidence} moreEvidence={moreEvidence}
        helperText={approving ? "This charges nothing and confirms no payment." : "This has to be different from the approval's evidence. Payment stays unknown."} />
    </BoundSheet>
  );
}

function CollectionSheet({model, record, evidence, hasMoreEvidence, moreEvidence, onClose}: Shared) {
  const quote = record.quote;
  const terms = record.quoteVersion?.terms;
  const [revision, setRevision] = useState(quote?.revision ?? 0);
  const [receivedAt, setReceivedAt] = useState("");
  const [method, setMethod] = useState<CommercialSettlementInput["settlementMethod"]>("bank_transfer");
  const [reference, setReference] = useState("");
  const [ledger, setLedger] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [proofId, setProofId] = useState("");
  if (!quote || !terms) return null;
  const changed = quote.revision !== revision;
  const recurring = terms.billingCadence === "monthly" || terms.billingCadence === "annual";
  const eligible = evidence.filter((item) => item.sourceType === "first_party" || item.sourceType === "import_artifact");
  const received = isoFrom(receivedAt);
  const startsAt = isoFrom(periodStart);
  const endsAt = isoFrom(periodEnd);
  const ready = received && proofId && reference.trim().length >= 6 && LEDGER_TEXT.test(reference.trim()) &&
    ledger.trim().length >= 3 && LEDGER_TEXT.test(ledger.trim()) && (!recurring || (startsAt && endsAt));
  const submit = async () => {
    if (!received) return;
    const done = await model.attestCollection({expectedQuoteRevision: revision, termVersion: quote.termVersion, amountMinor: terms.amountMinor,
      currency: terms.currency, purpose: "host_subscription", receivedAt: received, settlementMethod: method, settlementReference: reference.trim(),
      recipientAccountScope: ledger.trim(), servicePeriod: recurring && startsAt && endsAt ? {startsAt, endsAt} : null, evidence: {evidenceId: proofId}});
    if (done) onClose();
  };
  return (
    <BoundSheet title="Record what the host paid" changed={changed} onClose={onClose}
      changedText="This quote changed since you opened this. Check the latest before you save."
      onUseLatest={() => setRevision(quote.revision)} saveLabel={model.isSaving ? "Saving" : "Record payment"}
      onSave={ready && !model.isSaving ? () => void submit() : null}>
      <CatchText as="p" variant="bodyM">
        Exactly {moneyLabel(terms.amountMinor, terms.currency)}, received outside Catch. This doesn't charge anything, confirm it with a provider or count guest bookings.
      </CatchText>
      <CatchField recipe="input" title="Received on" keyboardType="datetime" value={receivedAt} onChanged={setReceivedAt} />
      <CatchField recipe="select" title="How" value={method} values={keysOf(settlementMethodLabels)}
        itemLabelBuilder={(value) => settlementMethodLabels[value as CommercialSettlementInput["settlementMethod"]]}
        onChanged={(value) => setMethod((value ?? method) as CommercialSettlementInput["settlementMethod"])} />
      <CatchField recipe="input" title="Payment reference" maxLength={120} value={reference} onChanged={setReference}
        helperText="At least six letters or numbers, as it appears on the statement." />
      <CatchField recipe="input" title="Account it reached" maxLength={96} value={ledger} onChanged={setLedger} />
      {recurring ? <>
        <CatchField recipe="input" title="Period starts" keyboardType="datetime" value={periodStart} onChanged={setPeriodStart} />
        <CatchField recipe="input" title="Period ends" keyboardType="datetime" value={periodEnd} onChanged={setPeriodEnd} />
      </> : null}
      <EvidenceSelect title="Proof of payment" value={proofId} onChanged={setProofId} evidence={eligible}
        hasMoreEvidence={hasMoreEvidence} moreEvidence={moreEvidence} helperText="From the host or an import. A staff note alone isn't proof." />
    </BoundSheet>
  );
}

function CloseSheet({model, record, onClose}: Pick<Shared, "model" | "record" | "onClose">) {
  const {opportunity, quote, settlementAttestation: attestation} = record;
  const reviewKey = `${quote?.revision}:${attestation?.attestationId}:${opportunity.revision}`;
  const [opened, setOpened] = useState(reviewKey);
  if (!attestation) return null;
  const submit = async () => {
    const done = await model.closeWon({expectedRevision: opportunity.revision, financeAttestationId: attestation.attestationId,
      fields: {motion: opportunity.motion, stage: "closed_won", ownerUid: opportunity.ownerUid, nextStep: null, nextStepAt: null}});
    if (done) onClose();
  };
  return (
    <BoundSheet title="Close as won" changed={opened !== reviewKey} onClose={onClose}
      changedText="This deal changed since you opened this. Check the latest before you close it."
      onUseLatest={() => setOpened(reviewKey)} saveLabel={model.isSaving ? "Saving" : "Close as won"}
      onSave={model.isSaving ? null : () => void submit()}>
      <CatchMetaRow columns={2} entries={[
        {label: "Quote version", value: String(quote?.termVersion ?? "")},
        {label: "Paid", value: moneyLabel(attestation.amountMinor, attestation.currency)},
        {label: "Reference", value: attestation.settlementReference},
        {label: "Proof", value: attestation.evidence.sourceRef},
      ]} />
      <CatchText as="p" variant="bodyM">This records the outcome against this quote and payment. It doesn't confirm the payment with a provider or switch on a product.</CatchText>
    </BoundSheet>
  );
}

function reportSubtitle(row: CommercialReportRow): string {
  const collected = row.manuallyAttestedHostRevenue;
  return [`Pilot: ${row.pilotStatus ? pilotStatusLabels[row.pilotStatus] : "None"}`, `Quote: ${row.quoteStatus ? quoteStatusLabels[row.quoteStatus] : "None"}`,
    `Paid: ${collected ? `${moneyLabel(collected.amountMinor, collected.currency)}, recorded by hand` : "Unknown"}`].join(" · ");
}

type Sheet = "pilot" | "quote" | "decision" | "collection" | "close";

/**
 * One deal's pilot, quote, payment and close, under Deals on a host's page. Each decision names its own
 * evidence. Nothing here charges anyone or confirms a payment with a provider.
 */
export function SalesHostCommercialWorkspace({model, deals, evidence, hasMoreEvidence, moreEvidence, isAdminOwner}: {
  model: SalesHostCommercialModel;
  deals: readonly SalesOpportunity[];
  evidence: SalesEvidence[];
  hasMoreEvidence: boolean;
  moreEvidence: () => void;
  /** Only the owner records a payment and closes a deal as won. */
  isAdminOwner: boolean;
}) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const close = () => setSheet(null);
  const options = [...deals.map((deal) => ({id: deal.opportunityId, stage: deal.stage})),
    ...model.reportRows.filter((row) => !deals.some((deal) => deal.opportunityId === row.opportunityId)).map((row) => ({id: row.opportunityId, stage: row.stage}))];
  const record = model.record?.opportunity.opportunityId === model.dealId ? model.record : null;
  const shared = record ? {model, record, evidence, hasMoreEvidence, moreEvidence, onClose: close} : null;
  const pilot = record?.pilotPlan;
  const quote = record?.quote;
  const terms = record?.quoteVersion?.terms;
  const paid = record?.settlementAttestation;
  const won = record?.opportunity.stage === "closed_won";
  return (
    <CatchGap size="section">
      {options.length > 1 ? <CatchField recipe="select" title="Deal" value={model.dealId ?? ""} values={options.map((option) => option.id)}
        itemLabelBuilder={(id) => stageLabel(options.find((option) => option.id === id)?.stage ?? id)}
        onChanged={(value) => model.selectDeal(value)} /> : null}
      {model.recordFailed ? <CatchEmptyState title="This deal's terms could not be loaded"
        actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={model.retryRecord} />} /> : null}
      {record ? <>
        <CatchSection title="Pilot" dividers="none" action={{label: pilot ? "Edit" : "Plan a pilot", onPressed: () => setSheet("pilot")}}>
          {pilot ? <CatchMetaRow columns={2} entries={[
            {label: "Status", value: pilotStatusLabels[pilot.status]},
            {label: "Workflow", value: pilot.workflowId},
            {label: "What it should show", value: pilot.objective, wide: true},
            {label: "How we'll know", value: pilot.successMeasures.join(", "), wide: true},
            ...(pilot.startsAt ? [{label: "Starts", value: day(pilot.startsAt)}] : []),
            ...(pilot.endsAt ? [{label: "Ends", value: day(pilot.endsAt)}] : []),
            ...(pilot.reviewEvidence ? [{label: "Reviewed from", value: pilot.reviewEvidence.sourceRef, wide: true}] : []),
            ...(pilot.outcomeEvidence ? [{label: "Outcome from", value: pilot.outcomeEvidence.sourceRef, wide: true}] : []),
          ]} /> : <CatchEmptyState title="No pilot planned" />}
        </CatchSection>
        <CatchSection title="Quote" dividers="none" {...(quote?.status === "accepted_reviewed" ? {} :
          {action: {label: quote ? "New version" : "Write a quote", onPressed: () => setSheet("quote")}})}>
          {quote && terms ? <CatchMetaRow columns={2} entries={[
            {label: "Status", value: `${quoteStatusLabels[quote.status]}, version ${quote.termVersion}`},
            {label: "Amount", value: `${moneyLabel(terms.amountMinor, terms.currency)}, ${billingCadenceLabels[terms.billingCadence].toLowerCase()}`},
            {label: "Includes", value: terms.scope, wide: true},
            {label: "Valid until", value: day(terms.validUntil)},
            ...(record.approvedDecision ? [{label: "Approved from", value: record.approvedDecision.evidence.sourceRef, wide: true}] : []),
            ...(record.acceptedDecision ? [{label: "Accepted from", value: record.acceptedDecision.evidence.sourceRef, wide: true}] : []),
          ]} /> : <CatchEmptyState title="No quote yet" />}
        </CatchSection>
        {quote && quote.status !== "accepted_reviewed" ? <CatchButton label={quote.status === "draft" ? "Approve this quote" : "Record acceptance"}
          variant="secondary" size="sm" onPressed={() => setSheet("decision")} /> : null}
        <CatchSection title="Payment and close" dividers="none">
          {paid ? <CatchMetaRow columns={2} entries={[
            {label: "Paid", value: moneyLabel(paid.amountMinor, paid.currency)},
            {label: "Received", value: `${day(paid.receivedAt)}, ${settlementMethodLabels[paid.settlementMethod].toLowerCase()}`},
            {label: "Reference", value: paid.settlementReference},
            {label: "Account", value: paid.recipientAccountScope},
            {label: "Proof", value: paid.evidence.sourceRef, wide: true},
            {label: "Provider", value: "Not confirmed"},
            ...(won ? [{label: "Deal", value: "Closed as won", tone: "success" as const}] : []),
          ]} /> : <CatchEmptyState title="No payment recorded" message="Payment stays unknown until the owner records it." />}
        </CatchSection>
        {isAdminOwner && quote?.status === "accepted_reviewed" && !paid ? <CatchButton label="Record what the host paid" variant="secondary" size="sm"
          onPressed={() => setSheet("collection")} /> : null}
        {isAdminOwner && paid && !won ? <CatchButton label="Close as won" variant="secondary" size="sm" onPressed={() => setSheet("close")} /> : null}
        <CatchSection title="Stage history" dividers="none" note={record.historyTruncated ? "Showing the first 25 changes." : undefined}
          empty={<CatchEmptyState title="No stage changes yet" />}>
          {record.history.map((entry) => <CatchIndexRow key={`${entry.changedAt}:${entry.toStage}`} titleVariant="bodyM"
            title={`${entry.fromStage ? stageLabel(entry.fromStage) : "New"} to ${stageLabel(entry.toStage)}`}
            subtitle={[day(entry.changedAt), entry.reason].filter(Boolean).join(" · ")} />)}
        </CatchSection>
      </> : null}
      <CatchSection title="Every deal with this host" dividers="none" note="Booked revenue stays unset until finance reconciles it."
        empty={model.reportFailed ? <CatchEmptyState title="These could not be loaded"
          actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={model.retryReport} />} /> : <CatchEmptyState title="No deals yet" />}>
        {model.reportRows.map((row) => <CatchIndexRow key={row.opportunityId} title={stageLabel(row.stage)} titleVariant="bodyM" subtitle={reportSubtitle(row)} />)}
      </CatchSection>
      {model.hasMoreReport ? <CatchButton label="Show more deals" variant="secondary" size="sm" onPressed={model.moreReport} /> : null}
      {shared && sheet === "pilot" ? <PilotSheet {...shared} /> : null}
      {shared && sheet === "quote" ? <QuoteSheet {...shared} /> : null}
      {shared && sheet === "decision" ? <QuoteDecisionSheet {...shared} /> : null}
      {shared && sheet === "collection" ? <CollectionSheet {...shared} /> : null}
      {shared && sheet === "close" ? <CloseSheet {...shared} /> : null}
    </CatchGap>
  );
}
