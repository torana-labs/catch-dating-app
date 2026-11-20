import {
  CatchBadge,
  CatchButton,
  CatchField,
  CatchFilePickerButton,
  CatchGrid,
  CatchGroundCard,
  CatchIndexRow,
  CatchMetricTile,
  CatchSection,
  CatchStack,
  CatchStoreButton,
  CatchText,
} from "@catch/web-ui";
import {useId, type ReactNode} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {activeMarket} from "@content/markets";
import {pastSalesTryItCopy as copy} from "@content/pastSalesTryIt";
import {tryItCopy} from "@content/tryIt";
import type {PlaybookLeadForm} from "../../content/playbook/playbookContract";
import {Form} from "../../shared/ui/primitives";
import {SignInSheetView} from "../account/SignInSheet";
import {useSignInSheetController} from "../account/useSignInSheetController";
import {useAppDownloadCtas} from "../marketing/useAppDownloadCtas";
import {columnMappingFields} from "../tryIt/ColumnMapping";
import {tryItCities, tryItLocalDate} from "../tryIt/tryItModel";
import type {PastSalesFlowState, PastSalesStage} from "./pastSalesFlow";
import {
  formatPastSalesCount as count,
  formatPastSalesMoney,
  formatPastSalesRate,
  pastSalesAccept,
  pastSalesInputLimits,
  pastSalesMappingFields,
  pastSalesToday,
  type PastSalesDetailField,
  type PastSalesReport,
} from "./pastSalesModel";
import {usePastSalesToolController, type PastSalesToolController} from "./usePastSalesToolController";

const noop = () => undefined;
const dash = "–";

interface PastSalesToolProps {
  readonly form: PlaybookLeadForm;
  readonly analyticsPlacement: string;
}

/** The most each amount field takes, as its error line states it. */
const fieldMaxima: Partial<Record<PastSalesDetailField, string>> = {
  ticketPrice: formatPastSalesMoney(pastSalesInputLimits.ticketPrice * 100, activeMarket.currencyCode),
  feePercent: `${pastSalesInputLimits.feePercent}%`,
  feePerTicket: formatPastSalesMoney(pastSalesInputLimits.feePerTicket * 100, activeMarket.currencyCode),
};

function detailError(state: PastSalesFlowState, field: PastSalesDetailField): string | null {
  const problem = state.detailProblems[field];
  if (!problem) return null;
  if (problem === "dateInFuture") return copy.dateInFuture;
  if (problem === "tooLarge") return fill(copy.errorTooLarge, {max: fieldMaxima[field] ?? ""});
  return problem === "notWhole" ? copy.errorNotWhole : copy.errorNotNumber;
}

function StartStep({controller, form}: {controller: PastSalesToolController; form: PlaybookLeadForm}) {
  const {state, flow} = controller;
  const fileLabelId = useId();
  const inputMode = state.busy ? "inactive" : "editable";
  const fileError = state.fields.file ? copy[state.fields.file] : null;
  const detail = (field: PastSalesDetailField) => ({
    errorText: detailError(state, field), inputMode, labelMode: "visible", onChanged: (value: string) => flow.setDetail(field, value),
    recipe: "input", value: state.details[field],
  }) as const;
  return (
    <CatchStack gap={12}>
      <Form aria-label={copy.title} noValidate onSubmit={controller.submit} pending={state.busy}>
        <CatchStack gap={16}>
          <CatchStack aria-labelledby={fileLabelId} gap={8} role="group">
            <CatchText as="p" id={fileLabelId} variant="title-row">{form.label}</CatchText>
            <CatchStack align="start">
              <CatchFilePickerButton accept={pastSalesAccept} label={state.file ? copy.changeFile : copy.chooseFile}
                onChanged={state.busy ? null : flow.chooseFile} size="md" />
            </CatchStack>
            {state.file ? <CatchText as="p" variant="body">{fill(copy.chosenFile, {name: state.file.name})}</CatchText> : null}
            {fileError ? (
              <CatchText aria-live="assertive" as="p" role="alert" tone="danger" variant="body-small">{fileError}</CatchText>
            ) : <CatchText as="p" tone="secondary" variant="body-small">{copy.fileHelp}</CatchText>}
          </CatchStack>
          <CatchText as="p" variant="title-row">{copy.eventTitle}</CatchText>
          <CatchField {...detail("eventName")} inputHint={copy.eventNameHint} maxLength={120} title={copy.eventName} />
          <CatchField {...detail("eventDate")} helperText={copy.eventDateHelp} keyboardType="date" max={pastSalesToday()} title={copy.eventDate} />
          <CatchField {...detail("ticketPrice")} helperText={copy.ticketPriceHelp} keyboardType="decimal" maxLength={11} prefixText={activeMarket.currencySymbol} title={copy.ticketPrice} />
          <CatchText as="p" variant="title-row">{copy.feeTitle}</CatchText>
          <CatchField {...detail("feePercent")} helperText={copy.feePercentHelp} keyboardType="decimal" maxLength={6} suffixText="%" title={copy.feePercent} />
          <CatchField {...detail("feePerTicket")} helperText={copy.feePerTicketHelp} keyboardType="decimal" maxLength={9} prefixText={activeMarket.currencySymbol} title={copy.feePerTicket} />
          <CatchStack align="start">
            <CatchButton label={form.submitLabel} onPressed={noop} status={state.busy ? "loading" : "idle"} type="submit" />
          </CatchStack>
        </CatchStack>
      </Form>
      <CatchText as="p" tone="secondary" variant="body-meta">{form.note ?? copy.private}</CatchText>
    </CatchStack>
  );
}

/** The phone step, as the link tools ask it: brand and city start the private profile, then the phone is confirmed by code. */
function AccountStep({controller}: {controller: PastSalesToolController}) {
  const {state, flow} = controller;
  const account = tryItCopy.account;
  const sheet = useSignInSheetController({onSignedIn: () => void flow.signedIn()});
  const verified = Boolean(state.caller?.phoneNumber);
  const cities = tryItCities();
  const inputMode = state.busy ? "inactive" : "editable";
  const button = (
    <CatchButton label={verified ? account.continue : account.continueWithPhone} onPressed={noop} status={state.busy ? "loading" : "idle"} type="submit" />
  );
  return (
    <Form aria-label={account.title} noValidate onSubmit={controller.continueAccount} pending={state.busy}>
      <CatchStack gap={12}>
        <CatchText as="h3" variant="display-xs">{account.title}</CatchText>
        <CatchText as="p" tone="secondary" variant="body">{verified ? account.signedInLead : account.lead}</CatchText>
        <CatchField autoComplete="organization" errorText={state.fields.brand ? account.brandRequired : null} inputHint={account.brandHint}
          inputMode={inputMode} labelMode="visible" onChanged={flow.setBrand} recipe="input" required title={account.brand} value={state.brand} />
        <CatchField<string> errorText={state.fields.city ? account.cityRequired : null} hintText={account.cityHint} inputMode={inputMode}
          itemLabelBuilder={(id) => cities.find((city) => city.id === id)?.label ?? id} labelMode="visible" onChanged={flow.setCity}
          recipe="select" required title={account.city} value={state.cityId} values={cities.map((city) => city.id)} />
        {verified ? <CatchText as="p" tone="secondary" variant="body-small">{fill(account.signedInAs, {phone: state.caller?.phoneNumber ?? ""})}</CatchText> : null}
        <CatchStack align="start">
          {verified ? button : <SignInSheetView onClose={() => {sheet.reset(); flow.closeSignIn();}} open={state.signIn} sheet={sheet} trigger={button} />}
        </CatchStack>
        <CatchText as="p" tone="secondary" variant="body-meta">{copy.private}</CatchText>
      </CatchStack>
    </Form>
  );
}

function MappingStep({controller, headers, shapes}: {controller: PastSalesToolController; headers: readonly string[]; shapes: readonly string[]}) {
  const {state, flow} = controller;
  const mapping = copy.mapping;
  const problem = Object.values(state.mappingProblems)[0];
  return (
    <Form aria-label={mapping.title} noValidate onSubmit={controller.submitMapping} pending={state.busy}>
      <CatchStack gap={12}>
        <CatchStack aria-live="polite" gap={4} role="status">
          <CatchText as="h3" variant="display-xs">{mapping.title}</CatchText>
          <CatchText as="p" tone="secondary" variant="body">{mapping.lead}</CatchText>
        </CatchStack>
        {columnMappingFields({
          busy: state.busy,
          errorText: problem ? mapping[problem] : null,
          fields: pastSalesMappingFields.map((field) => ({id: field, label: mapping.fields[field], required: field === "displayName"})),
          headers,
          hints: shapes.map((shape) => mapping.shapes[shape] ?? null),
          onChanged: flow.setMapping,
          value: state.mapping,
          words: {
            column: (header, hint) => hint ? fill(mapping.column, {header, hint}) : header,
            fieldLabel: (label) => label,
            none: mapping.none,
            untitled: (number) => fill(mapping.untitled, {number: String(number)}),
          },
        })}
        <CatchStack align="start" direction="row" gap={8} wrap>
          <CatchButton label={mapping.submit} onPressed={noop} status={state.busy ? "loading" : "idle"} type="submit" />
          <CatchButton label={copy.review.back} onPressed={state.busy ? null : flow.startOver} variant="quiet" />
        </CatchStack>
      </CatchStack>
    </Form>
  );
}

/**
 * The night as the command read it. Every figure is the command's; where
 * one is missing (no check-ins, no earlier nights, no fee it can work out)
 * the tile shows a dash and its reason, never a number of its own.
 */
function ReportView({report}: {report: PastSalesReport}) {
  const words = copy.report;
  const currency = report.currency;
  const money = (minor: number | null) => minor !== null && currency ? formatPastSalesMoney(minor, currency) : dash;
  const salesNote = {file: words.salesFromFile, estimate: words.salesEstimate, mixed: words.salesMixed, none: words.salesNone}[report.amountSource];
  const {attendance, guests, fees} = report;
  const catchFee = fees.catch;
  const difference = fees.differenceMinor;
  const types = report.byTicketType.length > 1 || report.byTicketType.some((type) => type.ticketType) ? report.byTicketType : [];
  return (
    <CatchStack gap={16}>
      <CatchGrid columns={2} compactColumns={1} gap="related">
        <CatchMetricTile label={words.tickets} value={count(report.ticketsSold)} />
        <CatchMetricTile label={words.sales} note={salesNote} value={money(report.grossSalesMinor)} />
        <CatchMetricTile label={words.came} value={attendance ? formatPastSalesRate(attendance.showRate) : dash}
          note={attendance ? fill(words.cameNote, {came: count(attendance.came), sold: count(attendance.came + attendance.noShows)}) : words.attendanceMissing} />
        <CatchMetricTile label={words.guests} value={guests ? count(guests.firstTime) : dash}
          note={guests ? fill(words.guestsNote, {repeat: count(guests.repeat)}) : words.guestsMissing} />
      </CatchGrid>
      {types.length ? (
        <CatchSection container="tile" title={words.byType}>
          {types.map((type) => (
            <CatchIndexRow density="compact" key={type.ticketType ?? ""} subtitle={fill(words.typeCount, {count: count(type.count)})}
              title={type.ticketType ?? words.untypedTicket} value={type.grossMinor === null ? undefined : money(type.grossMinor)} wrap />
          ))}
        </CatchSection>
      ) : null}
      <CatchText as="p" variant="title-row">{words.feesTitle}</CatchText>
      <CatchGrid columns={2} compactColumns={1} gap="related">
        <CatchMetricTile label={words.catchFee} value={catchFee ? money(catchFee.feeMinor) : dash}
          note={catchFee ? fill(words.catchFeeNote, {days: String(catchFee.freeTrialDays)}) :
            (fees.catchReason ? words.catchFeeReasons[fees.catchReason] : undefined) ?? words.catchFeeUnknown} />
        <CatchMetricTile label={words.currentFee} value={fees.current ? formatPastSalesMoney(fees.current.feeMinor, fees.current.currency) : dash}
          note={fees.current ? words.currentFeeNote : words.currentFeeMissing} />
      </CatchGrid>
      <CatchMetricTile label={words.difference} value={difference === null ? dash : money(Math.abs(difference))}
        note={difference === null ? words.differenceMissing : difference > 0 ? words.differenceLess : difference < 0 ? words.differenceMore : words.differenceSame} />
      <CatchText as="p" tone="secondary" variant="body-meta">{fees.gatewayNote}</CatchText>
      {report.skippedRows > 0 ? <CatchText as="p" tone="secondary" variant="body-meta">{fill(words.skipped, {count: count(report.skippedRows)})}</CatchText> : null}
    </CatchStack>
  );
}

function ReportHeading({report}: {report: PastSalesReport}) {
  return (
    <CatchStack aria-live="polite" gap={4} role="status">
      <CatchText as="h3" variant="display-xs">{fill(copy.report.title, {name: report.eventName, date: tryItLocalDate(report.localDate)})}</CatchText>
    </CatchStack>
  );
}

const shownRows = 5;

function ReviewStep({controller, stage}: {controller: PastSalesToolController; stage: Extract<PastSalesStage, {name: "review"}>}) {
  const {state, flow} = controller;
  const review = copy.review;
  const rows = stage.rows;
  return (
    <CatchStack gap={16}>
      <ReportHeading report={stage.report} />
      <ReportView report={stage.report} />
      {rows.length ? (
        <CatchStack gap={8}>
          <CatchSection container="tile" title={fill(review.rowsTitle, {count: count(rows.length)})}>
            {rows.slice(0, shownRows).map((row) => (
              <CatchIndexRow density="compact" key={row.rowId} title={row.displayName || fill(review.row, {number: String(row.sourceRowNumber)})} wrap
                subtitle={[fill(review.row, {number: String(row.sourceRowNumber)}), ...row.issues.map((issue) => review.issues[issue] ?? review.unknownIssue)].join(" · ")} />
            ))}
            {rows.length > shownRows ? <CatchIndexRow density="compact" title={fill(review.moreRows, {count: count(rows.length - shownRows)})} /> : null}
          </CatchSection>
          <CatchText as="p" tone="secondary" variant="body-small">{review.rowsLead}</CatchText>
        </CatchStack>
      ) : null}
      <CatchText as="p" tone="secondary" variant="body-small">{rows.length ? review.note : `${review.note} ${review.saveNote}`}</CatchText>
      <CatchStack align="start" direction="row" gap={8} wrap>
        {rows.length ? (
          <CatchButton label={review.leaveOut} onPressed={state.busy ? null : () => void flow.leaveOutRows()} status={state.busy ? "loading" : "idle"} />
        ) : (
          <CatchButton label={review.save} onPressed={state.busy ? null : () => void flow.confirm()} status={state.busy ? "loading" : "idle"} />
        )}
        <CatchButton label={review.back} onPressed={state.busy ? null : flow.startOver} variant="quiet" />
      </CatchStack>
    </CatchStack>
  );
}

/** "Claim it in Catch Host": the store badges and the number to sign in with, as the link tools end. */
function ClaimInHost({phone, placement}: {phone: string | null; placement: string}) {
  const stores = useAppDownloadCtas({placement, app: "host"});
  return (
    <CatchStack gap={12}>
      <CatchText as="h3" variant="display-xs">{tryItCopy.claimInHost.title}</CatchText>
      <CatchText as="p" tone="secondary" variant="body">{fill(tryItCopy.claimInHost.lead, {phone: phone ?? ""})}</CatchText>
      <CatchStack direction="row" gap={12} wrap>
        {stores.map((store) => (
          <CatchStoreButton badgeSrc={store.badgeSrc} comingSoon={store.comingSoon} href={store.href || undefined} key={store.store}
            label={store.accessibleLabel} onClick={store.onClick} size="m" store={store.store} />
        ))}
      </CatchStack>
    </CatchStack>
  );
}

/** The problem's words: the command's own reason when the site words it, else the shared try-it words. */
function pastSalesProblemText(stage: Extract<PastSalesStage, {name: "problem"}>): string[] {
  if (stage.code && copy.reasons[stage.code]) return [copy.reasons[stage.code]];
  if (stage.reason === "refused") return stage.summary ? [stage.summary.headline, ...stage.summary.lines] : [copy.fileUnreadable];
  if (stage.reason === "invalid") return [copy.fileUnreadable];
  return [tryItCopy.problems[stage.reason]];
}

const finalProblems = new Set(["invalid", "refused", "market_not_open", "multiple_organizers", "not_configured", "not_allowed"]);

function StageBody({controller, form, analyticsPlacement}: PastSalesToolProps & {controller: PastSalesToolController}) {
  const {state, flow} = controller;
  const {stage} = state;
  switch (stage.name) {
    case "start":
      return <StartStep controller={controller} form={form} />;
    case "account":
      return <AccountStep controller={controller} />;
    case "workspace":
      return (
        <CatchStack gap={12}>
          <CatchStack aria-live="polite" gap={4} role="status">
            <CatchText as="h3" variant="display-xs">{stage.summary.headline}</CatchText>
            {stage.summary.lines.map((line) => <CatchText as="p" key={line} tone="secondary" variant="body">{line}</CatchText>)}
          </CatchStack>
          <CatchStack align="start" direction="row" gap={8} wrap>
            <CatchButton label={tryItCopy.workspace.confirm} onPressed={state.busy ? null : () => void flow.confirmWorkspace()} status={state.busy ? "loading" : "idle"} />
            <CatchButton label={copy.review.back} onPressed={state.busy ? null : flow.startOver} variant="quiet" />
          </CatchStack>
        </CatchStack>
      );
    case "mapping":
      return <MappingStep controller={controller} headers={stage.headers} shapes={stage.shapes} />;
    case "review":
      return <ReviewStep controller={controller} stage={stage} />;
    case "done":
      return (
        <CatchStack gap={16}>
          <CatchStack aria-live="polite" gap={4} role="status">
            <CatchText as="h3" variant="display-xs">{fill(copy.done.title, {name: stage.report.eventName})}</CatchText>
            {stage.imported ? <CatchText as="p" tone="secondary" variant="body">{fill(copy.done.guests, {count: count(stage.imported.createdCount + stage.imported.updatedCount)})}</CatchText> : null}
          </CatchStack>
          <ReportView report={stage.report} />
          <CatchText as="p" variant="body">{tryItCopy.nothingLive}</CatchText>
          <ClaimInHost phone={state.caller?.phoneNumber ?? null} placement={analyticsPlacement} />
        </CatchStack>
      );
    case "problem": {
      const retriable = !finalProblems.has(stage.reason) && !(stage.code && copy.reasons[stage.code]);
      const [headline, ...lines] = pastSalesProblemText(stage);
      return (
        <CatchStack gap={12}>
          <CatchStack aria-live="assertive" gap={4} role="alert">
            <CatchText as="h3" variant="display-xs">{headline}</CatchText>
            {lines.map((line) => <CatchText as="p" key={line} tone="secondary" variant="body">{line}</CatchText>)}
          </CatchStack>
          <CatchStack align="start" direction="row" gap={8} wrap>
            {retriable ? <CatchButton label={tryItCopy.problem.retry} onPressed={state.busy ? null : () => void flow.retry()} status={state.busy ? "loading" : "idle"} /> : null}
            <CatchButton label={copy.review.back} onPressed={flow.startOver} variant={retriable ? "quiet" : "primary"} />
          </CatchStack>
        </CatchStack>
      );
    }
  }
}

/**
 * Reports' export upload: the visitor's sales or guest export into a report
 * of that night and the fee comparison (sales.import-past), behind the
 * try-it phone step, saved to their private profile only when they say so.
 */
function PastSalesTool({form, analyticsPlacement}: PastSalesToolProps) {
  const controller = usePastSalesToolController();
  return (
    <CatchGroundCard ground="white" outlined>
      <CatchStack gap={16}>
        <CatchStack align="start" gap={8}>
          <CatchBadge label={tryItCopy.kicker} size="sm" tone="gold" />
          <CatchText as="h3" variant="title-bar">{copy.title}</CatchText>
        </CatchStack>
        <StageBody analyticsPlacement={analyticsPlacement} controller={controller} form={form} />
      </CatchStack>
    </CatchGroundCard>
  );
}

/**
 * Reports' tool in a tool form's place (the try band's second column),
 * keyed by page, band and form so each starts empty.
 */
export function pastSalesToolNode(props: {form: PlaybookLeadForm; placement: "split" | "cta"; pageId: string; sectionId: string}): ReactNode {
  const key = `${props.pageId}-${props.sectionId}-${props.form.id}`;
  return <PastSalesTool analyticsPlacement={`try_it_${props.pageId}_${props.sectionId}`} form={props.form} key={key} />;
}
