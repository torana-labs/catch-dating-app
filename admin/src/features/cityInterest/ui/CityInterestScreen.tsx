import {
  CatchEmptyState,
  CatchGap,
  CatchMetricSection,
  CatchPaneLayout,
  CatchSection,
  CatchTable,
  CatchLegacyText,
  CatchWorkspaceHeader,
  type CatchMetricData,
  type CatchTableColumn,
} from "@catch/web-ui";
import type {CityInterest} from "../api/cityInterestRepository";
import type {CityInterestController} from "../controllers/useCityInterestController";

type Tone = "secondary" | "success" | "warning";
type Window = CityInterest["totals"];

const lifecycleLabel: Record<string, string> = {
  hidden: "Hidden", waitlist: "Waitlist", launching: "Launching", live: "Live", paused: "Paused",
};

const count = (value: number) => value.toLocaleString("en-IN");

/** "Up 9 on the 7 days before", "Down 3 …" or "Same as the 7 days before". */
function trend(now: number, before: number, days: number): {text: string; tone: Tone} {
  const change = now - before;
  if (change === 0) return {text: `Same as the ${days} days before`, tone: "secondary"};
  return {text: `${change > 0 ? "Up" : "Down"} ${count(Math.abs(change))} on the ${days} days before`,
    tone: change > 0 ? "success" : "warning"};
}

interface CityRow {
  key: string;
  city: {title: string; subtitle: string};
  total: string;
  last7: {text: string; tone?: Tone};
  last30: {text: string; tone?: Tone};
}

const columns: CatchTableColumn<CityRow>[] = [
  {key: "city", label: "City", kind: "title"},
  {key: "total", label: "People", kind: "number"},
  {key: "last7", label: "Last 7 days", align: "end"},
  {key: "last30", label: "Last 30 days", align: "end"},
];

const signed = (now: number, before: number) => {
  const change = now - before;
  return `${count(now)} (${change >= 0 ? "+" : "−"}${count(Math.abs(change))})`;
};

function rows(data: CityInterest): CityRow[] {
  return data.cities.map((city) => ({
    key: city.cityKey,
    city: {title: city.label, subtitle: city.lifecycle ? lifecycleLabel[city.lifecycle] ?? city.lifecycle : "Not in the catalog"},
    total: count(city.interest.total),
    last7: {text: signed(city.interest.last7, city.interest.previous7),
      tone: city.interest.last7 > city.interest.previous7 ? "success" : undefined},
    last30: {text: signed(city.interest.last30, city.interest.previous30),
      tone: city.interest.last30 > city.interest.previous30 ? "success" : undefined},
  }));
}

function metrics(totals: Window): CatchMetricData[] {
  const week = trend(totals.last7, totals.previous7, 7);
  const month = trend(totals.last30, totals.previous30, 30);
  return [
    {label: "People waiting", value: count(totals.total), note: "each counted once per city"},
    {label: "Last 7 days", value: count(totals.last7), note: week.text, noteTone: week.tone},
    {label: "Last 30 days", value: count(totals.last30), note: month.text, noteTone: month.tone},
  ];
}

/**
 * Interest by city: how many different people asked to hear when each city
 * opens, from the website's launch notice, with 7- and 30-day trends. Cities
 * the catalog does not have show as their country's Other.
 */
export function CityInterestScreen({controller}: {controller: CityInterestController}) {
  const {data} = controller;
  const header = <CatchWorkspaceHeader note="people asking to hear when their city opens" title="Interest by city" />;
  if (!data) {
    return (
      <>
        {header}
        <CatchPaneLayout
          main={<CatchLegacyText as="p" color={controller.loadState === "error" ? "danger" : "ink2"} variant="bodyM">
            {controller.loadState === "error" ? controller.loadError ?? "Interest by city could not load." : "Loading interest by city"}
          </CatchLegacyText>}
          pattern="feed"
        />
      </>
    );
  }
  return (
    <>
      {header}
      <CatchPaneLayout
        main={data.cities.length === 0 ? (
          <CatchEmptyState message="When someone asks to hear when their city opens, it shows here." title="No one is waiting yet" />
        ) : (
          <CatchGap size="section">
            <CatchMetricSection label="Interest at a glance" metrics={metrics(data.totals)} />
            <CatchSection dividers="none" note={`days end ${data.today} (UTC); change on the days before`} title="By city">
              <CatchTable<CityRow> columns={columns} density="compact" label="Interest by city" rowKey="key" rows={rows(data)} />
            </CatchSection>
          </CatchGap>
        )}
        pattern="feed"
      />
    </>
  );
}
