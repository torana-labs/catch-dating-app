import {CatchButton, CatchCheckboxInput, CatchEmptyState, CatchField, CatchGap, CatchIndexRow, CatchMetaRow, CatchSection, CatchText} from "@catch/web-ui";
import {useAdminOperationPending} from "../../../shared/pendingOperation";
import {useSalesDemoPartnerReviewController} from "../controllers/useSalesDemoPartnerReviewController";
import type {SalesDemoPartnerReviewApi} from "../api/salesDemoPartnerReview";
import type {DemoReviewWording} from "../../../shared/domain/salesDemoReview";
import {useCallback, useEffect, useState} from "react";
import {selectChoices} from "../controllers/salesLabels";
import type {DemoBlueprint, DemoCapabilityReview, DemoDisposition,
  DemoFieldMapping, DemoManagementApi, DemoPreviewCopy} from
  "../api/salesDemoManagement";
import type {DemoSetupPlanInput} from "../api/salesDemoManagement";
import {useSalesDemoManagementController} from
  "../controllers/useSalesDemoManagementController";
import {brand} from "@catch/brand";

const reviewAreas = [
  ["questionTypes", "Question types"], ["branching", "Branching"],
  ["requiredFields", "Required fields"], ["scoringApproval", "Scoring and approval"],
  ["uploads", "Uploads"],
] as const;
const dispositions: Array<{value: DemoDisposition; label: string}> = [
  {value: "exact", label: "Works the same way"},
  {value: "manual", label: "Needs a manual step"},
  {value: "retained", label: "Keep the existing tool"},
  {value: "unsupported", label: "Not supported"},
];
type FormState = {preview: DemoPreviewCopy;
  review: DemoCapabilityReview; mappings: DemoFieldMapping[];
  setupPlan: DemoSetupPlanInput};
function editablePlan(plan: DemoBlueprint["setupPlan"]): DemoSetupPlanInput {
  if (plan?.mode === "template") return {mode: "template",
    requirements: [...plan.requirements], templateId: plan.templateId,
    title: plan.title};
  return {mode: "manual", requirements: plan?.requirements ??
    ["Review requirements with the Catch team before creating a form."]};
}
function emptyForm(organizerName: string): FormState {
  return {preview: {brandName: organizerName.slice(0, 160), headline: "",
    scenario: "", steps: ["", "", ""], retainedTools: [],
    limitations: ["Synthetic example only; no real messages or admissions."],
    cta: "Try the example"},
  review: {questionTypes: "manual", branching: "manual",
    requiredFields: "manual", scoringApproval: "manual", uploads: "retained"},
  mappings: [], setupPlan: editablePlan(undefined)};
}
function lines(values: string[]): string {return values.join("\n");}
function splitLines(value: string): string[] {
  return value.split(/\r?\n/u);
}
function normalizedLines(values: string[]): string[] {
  return values.map((part) => part.trim()).filter(Boolean);
}
function validOrigin(): string | null {
  try {
    const url = new URL(import.meta.env.VITE_ADMIN_PUBLIC_SITE_ORIGIN ??
      brand.web.origin);
    if (!["http:", "https:"].includes(url.protocol) || url.username ||
        url.password || url.pathname !== "/" || url.search || url.hash) {
      return null;
    }
    return url.origin;
  } catch {return null;}
}

/** Mount inside a host detail; the server independently checks adminOwner. */
export function SalesDemoWorkspace({organizerId, organizerName, isAdminOwner,
  currentUserUid, api}: {organizerId: string; organizerName: string;
  isAdminOwner: boolean; currentUserUid: string; api?: DemoManagementApi}) {
  if (!isAdminOwner) return <CatchEmptyState title="Private workflow example" message="An Admin owner can prepare and issue private demos." />;
  return <OwnerDemoPanel key={`${currentUserUid}:${organizerId}`}
    organizerId={organizerId} organizerName={organizerName}
    currentUserUid={currentUserUid} api={api} />;
}

function OwnerDemoPanel({organizerId, organizerName, currentUserUid, api}: {
  organizerId: string; organizerName: string; currentUserUid: string;
  api?: DemoManagementApi;
}) {
  const controller = useSalesDemoManagementController({isAdminOwner: true,
    actorUid: currentUserUid, organizerId, api});
  const [form, setForm] = useState<FormState>(() => emptyForm(organizerName));
  const [formRevision, setFormRevision] = useState(0);
  const [formBlueprintId, setFormBlueprintId] = useState<string | null>(null);
  const [sharingPending, setSharingPending] = useState(false);
  const reportSharingPending = useCallback((value: boolean) => setSharingPending(value), []);
  const [dirty, setDirty] = useState(false);
  const [contactKind, setContactKind] = useState<"preview" | "email" | "phone">(
    "preview");
  const [contactValue, setContactValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [sessionCap, setSessionCap] = useState("1");
  const [copyNotice, setCopyNotice] = useState("");
  const selected = controller.blueprint.data;
  useEffect(() => {
    if (controller.confirmedSave?.blueprintId !== controller.blueprintId) return;
    setFormRevision(controller.confirmedSave.revision);
    setDirty(false);
  }, [controller.confirmedSave, controller.blueprintId]);
  useEffect(() => {
    if (!selected || dirty) return;
    if (controller.confirmedSave?.blueprintId === selected.blueprintId &&
        selected.revision < controller.confirmedSave.revision) return;
    setForm({preview: selected.preview,
      review: selected.formCapabilityReview,
      mappings: selected.fieldMappings, setupPlan: editablePlan(selected.setupPlan)});
    setFormRevision(selected.revision);
    setFormBlueprintId(selected.blueprintId);
  }, [selected, dirty, controller.confirmedSave]);
  const beginNew = () => {
    controller.newBlueprint();
    setForm(emptyForm(organizerName)); setFormRevision(0);
    setFormBlueprintId(null); setDirty(false); setCopyNotice("");
  };
  const selectBlueprint = (item: DemoBlueprint) => {
    controller.loadBlueprint(item.blueprintId);
    setForm({preview: item.preview, review: item.formCapabilityReview,
      mappings: item.fieldMappings, setupPlan: editablePlan(item.setupPlan)});
    setFormRevision(item.revision); setFormBlueprintId(item.blueprintId);
    setDirty(false); setCopyNotice("");
  };
  const edit = (next: FormState) => {setForm(next); setDirty(true);};
  const stale = Boolean(selected && selected.revision !== formRevision &&
    selected.blueprintId === formBlueprintId);
  const active = controller.blueprintId !== null;
  const locked = controller.busy || Boolean(controller.pending) || sharingPending;
  const sourceCurrent = !controller.blueprintExists || (controller.blueprint.isSuccess &&
    !controller.blueprint.isFetching && !controller.blueprint.isError);
  const capabilityReady = controller.capability.isSuccess && !controller.capability.isFetching &&
    !controller.capability.isError && controller.capability.data.enabled === true;
  const previewValid = Boolean(form.preview.brandName.trim() &&
    form.preview.headline.trim() && form.preview.scenario.trim() &&
    form.preview.steps.length === 3 &&
    form.preview.steps.every((step) => step.trim()) &&
    normalizedLines(form.preview.limitations).length);
  const requirements = normalizedLines(form.setupPlan.requirements);
  const templateId = form.setupPlan.mode === "template" ?
    form.setupPlan.templateId : null;
  const setupValid = requirements.length <= 12 &&
    requirements.every((part) => part.length <= 160) &&
    (form.setupPlan.mode === "manual" ? requirements.length > 0 :
      Boolean(templateId && form.setupPlan.title.trim() &&
      controller.capability.data?.templateOptions.some((option) =>
        option.templateId === templateId)));
  const expiryMillis = Date.parse(expiresAt);
  const expiryValid = Number.isFinite(expiryMillis) &&
    expiryMillis > Date.now() && expiryMillis <= Date.now() + 7 * 86_400_000;
  const save = async () => {
    if (!controller.blueprintId || !capabilityReady || !previewValid || !setupValid ||
        stale || locked || !sourceCurrent || selected?.state === "withdrawn") return;
    await controller.save({blueprintId: controller.blueprintId,
      expectedRevision: formRevision, organizerId, candidateId: null,
      opportunityId: null,
      evidenceRevision: controller.capability.data!.evidenceRevision,
      preview: {...form.preview,
        retainedTools: normalizedLines(form.preview.retainedTools),
        limitations: normalizedLines(form.preview.limitations)},
      formCapabilityReview: form.review,
      fieldMappings: form.mappings,
      setupPlan: form.setupPlan.mode === "manual" ?
        {mode: "manual", requirements} :
        {mode: "template", requirements, templateId: form.setupPlan.templateId,
          title: form.setupPlan.title.trim()}});
  };
  const issue = async () => {
    if (!selected || selected.state !== "reviewed" || locked || stale ||
        dirty || !sourceCurrent || !expiryValid) return;
    const parsed = expiryMillis;
    const cap = Number(sessionCap);
    if (!Number.isFinite(parsed) || !Number.isInteger(cap) ||
        cap < 1 || cap > 3) return;
    const binding = contactKind === "preview" ? null :
      {kind: contactKind, value: contactValue.trim()};
    await controller.issue({blueprintId: selected.blueprintId,
      blueprintRevision: formRevision, contactBinding: binding,
      expiresAt: new Date(parsed).toISOString(), sessionCap: cap});
    setContactValue("");
  };
  const copyLink = async () => {
    const issued = controller.issuedGrant;
    const origin = validOrigin();
    if (!sourceCurrent || locked || !issued || !origin || !/^[A-Za-z0-9_-]{43}$/u.test(
      issued.grantToken)) return;
    const link = `${origin}/demo/${encodeURIComponent(issued.invitationId)}`+
      `#grant=${issued.grantToken}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopyNotice("Private link copied. Share it only with the intended contact.");
    } catch {setCopyNotice("The link could not be copied. Try again.");}
  };

  const small = {variant: "secondary", size: "sm"} as const;
  return <CatchSection title="Private workflow example" dividers="none">
    <CatchGap size="section">
      <CatchGap size="related">
        <CatchText as="p" variant="supporting">Build a private, synthetic example for {organizerName}. No real guests,
          messages, charges, membership, or publication are changed.</CatchText>
        {controller.capability.isPending ? <CatchText as="p" variant="supporting">Checking supported example…</CatchText> : null}
        {!capabilityReady ? <CatchText as="p" variant="supporting" role="alert">The supported demo capability is
          unavailable. The demo has not been enabled for this environment.</CatchText> : null}
        {controller.error ? <CatchText as="p" variant="supporting" role="alert">{controller.error}</CatchText> : null}
        {controller.notice ? <CatchText as="p" variant="supporting" role="status">{controller.notice}</CatchText> : null}
        {controller.pending ? <CatchButton {...small} label="Retry unchanged request" onPressed={controller.busy ? null : () => void controller.retry()} /> : null}
        {controller.blueprintExists ? <CatchButton {...small} label="Refresh example and access" onPressed={controller.busy || controller.blueprint.isFetching ? null :
          () => {void controller.blueprint.refetch(); void controller.capability.refetch();}} /> : null}
        {!sourceCurrent ? <CatchText as="p" variant="supporting">Current example access is being checked or was denied. Refresh to review it.</CatchText> : null}
      </CatchGap>
      {sourceCurrent ? <CatchGap size="related">
        <CatchSection title="Saved examples" dividers="none"
          {...(controller.blueprintList.isError ? {empty: <CatchEmptyState title="Saved examples could not be loaded"
            actions={<CatchButton {...small} label="Try again" onPressed={() => void controller.blueprintList.refetch()} />} />} : {})}>
          {controller.blueprintList.data?.rows.map((item) => <CatchIndexRow key={item.blueprintId} title={item.preview.headline} titleVariant="bodyM"
            subtitle={`${item.state} · revision ${item.revision}`}
            trailing={<CatchButton {...small} label="Open" onPressed={locked ? null : () => selectBlueprint(item)} />} />)}
        </CatchSection>
        <CatchGap size="inline" direction="horizontal" wrap>
          {controller.blueprintList.data?.nextCursor ? <CatchButton {...small} label="More examples" onPressed={locked ? null :
            () => controller.nextBlueprintPage(controller.blueprintList.data!.nextCursor!)} /> : null}
          {controller.blueprintHistory.length ? <CatchButton {...small} label="Previous examples" onPressed={locked ? null : controller.previousBlueprintPage} /> : null}
          {controller.blueprintHistory.length > 1 ? <CatchButton {...small} label="First examples" onPressed={locked ? null : controller.firstBlueprintPage} /> : null}
          <CatchButton {...small} label="New example" onPressed={locked || !capabilityReady ? null : beginNew} />
        </CatchGap>
      </CatchGap> : null}
      {selected ? <SalesDemoPartnerSharePanel key={`${currentUserUid}:${organizerId}:${selected.blueprintId}`}
        actorUid={currentUserUid} organizerId={organizerId} blueprintId={selected.blueprintId} blueprintRevision={selected.revision}
        parentAccessCurrent={selected.state === "reviewed" && controller.blueprint.isSuccess && !controller.blueprint.isFetching &&
          !controller.blueprint.isError && !dirty && !stale && !controller.busy && !controller.pending}
        onPendingChange={reportSharingPending} onLoadWording={(wording) => edit({...form, preview: {...form.preview, ...wording}})} /> : null}
      {active && sourceCurrent ? <>
        <CatchSection title={selected ? "Edit example" : "New example"} dividers="none">
          <CatchGap size="related">
            {controller.blueprint.isError ? <CatchText as="p" variant="supporting" role="alert">This blueprint could not
              be loaded. Choose it again from the list.</CatchText> : null}
            {stale ? <CatchText as="p" variant="supporting" role="alert">This blueprint changed while you were editing.
              Review the current version before saving.</CatchText> : null}
            <BlueprintEditor form={form} edit={edit} templateOptions={controller.capability.data?.templateOptions ?? []}
              disabled={locked || selected?.state === "withdrawn"} />
            <CatchGap size="inline" direction="horizontal" wrap>
              <CatchButton size="sm" label="Save draft" onPressed={locked || !capabilityReady || !previewValid || !setupValid || stale ||
                selected?.state === "withdrawn" || (controller.blueprintExists && !dirty) ? null : () => void save()} />
              {selected?.state === "draft" ? <CatchButton {...small} label="Mark reviewed" onPressed={locked || dirty || stale ? null :
                () => void controller.change("review", selected.blueprintId, formRevision)} /> : null}
              {selected && selected.state !== "withdrawn" ? <CatchButton {...small} label="Withdraw example" onPressed={locked || dirty || stale ? null :
                () => void controller.change("withdraw", selected.blueprintId, formRevision)} /> : null}
            </CatchGap>
          </CatchGap>
        </CatchSection>
        {selected?.state === "reviewed" && !dirty ? <CatchSection title="Issue private invitation" dividers="none">
          <CatchGap size="related">
            <CatchText as="p" variant="supporting">An unbound link shows the preview only. Interactive access requires
              an intended email or verified phone.</CatchText>
            <CatchField recipe="select" title="Who may try it?" value={contactKind} inputMode={locked ? "inactive" : "editable"}
              onChanged={(value) => setContactKind((value ?? "") as typeof contactKind)}
              {...selectChoices([{value: "preview", label: "Preview only"}, {value: "email", label: "Verified email"}, {value: "phone", label: "Verified phone"}])} />
            {contactKind !== "preview" ? <CatchField recipe="input" title={contactKind === "email" ? "Intended email" : "Intended phone (+country code)"}
              keyboardType={contactKind === "email" ? "emailAddress" : "phone"} value={contactValue} onChanged={setContactValue}
              inputMode={locked ? "inactive" : "editable"} /> : null}
            <CatchField recipe="input" title="Expires (within seven days)" value={expiresAt} onChanged={setExpiresAt}
              inputMode={locked ? "inactive" : "editable"} keyboardType="datetime" />
            {expiresAt && !expiryValid ? <CatchText as="p" variant="supporting" role="alert">Choose a future expiry within seven days.</CatchText> : null}
            <CatchField recipe="select" title="Maximum trial sessions" value={sessionCap} onChanged={(value) => setSessionCap(value ?? "")}
              inputMode={locked ? "inactive" : "editable"}
              {...selectChoices([{value: "1", label: "One"}, {value: "2", label: "Two"}, {value: "3", label: "Three"}])} />
            <CatchButton size="sm" label="Issue invitation" onPressed={locked || !expiryValid || (contactKind !== "preview" && !contactValue.trim()) ? null : () => void issue()} />
          </CatchGap>
        </CatchSection> : null}
        <CatchSection title="Invitations" dividers="none"
          {...(controller.invitationList.isError ? {empty: <CatchEmptyState title="Invitations could not be loaded"
            actions={<CatchButton {...small} label="Try again" onPressed={() => void controller.invitationList.refetch()} />} />} : {})}
          {...(controller.invitationList.isPending ? {note: "Loading invitations…"} : {})}>
          {controller.invitationList.data?.rows.map((item) => <CatchIndexRow key={item.invitationId} titleVariant="bodyM"
            title={item.revoked ? "Revoked invitation" : "Active invitation"}
            subtitle={`Expires ${new Date(item.expiresAt).toLocaleString()} · ${item.sessionCount}/${item.sessionCap} sessions`}
            {...(!item.revoked ? {trailing: <CatchButton {...small} label="Revoke" onPressed={locked ? null : () => void controller.revoke(item.invitationId, item.revision)} />} : {})} />)}
        </CatchSection>
        <CatchGap size="inline" direction="horizontal" wrap>
          {controller.invitationList.data?.nextCursor ? <CatchButton {...small} label="More invitations" onPressed={locked ? null :
            () => controller.nextInvitationPage(controller.invitationList.data!.nextCursor!)} /> : null}
          {controller.invitationHistory.length ? <CatchButton {...small} label="Previous invitations" onPressed={locked ? null : controller.previousInvitationPage} /> : null}
          {controller.invitationHistory.length > 1 ? <CatchButton {...small} label="First invitations" onPressed={locked ? null : controller.firstInvitationPage} /> : null}
        </CatchGap>
        {controller.issuedGrant ? <CatchText as="p" variant="supporting" role="status">Invitation issued.
          The private link is available here until you leave this view.</CatchText> : null}
        {controller.issuedGrant && validOrigin() ? <CatchButton {...small} label="Copy private link" onPressed={locked ? null : () => void copyLink()} /> : null}
        {controller.issuedGrant && !validOrigin() ? <CatchText as="p" variant="supporting" role="alert">
          Public site origin is unavailable; link copying is disabled.</CatchText> : null}
        {copyNotice ? <CatchText as="p" variant="supporting" role="status">{copyNotice}</CatchText> : null}
      </> : null}
    </CatchGap>
  </CatchSection>;
}

function BlueprintEditor({form, edit, disabled, templateOptions}: {form: FormState;
  edit: (next: FormState) => void; disabled: boolean;
  templateOptions: Array<{templateId: string; title: string}>}) {
  const setPreview = (patch: Partial<DemoPreviewCopy>) => edit({...form,
    preview: {...form.preview, ...patch}});
  return <CatchGap size="related">
    <CatchText as="h4" variant="titleS">After the sample</CatchText>
    <CatchText as="p" variant="supporting">This plan is reviewed separately. It never publishes a form or copies
      sample answers into a real form.</CatchText>
    <CatchField
      recipe="select"
      title="Setup approach"
      value={form.setupPlan.mode}
      inputMode={disabled ? "inactive" : "editable"}
      {...selectChoices([{value: "manual", label: "Manual handoff"},
        {value: "template", label: "Prepare a reviewed form template"}])}
      onChanged={(value) => edit({...form, setupPlan: (value ?? "") === "template" ?
        {mode: "template", requirements: form.setupPlan.requirements,
          templateId: "", title: ""} :
        {mode: "manual", requirements: form.setupPlan.requirements}})}
    />
    {form.setupPlan.mode === "template" ? <>
      <CatchField
        recipe="select"
        title="Reviewed form template"
        inputMode={disabled ? "inactive" : "editable"}
        value={form.setupPlan.templateId}
        {...selectChoices([{value: "", label: "Choose a template"},
          ...templateOptions.map((item) => ({value: item.templateId,
            label: item.title}))])}
        onChanged={(templateId) => {
          if (form.setupPlan.mode === "template") edit({...form,
            setupPlan: {...form.setupPlan, templateId: templateId ?? ""}});
        }}
      />
      <CatchField
        recipe="input"
        title="Draft form title"
        inputMode={disabled ? "inactive" : "editable"}
        value={form.setupPlan.title}
        onChanged={(title) => {
          if (form.setupPlan.mode === "template") edit({...form,
            setupPlan: {...form.setupPlan, title}});
        }}
      />
    </> : null}
    <CatchField
      recipe="input"
      title="Setup steps (one per line)"
      maxLines={3}
      inputMode={disabled ? "inactive" : "editable"}
      value={lines(form.setupPlan.requirements)}
      onChanged={(value) => edit({...form, setupPlan: {...form.setupPlan,
        requirements: splitLines(value)}})}
    />
    <CatchText as="p" variant="supporting">Up to twelve steps, 160 characters each. Manual handoff needs at least one.</CatchText>
    <CatchField
      recipe="input"
      title="Host name in preview"
      value={form.preview.brandName}
      onChanged={(brandName) => setPreview({brandName})}
      inputMode={disabled ? "inactive" : "editable"}
    />
    <CatchField
      recipe="input"
      title="Headline"
      value={form.preview.headline}
      onChanged={(headline) => setPreview({headline})}
      inputMode={disabled ? "inactive" : "editable"}
    />
    <CatchField
      recipe="input"
      title="Scenario"
      maxLines={2}
      value={form.preview.scenario}
      onChanged={(scenario) => setPreview({scenario})}
      inputMode={disabled ? "inactive" : "editable"}
    />
    {form.preview.steps.map((step, index) => <CatchField
      recipe="input"
      key={index}
      title={`Synthetic step ${index + 1}`}
      value={step}
      onChanged={(value) => setPreview({steps: form.preview.steps.map(
        (part, at) => at === index ? value : part)})}
      inputMode={disabled ? "inactive" : "editable"}
    />)}
    <CatchField
      recipe="input"
      title="Tools that stay in place (one per line)"
      maxLines={3}
      value={lines(form.preview.retainedTools)}
      inputMode={disabled ? "inactive" : "editable"}
      onChanged={(value) => setPreview({retainedTools: splitLines(value)})}
    />
    <CatchField
      recipe="input"
      title="Limits to disclose (one per line)"
      maxLines={3}
      value={lines(form.preview.limitations)}
      inputMode={disabled ? "inactive" : "editable"}
      onChanged={(value) => setPreview({limitations: splitLines(value)})}
    />
    <CatchField
      recipe="input"
      title="Try button text"
      value={form.preview.cta}
      onChanged={(cta) => setPreview({cta})}
      inputMode={disabled ? "inactive" : "editable"}
    />
    <CatchText as="h4" variant="titleS">Form capability review</CatchText>
    {reviewAreas.map(([area, label]) => <CatchField
      recipe="select"
      key={area}
      title={label}
      value={form.review[area]}
      inputMode={disabled ? "inactive" : "editable"}
      {...selectChoices(dispositions)}
      onChanged={(value) => edit({...form,
        review: {...form.review, [area]: (value ?? "") as DemoDisposition}})}
    />)}
    <CatchText as="h4" variant="titleS">Field mapping</CatchText>
    {form.mappings.map((mapping, index) => <CatchGap key={index} size="related">
      <CatchField recipe="input" title={`Source field ${index + 1}`} value={mapping.sourceField} inputMode={disabled ? "inactive" : "editable"}
        onChanged={(sourceField) => edit({...form, mappings: form.mappings.map((part, at) => at === index ? {...part, sourceField} : part)})} />
      <CatchField recipe="input" title={`Catch field ${index + 1} (if supported)`} value={mapping.catchField ?? ""} inputMode={disabled ? "inactive" : "editable"}
        onChanged={(catchField) => edit({...form, mappings: form.mappings.map((part, at) => at === index ? {...part, catchField: catchField || null} : part)})} />
      <CatchField recipe="select" title={`Mapping outcome ${index + 1}`} value={mapping.disposition} inputMode={disabled ? "inactive" : "editable"}
        {...selectChoices(dispositions)}
        onChanged={(value) => edit({...form, mappings: form.mappings.map((part, at) => at === index ? {...part, disposition: (value ?? "") as DemoDisposition} : part)})} />
      <CatchButton variant="secondary" size="sm" label="Remove mapping" onPressed={disabled ? null : () => edit({...form, mappings: form.mappings.filter((_, at) => at !== index)})} />
    </CatchGap>)}
    <CatchButton variant="secondary" size="sm" label="Add field mapping" onPressed={disabled || form.mappings.length >= 30 ? null : () => edit({...form,
      mappings: [...form.mappings, {sourceField: "", catchField: null, disposition: "manual"}]})} />
  </CatchGap>;
}

function SalesDemoPartnerSharePanel(props: {actorUid: string; organizerId: string; blueprintId: string;
  blueprintRevision: number; parentAccessCurrent: boolean; onPendingChange: (pending: boolean) => void;
  onLoadWording: (wording: DemoReviewWording) => void; api?: SalesDemoPartnerReviewApi}) {
  const c = useSalesDemoPartnerReviewController(props); const operationPending = useAdminOperationPending();
  const [reviewKey, setReviewKey] = useState<string | null>(null); const [expires, setExpires] = useState("");
  useEffect(() => {props.onPendingChange(c.busy || !!c.ticket);}, [c.busy, c.ticket, props.onPendingChange]);
  useEffect(() => () => {props.onPendingChange(false);}, [props.onPendingChange]);
  const value = c.data;
  const key = value ? `${value.blueprintId}:${value.blueprintRevision}:${value.previewHash}:${value.partnerUid}:${value.assignmentRevision}:${value.sharingRevision}` : null;
  const expiry = Date.parse(`${expires}:00.000Z`);
  const expiryValid = value && Number.isFinite(expiry) && expiry > Date.now() && expiry <= Date.parse(value.maximumExpiresAt);
  const blocked = operationPending || c.busy || !!c.ticket;
  if (!props.parentAccessCurrent) return null;
  const small = {variant: "secondary", size: "sm"} as const;
  return <CatchSection title="Share a preview with the assigned partner" dividers="none">
    <CatchGap size="related">
      <CatchText as="p" variant="supporting">Blueprint approval and partner assignment do not share this preview. Review this exact recipient and composition before sharing.</CatchText>
      {c.error ? <CatchText as="p" variant="supporting" role="alert">{c.error}</CatchText> : null}
      {c.notice ? <CatchText as="p" variant="supporting" role="status">{c.notice}</CatchText> : null}
      <CatchButton {...small} label="Refresh sharing scope" onPressed={operationPending || c.busy ? null : () => void c.refresh()} />
      {c.ticket ? <CatchButton {...small} label="Retry unchanged sharing action" onPressed={operationPending || c.busy || !value ? null : () => void c.retry()} /> : null}
      {!value ? <CatchEmptyState title="A current accepted partner and reviewed canonical preview are required." /> : <>
        <CatchMetaRow columns={2} entries={[
          {label: "Recipient account", value: value.partnerUid},
          {label: "Assignment revision", value: String(value.assignmentRevision)},
          {label: "Preview fingerprint", value: value.previewHash, wide: true},
          {label: "Current sharing", value: value.sharingCurrent ? `Active until ${value.expiresAt}` : value.sharingState, wide: true},
        ]} />
        <CatchText as="h3" variant="sectionTitle">{value.preview.headline}</CatchText>
        <CatchText as="p" variant="supporting">{value.preview.scenario}</CatchText>
        {value.preview.steps.map((step, i) => <CatchText as="p" variant="supporting" key={i}>{i + 1}. {step}</CatchText>)}
        {value.preview.retainedTools.map((tool, i) => <CatchText as="p" variant="supporting" key={i}>Keep: {tool}</CatchText>)}
        {value.preview.limitations.map((limit, i) => <CatchText as="p" variant="supporting" key={i}>{limit}</CatchText>)}
        <CatchText as="p" variant="supporting">{value.preview.cta}</CatchText>
        <CatchField recipe="input" title="Share until (UTC)" value={expires} inputMode={blocked ? "inactive" : "editable"}
          onChanged={(v) => {setExpires(v); setReviewKey(null);}} keyboardType="datetime" />
        <CatchText as="p" variant="supporting">Latest allowed expiry: {value.maximumExpiresAt}. No invitation, send authority or organizer control is granted.</CatchText>
        <CatchCheckboxInput label="I approve this exact synthetic preview for this assigned partner" value={!!key && reviewKey === key}
          onChanged={blocked ? null : (checked) => setReviewKey(checked ? key : null)} />
        <CatchGap size="inline" direction="horizontal" wrap>
          <CatchButton size="sm" label="Share this preview" onPressed={blocked || !key || reviewKey !== key || !expiryValid ? null : () => {
            setReviewKey(null); void c.share("share", new Date(expiry).toISOString());}} />
          <CatchButton {...small} label="Withdraw partner sharing" onPressed={blocked || value.sharingState === "none" || !key || reviewKey !== key ? null : () => {
            setReviewKey(null); void c.share("withdraw", null);}} />
        </CatchGap>
        {value.proposedWording ? <>
          <CatchText as="h3" variant="sectionTitle">Pending partner wording</CatchText>
          <CatchText as="p" variant="supporting">{value.proposedWording.headline}</CatchText>
          <CatchText as="p" variant="supporting">{value.proposedWording.scenario}</CatchText>
          <CatchText as="p" variant="supporting">{value.proposedWording.cta}</CatchText>
          <CatchButton {...small} label="Load proposal into draft editor" onPressed={blocked ? null : () => props.onLoadWording(value.proposedWording!)} />
          <CatchText as="p" variant="supporting">Loading edits does not approve them. Save and review the new blueprint, then explicitly share it again.</CatchText>
        </> : null}
      </>}
    </CatchGap>
  </CatchSection>;
}
