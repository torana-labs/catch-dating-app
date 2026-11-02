import {CatchTable, CatchText} from "@catch/web-ui";
import type {ReactNode} from "react";

import {AdminSecondaryDisclosure, AdminWorkbenchStack, EmptyState} from "../../../shared/ui/AdminPrimitives";

interface TrendSeries {
  id: string;
  label: string;
}

interface TrendPoint {
  label: string;
  values: Record<string, number>;
}

/** User analytics' activity chart, with its values in a table beside it. */
export function renderActivityTrendSeries({
  ariaLabel,
  emptyLabel,
  points,
  series,
}: {
  ariaLabel: string;
  emptyLabel: ReactNode;
  points: TrendPoint[];
  series: TrendSeries[];
}) {
  if (points.length === 0 || series.length === 0) {
    return <EmptyState variant="workbench">{emptyLabel}</EmptyState>;
  }

  const values = points.flatMap((point) =>
    series.map((definition) => safeTrendValue(point.values[definition.id]))
  );
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(1, ...values);
  const range = Math.max(1, maximum - minimum);
  const pathFor = (seriesId: string) => points.map((point, index) => {
    const x = points.length === 1 ? 300 : (index / (points.length - 1)) * 600;
    const value = safeTrendValue(point.values[seriesId]);
    const y = 188 - ((value - minimum) / range) * 176;
    return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");

  return (
    <AdminWorkbenchStack>
      <figure aria-label={ariaLabel} className="admin-trend-series">
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 600 200">
          <line className="admin-trend-axis" x1="0" x2="600" y1="188" y2="188" />
          {series.map((definition, index) => (
            <path
              className={`admin-trend-line admin-trend-line-${(index % 4) + 1}`}
              d={pathFor(definition.id)}
              key={definition.id}
            />
          ))}
        </svg>
        <figcaption>
          {series.map((definition, index) => (
            <CatchText as="span" color="ink2" key={definition.id} variant="bodyS">
              <i className={`admin-trend-swatch admin-trend-swatch-${(index % 4) + 1}`} />
              {definition.label}
            </CatchText>
          ))}
        </figcaption>
      </figure>
      <AdminSecondaryDisclosure summary="View chart data as a table">
        <CatchTable<Record<string, string>> label={`${ariaLabel} data`} rowKey="period" density="compact"
          columns={[{key: "period", label: "Period"}, ...series.map((definition) => ({key: definition.id, label: definition.label}))]}
          rows={points.map((point) => ({period: point.label, ...Object.fromEntries(series.map((definition) =>
            [definition.id, String(safeTrendValue(point.values[definition.id]))]))}))} />
      </AdminSecondaryDisclosure>
    </AdminWorkbenchStack>
  );
}

function safeTrendValue(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
