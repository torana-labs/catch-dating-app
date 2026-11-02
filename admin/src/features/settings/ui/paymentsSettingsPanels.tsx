import {
  CatchButton,
  CatchCheckboxInput,
  CatchDialog,
  CatchField,
  CatchGap,
  CatchIndexRow,
  CatchSection,
  CatchText,
  CatchWorkspaceHeader,
} from "@catch/web-ui";
import {useState, type ReactNode} from "react";
import type {MoneySettings} from "../api/paymentSettingsRepository";
import {
  parseTermsField,
  termsFields,
  termsSummaryRows,
  type TermsField,
} from "../controllers/commercialTermsForm";
import type {CommercialTermsController} from "../controllers/useCommercialTermsController";
import type {PaymentSettingsController} from "../controllers/usePaymentSettingsController";
import type {PaymentRoutingController} from "../controllers/usePaymentRoutingController";
import {
  describeSelection,
  followsLegacyConnections,
  legacyFormFeeLabel,
  livePurposes,
  modeOptions,
  routeOptions,
  routingPurposeLabels,
  routingPurposes,
  storedSelection,
  type RoutingChoice,
} from "../controllers/paymentRoutingForm";

/** The editors Settings → Payments opens in its detail pane. */
export type PaymentsEdit = "terms" | "organizer-terms" | "collection" | "credit" | "plans" | "messaging";

export interface PaymentsOverviewProps {
  terms: CommercialTermsController;
  routing: PaymentRoutingController;
  money: PaymentSettingsController;
  isExporting: boolean;
  lastMonthLabel: string;
  onEdit: (edit: PaymentsEdit, organizerId?: string) => void;
  onExport: () => void;
}

const dateTime = new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short", timeZone: "Asia/Kolkata"});

const roleLabels: Record<MoneySettings["nominatorCredit"]["earningRoles"][number], string> = {
  associate: "sales associates",
  partner: "Partners",
  guest: "guests",
  organizer: "organizers",
};

function Value({children, tone}: {children: ReactNode; tone?: "positiveText" | "attentionText" | "ink2"}) {
  return <CatchText as="span" color={tone} variant="supportingStrong">{children}</CatchText>;
}

function Row({title, subtitle, value, action}: {title: string; subtitle?: string; value?: ReactNode; action?: ReactNode}) {
  return (
    <CatchIndexRow
      subtitle={subtitle}
      title={title}
      titleVariant="titleS"
      trailing={value || action ? (
        <CatchGap crossAxisAlignment="center" direction="horizontal" size="related">
          {value}
          {action}
        </CatchGap>
      ) : undefined}
    />
  );
}

function change(onPressed: (() => void) | null, label = "Change") {
  return <CatchButton label={label} onPressed={onPressed} size="sm" variant="secondary" />;
}

function percentOf(basisPoints: number): string {
  return `${(basisPoints / 100).toLocaleString("en-IN", {maximumFractionDigits: 2})}%`;
}

function rupees(minor: number): string {
  return `₹${Math.round(minor / 100).toLocaleString("en-IN")}`;
}

/** Settings → Payments as drawn: terms, who collects, partner credit, tax and invoices, own terms. */
export function renderPaymentsOverview(props: PaymentsOverviewProps) {
  return <PaymentsOverview {...props} />;
}

function PaymentsOverview({terms, routing, money, isExporting, lastMonthLabel, onEdit, onExport}: PaymentsOverviewProps) {
  const [confirmingGst, setConfirmingGst] = useState<boolean | null>(null);
  const listing = terms.listing;
  const platform = listing?.platform ?? null;
  const rows = termsSummaryRows(platform?.terms ?? null, null, "platform");
  const value = (id: string) => rows.find((row) => row.id === id)?.value ?? "Not set";
  const settings = money.state?.settings ?? null;
  const credit = settings?.nominatorCredit ?? null;
  const canEditTerms = terms.canManage && terms.loadState === "ready";
  return (
    <CatchGap size="section">
      <CatchSection
        container="tile"
        note={platform ? `Revision ${platform.revision}, saved ${dateTime.format(platform.updatedAtMillis)} · every change is kept` :
          terms.loadState === "error" ? terms.loadError ?? "Terms could not load" : "Not saved yet"}
        title="Platform terms"
      >
        <Row action={change(canEditTerms ? () => onEdit("terms") : null)} title="Commission on tickets" value={<Value>{value("rate")}</Value>} />
        <Row action={change(canEditTerms ? () => onEdit("terms") : null)} title="Cap per organizer" value={<Value>{platform ? `${value("cap")} a cycle` : "Not set"}</Value>} />
        <Row action={change(canEditTerms ? () => onEdit("terms") : null)} title="Free trial" value={<Value>{value("trialDays")}</Value>} />
        <Row action={change(canEditTerms ? () => onEdit("terms") : null)} title="Tools only, no ticketing" value={<Value>{platform ? `${value("toolsOnlyFee")} a cycle` : "Not set"}</Value>} />
      </CatchSection>
      <CatchSection container="tile" note="who takes each kind of payment, and whether it is real money" title="Who collects what">
        {routing.policy ? routingPurposes.map((purpose) => {
          const legacy = followsLegacyConnections(routing.policy!, purpose);
          const current = describeSelection(storedSelection(routing.policy!, purpose));
          const mode = legacy ? "Each connection's mode" : current.mode === "live" ? "Live" : current.mode === "test" ? "Test mode" : "Off";
          return (
            <Row
              action={change(routing.canManage ? () => onEdit("collection") : null)}
              key={purpose}
              subtitle={legacy ? legacyFormFeeLabel : current.route}
              title={routingPurposeLabels[purpose]}
              value={<Value tone={mode === "Live" ? "positiveText" : mode === "Off" ? "ink2" : "attentionText"}>{mode}</Value>}
            />
          );
        }) : <CatchText as="p" color={routing.loadState === "error" ? "danger" : "ink2"} variant="bodyS">
          {routing.loadState === "error" ? routing.loadError ?? "Payment routing could not load." : "Loading who collects"}
        </CatchText>}
      </CatchSection>
      {credit ? (
        <CatchSection container="tile" note="decided 1 Nov" title="Partner credit">
          <Row action={change(() => onEdit("credit"))} title="Credit" value={<Value>{`${percentOf(credit.rateBasisPoints)} of what the organizer pays Catch`}</Value>} />
          <Row action={change(() => onEdit("credit"))} title="For" value={<Value>{`${credit.months} months from their first paid bill`}</Value>} />
          <Row
            action={change(() => onEdit("credit"))}
            subtitle={`The first nomination; it lapses if the organizer has not claimed within ${credit.lapseDays} days`}
            title="Who wins"
            value={<Value>First nominator</Value>}
          />
          <Row
            action={change(() => onEdit("credit"))}
            subtitle={`Only on bills the organizer has paid; under ${rupees(credit.minimumPayoutMinor)} rolls over`}
            title="Paid"
            value={<Value>{`Monthly, on day ${credit.payoutDayOfMonth}`}</Value>}
          />
          <Row
            subtitle="Sales associates do not; their pay covers it. PAN collected when a partner joins."
            title="Who earns it"
            value={<Value>{credit.earningRoles.map((role) => roleLabels[role]).join(", ")}</Value>}
          />
        </CatchSection>
      ) : null}
      {settings ? (
        <CatchSection container="tile" title="Tax and invoices">
          <Row
            action={<CatchCheckboxInput label="Registered" onChanged={money.isSaving ? null : (next) => setConfirmingGst(next)} semanticLabel="GST registered" value={settings.gstRegistered} />}
            subtitle={settings.gstRegistered ? `On: bills add GST at ${percentOf(settings.gstRateBasisPoints)}.` :
              "Off: bills carry no GST. Turn on only when the accountant says Catch must register."}
            title="GST registered"
          />
          <Row subtitle="One unbroken sequence per financial year" title="Invoice numbers" value={<Value>{`Next: ${money.state?.nextInvoiceNumber ?? "—"}`}</Value>} />
          <Row action={change(() => onEdit("credit"))} subtitle="Bills are due this day of the month after they are made" title="Bills due" value={<Value>{`Day ${settings.billDueDayOfMonth}`}</Value>} />
          <Row
            action={change(isExporting ? null : onExport, isExporting ? "Exporting" : "Download")}
            subtitle="Bills, payments, credit and costs, for the accountant to import into Zoho Books"
            title="Monthly export"
            value={<Value>{`Last: ${lastMonthLabel}`}</Value>}
          />
        </CatchSection>
      ) : null}
      {listing ? (
        <CatchSection count={listing.overrides.length} title="Organizers on their own terms">
          {listing.overrides.map((entry) => {
            const set = termsSummaryRows(platform?.terms ?? null, entry.terms, "organizer").filter((row) => !row.inherited);
            return (
              <Row
                action={change(terms.canManage ? () => onEdit("organizer-terms", entry.organizerId) : null)}
                key={entry.organizerId}
                subtitle={[set.length === 0 ? "Inherits everything" : set.map((row) => `${row.field} ${row.value}`).join(" · "), entry.reason].filter(Boolean).join(" · ")}
                title={entry.organizerName ?? entry.organizerId}
              />
            );
          })}
          <OrganizerSearch onOpen={(organizerId) => onEdit("organizer-terms", organizerId)} terms={terms} />
        </CatchSection>
      ) : null}
      <CatchSection title="Granted by hand">
        <Row
          action={change(terms.canManage ? () => onEdit("plans") : null)}
          subtitle="Wedding and planner plans settled by invoice, outside checkout"
          title="Plans"
        />
        <Row
          action={change(terms.canManage ? () => onEdit("messaging") : null)}
          subtitle="Ceilings for one event's messages, reviewed and staged paused"
          title="Messaging budgets"
        />
      </CatchSection>
      {money.saveError ? <CatchText as="p" color="danger" variant="bodyS">{money.saveError}</CatchText> : null}
      <CatchDialog
        cancel={{label: "Cancel", onPressed: () => setConfirmingGst(null)}}
        confirm={{
          label: confirmingGst ? "Turn GST on" : "Turn GST off",
          tone: "danger",
          onPressed: money.isSaving ? null : () => {
            const next = confirmingGst === true;
            setConfirmingGst(null);
            void money.save((current) => ({...current, gstRegistered: next}));
          },
        }}
        message={confirmingGst ?
          "Bills made from now on add GST. Bills already made keep what they say. Turn this on only when the accountant confirms Catch is registered." :
          "Bills made from now on carry no GST. Bills already made keep what they say."}
        onClose={() => setConfirmingGst(null)}
        open={confirmingGst !== null}
        title={confirmingGst ? "Catch is GST registered?" : "Catch is no longer GST registered?"}
      />
    </CatchGap>
  );
}

function OrganizerSearch({terms, onOpen}: {terms: CommercialTermsController; onOpen: (organizerId: string) => void}) {
  return (
    <CatchGap size="related">
      <CatchGap crossAxisAlignment="end" direction="horizontal" size="related">
        <CatchField
          inputHint="Organizer name"
          onChanged={terms.setSearchText}
          onSubmitted={terms.search}
          recipe="input"
          title="Give an organizer their own terms"
          value={terms.searchText}
        />
        {change(terms.canManage ? terms.search : null, "Find")}
      </CatchGap>
      {terms.searchState === "loading" ? <CatchText as="p" color="ink2" variant="bodyS">Searching organizers</CatchText> :
        terms.searchState === "error" ? <CatchText as="p" color="danger" variant="bodyS">Organizers could not be searched. Try again.</CatchText> :
          terms.searchState === "ready" && terms.searchMatches.length === 0 ? <CatchText as="p" color="ink2" variant="bodyS">No organizer matches that name.</CatchText> :
            terms.searchMatches.map((match) => (
              <Row
                action={change(() => onOpen(match.organizerId), "Open")}
                key={match.organizerId}
                subtitle={match.cityName ?? undefined}
                title={match.organizerName ?? match.organizerId}
              />
            ))}
    </CatchGap>
  );
}

// ---------- Terms editor ----------

function groups(fields: readonly TermsField[]): Array<[string, TermsField[]]> {
  const byGroup = new Map<string, TermsField[]>();
  for (const field of fields) byGroup.set(field.group, [...(byGroup.get(field.group) ?? []), field]);
  return [...byGroup.entries()];
}

function TermsFieldInput({field, value, onChange}: {field: TermsField; value: string; onChange: (text: string) => void}) {
  if (field.kind === "choice") {
    return (
      <CatchField
        helperText={field.helperText}
        onChanged={(next) => onChange(next ?? "")}
        itemLabelBuilder={(option) => field.options?.find((entry) => entry.value === option)?.label ?? option}
        values={(field.options ?? []).map((option) => option.value)}
        recipe="select"
        title={field.label}
        value={value}
      />
    );
  }
  const parsed = value.trim() === "" && field.kind !== "rupeesOrNoCap" ? null : parseTermsField(field.id, value);
  const errorText = parsed && "error" in parsed ? parsed.error : undefined;
  return (
    <CatchField
      errorText={errorText}
      helperText={errorText ? undefined : field.helperText}
      keyboardType="decimal"
      onChanged={onChange}
      prefixText={field.kind === "rupees" || field.kind === "rupeesOrNoCap" ? "₹" : undefined}
      recipe="input"
      suffixText={field.kind === "percent" ? "%" : field.kind === "days" ? "days" : undefined}
      title={field.label}
      value={value}
    />
  );
}

/** Platform or one organizer's terms: edit, review the change, save it with a reason. */
export function renderTermsEditor(controller: CommercialTermsController, onDone: () => void) {
  return <TermsEditor controller={controller} onDone={onDone} />;
}

function TermsEditor({controller, onDone}: {controller: CommercialTermsController; onDone: () => void}) {
  const editor = controller.editor;
  const listing = controller.listing;
  const organizer = controller.scope === "organizer";
  const title = organizer ? `Terms for ${listing?.organizerName ?? "this organizer"}` : "Platform terms";
  const header = <CatchWorkspaceHeader back={{label: "Back to Payments", onPressed: () => { controller.cancelEdit(); onDone(); }}} kicker="Settings · Payments" title={title} />;
  if (!listing || !editor) {
    return (
      <>
        {header}
        {controller.loadState === "ready" && !listing?.platform && organizer ?
          <CatchText as="p" color="attentionText" variant="bodyM">Save Catch's platform terms before giving this organizer their own.</CatchText> :
          controller.loadState === "ready" && !listing?.platform ? (
            <CatchGap crossAxisAlignment="start" size="related">
              <CatchText as="p" color="attentionText" variant="bodyM">
                Platform terms are not saved yet. Until they are, payments Catch splits and host memberships stay unavailable, and host-collected payments record no terms for the bills.
              </CatchText>
              <CatchGap direction="horizontal" size="related" wrap>
                <CatchButton label="Start from the owner's 30 Oct decision" onPressed={controller.startFromOwnerDecision} size="sm" />
                <CatchButton label="Enter terms by hand" onPressed={controller.startEdit} size="sm" variant="secondary" />
              </CatchGap>
            </CatchGap>
          ) : <CatchText as="p" color={controller.loadState === "error" ? "danger" : "ink2"} variant="bodyM">
            {controller.loadState === "error" ? controller.loadError ?? "Terms could not load." : "Loading terms"}
          </CatchText>}
      </>
    );
  }
  if (editor.preview) {
    const changed = editor.preview.filter((row) => row.changed);
    return (
      <>
        {header}
        <CatchGap size="section">
          <CatchText as="p" color="ink2" variant="bodyM">
            {`${changed.length} ${changed.length === 1 ? "term changes" : "terms change"} against ${editor.baseRevision === 0 ? "the unsaved state" : `revision ${editor.baseRevision}`}. ` +
              "New payments use the saved terms; payments already recorded keep the terms they were taken under."}
          </CatchText>
          <CatchSection title="What changes">
            {changed.map((row) => <Row key={row.id} subtitle={`Now ${row.before}`} title={row.field} value={<Value>{row.after}</Value>} />)}
          </CatchSection>
          <Row subtitle={editor.reason.trim()} title="Reason" />
          {editor.unconfirmed ? <CatchText as="p" color="attentionText" variant="bodyS">Catch did not confirm the last save. Retrying sends exactly the same change, and it is applied only once.</CatchText> : null}
          <CatchGap direction="horizontal" size="related" wrap>
            <CatchButton
              label={controller.isSaving ? "Saving" : editor.unconfirmed ? "Retry the same save" : `Save as revision ${editor.baseRevision + 1}`}
              onPressed={controller.isSaving ? null : () => void controller.save().then((saved) => { if (saved) onDone(); })}
              size="sm"
            />
            <CatchButton label="Back to editing" onPressed={controller.isSaving || editor.unconfirmed ? null : controller.backToEdit} size="sm" variant="secondary" />
          </CatchGap>
        </CatchGap>
      </>
    );
  }
  const platformTerms = listing.platform?.terms ?? null;
  const inherited = termsSummaryRows(platformTerms, null, "platform");
  return (
    <>
      {header}
      <CatchGap size="section">
        {organizer ? <CatchText as="p" color="ink2" variant="bodyM">Tick a term to set it for this organizer. Unticked terms follow the platform terms when they change.</CatchText> : null}
        {groups(termsFields).map(([group, fields]) => (
          <CatchSection key={group} title={group}>
            {fields.map((field) => {
              const own = field.id in editor.draft;
              return (
                <CatchGap key={field.id} size="related">
                  {organizer ? (
                    <CatchCheckboxInput
                      label={`Set ${field.label.toLowerCase()} for this organizer`}
                      onChanged={(checked) => controller.setInherited(field.id, !checked)}
                      value={own}
                    />
                  ) : null}
                  {!organizer || own ? (
                    <TermsFieldInput field={field} onChange={(text) => controller.setField(field.id, text)} value={editor.draft[field.id] ?? ""} />
                  ) : (
                    <Row subtitle={`Platform: ${inherited.find((row) => row.id === field.id)?.value ?? "Not set"}`} title={field.label} />
                  )}
                </CatchGap>
              );
            })}
          </CatchSection>
        ))}
        <CatchField
          helperText="Recorded with the revision and in the admin audit log."
          maxLength={500}
          maxLines={3}
          onChanged={controller.setReason}
          recipe="input"
          title="Reason for this change"
          value={editor.reason}
        />
        {editor.errors.length > 0 ? <CatchText as="p" color="danger" variant="bodyS">{editor.errors.join(" ")}</CatchText> : null}
        <CatchGap direction="horizontal" size="related" wrap>
          <CatchButton label="Review the change" onPressed={controller.review} size="sm" />
          <CatchButton label="Cancel" onPressed={() => { controller.cancelEdit(); onDone(); }} size="sm" variant="secondary" />
        </CatchGap>
      </CatchGap>
    </>
  );
}

// ---------- Who collects ----------

/** Who collects each kind of payment: edit, review, type the confirmations, save. */
export function renderRoutingEditor(controller: PaymentRoutingController, onDone: () => void) {
  return <RoutingEditor controller={controller} onDone={onDone} />;
}

function RoutingEditor({controller, onDone}: {controller: PaymentRoutingController; onDone: () => void}) {
  const editor = controller.editor;
  const header = <CatchWorkspaceHeader back={{label: "Back to Payments", onPressed: () => { controller.cancelEdit(); onDone(); }}} kicker="Settings · Payments" title="Who collects what" />;
  if (!editor) {
    return <>{header}<CatchText as="p" color={controller.loadState === "error" ? "danger" : "ink2"} variant="bodyM">
      {controller.loadState === "error" ? controller.loadError ?? "Payment routing could not load." : "Loading who collects"}
    </CatchText></>;
  }
  if (editor.preview) {
    const changed = editor.preview.filter((row) => row.changed);
    return (
      <>
        {header}
        <CatchGap size="section">
          <CatchSection note={editor.base.revision === 0 ? "creates revision 1" : `replaces revision ${editor.base.revision}`} title="What changes">
            {changed.map((row) => <Row key={row.purpose} subtitle={`Now ${row.before}`} title={row.field} value={<Value>{row.after}</Value>} />)}
          </CatchSection>
          {editor.confirmations.map((confirmation) => (
            <CatchField
              helperText={confirmation.reason}
              key={confirmation.id}
              onChanged={(text) => controller.setTyped(confirmation.id, text)}
              recipe="input"
              title={`Type "${confirmation.phrase}" to confirm`}
              value={editor.typed[confirmation.id] ?? ""}
            />
          ))}
          {editor.error ? <CatchText as="p" color="danger" variant="bodyS">{editor.error}</CatchText> : null}
          <CatchGap direction="horizontal" size="related" wrap>
            <CatchButton
              label={controller.isSaving ? "Saving" : editor.unconfirmed ? "Retry the same save" : "Save who collects"}
              onPressed={controller.isSaving || !controller.confirmed ? null : () => void controller.save().then((saved) => { if (saved) onDone(); })}
              size="sm"
            />
            <CatchButton label="Back to editing" onPressed={controller.isSaving || editor.unconfirmed ? null : controller.backToEdit} size="sm" variant="secondary" />
          </CatchGap>
        </CatchGap>
      </>
    );
  }
  const live = livePurposes(editor.draft);
  return (
    <>
      {header}
      <CatchGap size="section">
        <CatchText as="p" color="ink2" variant="bodyM">
          Who collects each kind of payment, and whether it is real money. An organizer override still takes precedence, and a route here does not prove the Razorpay account behind it is ready.
        </CatchText>
        {routingPurposes.map((purpose) => {
          const draft = editor.draft[purpose];
          const stored = describeSelection(storedSelection(editor.base, purpose));
          const choices = draft.route === "unsupported" ? [{value: "unsupported", label: `Keep ${stored.route}`}, ...routeOptions] : [...routeOptions];
          return (
            <CatchSection key={purpose} title={routingPurposeLabels[purpose]}>
              <CatchField
                onChanged={(value) => controller.setPurpose(purpose, {route: (value ?? "off") as RoutingChoice})}
                itemLabelBuilder={(option) => choices.find((entry) => entry.value === option)?.label ?? option}
                values={choices.map((option) => option.value)}
                recipe="select"
                title="Who collects"
                value={draft.route}
              />
              {draft.route === "razorpayOAuth" || draft.route === "razorpayRoute" ? (
                <CatchField
                  onChanged={(value) => controller.setPurpose(purpose, {mode: value === "live" ? "live" : "test"})}
                  itemLabelBuilder={(option) => modeOptions.find((entry) => entry.value === option)?.label ?? option}
                  values={modeOptions.map((option) => option.value)}
                  recipe="select"
                  title="Mode"
                  value={draft.mode}
                />
              ) : null}
            </CatchSection>
          );
        })}
        {live.length > 0 ? (
          <CatchText as="p" color="attentionText" variant="bodyS">
            {`Live mode moves real money: ${live.map((purpose) => routingPurposeLabels[purpose]).join(", ")} ${live.length === 1 ? "is" : "are"} set to live.`}
          </CatchText>
        ) : null}
        {editor.error ? <CatchText as="p" color="danger" variant="bodyS">{editor.error}</CatchText> : null}
        <CatchGap direction="horizontal" size="related" wrap>
          <CatchButton label="Review the change" onPressed={controller.review} size="sm" />
          <CatchButton label="Cancel" onPressed={() => { controller.cancelEdit(); onDone(); }} size="sm" variant="secondary" />
        </CatchGap>
      </CatchGap>
    </>
  );
}

// ---------- Partner credit and bills ----------

/** The nominator credit rule and the bill due day. */
export function renderCreditEditor(controller: PaymentSettingsController, onDone: () => void) {
  return controller.state ? <CreditEditor controller={controller} key={controller.state.revision} onDone={onDone} settings={controller.state.settings} /> : null;
}

const roleOptions: MoneySettings["nominatorCredit"]["earningRoles"] = ["partner", "guest", "organizer"];

function CreditEditor({controller, settings, onDone}: {controller: PaymentSettingsController; settings: MoneySettings; onDone: () => void}) {
  const credit = settings.nominatorCredit;
  const [rate, setRate] = useState(String(credit.rateBasisPoints / 100));
  const [months, setMonths] = useState(String(credit.months));
  const [lapse, setLapse] = useState(String(credit.lapseDays));
  const [minimum, setMinimum] = useState(String(credit.minimumPayoutMinor / 100));
  const [payoutDay, setPayoutDay] = useState(String(credit.payoutDayOfMonth));
  const [dueDay, setDueDay] = useState(String(settings.billDueDayOfMonth));
  const [roles, setRoles] = useState(credit.earningRoles);
  const number = (text: string) => Number(text.replace(/[,₹%\s]/gu, ""));
  const errors = [
    !(number(rate) >= 0 && number(rate) <= 50) ? "Credit is a percentage from 0 to 50." : null,
    !(Number.isInteger(number(months)) && number(months) >= 1 && number(months) <= 60) ? "Months is a whole number from 1 to 60." : null,
    !(Number.isInteger(number(lapse)) && number(lapse) >= 1 && number(lapse) <= 365) ? "Lapse is a whole number of days from 1 to 365." : null,
    !(number(minimum) >= 0) ? "The minimum payout is an amount in rupees." : null,
    !(Number.isInteger(number(payoutDay)) && number(payoutDay) >= 1 && number(payoutDay) <= 28) ? "The payout day is from 1 to 28." : null,
    !(Number.isInteger(number(dueDay)) && number(dueDay) >= 1 && number(dueDay) <= 28) ? "The due day is from 1 to 28." : null,
  ].filter((error): error is string => error !== null);
  const save = async () => {
    const saved = await controller.save((current) => ({
      ...current,
      billDueDayOfMonth: number(dueDay),
      nominatorCredit: {
        ...current.nominatorCredit,
        rateBasisPoints: Math.round(number(rate) * 100),
        months: number(months),
        lapseDays: number(lapse),
        minimumPayoutMinor: Math.round(number(minimum) * 100),
        payoutDayOfMonth: number(payoutDay),
        earningRoles: roles,
      },
    }));
    if (saved) onDone();
  };
  return (
    <>
      <CatchWorkspaceHeader back={{label: "Back to Payments", onPressed: onDone}} kicker="Settings · Payments" title="Partner credit and bills" />
      <CatchGap size="section">
        <CatchSection title="Partner credit">
          <CatchField keyboardType="decimal" onChanged={setRate} recipe="input" suffixText="%" title="Credit, of what the organizer pays Catch before GST" value={rate} />
          <CatchField keyboardType="number" onChanged={setMonths} recipe="input" suffixText="months" title="For, from their first paid bill" value={months} />
          <CatchField keyboardType="number" onChanged={setLapse} recipe="input" suffixText="days" title="A nomination lapses after" value={lapse} />
          <CatchField keyboardType="decimal" onChanged={setMinimum} prefixText="₹" recipe="input" title="Smallest payout; less rolls over" value={minimum} />
          <CatchField keyboardType="number" onChanged={setPayoutDay} recipe="input" title="Paid on this day of the month" value={payoutDay} />
          {roleOptions.map((role) => (
            <CatchCheckboxInput
              key={role}
              label={`${role.charAt(0).toUpperCase()}${role.slice(1)}s earn credit`}
              onChanged={(checked) => setRoles((current) => checked ? [...new Set([...current, role])] : current.filter((entry) => entry !== role))}
              value={roles.includes(role)}
            />
          ))}
        </CatchSection>
        <CatchSection title="Bills">
          <CatchField keyboardType="number" onChanged={setDueDay} recipe="input" title="Bills are due on this day of the next month" value={dueDay} />
        </CatchSection>
        {errors.length > 0 ? <CatchText as="p" color="danger" variant="bodyS">{errors.join(" ")}</CatchText> : null}
        {controller.saveError ? <CatchText as="p" color="danger" variant="bodyS">{controller.saveError}</CatchText> : null}
        <CatchGap direction="horizontal" size="related" wrap>
          <CatchButton label={controller.isSaving ? "Saving" : "Save"} onPressed={controller.isSaving || errors.length > 0 ? null : () => void save()} size="sm" />
          <CatchButton label="Cancel" onPressed={onDone} size="sm" variant="secondary" />
        </CatchGap>
      </CatchGap>
    </>
  );
}
