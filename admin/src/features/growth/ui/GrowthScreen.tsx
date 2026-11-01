import {
  CatchBarIndicator,
  CatchDock,
  CatchEmptyState,
  CatchGap,
  CatchIndexRow,
  CatchMetaRow,
  CatchMetricSection,
  CatchPageTabBar,
  CatchPaneLayout,
  CatchSection,
  CatchTable,
  CatchText,
  CatchWorkspaceHeader,
  type CatchMetricData,
  type CatchTableColumn,
  type CatchWorkspaceHeaderFilterChip,
} from "@catch/web-ui";
import {useState, type ReactNode} from "react";
import type {Growth, GrowthRange, NominatorRow} from "../api/growthRepository";
import type {
  BestFilter,
  GrowthController,
  GrowthView,
  NominatorFilter,
} from "../controllers/useGrowthController";
import {
  channelLabels,
  channelShortLabels,
  compactRupees,
  countAndShare,
  days,
  monthAbbreviation,
  monthName,
  nominatorRoleLabels,
  rupees,
  share,
  trendLabel,
} from "../controllers/growthLabels";

type Tone = "secondary" | "success" | "warning" | "danger";

const views = [
  {value: "cohorts", label: "Cohorts"},
  {value: "channels", label: "Channels and ads"},
  {value: "nominators", label: "Nominators"},
  {value: "best", label: "Best organizers"},
] as const;

const ranges: Array<{value: GrowthRange; label: string}> = [
  {value: "90d", label: "90 days"},
  {value: "12m", label: "12 months"},
  {value: "all", label: "All"},
];

const notes: Record<GrowthView, string> = {
  cohorts: "organizers, by the month we listed them",
  channels: "what each channel costs and brings",
  nominators: "who brings organizers that stay",
  best: "ranked by what Catch earned in the last 90 days",
};

/**
 * Growth: how organizers come to Catch and stay. Cohorts by listing month, channels and what they
 * cost, nominators with their credit to approve, and the organizers earning Catch the most. The
 * AdminGrowth, AdminGrowthChannels, AdminGrowthNominators and AdminGrowthBest boards.
 */
export function GrowthScreen({
  controller,
  detailOpen,
  onViewChange,
  onSelectNominator,
  onCloseDetail,
}: {
  controller: GrowthController;
  detailOpen: boolean;
  onViewChange: (view: GrowthView) => void;
  onSelectNominator: (uid: string) => void;
  onCloseDetail: () => void;
}) {
  const {view, data} = controller;
  const header = (
    <CatchWorkspaceHeader
      actions={view === "nominators" ? undefined : (
        <CatchPageTabBar
          label="Range"
          onChanged={(value) => controller.setRange(value as GrowthRange)}
          options={ranges}
          selected={controller.range}
          size="sm"
        />
      )}
      filters={filtersFor(controller)}
      note={notes[view]}
      title="Growth"
      views={{label: "Growth views", value: view, items: views, onChanged: (value) => onViewChange(value as GrowthView)}}
    />
  );
  if (!data) {
    return (
      <CatchPaneLayout
        main={<>{header}<CatchText as="p" color={controller.loadState === "error" ? "danger" : "ink2"} variant="bodyM">
          {controller.loadState === "error" ? controller.loadError ?? "Growth could not load." : "Loading growth"}
        </CatchText></>}
        pattern="feed"
      />
    );
  }
  if (view === "nominators") {
    const selected = controller.selectedNominator;
    return (
      <CatchPaneLayout
        detail={selected ? <NominatorInspector controller={controller} key={selected.uid} nominator={selected} onClose={onCloseDetail} onSelect={onSelectNominator} /> : null}
        detailOpen={detailOpen && selected !== null}
        main={<>{header}<NominatorTable controller={controller} onSelect={onSelectNominator} /></>}
        pattern="queue"
      />
    );
  }
  if (view === "best") {
    return <CatchPaneLayout main={<>{header}<BestTable rows={controller.best} /></>} pattern="wide-table" />;
  }
  const [main, aside, stats] = view === "channels" ? channelsView(data) : cohortsView(data);
  return (
    <>
      {header}
      <CatchPaneLayout
        aside={aside}
        main={<CatchGap size="section"><CatchMetricSection label="Growth at a glance" metrics={stats} />{main}</CatchGap>}
        pattern="feed"
      />
    </>
  );
}

function filtersFor(controller: GrowthController): {chips?: CatchWorkspaceHeaderFilterChip[]; search?: {placeholder: string; value: string; onChanged: (value: string) => void}} | undefined {
  const search = {value: controller.search, onChanged: controller.setSearch};
  if (controller.view === "nominators") {
    const counts = countBy(controller.data?.nominators ?? [], (row) => row.role);
    const options: Array<[NominatorFilter, string]> = [["all", "All"], ["partner", "Partners"], ["associate", "Sales associates"], ["guest", "Guests"], ["organizer", "Organizers"]];
    return {
      chips: options.filter(([value]) => value === "all" || (counts.get(value) ?? 0) > 0).map(([value, label]) => ({
        label,
        count: value === "all" ? controller.data?.nominators.length : counts.get(value),
        selected: controller.nominatorFilter === value,
        onPressed: () => controller.setNominatorFilter(value),
      })),
      search: {...search, placeholder: "Search nominators"},
    };
  }
  if (controller.view === "best") {
    const rows = controller.data?.best ?? [];
    const options: Array<[BestFilter, string, number]> = [
      ["all", "All", rows.length],
      ["growing", "Growing", rows.filter((row) => (row.trendPercent ?? 0) > 0).length],
      ["quiet", "Going quiet", rows.filter((row) => (row.trendPercent ?? 0) < 0).length],
      ["ownTerms", "On their own terms", rows.filter((row) => row.ownTerms).length],
    ];
    return {
      chips: options.map(([value, label, count]) => ({label, count, selected: controller.bestFilter === value, onPressed: () => controller.setBestFilter(value)})),
      search: {...search, placeholder: "Search organizers"},
    };
  }
  return undefined;
}

function countBy<T, K>(rows: readonly T[], key: (row: T) => K): Map<K, number> {
  const counts = new Map<K, number>();
  for (const row of rows) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1);
  return counts;
}

/** A short note set apart in a tile: something missing, or waiting. */
function Callout({title, message}: {title: string; message: string}) {
  return (
    <CatchSection container="tile">
      <CatchIndexRow subtitle={message} title={title} titleVariant="titleS" />
    </CatchSection>
  );
}

/** A statement row without an amount: what a word means here. */
function Definition({title, subtitle}: {title: string; subtitle: string}) {
  return <CatchIndexRow subtitle={subtitle} title={title} titleVariant="titleS" />;
}

// ---------- Cohorts ----------

interface CohortRow {
  key: string;
  month: {title: string; subtitle: string};
  claimed: string;
  claimDays: string;
  ranEvent: string;
  eventDays: {text: string; tone?: Tone};
}

const cohortColumns: CatchTableColumn<CohortRow>[] = [
  {key: "month", label: "Listed in", kind: "title"},
  {key: "claimed", label: "Claimed", kind: "number"},
  {key: "claimDays", label: "Days to claim", kind: "number"},
  {key: "ranEvent", label: "Ran an event", kind: "number"},
  {key: "eventDays", label: "Days to it", align: "end"},
];

type SpendRow = {key: string; month: {title: string; subtitle: string}} & Record<`m${number}`, string>;

function cohortsView(data: Growth): [ReactNode, ReactNode, CatchMetricData[]] {
  const {summary} = data;
  const stats: CatchMetricData[] = [
    {label: "Listed", value: summary.listed.toLocaleString("en-IN"), note: summary.sinceMonth ? `since ${monthName(summary.sinceMonth)}` : undefined},
    {label: "Claimed", value: share(summary.claimed, summary.listed), note: `${summary.claimed} · median ${days(summary.claimMedianDays)}`},
    {label: "Ran an event on Catch", value: share(summary.ranEvent, summary.listed), note: `${summary.ranEvent} · median ${days(summary.ranEventMedianDays)}`},
    {label: "Paying Catch", value: String(summary.paying), note: "past their free month", noteTone: "success"},
  ];
  const cohortRows: CohortRow[] = data.cohorts.map((cohort, index) => ({
    key: cohort.month,
    month: {title: monthName(cohort.month, index === 0), subtitle: `${cohort.listed} listed`},
    claimed: countAndShare(cohort.claimed, cohort.listed),
    claimDays: days(cohort.claimMedianDays),
    ranEvent: countAndShare(cohort.ranEvent, cohort.listed),
    eventDays: cohort.tooEarly ? {text: "Too early", tone: "secondary"} : {text: days(cohort.ranEventMedianDays)},
  }));
  const monthCount = Math.max(0, ...data.salesByMonthOnCatch.map((row) => row.salesPerOrganizerMinor.length));
  const spendColumns: CatchTableColumn<SpendRow>[] = [
    {key: "month", label: "Started in", kind: "title"},
    ...Array.from({length: monthCount}, (_, index) => ({key: `m${index + 1}` as const, label: `Month ${index + 1}`, kind: "number" as const})),
  ];
  const spendRows: SpendRow[] = data.salesByMonthOnCatch.map((row, index) => ({
    key: row.month,
    month: {title: monthName(row.month, index === 0), subtitle: `${row.organizers} organizers`},
    ...Object.fromEntries(row.salesPerOrganizerMinor.map((value, month) => [`m${month + 1}`, value === null ? "" : compactRupees(value)])),
  }) as SpendRow);
  const main = (
    <CatchGap size="section">
      <CatchSection dividers="none" note="median days, counted from the day we listed them" title="From listing to first event">
        <CatchTable<CohortRow> columns={cohortColumns} density="compact" label="From listing to first event" rowKey="key" rows={cohortRows} />
      </CatchSection>
      <CatchSection dividers="none" note="ticket sales per organizer that ran an event, in its months on Catch" title="Do they spend more over time?">
        <CatchTable<SpendRow> columns={spendColumns} density="compact" label="Ticket sales per organizer, by month on Catch" rowKey="key" rows={spendRows} />
      </CatchSection>
    </CatchGap>
  );
  const claims = data.claimDays.reduce((total, bucket) => total + bucket.count, 0);
  const aside = (
    <CatchGap size="section">
      <CatchSection dividers="none" note={`${claims} claims`} title="Days from listing to claim">
        <CatchBarIndicator bars={data.claimDays.map((bucket) => ({label: bucket.label, value: bucket.count}))} label="Organizers claimed, by days after listing" recipe="chart" />
      </CatchSection>
      <CatchSection title="How each step is counted">
        <Definition subtitle="The day the page was published, claimed or not" title="Listed" />
        <Definition subtitle="The day the owner approved the claim" title="Claimed" />
        <Definition subtitle="The first event on Catch with at least one booking" title="Ran an event" />
        <Definition subtitle="Paid bookings less refunds, into the organizer's Razorpay" title="Ticket sales" />
      </CatchSection>
    </CatchGap>
  );
  return [main, aside, stats];
}

// ---------- Channels and ads ----------

interface ChannelRow {
  key: string;
  channel: {title: string; subtitle: string};
  listed: string;
  claimed: string;
  paying: string;
  earned: string;
  cost: {text: string; tone?: Tone};
  perPaying: {text: string; tone?: Tone};
}

const channelColumns: CatchTableColumn<ChannelRow>[] = [
  {key: "channel", label: "Channel", kind: "title"},
  {key: "listed", label: "Listed", kind: "number", width: "70px"},
  {key: "claimed", label: "Claimed", kind: "number", width: "80px"},
  {key: "paying", label: "Paying", kind: "number", width: "70px"},
  {key: "earned", label: "Catch earned", kind: "number", width: "110px"},
  {key: "cost", label: "Cost", align: "end", width: "90px"},
  {key: "perPaying", label: "Per paying", align: "end", width: "100px"},
];

function channelCost(channel: Growth["channels"][number]): {text: string; tone?: Tone} {
  if (channel.costKind === "salaries") return {text: "Salaries", tone: "secondary"};
  if (channel.costMinor === null || channel.costKind === "none") return {text: "—", tone: "secondary"};
  return {text: rupees(channel.costMinor)};
}

function perPaying(channel: Growth["channels"][number]): {text: string; tone?: Tone} {
  if (channel.costMinor === null || channel.costKind === "none" || channel.costKind === "salaries") return {text: "—", tone: "secondary"};
  return channel.paying === 0 ? {text: "None yet", tone: "danger"} : {text: rupees(Math.round(channel.costMinor / channel.paying))};
}

function channelsView(data: Growth): [ReactNode, ReactNode, CatchMetricData[]] {
  const ads = data.channels.find((channel) => channel.channel === "ads");
  const spend = data.adSpend.metaMinor;
  const priced = data.channels.filter((channel) => channel.paying > 0 && channel.costMinor !== null &&
    (channel.costKind === "ads" || channel.costKind === "credit"));
  const cheapest = [...priced].sort((a, b) => (a.costMinor ?? 0) / a.paying - (b.costMinor ?? 0) / b.paying)[0];
  const stats: CatchMetricData[] = [
    {label: `Ad spend, ${monthName(data.adSpend.month)}`, value: spend === null ? "Not connected" : rupees(spend),
      note: data.adSpend.metaConnected ? "Meta only" : "Meta waits for its token", noteTone: data.adSpend.metaConnected ? "secondary" : "warning"},
    {label: "Cost per claim", value: spend !== null && data.adSpend.adClaims > 0 ? rupees(Math.round(spend / data.adSpend.adClaims)) : "None yet",
      note: `from ads, ${data.adSpend.adClaims} ${data.adSpend.adClaims === 1 ? "claim" : "claims"}`},
    {label: "Cost per paying organizer", value: ads && ads.paying > 0 && ads.costMinor !== null ? rupees(Math.round(ads.costMinor / ads.paying)) : "None yet",
      note: ads && ads.paying > 0 ? `${ads.paying} paying from ads` : "no ad organizer paying", noteTone: ads && ads.paying > 0 ? "secondary" : "warning"},
    {label: "Cheapest channel", value: cheapest ? channelLabels[cheapest.channel] : "—",
      note: cheapest ? `${rupees(Math.round((cheapest.costMinor ?? 0) / cheapest.paying))} per paying` : "nothing paid for yet", noteTone: "success"},
  ];
  const rows: ChannelRow[] = data.channels.map((channel) => ({
    key: channel.channel,
    channel: {title: channelLabels[channel.channel], subtitle: channel.detail},
    listed: String(channel.listed),
    claimed: String(channel.claimed),
    paying: String(channel.paying),
    earned: channel.earnedMinor > 0 ? rupees(channel.earnedMinor) : "—",
    cost: channelCost(channel),
    perPaying: perPaying(channel),
  }));
  const main = (
    <CatchSection dividers="none" note="where each organizer first came from" title="By channel">
      <CatchTable<ChannelRow> columns={channelColumns} density="compact" label="By channel" rowKey="key" rows={rows} />
    </CatchSection>
  );
  const aside = (
    <CatchGap size="section">
      <CatchSection dividers="none" title="Claims each month">
        <CatchBarIndicator
          bars={data.claimsByMonth.map((month, index, all) => ({label: monthAbbreviation(month.month), value: month.count, partial: index === all.length - 1}))}
          label="Organizers claimed each month"
          recipe="chart"
        />
      </CatchSection>
      <CatchSection title="How a channel is decided">
        <Definition subtitle="A nomination before an ad click keeps the nomination" title="The first touch wins" />
        <Definition subtitle="Set when the listing is made, never edited by hand" title="One channel per organizer" />
        <Definition subtitle="From Meta each morning, and Google once connected" title="Spend comes in daily" />
      </CatchSection>
      {data.adSpend.metaConnected ? null : (
        <Callout message={"Meta ad spend comes in once the Marketing API token is granted (GitHub issue #1364)."} title="Meta is not connected" />
      )}
      {data.adSpend.googleConnected ? null : (
        <Callout message={"Search ads would show up here once the account is connected."} title="Google Ads is not connected" />
      )}
    </CatchGap>
  );
  return [main, aside, stats];
}

// ---------- Nominators ----------

interface NominatorTableRow {
  key: string;
  who: {title: string; subtitle: string};
  nominated: string;
  claimed: string;
  paying: string;
  credit: {text: string; tone?: Tone};
}

const nominatorColumns: CatchTableColumn<NominatorTableRow>[] = [
  {key: "who", label: "Nominator", kind: "title"},
  {key: "nominated", label: "Nominated", kind: "number", width: "100px"},
  {key: "claimed", label: "Claimed", kind: "number", width: "84px"},
  {key: "paying", label: "Paying", kind: "number", width: "76px"},
  {key: "credit", label: "Credit owed", align: "end", width: "110px", sort: "desc"},
];

function creditCell(row: NominatorRow): {text: string; tone?: Tone} {
  if (row.role === "associate") return {text: "Salary", tone: "secondary"};
  return row.creditOwedMinor > 0 ? {text: rupees(row.creditOwedMinor)} : {text: "—", tone: "secondary"};
}

function NominatorTable({controller, onSelect}: {controller: GrowthController; onSelect: (uid: string) => void}) {
  if (controller.nominators.length === 0) {
    return <CatchEmptyState message="Nominators appear once someone nominates an organizer who is listed." title="No nominators" />;
  }
  const rows: NominatorTableRow[] = controller.nominators.map((row) => ({
      key: row.uid,
      who: {title: row.name, subtitle: nominatorRoleLabels[row.role]},
      nominated: String(row.nominated),
      claimed: String(row.claimed),
      paying: String(row.paying),
      credit: creditCell(row),
    }));
  return (
    <CatchTable<NominatorTableRow>
      columns={nominatorColumns}
      density="compact"
      label="Nominators"
      onRowPressed={(row) => onSelect(row.key)}
      rowKey="key"
      rows={rows}
      selectedKey={controller.selectedNominator?.uid ?? null}
    />
  );
}

function organizerLine(organizer: NominatorRow["organizers"][number]): {subtitle: string; value: string} {
  const bill = organizer.latestBill;
  const month = organizer.creditMonthIndex === null ? "" : ` · month ${organizer.creditMonthIndex} of 12`;
  if (!organizer.claimed) return {subtitle: "Not claimed yet", value: "—"};
  if (!bill) return {subtitle: "Claimed · no bill yet", value: "—"};
  const billText = `${monthName(bill.month)} bill ${rupees(bill.totalMinor)}`;
  if (bill.status === "paid") return {subtitle: `${billText}, paid${month}`, value: bill.creditMinor === null ? "—" : rupees(bill.creditMinor)};
  if (bill.status === "free") return {subtitle: `${monthName(bill.month)} · free month`, value: "—"};
  return {subtitle: `${billText}, not paid yet${month}`, value: "Waiting"};
}

function NominatorInspector({controller, nominator, onSelect, onClose}: {
  controller: GrowthController;
  nominator: NominatorRow;
  onSelect: (uid: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const credit = controller.selectedCredit;
  const rows = controller.nominators;
  const index = rows.findIndex((row) => row.uid === nominator.uid);
  const previous = index > 0 ? rows[index - 1] : null;
  const following = index >= 0 ? rows[index + 1] ?? null : null;
  const waiting = nominator.organizers.filter((organizer) => organizer.latestBill && organizer.latestBill.status === "sent");
  const minimum = controller.credits?.minimumPayoutMinor ?? null;
  const facts = [
    {label: "Role", value: nominatorRoleLabels[nominator.role]},
    {label: "Nominated", value: `${nominator.nominated} · ${nominator.claimed} claimed (${share(nominator.claimed, nominator.nominated)})`, tone: nominator.claimed > 0 ? "success" as const : undefined},
    {label: "Paying", value: `${nominator.paying} ${nominator.paying === 1 ? "organizer" : "organizers"}`},
    {label: "Their organizers paid Catch", value: rupees(nominator.paidToCatchMinor)},
    {label: "Credit owed", value: nominator.role === "associate" ? "None; their pay covers it" : rupees(nominator.creditOwedMinor)},
    {label: "Credit paid so far", value: rupees(nominator.creditPaidMinor)},
  ];
  const run = async (action: (note: string | null) => Promise<boolean>) => {
    if (await action(note)) setNote("");
  };
  const approved = credit?.approvedMinor ?? nominator.creditApprovedMinor;
  const owed = credit?.owedMinor ?? nominator.creditOwedMinor;
  const dock = nominator.role === "associate" ? null : approved > 0 ? (
    <CatchDock
      next={following ? `Then: ${following.name}` : undefined}
      note={{label: "Note", placeholder: "How it was paid", value: note, onChanged: setNote}}
      primary={{label: `Record ${rupees(approved)} paid`, isLoading: controller.isActing, onPressed: controller.isActing ? null : () => void run(controller.markCreditPaid)}}
      recipe="pane"
    />
  ) : owed > 0 ? (
    <CatchDock
      next={credit && !credit.payable && minimum !== null ? `Under ${rupees(minimum)}, so it rolls over to next month` :
        "Paid on the 10th with the other partners"}
      note={{label: "Note", placeholder: "Optional", value: note, onChanged: setNote}}
      primary={{label: `Approve ${rupees(owed)}`, isLoading: controller.isActing,
        onPressed: controller.isActing || (credit !== null && !credit.payable) ? null : () => void run(controller.approveCredit)}}
      recipe="pane"
    />
  ) : null;
  return (
    <>
      <CatchWorkspaceHeader
        back={{label: "Back to nominators", close: true, onPressed: onClose}}
        kicker={`Nominators · ${index + 1} of ${rows.length}`}
        position={{
          label: `${index + 1} of ${rows.length}`,
          previous: previous ? {label: "Previous nominator", onPressed: () => onSelect(previous.uid)} : undefined,
          next: following ? {label: "Next nominator", onPressed: () => onSelect(following.uid)} : undefined,
        }}
        title={nominator.name}
      />
      <CatchGap size="section">
        <CatchMetaRow columns={2} entries={facts} />
        {waiting.length > 0 && nominator.role !== "associate" ? (
          <Callout message={`${waiting.map((organizer) => organizer.name).join(", ")} ${waiting.length === 1 ? "has" : "have"} a bill not paid yet, so that credit waits until they pay.`} title="More credit is waiting on bills" />
        ) : null}
        <CatchSection count={nominator.organizers.length} title="Their organizers">
          {nominator.organizers.map((organizer) => {
            const line = organizerLine(organizer);
            return (
              <CatchIndexRow
                key={organizer.organizerId}
                subtitle={line.subtitle}
                title={organizer.name}
                titleVariant="titleS"
                trailing={<CatchText as="span" variant="supportingStrong">{line.value}</CatchText>}
              />
            );
          })}
        </CatchSection>
        {controller.actionError ? <CatchText as="p" color="danger" variant="bodyS">{controller.actionError}</CatchText> : null}
      </CatchGap>
      {dock}
    </>
  );
}

// ---------- Best organizers ----------

interface BestRow {
  key: string;
  organizer: {title: string; subtitle: string};
  sales: string;
  earned: {text: string; tone?: Tone};
  events: string;
  trend: {text: string; tone?: Tone};
  from: string;
  since: string;
}

const bestColumns: CatchTableColumn<BestRow>[] = [
  {key: "organizer", label: "Organizer", kind: "title"},
  {key: "sales", label: "Ticket sales", kind: "number", width: "120px"},
  {key: "earned", label: "Catch earned", align: "end", width: "120px", sort: "desc"},
  {key: "events", label: "Events", kind: "number", width: "80px"},
  {key: "trend", label: "Last 90 days", width: "130px"},
  {key: "from", label: "Came from", width: "150px"},
  {key: "since", label: "Paying since", align: "end", width: "110px"},
];

function BestTable({rows}: {rows: Growth["best"]}) {
  if (rows.length === 0) return <CatchEmptyState message="No organizer matches." title="Nothing here" />;
  const tableRows: BestRow[] = rows.map((row) => ({
    key: row.organizerId,
    organizer: {title: row.name, subtitle: [row.marketId ? row.marketId.charAt(0).toUpperCase() + row.marketId.slice(1) : null, row.ownTerms ? "own terms" : null].filter(Boolean).join(" · ")},
    sales: compactRupees(row.salesMinor),
    earned: row.inTrial ? {text: "In trial", tone: "secondary"} : {text: rupees(row.earnedMinor)},
    events: String(row.events),
    trend: trendLabel(row.trendPercent, row.inTrial),
    from: channelShortLabels[row.channel],
    since: row.payingSinceMonth ? monthAbbreviation(row.payingSinceMonth) : "—",
  }));
  return <CatchTable<BestRow> columns={bestColumns} density="compact" label="Best organizers" rowKey="key" rows={tableRows} />;
}
