import {
  CatchButton,
  CatchEmptyState,
  CatchField,
  CatchGap,
  CatchIndexRow,
  CatchPaneLayout,
  CatchTable,
  CatchText,
  CatchWorkspaceHeader,
  type CatchTableColumn,
} from "@catch/web-ui";
import {useState, type ReactNode} from "react";
import type {AccessReviewController} from
  "../controllers/useAccessReviewController";
import type {AccountAction} from "../api/accountSafetyRepository";
import {
  accountActionFacts,
  accountActionRows,
  actionName,
  filterSafetyCases,
  safetyCaseCounts,
  safetyCaseRows,
  type AccountActionRow,
  type SafetyCaseKind,
  type SafetyCaseRow,
  type SafetyTone,
} from "../controllers/safetyCases";
import {canTakeStep, type SafetyJob} from "../controllers/safetyActionSheet";
import type {AccountKindFilter, AccountSafetyController} from
  "../controllers/useAccountSafetyController";
import type {SafetyActionSheetController} from
  "../controllers/useSafetyActionSheetController";
import type {SafetyTriageController} from
  "../controllers/useSafetyTriageController";
import {SafetyActionSheetWorkspace} from "./SafetyActionSheetWorkspace";

export type SafetyView = "open" | "actions" | "appeals";

const toneColor: Record<SafetyTone, "danger" | "attentionText" |
  "positiveText" | "ink2"> = {
  danger: "danger", warning: "attentionText", success: "positiveText",
  secondary: "ink2",
};

const caseColumns: CatchTableColumn<SafetyCaseRow>[] = [
  {key: "case", label: "Case", kind: "title"},
  {key: "kindLabel", label: "Kind", kind: "badge", width: "100px"},
  {key: "due", label: "Due", width: "160px", sort: "asc", align: "end"},
];

const actionColumns: CatchTableColumn<AccountActionRow>[] = [
  {key: "who", label: "Account", kind: "title"},
  {key: "action", label: "Action", kind: "badge", width: "110px"},
  {key: "until", label: "Until", width: "120px"},
  {key: "state", label: "Where it is", width: "150px"},
];

const caseChips: Array<{kind: SafetyCaseKind | "all"; label: string}> = [
  {kind: "all", label: "All"}, {kind: "report", label: "Reports"},
  {kind: "flag", label: "Flags"}, {kind: "event", label: "Events"},
  {kind: "access", label: "Access"},
];

const actionChips: Array<{kind: AccountKindFilter; label: string}> = [
  {kind: "all", label: "All"}, {kind: "warn", label: "Warnings"},
  {kind: "restrict", label: "Restrictions"},
  {kind: "suspend", label: "Suspensions"}, {kind: "ban", label: "Bans"},
];

function Fact({label, value, tone}: {label: string; value: string;
  tone?: SafetyTone}) {
  return (
    <CatchIndexRow
      title={label}
      titleVariant="supporting"
      trailing={<CatchText as="span" color={tone ? toneColor[tone] : "ink"}
        variant="supportingStrong">{value}</CatchText>}
    />
  );
}

function Block({title, children}: {title: string; children: ReactNode}) {
  return (
    <CatchGap size="related">
      <CatchText as="h2" variant="sectionTitle">{title}</CatchText>
      {children}
    </CatchGap>
  );
}

/**
 * Safety (boards AdminSafety and AdminSafetyActions): open cases from every
 * queue, including launch access, due soonest first; the accounts acted on;
 * and appeals waiting. The case beside the queue carries its evidence and
 * the decision; acting on an account opens the sheet.
 */
export function SafetyScreen({
  access,
  actions,
  caseKind,
  job,
  nowMs,
  onCaseKind,
  onSelectAction,
  onSelectCase,
  onViewChanged,
  selectedCaseKey,
  sheet,
  triage,
  view,
}: {
  access: AccessReviewController;
  actions: AccountSafetyController;
  caseKind: SafetyCaseKind | "all";
  job: SafetyJob;
  nowMs: number;
  onCaseKind: (kind: SafetyCaseKind | "all") => void;
  onSelectAction: (actionId: string) => void;
  onSelectCase: (row: SafetyCaseRow) => void;
  onViewChanged: (view: SafetyView) => void;
  selectedCaseKey: string | null;
  sheet: SafetyActionSheetController;
  triage: SafetyTriageController;
  view: SafetyView;
}) {
  const cases = safetyCaseRows(triage.rows, access.rows, nowMs);
  const counts = safetyCaseCounts(cases);
  const shown = filterSafetyCases(cases, caseKind, triage.query);
  const views = {
    items: [
      {value: "open", label: "Open cases", count: counts.all},
      {value: "actions", label: "Account actions",
        count: view === "actions" ? actions.counts.all : undefined},
      {value: "appeals", label: "Appeals",
        count: view === "appeals" ? actions.counts.all : undefined},
    ],
    value: view,
    onChanged: (value: string) => onViewChanged(value as SafetyView),
  };

  const casesPane = (
    <>
      <CatchWorkspaceHeader
        count={counts.all}
        filters={{
          chips: caseChips.map((chip) => ({label: chip.label,
            count: counts[chip.kind], selected: caseKind === chip.kind,
            onPressed: () => onCaseKind(chip.kind)})),
          search: {placeholder: "Search cases", value: triage.query,
            onChanged: triage.setQuery},
        }}
        note={shown[0]?.due.tone === "danger" ? shown[0].due.text :
          undefined}
        title="Safety"
        views={views}
      />
      {shown.length === 0 ? (
        <CatchEmptyState message={triage.isLoading || access.isLoading ?
          "Loading cases" : "No open cases."} title="Nothing waiting" />
      ) : (
        <CatchTable
          columns={caseColumns}
          density="compact"
          label="Open safety cases"
          onRowPressed={onSelectCase}
          rows={shown}
          selectedKey={selectedCaseKey}
        />
      )}
    </>
  );

  const actionRows = accountActionRows(actions.items);
  const actionsPane = (
    <>
      <CatchWorkspaceHeader
        count={actions.counts.all}
        filters={{chips: actionChips.map((chip) => ({label: chip.label,
          count: actions.counts[chip.kind],
          selected: actions.kind === chip.kind,
          onPressed: () => actions.setKind(chip.kind)}))}}
        title="Safety"
        views={views}
      />
      {actionRows.length === 0 ? (
        <CatchEmptyState message={actions.loadState === "loading" ?
          "Loading account actions" : view === "appeals" ?
          "No appeals are waiting." : "No account actions in force."}
        title={view === "appeals" ? "No appeals" : "Nothing in force"} />
      ) : (
        <CatchTable
          columns={actionColumns}
          density="compact"
          label={view === "appeals" ? "Appeals" : "Account actions"}
          onRowPressed={(row) => onSelectAction(row.key)}
          rows={actionRows}
          selectedKey={actions.selected?.actionId ?? null}
        />
      )}
    </>
  );

  const selectedCase = cases.find((row) => row.key === selectedCaseKey) ??
    null;
  const detail = view === "open" ?
    selectedCase?.kind === "access" ?
      <AccessDetail access={access} /> :
      selectedCase ?
        <CaseDetail job={job} onAct={sheet.open} position={
          `${shown.findIndex((row) => row.key === selectedCase.key) + 1} of ` +
          `${shown.length}`} triage={triage} /> :
        null :
    actions.selected ?
      <ActionDetail action={actions.selected} actions={actions} job={job} /> :
      null;

  return (
    <>
      <CatchPaneLayout
        detail={detail ?? undefined}
        detailOpen={detail !== null}
        main={view === "open" ? casesPane : actionsPane}
        pattern="queue"
      />
      <SafetyActionSheetWorkspace isSaving={actions.isMutating} job={job}
        sheet={sheet} />
    </>
  );
}

function CaseDetail({
  job,
  onAct,
  position,
  triage,
}: {
  job: SafetyJob;
  onAct: SafetyActionSheetController["open"];
  position: string;
  triage: SafetyTriageController;
}) {
  const item = triage.selectedDetail;
  if (!item) {
    return (
      <>
        <CatchWorkspaceHeader kicker="Safety" title="Case" />
        <CatchText as="p" color="ink2" variant="bodyM">
          {triage.isDetailLoading ? "Loading the case" :
            "This case is no longer available."}
        </CatchText>
      </>
    );
  }
  const busy = triage.decisionInFlight !== null;
  const reasonCode = item.kind === "report" ?
    item.title.trim().toLowerCase().replace(/\s+/gu, "_") : null;
  return (
    <>
      <CatchWorkspaceHeader
        kicker="Safety"
        note={position}
        title={item.title}
      />
      <CatchGap size="section">
        <Block title="The case">
          <Fact label="Due" tone={item.sla.state === "overdue" ||
            item.sla.state === "due_soon" ? "danger" : undefined}
          value={item.sla.dueAt ? new Date(item.sla.dueAt).toLocaleString(
            "en-GB", {dateStyle: "medium", timeStyle: "short",
              timeZone: "Asia/Kolkata"}) : "Not set"} />
          <Fact label="Deadline" value={item.sla.policy} />
          {item.fields.map((field) => (
            <Fact key={field.label} label={field.label} value={field.value} />
          ))}
          <Fact label="Assigned to"
            value={item.assignment.assigneeUid ?? "No one yet"} />
          {item.priorHistory.length > 0 ? (
            <Fact label="Before this" tone="warning" value={
              item.priorHistory.map((signal) =>
                `${signal.count} ${signal.label.toLowerCase()}`).join(", ")} />
          ) : null}
        </Block>
        {item.evidence.length > 0 ? (
          <Block title="What was reported">
            {item.evidence.map((entry) => (
              <CatchIndexRow
                key={`${entry.label}:${entry.value}`}
                subtitle={entry.sourcePath ?? undefined}
                title={entry.sensitive ? `${entry.label} (sensitive)` :
                  entry.label}
                titleVariant="supporting"
                trailing={<CatchText as="span" variant="supporting">
                  {entry.value}</CatchText>}
              />
            ))}
          </Block>
        ) : null}
        <Block title="Decide">
          <CatchField
            helperText={"Only your team sees this. The reporter hears it " +
              "was handled, never what was done."}
            maxLength={1000}
            maxLines={3}
            onChanged={(note) => triage.setDecisionForm({note})}
            recipe="input"
            title="What you decided and why"
            value={triage.decisionForm.note}
          />
          <CatchGap direction="horizontal" size="related" wrap>
            <CatchButton
              label={triage.decisionInFlight === "review" ? "Saving" :
                "Resolve"}
              onPressed={busy ? null : () => void triage.decide("review")}
              size="sm"
            />
            <CatchButton
              label={triage.decisionInFlight === "dismiss" ? "Saving" :
                "Dismiss"}
              onPressed={busy ? null : () => void triage.decide("dismiss")}
              size="sm"
              variant="secondary"
            />
            {item.primaryUserId ? (
              <CatchButton
                label="Act on the account"
                onPressed={() => onAct({uid: item.primaryUserId!,
                  displayName: null, caseTargetPath: item.targetPath,
                  caseTitle: item.title, reasonCode})}
                size="sm"
                variant="danger"
              />
            ) : null}
          </CatchGap>
          {triage.decisionValidationIssue && triage.decisionForm.note ? (
            <CatchText as="p" color="danger" variant="bodyS">
              {triage.decisionValidationIssue}
            </CatchText>
          ) : null}
          {job === "ops" ? (
            <CatchText as="p" color="ink2" variant="bodyS">
              You can warn or restrict. Suspending or banning is the
              owner&apos;s call.
            </CatchText>
          ) : null}
        </Block>
      </CatchGap>
    </>
  );
}

function AccessDetail({access}: {access: AccessReviewController}) {
  const details = access.selectedDetails;
  const row = access.selected;
  if (!row) return null;
  const busy = access.decisionInFlight !== null;
  return (
    <>
      <CatchWorkspaceHeader kicker="Safety · launch access" title={row.title} />
      <CatchGap size="section">
        <Block title="The application">
          {details ? (
            <>
              <Fact label="City" value={details.city ?? "Not given"} />
              <Fact label="Role" value={details.role ?? "Not given"} />
              <Fact label="Wants to host"
                value={details.wantsToHost ? "Yes" : "No"} />
              {details.eventTypes.length > 0 ? (
                <Fact label="Events" value={details.eventTypes.join(", ")} />
              ) : null}
              {details.instagramHandle ? (
                <Fact label="Instagram" value={`@${details.instagramHandle}`} />
              ) : null}
              {details.whyCatch ? (
                <CatchText as="p" variant="bodyM">{details.whyCatch}</CatchText>
              ) : null}
            </>
          ) : (
            <CatchText as="p" color="ink2" variant="bodyM">
              {access.isDetailLoading ? "Loading the application" :
                access.detailError ?? row.detail}
            </CatchText>
          )}
        </Block>
        <Block title="Decide">
          <CatchField
            maxLength={1000}
            maxLines={3}
            onChanged={(note) => access.setForm({...access.form, note})}
            recipe="input"
            title="Why"
            value={access.form.note}
          />
          <CatchField
            helperText="Optional: the launch cohort they join."
            onChanged={(cohortId) => access.setForm({...access.form,
              cohortId})}
            recipe="input"
            title="Cohort"
            value={access.form.cohortId}
          />
          <CatchGap direction="horizontal" size="related" wrap>
            <CatchButton
              label={access.decisionInFlight === "approve" ? "Saving" :
                "Let them in"}
              onPressed={busy ? null : () => void access.decide("approve")}
              size="sm"
            />
            <CatchButton
              label={access.decisionInFlight === "deny" ? "Saving" :
                "Turn down"}
              onPressed={busy ? null : () => void access.decide("deny")}
              size="sm"
              variant="secondary"
            />
          </CatchGap>
          {access.validationIssue && access.form.note ? (
            <CatchText as="p" color="danger" variant="bodyS">
              {access.validationIssue}
            </CatchText>
          ) : null}
        </Block>
      </CatchGap>
    </>
  );
}

const lighter: Record<AccountAction["kind"], {kind: "warn" | "restrict" |
  "suspend"; durationDays: 7 | 30 | null; label: string} | null> = {
  ban: {kind: "suspend", durationDays: 30, label: "Change to a suspension"},
  suspend: {kind: "restrict", durationDays: 30,
    label: "Change to a restriction"},
  restrict: {kind: "warn", durationDays: null, label: "Change to a warning"},
  warn: null,
};

function ActionDetail({
  action,
  actions,
  job,
}: {
  action: AccountAction;
  actions: AccountSafetyController;
  job: SafetyJob;
}) {
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const appealOpen = action.appeal?.status === "open";
  const busy = actions.isMutating;
  const name = action.displayName ?? action.uid;
  const reduceTo = lighter[action.kind];
  const ready = message.trim().length > 0 && note.trim().length > 0;
  const decide = (outcome: "keep" | "reduce" | "lift") =>
    void actions.decide({actionId: action.actionId, outcome,
      reduceTo: outcome === "reduce" && reduceTo ?
        {kind: reduceTo.kind, durationDays: reduceTo.durationDays} : null,
      messageToUser: message.trim(), note: note.trim()});
  return (
    <>
      <CatchWorkspaceHeader kicker="Account actions" title={name} />
      <CatchGap size="section">
        <Block title={actionName(action.kind)}>
          {accountActionFacts(action).map((fact) => (
            <Fact key={fact.label} {...fact} />
          ))}
        </Block>
        <Block title="What they were told">
          <CatchText as="p" variant="bodyM">{action.messageToUser}</CatchText>
        </Block>
        {action.appeal ? (
          <Block title="Their appeal">
            <CatchText as="p" variant="bodyM">{action.appeal.text}</CatchText>
          </Block>
        ) : null}
        {appealOpen && action.canReviewAppeal ? (
          <Block title="Decide the appeal">
            <CatchField maxLength={1000} maxLines={3}
              helperText="Plain words; no reporter is named."
              onChanged={setMessage} recipe="input"
              title="Reason, sent to them" value={message} />
            <CatchField maxLength={1000} maxLines={2}
              onChanged={setNote} recipe="input"
              title="Note for the team" value={note} />
            <CatchGap direction="horizontal" size="related" wrap>
              <CatchButton label="Keep it"
                onPressed={ready && !busy ? () => decide("keep") : null}
                size="sm" />
              {reduceTo ? (
                <CatchButton label={reduceTo.label}
                  onPressed={ready && !busy ? () => decide("reduce") : null}
                  size="sm" variant="secondary" />
              ) : null}
              <CatchButton label="Lift it"
                onPressed={ready && !busy ? () => decide("lift") : null}
                size="sm" variant="danger" />
            </CatchGap>
            <CatchText as="p" color="ink2" variant="bodyS">
              {name} hears the outcome. The reporters are not told.
            </CatchText>
          </Block>
        ) : appealOpen ? (
          <CatchText as="p" color="ink2" variant="bodyS">
            You decided this, so someone else reviews the appeal.
          </CatchText>
        ) : action.status === "active" && canTakeStep(job, action.kind) ? (
          <Block title="Lift early">
            <CatchField maxLength={1000} maxLines={2}
              onChanged={setNote} recipe="input"
              title="Why it's lifted" value={note} />
            <CatchButton label="Lift"
              onPressed={note.trim() && !busy ?
                () => void actions.lift(action.actionId, note.trim()) : null}
              size="sm" variant="secondary" />
          </Block>
        ) : null}
      </CatchGap>
    </>
  );
}
