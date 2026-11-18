import {
  CatchButton,
  CatchCheckboxInput,
  CatchChip,
  CatchChoiceTile,
  CatchField,
  CatchFlowLayout,
  CatchFormStepList,
  CatchGroundCard,
  CatchIcon,
  CatchRoot,
  CatchStack,
  CatchStepList,
  CatchSurface,
  CatchText,
  type CatchFormStepListStatus,
} from "@catch/web-ui";
import {interpolateContent as fill} from "@content/interpolate";
import {listingRequestCopy as copy} from "@content/listingRequest";
import type {ReactNode} from "react";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../../shared/site";
import {
  contextMax,
  declarationsFor,
  proofMethodsByType,
  requestTypes,
  rolesByType,
  toggle,
  type ListingRequestDraft,
} from "../listingRequestModel";
import type {ListingRequestController} from "../useListingRequestController";

const f = copy.fields;

/** A labelled row of choice chips (a radiogroup), or toggles (a group) when several may be chosen. */
function ChipGroup<T extends string>({id, label, options, selected, onPressed, multiple = false, error}: {
  id: string;
  label: string;
  options: Readonly<Record<T, string>>;
  selected: (option: T) => boolean;
  onPressed: (option: T) => void;
  multiple?: boolean;
  error?: string;
}) {
  return (
    <CatchStack gap={8}>
      <CatchText id={id} variant="label-action">{label}</CatchText>
      <CatchStack aria-labelledby={id} direction="row" gap={8} role={multiple ? "group" : "radiogroup"} wrap>
        {(Object.keys(options) as T[]).map((option) => (
          <CatchChip key={option} kind={multiple ? "filter" : "choice"} label={options[option]} onPressed={() => onPressed(option)}
            selected={selected(option)} />
        ))}
      </CatchStack>
      {error ? <CatchText role="alert" tone="danger" variant="body-meta">{error}</CatchText> : null}
    </CatchStack>
  );
}

function Steps({current}: {current: number}) {
  const status = (value: CatchFormStepListStatus) => copy.stepStatus[value];
  return <CatchFormStepList current={current} direction="row" label={copy.stepsLabel} statusLabelBuilder={status}
    items={copy.steps.map((title, index) => ({index, title, status: index < current ? "complete" : "needsInformation"}))} />;
}

function Card({children, labelledBy}: {children: ReactNode; labelledBy?: string}) {
  return (
    <CatchGroundCard aria-labelledby={labelledBy} as="section" ground="white" outlined padding="spacious">
      <CatchStack gap={20}>{children}</CatchStack>
    </CatchGroundCard>
  );
}

/** Step 1: the fixed menu, each with the timeline it carries. */
function TypeStep({controller}: {controller: ListingRequestController}) {
  const {draft} = controller;
  return (
    <Card labelledBy="listing-request-type">
      <CatchText as="h2" id="listing-request-type" variant="display-sm">{copy.typeStep.title}</CatchText>
      <CatchStack aria-labelledby="listing-request-type" gap={8} role="radiogroup">
        {requestTypes.map((type) => (
          <CatchChoiceTile key={type} onTap={() => controller.chooseType(type)} selected={draft.type === type}
            subtitle={copy.types[type].timeline} title={copy.types[type].label} />
        ))}
      </CatchStack>
      {controller.typeError ? <CatchText role="alert" tone="danger" variant="body-meta">{controller.typeError}</CatchText> : null}
      <CatchStack align="end">
        <CatchButton label={copy.typeStep.continue} onPressed={controller.continueFromType} trailingIcon="forward" />
      </CatchStack>
    </Card>
  );
}

function input(controller: ListingRequestController, key: keyof ListingRequestDraft & string, title: string,
  options: {hint?: string; help?: string; keyboard?: "text" | "emailAddress" | "phone" | "url" | "number" | "date"; autoComplete?: string;
    maxLength?: number; lines?: number} = {}) {
  return (
    <CatchField autoComplete={options.autoComplete} errorText={controller.errors[key]} helperText={options.help} inputHint={options.hint}
      keyboardType={options.keyboard} maxLength={options.maxLength} maxLines={options.lines} onChanged={(value) => controller.update(key, value as never)}
      recipe="input" title={title} value={String(controller.draft[key] ?? "")} />
  );
}

/** The target: the page the form opened from, or a link to paste. */
function TargetBlock({controller}: {controller: ListingRequestController}) {
  const {target} = controller.draft;
  const t = copy.detailsStep.target;
  if (target.kind === "url") {
    return (
      <CatchField errorText={controller.errors.target} helperText={t.help} inputHint={t.hint} keyboardType="url"
        onChanged={(url) => controller.update("target", {kind: "url", url})} recipe="input" title={t.label} value={target.url} />
    );
  }
  return (
    <CatchSurface block="tile" padding="md">
      <CatchStack align="center" direction="row" gap={12} justify="between" wrap>
        <CatchStack gap={2}>
          <CatchText tone="secondary" variant="label-kicker">{t.prefilled}</CatchText>
          <CatchText variant="title-row">{target.kind === "organizer" ? t.organizer : t.event}</CatchText>
        </CatchStack>
        <CatchButton label={t.change} onPressed={controller.changeTarget} size="sm" variant="quiet" />
      </CatchStack>
    </CatchSurface>
  );
}

/** The official-channel proof for claim, removal and impersonation. */
function ProofFields({controller}: {controller: ListingRequestController}) {
  const {draft, errors} = controller;
  const methods = draft.type ? proofMethodsByType[draft.type] : undefined;
  if (!methods) return null;
  const options = Object.fromEntries(methods.map((method) => [method, copy.proof[method]])) as Record<typeof methods[number], string>;
  return (
    <CatchStack gap={16}>
      <CatchText as="h3" variant="title-row">{copy.detailsStep.proofTitle}</CatchText>
      <ChipGroup error={errors.proofMethod} id="listing-request-proof" label={copy.proof.method} onPressed={(method) => controller.update("proofMethod", method)}
        options={options} selected={(method) => draft.proofMethod === method} />
      {draft.proofMethod === "instagramCode" || draft.proofMethod === "letterhead" ?
        input(controller, "officialHandle", copy.proof.handle.label, {hint: copy.proof.handle.hint}) : null}
      {draft.proofMethod === "domainEmail" || draft.proofMethod === "letterhead" ?
        input(controller, "officialDomain", copy.proof.domain.label, {hint: copy.proof.domain.hint, keyboard: "url"}) : null}
    </CatchStack>
  );
}

/** Each type's own fixed fields. */
function TypeFields({controller}: {controller: ListingRequestController}) {
  const {draft, errors, update} = controller;
  switch (draft.type) {
  case "correctFact":
    return (
      <CatchStack gap={16}>
        <ChipGroup error={errors.field} id="listing-request-fact" label={f.fact.label} onPressed={(value) => update("field", value)}
          options={f.fact.options} selected={(value) => draft.field === value} />
        {input(controller, "correction", f.correction.label, {help: f.correction.help, maxLength: 200})}
        {input(controller, "evidenceUrl", f.evidenceUrl.label, {keyboard: "url"})}
      </CatchStack>
    );
  case "trademark":
    return (
      <CatchStack gap={16}>
        <ChipGroup error={errors.basis} id="listing-request-basis" label={f.basis.label} onPressed={(value) => update("basis", value)}
          options={f.basis.options} selected={(value) => draft.basis === value} />
        {draft.basis === "registered" ? (
          <CatchStack collapseBelow="medium" direction="row" equal gap={12}>
            {input(controller, "registrationNumber", f.registrationNumber.label)}
            {input(controller, "registrationClass", f.registrationClass.label, {keyboard: "number"})}
            {input(controller, "jurisdiction", f.jurisdiction.label, {hint: f.jurisdiction.hint})}
          </CatchStack>
        ) : null}
        {draft.basis === "unregistered" ? (
          <CatchStack collapseBelow="medium" direction="row" equal gap={12}>
            {input(controller, "firstUseYear", f.firstUseYear.label, {keyboard: "number"})}
            {input(controller, "evidenceUrl", f.evidenceUrl.label, {keyboard: "url"})}
          </CatchStack>
        ) : null}
        <ChipGroup error={errors.trademarkRemedy} id="listing-request-tm-remedy" label={f.trademarkRemedy.label}
          onPressed={(value) => update("trademarkRemedy", value)} options={f.trademarkRemedy.options} selected={(value) => draft.trademarkRemedy === value} />
      </CatchStack>
    );
  case "copyright":
    return (
      <CatchStack gap={16}>
        <ChipGroup error={errors.workKind} id="listing-request-work" label={f.workKind.label} onPressed={(value) => update("workKind", value)}
          options={f.workKind.options} selected={(value) => draft.workKind === value} />
        {input(controller, "originalWorkUrl", f.originalWorkUrl.label, {keyboard: "url"})}
        <ChipGroup error={errors.ownershipBasis} id="listing-request-ownership" label={f.ownershipBasis.label}
          onPressed={(value) => update("ownershipBasis", value)} options={f.ownershipBasis.options} selected={(value) => draft.ownershipBasis === value} />
      </CatchStack>
    );
  case "privacy":
    return (
      <CatchStack gap={16}>
        <ChipGroup error={errors.relationship} id="listing-request-relationship" label={f.relationship.label}
          onPressed={(value) => update("relationship", value)} options={f.relationship.options} selected={(value) => draft.relationship === value} />
        <ChipGroup error={errors.dataKinds} id="listing-request-data" label={f.dataKinds.label} multiple
          onPressed={(value) => update("dataKinds", toggle(draft.dataKinds, value))} options={f.dataKinds.options}
          selected={(value) => draft.dataKinds.includes(value)} />
        <ChipGroup error={errors.identityMatch} id="listing-request-identity" label={f.identityMatch.label}
          onPressed={(value) => update("identityMatch", value)} options={f.identityMatch.options} selected={(value) => draft.identityMatch === value} />
        <ChipGroup error={errors.privacyRemedy} id="listing-request-privacy-remedy" label={f.privacyRemedy.label}
          onPressed={(value) => update("privacyRemedy", value)} options={f.privacyRemedy.options} selected={(value) => draft.privacyRemedy === value} />
      </CatchStack>
    );
  case "legalOrder":
    return (
      <CatchStack gap={16}>
        <ChipGroup error={errors.issuingBody} id="listing-request-issuer" label={f.issuingBody.label} onPressed={(value) => update("issuingBody", value)}
          options={f.issuingBody.options} selected={(value) => draft.issuingBody === value} />
        <CatchStack collapseBelow="medium" direction="row" equal gap={12}>
          {input(controller, "orderReference", f.orderReference.label)}
          {input(controller, "orderDate", f.orderDate.label, {keyboard: "date"})}
        </CatchStack>
        {input(controller, "orderUrl", f.orderUrl.label, {keyboard: "url"})}
      </CatchStack>
    );
  default:
    return null;
  }
}

/** Step 2: the target, who is asking, the type's fields, the proof and a short optional line. */
function DetailsStep({controller}: {controller: ListingRequestController}) {
  const {draft, errors} = controller;
  const d = copy.detailsStep;
  const roles = draft.type ? Object.fromEntries(rolesByType[draft.type].map((role) => [role, copy.roles[role]])) as Record<string, string> : {};
  return (
    <Card labelledBy="listing-request-details">
      <CatchStack gap={4}>
        <CatchText tone="secondary" variant="label-kicker">{draft.type ? copy.types[draft.type].short : ""}</CatchText>
        <CatchText as="h2" id="listing-request-details" variant="display-sm">{d.title}</CatchText>
      </CatchStack>
      <TargetBlock controller={controller} />
      <TypeFields controller={controller} />
      <CatchText as="h3" variant="title-row">{d.you}</CatchText>
      <CatchStack collapseBelow="medium" direction="row" equal gap={12}>
        {input(controller, "name", d.name.label, {autoComplete: "name"})}
        {input(controller, "organisation", d.organisation.label, {autoComplete: "organization"})}
      </CatchStack>
      <ChipGroup error={errors.role} id="listing-request-role" label={d.role.label} onPressed={(role) => controller.update("role", role as never)}
        options={roles} selected={(role) => draft.role === role} />
      <CatchStack collapseBelow="medium" direction="row" equal gap={12}>
        {input(controller, "email", d.email.label, {autoComplete: "email", help: d.email.help, hint: d.email.hint, keyboard: "emailAddress"})}
        {input(controller, "phone", d.phone.label, {autoComplete: "tel", hint: d.phone.hint, keyboard: "phone"})}
      </CatchStack>
      <ProofFields controller={controller} />
      {input(controller, "context", d.context.label, {help: fill(d.context.help, {max: contextMax}), lines: 3, maxLength: contextMax})}
      <CatchStack collapseBelow="medium" direction="row" gap={8} justify="end">
        <CatchButton label={d.back} onPressed={controller.back} variant="secondary" />
        <CatchButton label={d.continue} onPressed={controller.continueFromDetails} trailingIcon="forward" />
      </CatchStack>
    </Card>
  );
}

/** Step 3: the fixed declarations, then Send. */
function DeclarationsStep({controller}: {controller: ListingRequestController}) {
  const {draft} = controller;
  const s = copy.declarationsStep;
  return (
    <Card labelledBy="listing-request-declarations">
      <CatchText as="h2" id="listing-request-declarations" variant="display-sm">{s.title}</CatchText>
      <CatchSurface block="tile" padding="md">
        <CatchText tone="secondary" variant="label-kicker">{s.summary}</CatchText>
        <CatchText variant="title-row">{draft.type ? copy.types[draft.type].short : ""}</CatchText>
        <CatchText tone="secondary" variant="body-small">{draft.type ? copy.types[draft.type].timeline : ""}</CatchText>
      </CatchSurface>
      <CatchStack gap={12}>
        {declarationsFor(draft.type).map((key) => (
          <CatchCheckboxInput key={key} label={copy.declarations[key]} onChanged={(value) => controller.declare(key, value)} value={draft.declarations[key]} />
        ))}
      </CatchStack>
      {controller.declarationsError ? <CatchText role="alert" tone="danger" variant="body-meta">{controller.declarationsError}</CatchText> : null}
      <CatchText tone="secondary" variant="body-small">{s.note}</CatchText>
      <CatchStack collapseBelow="medium" direction="row" gap={8} justify="end">
        <CatchButton label={s.back} onPressed={controller.back} variant="secondary" />
        <CatchButton label={controller.sending ? s.sending : s.send} onPressed={controller.sending ? null : () => void controller.send()}
          status={controller.sending ? "loading" : "idle"} />
      </CatchStack>
      {controller.error ? <CatchText role="alert" tone="danger" variant="body-small">{controller.error}</CatchText> : null}
    </Card>
  );
}

/** After Send: the reference, the timeline and what happens next. */
function SentStep({controller}: {controller: ListingRequestController}) {
  const s = copy.sent;
  const type = controller.draft.type;
  return (
    <>
      <CatchGroundCard aria-labelledby="listing-request-sent" aria-live="polite" as="section" ground="white" outlined padding="spacious">
        <CatchStack gap={16}>
          <CatchStack align="center" direction="row" gap={8}>
            <CatchIcon label={s.badge} name="success" size={24} />
            <CatchText tone="success" variant="label-action">{s.badge}</CatchText>
          </CatchStack>
          <CatchText as="h2" id="listing-request-sent" variant="display-lg">{s.title}</CatchText>
          <CatchText variant="title-row">{fill(s.reference, {reference: controller.receipt?.reference ?? ""})}</CatchText>
          <CatchText variant="body-lead">{s.body}</CatchText>
          {type ? <CatchText tone="secondary" variant="body">{copy.types[type].timeline}</CatchText> : null}
          <CatchStack align="start"><CatchButton label={s.another} onPressed={controller.startAgain} size="sm" variant="quiet" /></CatchStack>
        </CatchStack>
      </CatchGroundCard>
      <CatchGroundCard ground="white" outlined>
        <CatchStack gap={16}>
          <CatchText as="h2" variant="display-sm">{s.nextTitle}</CatchText>
          <CatchStepList steps={s.next} />
        </CatchStack>
      </CatchGroundCard>
    </>
  );
}

const stepIndex = {type: 0, details: 1, declarations: 2, sent: 3} as const;

/** /listings/request/ on the site chrome: the kit's flow with its step rail. */
export function ListingRequestView({controller}: {controller: ListingRequestController}) {
  const {stage} = controller;
  return (
    <CatchRoot theme="day">
      <PublicSiteHeader />
      <WebsitePageMain id="top">
        <CatchFlowLayout kicker={copy.kicker} kickerTone="info" lead={stage === "type" ? copy.lead : undefined}
          navigation={stage === "sent" ? undefined : <Steps current={stepIndex[stage]} />} title={copy.title}>
          {stage === "type" ? <TypeStep controller={controller} /> : null}
          {stage === "details" ? <DetailsStep controller={controller} /> : null}
          {stage === "declarations" ? <DeclarationsStep controller={controller} /> : null}
          {stage === "sent" ? <SentStep controller={controller} /> : null}
        </CatchFlowLayout>
      </WebsitePageMain>
      <PublicSiteFooter />
    </CatchRoot>
  );
}
