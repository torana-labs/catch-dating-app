import {
  CatchBarIndicator,
  CatchButton,
  CatchEmptyState,
  CatchGap,
  CatchIndexRow,
  CatchMetricSection,
  CatchPageTabBar,
  CatchPaneLayout,
  CatchSection,
  CatchTable,
  CatchLegacyText,
  CatchWorkspaceHeader,
  type CatchMetricData,
  type CatchTableColumn,
} from "@catch/web-ui";
import type {Marketplace, MarketplaceRange} from "../api/marketplaceRepository";
import type {MarketplaceController} from "../controllers/useMarketplaceController";

type Tone = "secondary" | "success" | "warning" | "danger";

const ranges: Array<{value: string; label: string}> = [
  {value: "7", label: "7 days"},
  {value: "30", label: "30 days"},
  {value: "90", label: "90 days"},
];

// Cities Catch runs in; the views list grows with launches.
const cityNames: Record<string, string> = {mumbai: "Mumbai", indore: "Indore", pune: "Pune"};
const india = "Asia/Kolkata";
const monthLong = new Intl.DateTimeFormat("en-IN", {month: "long", timeZone: india});
const dayMonth = new Intl.DateTimeFormat("en-GB", {day: "numeric", month: "short", timeZone: india});

function cityName(marketId: string): string {
  return cityNames[marketId] ?? marketId.charAt(0).toUpperCase() + marketId.slice(1);
}

function percent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`;
}

function month(value: string, withYear: boolean): string {
  const [year, number] = value.split("-").map(Number);
  const name = monthLong.format(Date.UTC(year, number - 1, 15));
  return withYear ? `${name} ${year}` : name;
}

interface CityRow {
  key: string;
  city: {title: string; subtitle: string};
  events: string;
  filled: {text: string; tone?: Tone};
  noShows: {text: string; tone?: Tone};
  waitlisted: string;
}

const cityColumns: CatchTableColumn<CityRow>[] = [
  {key: "city", label: "City", kind: "title"},
  {key: "events", label: "Events a week", kind: "number"},
  {key: "filled", label: "Places filled", align: "end"},
  {key: "noShows", label: "No-shows", align: "end"},
  {key: "waitlisted", label: "Waitlisted", kind: "number"},
];

interface CohortRow {
  key: string;
  month: {title: string; subtitle: string};
  again30: string;
  again60: string;
  again90: string;
}

const cohortColumns: CatchTableColumn<CohortRow>[] = [
  {key: "month", label: "Joined in", kind: "title"},
  {key: "again30", label: "Again in 30 days", kind: "number"},
  {key: "again60", label: "In 60", kind: "number"},
  {key: "again90", label: "In 90", kind: "number"},
];

/**
 * Marketplace: are guests finding good, full nights in each city, and do they come back. Cities,
 * guest cohorts, bookings each week and organizers going quiet, read from the warehouse. The
 * AdminNumbers board.
 */
export function MarketplaceScreen({
  controller,
  onOpenOrganizer,
}: {
  controller: MarketplaceController;
  onOpenOrganizer: (organizerId: string) => void;
}) {
  const {data} = controller;
  const cityIds = [...new Set([...(data?.cities.map((city) => city.marketId) ?? []), ...(controller.marketId ? [controller.marketId] : [])])];
  const header = (
    <CatchWorkspaceHeader
      actions={(
        <CatchPageTabBar
          label="Range"
          onChanged={(value) => controller.setRangeDays(Number(value) as MarketplaceRange)}
          options={ranges}
          selected={String(controller.rangeDays)}
          size="sm"
        />
      )}
      note="are guests finding good, full nights, and coming back"
      title="Marketplace"
      views={{
        label: "City",
        value: controller.marketId ?? "all",
        items: [{value: "all", label: "All cities"}, ...cityIds.map((id) => ({value: id, label: cityName(id)}))],
        onChanged: (value) => controller.setMarketId(value === "all" ? null : value),
      }}
    />
  );
  if (!data) {
    return (
      <>
        {header}
        <CatchPaneLayout
          main={<CatchLegacyText as="p" color={controller.loadState === "error" ? "danger" : "ink2"} variant="bodyM">
            {controller.loadState === "error" ? controller.loadError ?? "Marketplace could not load." : "Loading the marketplace"}
          </CatchLegacyText>}
          pattern="feed"
        />
      </>
    );
  }
  if (!data.available) {
    return (
      <>
        {header}
        <CatchPaneLayout
          main={<CatchEmptyState message={data.unavailableReason ?? "The warehouse could not be read. Try again later."} title="The marketplace numbers are not available" />}
          pattern="feed"
        />
      </>
    );
  }
  return (
    <>
      {header}
      <CatchPaneLayout
        aside={<MarketplaceAside data={data} onOpenOrganizer={onOpenOrganizer} />}
        main={(
          <CatchGap size="section">
            <CatchMetricSection label="The marketplace at a glance" metrics={stats(data)} />
            <CatchSection dividers="none" note={`last ${data.rangeDays} days`} title="By city">
              <CatchTable<CityRow> columns={cityColumns} density="compact" label="By city" rowKey="key" rows={cityRows(data)} />
            </CatchSection>
            <CatchSection dividers="none" note="share of each month's guests who booked again" title="Do guests come back?">
              {data.guestCohorts.length === 0 ? <CatchLegacyText as="p" color="ink2" variant="bodyS">No guest has booked yet.</CatchLegacyText> : (
                <CatchTable<CohortRow> columns={cohortColumns} density="compact" label="Guests, by the month they joined" rowKey="key" rows={cohortRows(data)} />
              )}
            </CatchSection>
          </CatchGap>
        )}
        pattern="feed"
      />
    </>
  );
}

function stats(data: Marketplace): CatchMetricData[] {
  const {stats: values} = data;
  const change = values.eventsThisWeek - values.eventsLastWeek;
  return [
    {label: "Events this week", value: String(values.eventsThisWeek),
      note: change === 0 ? "Same as last week" : `${change > 0 ? "Up" : "Down"} ${Math.abs(change)} on last week`,
      noteTone: change > 0 ? "success" : change < 0 ? "warning" : "secondary"},
    {label: "Places filled", value: percent(values.filledPercent), note: `last ${data.rangeDays} days`},
    {label: "No-shows", value: percent(values.noShowPercent), note: "of booked guests"},
    {label: "Came back", value: percent(values.cameBackPercent), note: "booked again within 30 days", noteTone: "success"},
  ];
}

function cityRows(data: Marketplace): CityRow[] {
  return data.cities.map((city) => {
    const live = city.organizersLive > 0;
    return {
      key: city.marketId,
      city: {title: cityName(city.marketId), subtitle: live ? `${city.organizersLive} organizers live` : "Not launched"},
      events: live ? String(city.eventsPerWeek) : "—",
      filled: {text: percent(city.filledPercent), tone: city.filledPercent !== null && city.filledPercent < 65 ? "warning" : undefined},
      noShows: {text: percent(city.noShowPercent), tone: city.noShowPercent !== null && city.noShowPercent > 12 ? "warning" : undefined},
      waitlisted: live ? city.waitlisted.toLocaleString("en-IN") : "—",
    };
  });
}

function cohortRows(data: Marketplace): CohortRow[] {
  return data.guestCohorts.map((cohort, index) => ({
    key: cohort.month,
    month: {title: month(cohort.month, index === 0), subtitle: `${cohort.guests.toLocaleString("en-IN")} guests`},
    again30: cohort.again30Percent === null ? "" : percent(cohort.again30Percent),
    again60: cohort.again60Percent === null ? "" : percent(cohort.again60Percent),
    again90: cohort.again90Percent === null ? "" : percent(cohort.again90Percent),
  }));
}

function MarketplaceAside({data, onOpenOrganizer}: {data: Marketplace; onOpenOrganizer: (organizerId: string) => void}) {
  return (
    <CatchGap size="section">
      <CatchSection dividers="none" title="Bookings each week">
        <CatchBarIndicator
          bars={data.bookingsByWeek.map((week) => ({
            label: dayMonth.format(Date.parse(`${week.weekStart}T12:00:00+05:30`)),
            value: week.bookings,
            partial: week.partial,
          }))}
          label="Bookings each week"
          recipe="chart"
        />
      </CatchSection>
      <CatchSection count={data.goingQuiet.length} empty={<CatchLegacyText as="p" color="ink2" variant="bodyS">Every organizer is running events as usual.</CatchLegacyText>} title="Organizers going quiet">
        {data.goingQuiet.map((organizer) => (
          <CatchIndexRow
            key={organizer.organizerId}
            subtitle={`No event in ${Math.round(organizer.daysSinceLastEvent / 7)} weeks · used to run ${Math.round(organizer.eventsPerMonthBefore)} a month` +
              (organizer.salesOwnerName ? ` · ${organizer.salesOwnerName} looks after them` : "")}
            title={organizer.name}
            titleVariant="titleS"
            trailing={<CatchButton label="Open" onPressed={() => onOpenOrganizer(organizer.organizerId)} size="sm" variant="secondary" />}
          />
        ))}
      </CatchSection>
    </CatchGap>
  );
}
