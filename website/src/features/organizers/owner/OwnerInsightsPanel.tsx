import {CatchBarIndicator, CatchIndexRow, CatchMetricSection, CatchSection, CatchStack, CatchText} from "@catch/web-ui";
import {ownerViewCopy} from "../../../content/ownerView";
import type {OwnerViewController} from "./useOwnerViewController";

const copy = ownerViewCopy.insights;

/** "8 Nov" from a YYYY-MM-DD day. */
export function ownerDayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {day: "numeric", month: "short", timeZone: "UTC"});
}

/** Visits in each of the last four whole weeks of the window, oldest first, labelled by their first day. */
export function ownerWeeks(days: readonly {date: string; visits: number}[]): {label: string; value: number}[] {
  const recent = days.slice(-28);
  return [0, 1, 2, 3].map((week) => {
    const slice = recent.slice(week * 7, week * 7 + 7);
    return {label: slice.length ? ownerDayLabel(slice[0].date) : "", value: slice.reduce((sum, day) => sum + day.visits, 0)};
  });
}

/** A save's outcome under the panel that made it. */
export function renderOwnerNotice({controller, panel, saved, failed}: {
  controller: OwnerViewController;
  panel: OwnerViewController["tab"];
  saved: string;
  failed: string;
}) {
  const {notice} = controller;
  if (!notice || notice.panel !== panel) return null;
  return notice.text === "saved" ?
    <CatchText as="p" role="status" tone="success" variant="body-small">{saved}</CatchText> :
    <CatchText as="p" role="alert" tone="danger" variant="body-small">{failed}</CatchText>;
}

/**
 * The last 30 days from the nightly organizerInsights roll-up: the four
 * numbers, visits each day, and where link clicks came from.
 */
export function OwnerInsightsPanel({controller}: {controller: OwnerViewController}) {
  const insights = controller.data?.insights;
  if (!insights) return null;
  const {totals} = insights;
  const weeks = ownerWeeks(insights.days);
  const peak = weeks.reduce((max, week) => Math.max(max, week.value), 0);
  return (
    <CatchStack gap={20}>
      <CatchSection dividers="none" note={copy.note(ownerDayLabel(insights.startDate), ownerDayLabel(insights.endDate))}
        title={copy.title}>
        <CatchMetricSection label={copy.metricsLabel} metrics={[
          {label: copy.metrics.visits, value: copy.count(totals.visits)},
          {label: copy.metrics.linkClicks, value: copy.count(totals.linkClicks)},
          {label: copy.metrics.bookingClicks, value: copy.count(totals.bookingClicks)},
          {label: copy.metrics.newFollowers, value: copy.count(totals.newFollowers)},
        ]} />
      </CatchSection>
      {peak > 0 ? (
        <CatchBarIndicator bars={weeks} height={96} label={copy.chartLabel} recipe="chart" />
      ) : null}
      <CatchText as="p" tone="secondary" variant="body-small">
        {insights.updatedThrough ? copy.updatedThrough(ownerDayLabel(insights.updatedThrough)) : copy.waiting}
      </CatchText>
      <CatchSection dividers="between" title={copy.sourcesTitle}>
        {insights.sources.length ? insights.sources.map((row) => (
          <CatchIndexRow density="compact" key={row.source}
            progress={{label: copy.sources[row.source], max: Math.max(1, totals.linkClicks), value: row.clicks}}
            title={copy.sources[row.source]} value={copy.sourceValue(row.clicks)} />
        )) : <CatchText as="p" tone="secondary" variant="body-small">{copy.noSources}</CatchText>}
      </CatchSection>
    </CatchStack>
  );
}
