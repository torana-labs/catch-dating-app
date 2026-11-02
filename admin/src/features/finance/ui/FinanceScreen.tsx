import {
  CatchBarIndicator,
  CatchButton,
  CatchDialog,
  CatchField,
  CatchGap,
  CatchIndexRow,
  CatchMetricSection,
  CatchPaneLayout,
  CatchSection,
  CatchText,
  CatchWorkspaceHeader,
  type CatchMetricData,
} from "@catch/web-ui";
import {useState, type ReactNode} from "react";
import type {CostCategory, FinanceMonth} from "../api/financeMonthRepository";
import type {FinanceMonthController} from "../controllers/useFinanceMonthController";

type CostLine = FinanceMonth["costs"]["lines"][number];

const india = "Asia/Kolkata";
const monthLong = new Intl.DateTimeFormat("en-IN", {month: "long", timeZone: india});
const monthShort = new Intl.DateTimeFormat("en-IN", {month: "short", timeZone: india});

const costTitles: Record<CostLine["category"], string> = {
  whatsapp: "WhatsApp messages",
  ai: "AI",
  cloud: "Servers and database",
  sms: "Phone checks and SMS",
  ads_meta: "Ads · Meta",
  ads_google: "Ads · Google",
  other: "Other",
};

const costNotes: Partial<Record<CostLine["category"], string>> = {
  ai: "Listings, replies and research",
  cloud: "Firebase and Google Cloud",
  sms: "Sign-in codes",
};

/** Costs entered by hand; ad spend comes from the ad platforms. */
const editable = new Set<CostLine["category"]>(["whatsapp", "ai", "cloud", "sms", "other"]);

function monthDate(month: string): number {
  const [year, number] = month.split("-").map(Number);
  return Date.UTC(year, number - 1, 15);
}

function monthName(month: string): string {
  return `${monthLong.format(monthDate(month))} ${month.slice(0, 4)}`;
}

/** The month and the three before it: 2026-10, 2026-09, 2026-08, 2026-07. */
function recentMonths(month: string): string[] {
  const [year, number] = month.split("-").map(Number);
  return [0, 1, 2, 3].map((back) => {
    const date = new Date(Date.UTC(year, number - 1 - back, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

/** Paise as rupees, Indian grouping, with a real minus: −₹38,500. */
function rupees(minor: number): string {
  return `${minor < 0 ? "−" : ""}₹${Math.round(Math.abs(minor) / 100).toLocaleString("en-IN")}`;
}

function compact(minor: number): string {
  const value = minor / 100;
  if (value >= 100_000) return `₹${(value / 100_000).toLocaleString("en-IN", {maximumFractionDigits: 1})}L`;
  return rupees(minor);
}

function Line({title, subtitle, amount, action}: {title: string; subtitle?: string; amount: string; action?: ReactNode}) {
  return (
    <CatchIndexRow
      subtitle={subtitle}
      title={title}
      titleVariant="titleS"
      trailing={(
        <CatchGap crossAxisAlignment="center" direction="horizontal" size="related">
          <CatchText as="span" variant="supportingStrong">{amount}</CatchText>
          {action}
        </CatchGap>
      )}
    />
  );
}

/**
 * Finance: every rupee that passed through Catch in a month, line by line. Ticket sales, what
 * Catch earned, what it cost, and what is not Catch's money, with the ledger export for the
 * accountant. The AdminFinance board.
 */
export function FinanceScreen({
  controller,
  latestMonth,
  onExport,
  onOpenBills,
}: {
  controller: FinanceMonthController;
  /** The newest month offered, normally last month. */
  latestMonth: string;
  onExport: () => void;
  onOpenBills: () => void;
}) {
  const {data} = controller;
  const [editing, setEditing] = useState<CostLine | null>(null);
  const header = (
    <CatchWorkspaceHeader
      actions={<CatchButton label={controller.isExporting ? "Exporting" : "Export for the accountant"} onPressed={controller.isExporting ? null : onExport} size="sm" variant="secondary" />}
      note="every rupee that passed through Catch"
      title="Finance"
      views={{
        label: "Month",
        value: controller.month,
        items: recentMonths(latestMonth).map((month) => ({value: month, label: monthName(month)})),
        onChanged: controller.setMonth,
      }}
    />
  );
  if (!data) {
    return (
      <>
        {header}
        <CatchPaneLayout
          main={<CatchText as="p" color={controller.loadState === "error" ? "danger" : "ink2"} variant="bodyM">
            {controller.loadState === "error" ? controller.loadError ?? "Finance could not load." : "Loading the month"}
          </CatchText>}
          pattern="feed"
        />
      </>
    );
  }
  const {sales, earned, costs, notCatch} = data;
  const previous = data.series.at(-2) ?? null;
  const growth = previous && previous.salesMinor > 0 ? Math.round((sales.netMinor - previous.salesMinor) * 100 / previous.salesMinor) : null;
  const ads = costs.lines.filter((line) => line.category === "ads_meta" || line.category === "ads_google")
    .reduce((total, line) => total + line.amountMinor, 0);
  const stats: CatchMetricData[] = [
    {label: "Ticket sales", value: compact(sales.netMinor),
      note: growth === null ? `${sales.events} events` : `${growth >= 0 ? "Up" : "Down"} ${Math.abs(growth)}% on ${previous ? monthLong.format(monthDate(previous.month)) : "last month"}`,
      noteTone: growth === null ? "secondary" : growth >= 0 ? "success" : "warning"},
    {label: "Catch earned", value: rupees(earned.billedMinor),
      note: sales.netMinor > 0 ? `${(earned.billedMinor * 100 / sales.netMinor).toFixed(1)}% of ticket sales` : "nothing billed"},
    {label: "Costs", value: rupees(costs.totalMinor), note: ads > 0 ? `${rupees(ads)} of it ads` : undefined},
    {label: "Left over", value: rupees(data.leftOverMinor), note: "before salaries", noteTone: data.leftOverMinor >= 0 ? "success" : "danger"},
  ];
  const main = (
    <CatchGap size="section">
      <CatchMetricSection label="The month at a glance" metrics={stats} />
      <CatchSection title="Ticket sales through Catch">
        <Line amount={rupees(sales.grossMinor)} subtitle={`${sales.events} events by ${sales.organizers} organizers · paid into their own Razorpay`} title="Ticket sales" />
        <Line amount={rupees(-sales.refundedMinor)} title="Refunds" />
        <Line amount={rupees(sales.netMinor)} subtitle="What organizers kept before Razorpay fees" title="Net ticket sales" />
      </CatchSection>
      <CatchSection action={{label: "Bills", onPressed: onOpenBills}} title="What Catch earned">
        <Line amount={rupees(earned.uncappedMinor)} subtitle={`${earned.billedOrganizers} organizers billed`} title="Commission" />
        {earned.capsAndTermsMinor !== 0 ? (
          <Line
            amount={rupees(-Math.abs(earned.capsAndTermsMinor))}
            subtitle={`${earned.cappedOrganizers} hit the cap · ${earned.ownTermsOrganizers} on their own terms`}
            title="Caps and own terms"
          />
        ) : null}
        {earned.trialWaivedMinor > 0 ? (
          <Line amount={rupees(-earned.trialWaivedMinor)} subtitle={`${earned.freeOrganizers} organizers in their free month`} title="Free months" />
        ) : null}
        <Line amount={rupees(earned.billedMinor)} subtitle={`Billed this month · ${rupees(earned.paidMinor)} paid so far`} title="Earned" />
        {earned.writtenOffMinor > 0 ? <Line amount={rupees(-earned.writtenOffMinor)} title="Written off" /> : null}
      </CatchSection>
      <CatchSection title="What it cost">
        {costs.lines.map((line) => (
          <Line
            action={editable.has(line.category) ? <CatchButton label="Change" onPressed={() => setEditing(line)} size="sm" variant="secondary" /> : undefined}
            amount={rupees(line.amountMinor)}
            key={line.category}
            subtitle={line.category === "whatsapp" ?
              `${costs.whatsappMessages.toLocaleString("en-IN")} messages${costs.whatsappIsEstimate ? " · estimated until the invoice is entered" : ""}` :
              line.note ?? costNotes[line.category] ?? (line.source === "meta_api" ? "From Meta" : undefined)}
            title={costTitles[line.category]}
          />
        ))}
        {costs.nominatorCreditPaidMinor > 0 ? <Line amount={rupees(costs.nominatorCreditPaidMinor)} subtitle="Paid to partners on the 10th" title="Nominator credit" /> : null}
        <Line amount={rupees(costs.totalMinor)} title="Total" />
      </CatchSection>
      <CatchSection title="Not Catch's money">
        <Line amount={rupees(notCatch.providerFeeMinor)} subtitle={`Including ${rupees(notCatch.providerTaxMinor)} tax. Organizers pay these; shown so they can see their net`} title="Razorpay fees on ticket sales" />
        <Line
          amount={notCatch.gstRegistered ? rupees(notCatch.gstMinor) : "—"}
          subtitle={notCatch.gstRegistered ? "Collected on Catch's bills" : "Not registered yet, so bills carry none. Settings → Payments"}
          title="GST"
        />
      </CatchSection>
      {controller.actionError ? <CatchText as="p" color="danger" variant="bodyS">{controller.actionError}</CatchText> : null}
    </CatchGap>
  );
  const aside = (
    <CatchGap size="section">
      <CatchSection dividers="none" title="Catch earned each month">
        <CatchBarIndicator
          bars={data.series.map((point) => ({label: monthShort.format(monthDate(point.month)), value: Math.round(point.earnedMinor / 100_000), partial: point.partial}))}
          label="Catch earned each month, ₹ thousand"
          recipe="chart"
        />
      </CatchSection>
      <CatchSection dividers="none" title="Ticket sales each month">
        <CatchBarIndicator
          bars={data.series.map((point) => ({label: monthShort.format(monthDate(point.month)), value: Math.round(point.salesMinor / 10_000_000), partial: point.partial}))}
          label="Ticket sales through Catch each month, ₹ lakh"
          recipe="chart"
        />
      </CatchSection>
      <CatchSection container="tile">
        <CatchIndexRow
          subtitle="Admin keeps the ledger: bills, payments, credit and costs. Each month's export goes into Zoho Books, and the accountant files from there."
          title="The books live with the accountant"
          titleVariant="titleS"
        />
      </CatchSection>
    </CatchGap>
  );
  return (
    <>
      {header}
      <CatchPaneLayout aside={aside} main={main} pattern="feed" />
      {editing ? (
        <CostDialog
          isSaving={controller.isSaving}
          line={editing}
          month={controller.month}
          onClose={() => setEditing(null)}
          onSave={async (amount, note) => {
            if (await controller.saveCost(editing.category as CostCategory, amount, note)) setEditing(null);
          }}
        />
      ) : null}
    </>
  );
}

function CostDialog({line, month, isSaving, onSave, onClose}: {
  line: CostLine;
  month: string;
  isSaving: boolean;
  onSave: (rupees: number | null, note: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(line.source === "estimate" ? "" : String(Math.round(line.amountMinor / 100)));
  const [note, setNote] = useState(line.note ?? "");
  const value = amount.trim() === "" ? null : Number(amount.replace(/[,₹\s]/gu, ""));
  const invalid = value !== null && (!Number.isFinite(value) || value < 0);
  return (
    <CatchDialog
      cancel={{label: "Cancel", onPressed: onClose}}
      confirm={{label: value === null ? "Clear" : "Save", onPressed: isSaving || invalid ? null : () => void onSave(value, note)}}
      message={line.category === "whatsapp" ?
        "Enter the invoice total. Until then Finance shows the reserved message cost, an upper bound." :
        "Enter the month's total from the provider's invoice. Leave it empty to clear it."}
      onClose={onClose}
      open
      title={`${costTitles[line.category]} for ${monthName(month)}`}
    >
      <CatchGap size="related">
        <CatchField
          errorText={invalid ? "Enter an amount in rupees, like 4600." : undefined}
          keyboardType="decimal"
          onChanged={setAmount}
          prefixText="₹"
          recipe="input"
          title="Amount"
          value={amount}
        />
        <CatchField maxLength={200} onChanged={setNote} recipe="input" title="Note" value={note} />
      </CatchGap>
    </CatchDialog>
  );
}
