import {
  CatchBadge,
  CatchButton,
  CatchField,
  CatchFilePickerButton,
  CatchGroundCard,
  CatchIcon,
  CatchIndexRow,
  CatchLoadingIndicator,
  CatchSection,
  CatchStack,
  CatchStoreButton,
  CatchText,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {guestImportTryItCopy as copy} from "@content/guestImportTryIt";
import {interpolateContent as fill} from "@content/interpolate";
import {tryItCopy} from "@content/tryIt";
import type {PlaybookLeadForm} from "../../content/playbook/playbookContract";
import {Form} from "../../shared/ui/primitives";
import {SignInSheetView} from "../account/SignInSheet";
import {useSignInSheetController} from "../account/useSignInSheetController";
import {useAppDownloadCtas} from "../marketing/useAppDownloadCtas";
import {tryItCities} from "../tryIt/tryItModel";
import {columnMappingFields} from "./ColumnMapping";
import type {GuestImportFieldProblem, GuestImportStage, GuestImportSummary} from "./guestImportFlow";
import {
  guestColumnsRead,
  guestFileSize,
  guestImportAccept,
  guestMappingFields,
  guestMergeSuggestions,
  guestPhoneCounts,
  guestRowsToLookAt,
  guestTagSuggestions,
  type GuestImportResult,
  type GuestImportRow,
} from "./guestImportModel";
import {useGuestImportController, type GuestImportController} from "./useGuestImportController";

interface GuestImportToolProps {
  readonly form: PlaybookLeadForm;
  readonly analyticsPlacement: string;
}

const noop = () => undefined;
/** Rows of a long list shown before "And N more". */
const shownRows = 8;

function fieldText(problem: GuestImportFieldProblem | undefined): string | null {
  if (!problem) return null;
  if (problem === "brandRequired" || problem === "cityRequired") return tryItCopy.account[problem];
  if (problem === "nameRequired" || problem === "duplicateColumn" || problem === "invalidMapping") return copy.mapping[problem];
  return copy[problem];
}

function SummaryText({summary}: {summary: GuestImportSummary}) {
  return (
    <CatchStack aria-live="polite" gap={4} role="status">
      <CatchText as="h3" variant="display-xs">{summary.headline}</CatchText>
      {summary.lines.map((line) => <CatchText as="p" key={line} tone="secondary" variant="body">{line}</CatchText>)}
    </CatchStack>
  );
}

function Where() {
  return <CatchText as="p" tone="secondary" variant="body-meta">{copy.where}</CatchText>;
}

function StartStep({controller, form}: {controller: GuestImportController; form: PlaybookLeadForm}) {
  const {state} = controller;
  const error = fieldText(state.fields.file);
  return (
    <Form aria-label={copy.title} noValidate onSubmit={controller.submit} pending={state.busy}>
      <CatchStack gap={12}>
        <CatchText as="p" variant="title-bar">{form.label}</CatchText>
        <CatchStack align="center" direction="row" gap={12} wrap>
          <CatchFilePickerButton accept={guestImportAccept} label={state.file ? copy.chooseAnother : copy.choose}
            leading={<CatchIcon name={state.file ? "check" : "upload"} />} onChanged={state.busy ? null : controller.chooseFile}
            semanticsLabel={fill(copy.chooseFor, {action: state.file ? copy.chooseAnother : copy.choose, label: form.label})} />
          {state.file ? (
            <CatchText as="p" variant="body">{fill(copy.chosen, {name: state.file.name, size: guestFileSize(state.file.size)})}</CatchText>
          ) : null}
        </CatchStack>
        {error ? <CatchText as="p" role="alert" tone="danger" variant="body-small">{error}</CatchText> : (
          <CatchText as="p" tone="secondary" variant="body-small">{copy.accepts}</CatchText>
        )}
        <CatchStack align="start">
          <CatchButton label={form.submitLabel} onPressed={noop} status={state.busy ? "loading" : "idle"} type="submit" />
        </CatchStack>
        {form.note ? <CatchText as="p" tone="secondary" variant="body-small">{form.note}</CatchText> : null}
        <Where />
      </CatchStack>
    </Form>
  );
}

function AccountStep({controller}: {controller: GuestImportController}) {
  const {state, flow} = controller;
  const sheet = useSignInSheetController({onSignedIn: () => void flow.signedIn()});
  const verified = Boolean(state.caller?.phoneNumber);
  const cities = tryItCities();
  const inputMode = state.busy ? "inactive" : "editable";
  const account = tryItCopy.account;
  const button = (
    <CatchButton label={verified ? account.continue : account.continueWithPhone} onPressed={noop}
      status={state.busy ? "loading" : "idle"} type="submit" />
  );
  return (
    <Form aria-label={account.title} noValidate onSubmit={controller.continueAccount} pending={state.busy}>
      <CatchStack gap={12}>
        <CatchText as="h3" variant="display-xs">{account.title}</CatchText>
        <CatchText as="p" tone="secondary" variant="body">{verified ? account.signedInLead : account.lead}</CatchText>
        <CatchField autoComplete="organization" errorText={fieldText(state.fields.brand)} inputHint={account.brandHint} inputMode={inputMode}
          labelMode="visible" onChanged={flow.setBrand} recipe="input" required title={account.brand} value={state.brand} />
        <CatchField<string> errorText={fieldText(state.fields.city)} hintText={account.cityHint} inputMode={inputMode}
          itemLabelBuilder={(id) => cities.find((city) => city.id === id)?.label ?? id} labelMode="visible" onChanged={flow.setCity}
          recipe="select" required title={account.city} value={state.cityId} values={cities.map((city) => city.id)} />
        {verified ? <CatchText as="p" tone="secondary" variant="body-small">{fill(account.signedInAs, {phone: state.caller?.phoneNumber ?? ""})}</CatchText> : null}
        <CatchStack align="start">
          {verified ? button : (
            <SignInSheetView onClose={() => {sheet.reset(); flow.closeSignIn();}} open={state.signIn} sheet={sheet} trigger={button} />
          )}
        </CatchStack>
        <Where />
      </CatchStack>
    </Form>
  );
}

function MappingStep({controller, stage}: {controller: GuestImportController; stage: Extract<GuestImportStage, {name: "mapping"}>}) {
  const {state, flow} = controller;
  const words = copy.mapping;
  return (
    <Form aria-label={words.title} noValidate onSubmit={controller.submitMapping} pending={state.busy}>
      <CatchStack gap={12}>
        <SummaryText summary={stage.summary} />
        <CatchText as="h3" variant="title-bar">{words.title}</CatchText>
        {columnMappingFields({
          fields: guestMappingFields.map((field) => ({id: field, label: copy.fields[field], required: field === "displayName"})),
          headers: stage.headers,
          hints: stage.shapes.map((shape) => shape === "empty" ? null : words.shapes[shape]),
          value: state.mapping,
          onChanged: flow.setColumn,
          words: {
            fieldLabel: (field) => fill(words.fieldLabel, {field}),
            none: words.none,
            column: (header, shape) => shape ? fill(words.column, {header, shape}) : header,
            untitled: (number) => fill(words.untitled, {number}),
          },
          busy: state.busy,
          errorText: fieldText(state.fields.mapping),
        })}
        <CatchStack align="start" direction="row" gap={8} wrap>
          <CatchButton label={words.submit} onPressed={noop} status={state.busy ? "loading" : "idle"} type="submit" />
          <CatchButton label={copy.review.back} onPressed={state.busy ? null : flow.startOver} variant="quiet" />
        </CatchStack>
      </CatchStack>
    </Form>
  );
}

function issueText(row: GuestImportRow): string {
  const issues: Readonly<Record<string, string>> = copy.review.look.issues;
  return row.issueCode && Object.hasOwn(issues, row.issueCode) ? issues[row.issueCode] : issues.other;
}

/** The review's numbers: what saving would add and update, and what it leaves alone. */
function Counts({result}: {result: GuestImportResult}) {
  const words = copy.review;
  const {counts} = result;
  const rows = [
    {title: words.add, value: counts.add},
    {title: words.update, value: counts.update},
    {title: words.unchanged, value: counts.unchanged},
    {title: words.needsReview, value: counts.needsReview + counts.identityConflict},
    {title: words.excluded, value: counts.excluded},
    {title: words.skipped, value: counts.skipped},
  ].filter((row, index) => index < 2 || row.value > 0);
  return (
    <CatchSection container="tile" title={words.counts}>
      {rows.map((row) => <CatchIndexRow density="compact" key={row.title} title={row.title} value={String(row.value)} />)}
    </CatchSection>
  );
}

/** Which column filled each field, and how the phone numbers came out. */
function ColumnsRead({result}: {result: GuestImportResult}) {
  const columns = guestColumnsRead(result, (number) => fill(copy.mapping.untitled, {number}));
  const phones = guestPhoneCounts(result);
  if (!columns.length) return null;
  return (
    <CatchSection container="tile" title={copy.review.columns}>
      {columns.map(({field, header}) => <CatchIndexRow density="compact" key={field} subtitle={header} title={copy.fields[field]} wrap />)}
      {phones.formatted ? <CatchIndexRow density="compact" icon="check" title={fill(copy.review.phones, {count: phones.formatted})} wrap /> : null}
      {phones.invalid ? <CatchIndexRow density="compact" icon="warning" title={fill(copy.review.badPhones, {count: phones.invalid})} wrap /> : null}
    </CatchSection>
  );
}

/** Rows that need a look, each with why, and a switch to leave it out of this import. */
function LookAt({controller, result}: {controller: GuestImportController; result: GuestImportResult}) {
  const {state, flow} = controller;
  const look = copy.review.look;
  const rows = guestRowsToLookAt(result);
  const outRows = result.rows.filter((row) => row.kind === "excluded");
  if (!rows.length && !outRows.length) return null;
  const sent = new Set(outRows.map((row) => row.rowId));
  const changed = state.excluded.size !== sent.size || [...state.excluded].some((rowId) => !sent.has(rowId));
  return (
    <CatchStack gap={8}>
      <CatchText as="h3" variant="title-bar">{look.title}</CatchText>
      <CatchText as="p" tone="secondary" variant="body-small">{look.lead}</CatchText>
      {[...rows, ...outRows].slice(0, 250).map((row) => (
        <CatchField body={fill(look.line, {row: fill(look.row, {row: row.sourceRowNumber}), issue: row.kind === "excluded" ? copy.review.kinds.excluded : issueText(row)})}
          key={row.rowId} onChanged={state.busy ? null : () => flow.toggleExcluded(row.rowId)} recipe="toggle"
          title={fill(look.leaveOut, {name: row.displayName || look.unnamed})} value={state.excluded.has(row.rowId)} />
      ))}
      {changed ? (
        <CatchStack align="start">
          <CatchButton label={look.again} onPressed={state.busy ? null : () => void flow.previewAgain()} status={state.busy ? "loading" : "idle"}
            variant="secondary" />
        </CatchStack>
      ) : null}
    </CatchStack>
  );
}

/** Possible repeats and suggested tags, in the command's words; nothing is merged or tagged here. */
function Suggestions({result}: {result: GuestImportResult}) {
  const merges = guestMergeSuggestions(result);
  const tags = guestTagSuggestions(result);
  return (
    <>
      {merges.length ? (
        <CatchSection container="tile" footer={<CatchText as="p" tone="secondary" variant="body-small">{copy.review.merges.note}</CatchText>}
          title={copy.review.merges.title}>
          {merges.slice(0, shownRows).map((merge) => <CatchIndexRow density="compact" key={`${merge.rowId}-${merge.reason}`} title={merge.label} wrap />)}
          {merges.length > shownRows ? <CatchIndexRow density="compact" title={fill(copy.review.more, {count: merges.length - shownRows})} /> : null}
        </CatchSection>
      ) : null}
      {tags.length ? (
        <CatchSection container="tile" footer={<CatchText as="p" tone="secondary" variant="body-small">{copy.review.tags.note}</CatchText>}
          title={copy.review.tags.title}>
          {tags.slice(0, shownRows).map(({tag, count}) => (
            <CatchIndexRow density="compact" key={tag} title={tag} value={fill(copy.review.tags.count, {count})} />
          ))}
        </CatchSection>
      ) : null}
    </>
  );
}

/** The first guests in the list, with what saving does to each. */
function Guests({result}: {result: GuestImportResult}) {
  const rows = result.rows.filter((row) => row.kind === "add" || row.kind === "update" || row.kind === "unchanged");
  if (!rows.length) return null;
  return (
    <CatchSection container="tile" title={copy.review.guests}>
      {rows.slice(0, shownRows).map((row) => (
        <CatchIndexRow density="compact" key={row.rowId} status={copy.review.kinds[row.kind]} statusTone={row.kind === "add" ? "success" : "secondary"}
          subtitle={fill(copy.review.look.row, {row: row.sourceRowNumber})} title={row.displayName || copy.review.look.unnamed} wrap />
      ))}
      {rows.length > shownRows ? <CatchIndexRow density="compact" title={fill(copy.review.more, {count: rows.length - shownRows})} /> : null}
    </CatchSection>
  );
}

function ReviewStep({controller, stage}: {controller: GuestImportController; stage: Extract<GuestImportStage, {name: "review"}>}) {
  const {state, flow} = controller;
  const {result} = stage;
  const nothing = result.counts.add + result.counts.update === 0;
  return (
    <CatchStack gap={12}>
      <SummaryText summary={stage.summary} />
      <Counts result={result} />
      <ColumnsRead result={result} />
      <LookAt controller={controller} result={result} />
      <Suggestions result={result} />
      <Guests result={result} />
      {nothing ? <CatchText as="p" variant="body">{copy.review.nothing}</CatchText> : null}
      {!nothing && !result.eligibleForApply ? <CatchText as="p" variant="body">{copy.review.blocked}</CatchText> : null}
      <CatchText as="p" tone="secondary" variant="body-small">{copy.review.note}</CatchText>
      <CatchStack align="start" direction="row" gap={8} wrap>
        <CatchButton label={copy.review.confirm} onPressed={state.busy || !result.eligibleForApply ? null : () => void flow.confirm()}
          status={state.busy ? "loading" : "idle"} />
        <CatchButton label={copy.review.back} onPressed={state.busy ? null : flow.startOver} variant="quiet" />
      </CatchStack>
      <Where />
    </CatchStack>
  );
}

/** Saved: the import's numbers, then where to see the guests (Catch Host, signed in with the same phone). */
function DoneStep({controller, stage, placement}: {controller: GuestImportController; stage: Extract<GuestImportStage, {name: "done"}>; placement: string}) {
  const stores = useAppDownloadCtas({placement, app: "host"});
  const imported = stage.result.import;
  const phone = controller.state.caller?.phoneNumber ?? "";
  return (
    <CatchStack gap={16}>
      <SummaryText summary={stage.summary} />
      {imported ? (
        <CatchSection container="tile" title={copy.done.title}>
          <CatchIndexRow density="compact" title={copy.done.added} value={String(imported.createdCount)} />
          <CatchIndexRow density="compact" title={copy.done.updated} value={String(imported.updatedCount)} />
          {imported.skippedCount ? <CatchIndexRow density="compact" title={copy.done.skipped} value={String(imported.skippedCount)} /> : null}
        </CatchSection>
      ) : null}
      <CatchText as="p" variant="body">{copy.done.lead}</CatchText>
      <CatchText as="h3" variant="display-xs">{tryItCopy.claimInHost.title}</CatchText>
      <CatchText as="p" tone="secondary" variant="body">{fill(tryItCopy.claimInHost.lead, {phone})}</CatchText>
      <CatchStack direction="row" gap={12} wrap>
        {stores.map((store) => (
          <CatchStoreButton badgeSrc={store.badgeSrc} comingSoon={store.comingSoon} href={store.href || undefined} key={store.store}
            label={store.accessibleLabel} onClick={store.onClick} size="m" store={store.store} />
        ))}
      </CatchStack>
    </CatchStack>
  );
}

function problemText(reason: Extract<GuestImportStage, {name: "problem"}>["reason"]): string {
  const refusals: Readonly<Record<string, string>> = copy.refusals;
  if (Object.hasOwn(refusals, reason)) return refusals[reason];
  const problems: Readonly<Record<string, string>> = tryItCopy.problems;
  return Object.hasOwn(problems, reason) ? problems[reason] : tryItCopy.problems.failed;
}

/** Problems a retry cannot fix: the file, the city, or the caller's rights. */
const final = new Set(["invalid", "market_not_open", "multiple_organizers", "not_configured", "not_allowed", "city_unavailable", "intake_refused",
  "unreadable", ...Object.keys(copy.refusals)]);

function StageBody({controller, form, analyticsPlacement}: GuestImportToolProps & {controller: GuestImportController}) {
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
          <SummaryText summary={stage.summary} />
          <CatchStack align="start" direction="row" gap={8} wrap>
            <CatchButton label={tryItCopy.workspace.confirm} onPressed={state.busy ? null : () => void flow.confirmWorkspace()}
              status={state.busy ? "loading" : "idle"} />
            <CatchButton label={copy.review.back} onPressed={state.busy ? null : flow.startOver} variant="quiet" />
          </CatchStack>
        </CatchStack>
      );
    case "working":
      return (
        <CatchStack align="center" aria-live="polite" direction="row" gap={12} role="status">
          <CatchLoadingIndicator label={tryItCopy.working.busy} />
          <CatchText as="h3" variant="display-xs">{copy.working}</CatchText>
        </CatchStack>
      );
    case "mapping":
      return <MappingStep controller={controller} stage={stage} />;
    case "review":
      return <ReviewStep controller={controller} stage={stage} />;
    case "done":
      return <DoneStep controller={controller} placement={analyticsPlacement} stage={stage} />;
    case "problem": {
      const retriable = !final.has(stage.reason);
      return (
        <CatchStack gap={12}>
          <CatchStack aria-live="assertive" gap={4} role="alert">
            <CatchText as="h3" variant="display-xs">{problemText(stage.reason)}</CatchText>
          </CatchStack>
          <CatchStack align="start" direction="row" gap={8} wrap>
            {retriable ? <CatchButton label={tryItCopy.problem.retry} onPressed={state.busy ? null : () => void flow.retry()} status={state.busy ? "loading" : "idle"} /> : null}
            <CatchButton label={retriable ? tryItCopy.problem.startOver : copy.review.back} onPressed={flow.startOver} variant={retriable ? "quiet" : "primary"} />
          </CatchStack>
        </CatchStack>
      );
    }
  }
}

function GuestImportTool(props: GuestImportToolProps) {
  const controller = useGuestImportController();
  return (
    <CatchGroundCard ground="white" outlined>
      <CatchStack gap={16}>
        <CatchStack align="start" gap={8}>
          <CatchBadge label={tryItCopy.kicker} size="sm" tone="gold" />
          <CatchText as="h3" variant="title-bar">{copy.title}</CatchText>
        </CatchStack>
        <StageBody {...props} controller={controller} />
      </CatchStack>
    </CatchGroundCard>
  );
}

/**
 * Guest records' try-it tool in a tool form's place (features/playbook's
 * tool slot): choose a guest list, the phone step, then guests.import-list
 * end to end into the visitor's private draft event. The same card in a
 * try band or a closing band. Keyed by page, band and form, so each starts
 * empty.
 */
export function guestImportToolNode(props: {form: PlaybookLeadForm; pageId: string; sectionId: string}): ReactNode {
  const key = `${props.pageId}-${props.sectionId}-${props.form.id}`;
  return <GuestImportTool analyticsPlacement={`try_it_${props.pageId}_${props.sectionId}`} form={props.form} key={key} />;
}
