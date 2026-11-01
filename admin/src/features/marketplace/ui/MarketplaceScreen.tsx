import {CatchField} from "@catch/web-ui";
import {
  FileWarning,
  LineChart,
  RefreshCw,
} from "lucide-react";
import {
  AdminButton,
  AdminFeatureLoadingState,
  AdminFilterBar,
  AdminMetricCard,
  AdminMetricGrid,
  AdminOverviewMainGrid,
  AdminStatusGrid,
  AdminTrendSeries,
  Panel,
  selectOptions,
  StateRow,
  StatusBanner,
} from "../../../shared/ui/AdminPrimitives";
import type {
  HostAnalyticsQueryPayload,
  HostAnalyticsResponse,
  HostAnalyticsMetricCard,
} from "../../../shared/types/adminTypes";

export type MarketplaceAnalyticsRangePreset = NonNullable<
  HostAnalyticsQueryPayload["rangePreset"]
>;
export type MarketplaceAnalyticsGranularity = NonNullable<
  HostAnalyticsQueryPayload["granularity"]
>;

export function MarketplaceScreen({
  analyticsOrganizerId,
  analyticsEndDate,
  analyticsError = null,
  analyticsEventId,
  analyticsGranularity,
  analyticsLoadedAt = null,
  analyticsRangePreset,
  analyticsStartDate,
  canLoadAnalytics = true,
  hostAnalytics,
  isAnalyticsLoading,
  isLoading = false,
  onAnalyticsOrganizerIdChange,
  onAnalyticsEndDateChange,
  onAnalyticsEventIdChange,
  onAnalyticsGranularityChange,
  onAnalyticsRangePresetChange,
  onAnalyticsStartDateChange,
  onClearAnalyticsScope,
  onRefresh,
  onRefreshAnalytics,
}: {
  analyticsOrganizerId: string;
  analyticsEndDate: string;
  analyticsError?: string | null;
  analyticsEventId: string;
  analyticsGranularity: MarketplaceAnalyticsGranularity;
  analyticsLoadedAt?: string | null;
  analyticsRangePreset: MarketplaceAnalyticsRangePreset;
  analyticsStartDate: string;
  canLoadAnalytics?: boolean;
  hostAnalytics: HostAnalyticsResponse | null;
  isAnalyticsLoading?: boolean;
  isLoading?: boolean;
  onAnalyticsOrganizerIdChange: (value: string) => void;
  onAnalyticsEndDateChange: (value: string) => void;
  onAnalyticsEventIdChange: (value: string) => void;
  onAnalyticsGranularityChange: (value: MarketplaceAnalyticsGranularity) => void;
  onAnalyticsRangePresetChange: (value: MarketplaceAnalyticsRangePreset) => void;
  onAnalyticsStartDateChange: (value: string) => void;
  onClearAnalyticsScope: () => void;
  onRefresh: () => void;
  onRefreshAnalytics?: () => void;
}) {
  const analyticsRefreshing = isAnalyticsLoading ?? isLoading;
  const refreshAnalytics = onRefreshAnalytics ?? onRefresh;

  return (
    <>
      {canLoadAnalytics && hostAnalytics ? (
        <HostAnalyticsDigest
          analyticsOrganizerId={analyticsOrganizerId}
          analyticsEndDate={analyticsEndDate}
          analyticsError={analyticsError}
          analyticsEventId={analyticsEventId}
          analyticsGranularity={analyticsGranularity}
          analyticsLoadedAt={analyticsLoadedAt}
          analyticsRangePreset={analyticsRangePreset}
          analyticsStartDate={analyticsStartDate}
          hostAnalytics={hostAnalytics}
          isLoading={analyticsRefreshing}
          onAnalyticsOrganizerIdChange={onAnalyticsOrganizerIdChange}
          onAnalyticsEndDateChange={onAnalyticsEndDateChange}
          onAnalyticsEventIdChange={onAnalyticsEventIdChange}
          onAnalyticsGranularityChange={onAnalyticsGranularityChange}
          onAnalyticsRangePresetChange={onAnalyticsRangePresetChange}
          onAnalyticsStartDateChange={onAnalyticsStartDateChange}
          onClearAnalyticsScope={onClearAnalyticsScope}
          onRefresh={refreshAnalytics}
        />
      ) : canLoadAnalytics && analyticsError ? (
        <StatusBanner
          icon={<FileWarning size={17} strokeWidth={1.9} />}
          tone="error"
        >
          {analyticsError}
        </StatusBanner>
      ) : canLoadAnalytics ? (
        <AdminFeatureLoadingState label="Loading live marketplace analytics" />
      ) : null}
    </>
  );
}

function HostAnalyticsDigest({
  analyticsOrganizerId,
  analyticsEndDate,
  analyticsError,
  analyticsEventId,
  analyticsGranularity,
  analyticsLoadedAt,
  analyticsRangePreset,
  analyticsStartDate,
  hostAnalytics,
  isLoading,
  onAnalyticsOrganizerIdChange,
  onAnalyticsEndDateChange,
  onAnalyticsEventIdChange,
  onAnalyticsGranularityChange,
  onAnalyticsRangePresetChange,
  onAnalyticsStartDateChange,
  onClearAnalyticsScope,
  onRefresh,
}: {
  analyticsOrganizerId: string;
  analyticsEndDate: string;
  analyticsError: string | null;
  analyticsEventId: string;
  analyticsGranularity: MarketplaceAnalyticsGranularity;
  analyticsLoadedAt: string | null;
  analyticsRangePreset: MarketplaceAnalyticsRangePreset;
  analyticsStartDate: string;
  hostAnalytics: HostAnalyticsResponse;
  isLoading: boolean;
  onAnalyticsOrganizerIdChange: (value: string) => void;
  onAnalyticsEndDateChange: (value: string) => void;
  onAnalyticsEventIdChange: (value: string) => void;
  onAnalyticsGranularityChange: (value: MarketplaceAnalyticsGranularity) => void;
  onAnalyticsRangePresetChange: (value: MarketplaceAnalyticsRangePreset) => void;
  onAnalyticsStartDateChange: (value: string) => void;
  onClearAnalyticsScope: () => void;
  onRefresh: () => void;
}) {
  const cards = ["bookings", "attendanceRate", "revenue", "newReviews"]
    .map((id) => hostAnalytics.summaryCards.find((card) => card.id === id))
    .filter((card): card is HostAnalyticsMetricCard => Boolean(card));
  return (
    <AdminOverviewMainGrid aria-label="Marketplace analytics">
      <Panel
        icon={<LineChart size={18} strokeWidth={1.9} />}
        title="Marketplace analytics"
        action={hostAnalytics.range.preset ?? analyticsRangePreset}
        span={3}
      >
        {analyticsError ? (
          <StatusBanner
            icon={<FileWarning size={17} strokeWidth={1.9} />}
            tone="error"
          >
            {analyticsError} Queue data above is unaffected.
          </StatusBanner>
        ) : null}
        <AdminFilterBar ariaLabel="Marketplace analytics filters">
          <CatchField
            recipe="select"
            title="Range"
            onChanged={(value) => onAnalyticsRangePresetChange((value ?? "") as MarketplaceAnalyticsRangePreset)}
            {...selectOptions([
              {label: "Last 7 days", value: "7d"},
              {label: "Last 30 days", value: "30d"},
              {label: "Last 90 days", value: "90d"},
              {label: "This month", value: "month"},
              {label: "Custom", value: "custom"},
            ])}
            value={analyticsRangePreset}
          />
          <CatchField
            recipe="select"
            title="Group by"
            onChanged={(value) => onAnalyticsGranularityChange((value ?? "") as MarketplaceAnalyticsGranularity)}
            {...selectOptions([
              {label: "Day", value: "day"},
              {label: "Week", value: "week"},
              {label: "Month", value: "month"},
            ])}
            value={analyticsGranularity}
          />
          {analyticsRangePreset === "custom" ? (
            <>
              <CatchField
                recipe="input"
                title="Start date"
                onChanged={onAnalyticsStartDateChange}
                value={analyticsStartDate}
                keyboardType="date"
              />
              <CatchField
                recipe="input"
                title="End date"
                onChanged={onAnalyticsEndDateChange}
                value={analyticsEndDate}
                keyboardType="date"
              />
            </>
          ) : null}
          <CatchField
            recipe="input"
            title="Organizer ID"
            onChanged={onAnalyticsOrganizerIdChange}
            inputHint="all organizers"
            value={analyticsOrganizerId}
          />
          <CatchField
            recipe="input"
            title="Event ID"
            onChanged={onAnalyticsEventIdChange}
            inputHint="all events"
            value={analyticsEventId}
          />
          <AdminButton
            disabled={!analyticsOrganizerId.trim() && !analyticsEventId.trim()}
            onClick={onClearAnalyticsScope}
          >
            Clear scope
          </AdminButton>
          <AdminButton
            disabled={isLoading}
            icon={<RefreshCw size={15} strokeWidth={1.9} />}
            onClick={onRefresh}
          >
            {isLoading ? "Refreshing" : "Refresh analytics"}
          </AdminButton>
        </AdminFilterBar>
        <AdminStatusGrid>
          <StateRow label="Source generated at" value={formatDateTime(hostAnalytics.generatedAt)} />
          <StateRow label="Loaded at" value={formatDateTime(analyticsLoadedAt)} />
          <StateRow
            label="Selected range"
            value={`${formatDate(hostAnalytics.range.startDate)} – ${formatDate(hostAnalytics.range.endDate)}`}
          />
          <StateRow label="Timezone" value={hostAnalytics.timezone} />
        </AdminStatusGrid>
        <AdminMetricGrid ariaLabel="Selected-range marketplace outcomes" columns={4}>
          {cards.map((card) => (
            <AdminMetricCard
              caption={card.caption}
              key={card.id}
              label={card.label}
              tone={card.status === "ready" ? "normal" : "attention"}
              value={formatAnalyticsMetric(card)}
            />
          ))}
        </AdminMetricGrid>
        <AdminTrendSeries
          ariaLabel="Selected-range bookings and attendance activity"
          emptyLabel="No marketplace activity buckets are available for this range."
          points={hostAnalytics.trend.map((point) => ({
            label: `${formatDate(point.periodStart)} – ${formatDate(point.periodEnd)}`,
            values: point.metrics,
          }))}
          series={[
            {id: "bookings", label: "Bookings"},
            {id: "checkedIn", label: "Checked in"},
          ]}
        />
      </Panel>
    </AdminOverviewMainGrid>
  );
}

function formatAnalyticsMetric(metric: HostAnalyticsMetricCard): string {
  if (metric.unit === "percent") return `${Math.round(metric.value)}%`;
  if (metric.unit === "money_minor") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(metric.value / 100);
  }
  return Math.round(metric.value).toLocaleString("en-IN");
}

function formatDateTime(value: string | null): string {
  if (!value) return "unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {dateStyle: "medium"}).format(date);
}
