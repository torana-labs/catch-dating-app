import {CatchText, CatchField} from "@catch/web-ui";
import {
  ArrowRight,
  CircleDollarSign,
  FileWarning,
  LineChart,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import {
  AdminButton,
  AdminFeatureLoadingState,
  AdminFilterBar,
  AdminMetricCard,
  AdminMetricGrid,
  AdminOverviewMainGrid,
  AdminOverviewQueueDecisionButton,
  AdminOverviewQueueItems,
  AdminOverviewQueueRow,
  AdminOverviewQueueRowActions,
  AdminStatusGrid,
  AdminTrendSeries,
  AdminWorkbenchNote,
  EmptyState,
  Panel,
  QualityList,
  selectOptions,
  StateRow,
  StatusBanner,
} from "../../../shared/ui/AdminPrimitives";
import type {
  AdminOverviewResponse,
  AdminQueueItem,
  HostAnalyticsQueryPayload,
  HostAnalyticsResponse,
  HostAnalyticsMetricCard,
} from "../../../shared/types/adminTypes";
import {displayAdminQueueTitle} from "../../../shared/ui/adminPresentation";

export type OverviewAnalyticsRangePreset = NonNullable<
  HostAnalyticsQueryPayload["rangePreset"]
>;
export type OverviewAnalyticsGranularity = NonNullable<
  HostAnalyticsQueryPayload["granularity"]
>;

export type OverviewQueueDestination =
  | "safety"
  | "access"
  | "organizers"
  | "finance";

export function OverviewScreen({
  analyticsClubId,
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
  isOverviewLoading,
  overview,
  overviewError = null,
  overviewLoadedAt = null,
  onOpenQueue,
  onAnalyticsClubIdChange,
  onAnalyticsEndDateChange,
  onAnalyticsEventIdChange,
  onAnalyticsGranularityChange,
  onAnalyticsRangePresetChange,
  onAnalyticsStartDateChange,
  onClearAnalyticsScope,
  onRefresh,
  onRefreshAnalytics,
  onRefreshOverview,
}: {
  analyticsClubId: string;
  analyticsEndDate: string;
  analyticsError?: string | null;
  analyticsEventId: string;
  analyticsGranularity: OverviewAnalyticsGranularity;
  analyticsLoadedAt?: string | null;
  analyticsRangePreset: OverviewAnalyticsRangePreset;
  analyticsStartDate: string;
  canLoadAnalytics?: boolean;
  hostAnalytics: HostAnalyticsResponse | null;
  isAnalyticsLoading?: boolean;
  isLoading?: boolean;
  isOverviewLoading?: boolean;
  overview: AdminOverviewResponse;
  overviewError?: string | null;
  overviewLoadedAt?: string | null;
  onOpenQueue: (
    destination: OverviewQueueDestination,
    targetPath?: string | null
  ) => void;
  onAnalyticsClubIdChange: (value: string) => void;
  onAnalyticsEndDateChange: (value: string) => void;
  onAnalyticsEventIdChange: (value: string) => void;
  onAnalyticsGranularityChange: (value: OverviewAnalyticsGranularity) => void;
  onAnalyticsRangePresetChange: (value: OverviewAnalyticsRangePreset) => void;
  onAnalyticsStartDateChange: (value: string) => void;
  onClearAnalyticsScope: () => void;
  onRefresh: () => void;
  onRefreshAnalytics?: () => void;
  onRefreshOverview?: () => void;
}) {
  const overviewRefreshing = isOverviewLoading ?? isLoading;
  const analyticsRefreshing = isAnalyticsLoading ?? isLoading;
  const refreshOverview = onRefreshOverview ?? onRefresh;
  const refreshAnalytics = onRefreshAnalytics ?? onRefresh;
  const digestCards = ownerDigestCards(overview);

  return (
    <>
      {overviewError ? (
        <StatusBanner
          icon={<FileWarning size={17} strokeWidth={1.9} />}
          tone="error"
        >
          {overviewError} Successful sources remain visible below.
        </StatusBanner>
      ) : null}
      <AdminStatusGrid>
        <StateRow label="Source generated at" value={formatDateTime(overview.generatedAt)} />
        <StateRow label="Loaded at" value={formatDateTime(overviewLoadedAt)} />
        <AdminButton
          disabled={overviewRefreshing}
          icon={<RefreshCw size={15} strokeWidth={1.9} />}
          onClick={refreshOverview}
        >
          {overviewRefreshing ? "Refreshing" : "Refresh queues"}
        </AdminButton>
      </AdminStatusGrid>

      <AdminOverviewMainGrid aria-label="Owner action digest">
        {digestCards.map((card) => (
          <OwnerDigestCard
            card={card}
            key={card.id}
            onOpenQueue={onOpenQueue}
          />
        ))}
      </AdminOverviewMainGrid>

      {canLoadAnalytics && hostAnalytics ? (
        <HostAnalyticsDigest
          analyticsClubId={analyticsClubId}
          analyticsEndDate={analyticsEndDate}
          analyticsError={analyticsError}
          analyticsEventId={analyticsEventId}
          analyticsGranularity={analyticsGranularity}
          analyticsLoadedAt={analyticsLoadedAt}
          analyticsRangePreset={analyticsRangePreset}
          analyticsStartDate={analyticsStartDate}
          hostAnalytics={hostAnalytics}
          isLoading={analyticsRefreshing}
          onAnalyticsClubIdChange={onAnalyticsClubIdChange}
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

interface OwnerDigestCardModel {
  id: string;
  title: string;
  destination: OverviewQueueDestination;
  icon: typeof ShieldAlert;
  totals: Array<{label: string; value: number}>;
  previewRows: AdminQueueItem[];
}

function ownerDigestCards(overview: AdminOverviewResponse): OwnerDigestCardModel[] {
  return [
    {
      id: "safety",
      title: "Safety",
      destination: "safety",
      icon: ShieldAlert,
      totals: [
        {label: "Open user reports", value: metricValue(overview, "openReports")},
        {label: "Pending moderation", value: metricValue(overview, "pendingModerationFlags")},
        {label: "Open event safety", value: metricValue(overview, "eventSafetyReports")},
      ],
      previewRows: [
        ...overview.queues.safetyReports,
        ...overview.queues.moderationFlags,
        ...overview.queues.eventSafetyReports,
      ],
    },
    {
      id: "access",
      title: "Launch access",
      destination: "access",
      icon: UserCheck,
      totals: [
        {label: "Pending applications", value: metricValue(overview, "pendingApplications")},
      ],
      previewRows: overview.queues.accessApplications,
    },
    {
      id: "supply",
      title: "Supply",
      destination: "organizers",
      icon: Users,
      totals: [
        {label: "Pending claims", value: metricValue(overview, "pendingClubClaims")},
        {label: "Index review pages", value: metricValue(overview, "indexReviewPages")},
      ],
      previewRows: [
        ...overview.queues.clubClaimRequests,
        ...overview.queues.clubIndexReviews,
      ],
    },
    {
      id: "finance",
      title: "Finance",
      destination: "finance",
      icon: CircleDollarSign,
      totals: [
        {label: "Failed payments", value: metricValue(overview, "failedPayments")},
        {label: "Signup-failed payments", value: metricValue(overview, "signupFailedPayments")},
        {label: "Payout restrictions", value: metricValue(overview, "payoutRestrictedHosts")},
      ],
      previewRows: overview.queues.paymentIssues,
    },
  ];
}

function OwnerDigestCard({
  card,
  onOpenQueue,
}: {
  card: OwnerDigestCardModel;
  onOpenQueue: (
    destination: OverviewQueueDestination,
    targetPath?: string | null
  ) => void;
}) {
  const Icon = card.icon;
  const visibleRows = card.previewRows.slice(0, 3);
  return (
    <Panel
      icon={<Icon size={18} strokeWidth={1.9} />}
      title={card.title}
      action={(
        <AdminButton onClick={() => onOpenQueue(card.destination)}>
          Open workflow
        </AdminButton>
      )}
    >
      <QualityList>
        {card.totals.map((total) => (
          <StateRow
            key={total.label}
            label={total.label}
            value={total.value.toLocaleString()}
          />
        ))}
      </QualityList>
      <AdminWorkbenchNote>
        Capped preview: showing {visibleRows.length} of {card.previewRows.length} returned rows.
      </AdminWorkbenchNote>
      <AdminOverviewQueueItems>
        {visibleRows.length ? visibleRows.map((item) => (
          <DigestQueueRow
            item={item}
            key={item.id}
            onOpen={() => onOpenQueue(card.destination, item.targetPath)}
          />
        )) : (
          <EmptyState>Nothing in the returned preview.</EmptyState>
        )}
      </AdminOverviewQueueItems>
    </Panel>
  );
}

function DigestQueueRow({
  item,
  onOpen,
}: {
  item: AdminQueueItem;
  onOpen: () => void;
}) {
  return (
    <AdminOverviewQueueRow intent="neutral">
      <div>
        <CatchText as="h3" variant="sectionTitle">{displayAdminQueueTitle(item.title)}</CatchText>
        <CatchText as="p" variant="supporting">{item.detail}</CatchText>
      </div>
      <AdminOverviewQueueRowActions>
        <span>{relativeTime(item.createdAt)}</span>
        <AdminOverviewQueueDecisionButton onClick={onOpen}>
          Open <ArrowRight aria-hidden="true" size={13} strokeWidth={2} />
        </AdminOverviewQueueDecisionButton>
      </AdminOverviewQueueRowActions>
    </AdminOverviewQueueRow>
  );
}

function HostAnalyticsDigest({
  analyticsClubId,
  analyticsEndDate,
  analyticsError,
  analyticsEventId,
  analyticsGranularity,
  analyticsLoadedAt,
  analyticsRangePreset,
  analyticsStartDate,
  hostAnalytics,
  isLoading,
  onAnalyticsClubIdChange,
  onAnalyticsEndDateChange,
  onAnalyticsEventIdChange,
  onAnalyticsGranularityChange,
  onAnalyticsRangePresetChange,
  onAnalyticsStartDateChange,
  onClearAnalyticsScope,
  onRefresh,
}: {
  analyticsClubId: string;
  analyticsEndDate: string;
  analyticsError: string | null;
  analyticsEventId: string;
  analyticsGranularity: OverviewAnalyticsGranularity;
  analyticsLoadedAt: string | null;
  analyticsRangePreset: OverviewAnalyticsRangePreset;
  analyticsStartDate: string;
  hostAnalytics: HostAnalyticsResponse;
  isLoading: boolean;
  onAnalyticsClubIdChange: (value: string) => void;
  onAnalyticsEndDateChange: (value: string) => void;
  onAnalyticsEventIdChange: (value: string) => void;
  onAnalyticsGranularityChange: (value: OverviewAnalyticsGranularity) => void;
  onAnalyticsRangePresetChange: (value: OverviewAnalyticsRangePreset) => void;
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
            onChanged={(value) => onAnalyticsRangePresetChange((value ?? "") as OverviewAnalyticsRangePreset)}
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
            onChanged={(value) => onAnalyticsGranularityChange((value ?? "") as OverviewAnalyticsGranularity)}
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
            onChanged={onAnalyticsClubIdChange}
            inputHint="all organizers"
            value={analyticsClubId}
          />
          <CatchField
            recipe="input"
            title="Event ID"
            onChanged={onAnalyticsEventIdChange}
            inputHint="all events"
            value={analyticsEventId}
          />
          <AdminButton
            disabled={!analyticsClubId.trim() && !analyticsEventId.trim()}
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

function metricValue(overview: AdminOverviewResponse, id: string): number {
  const value = overview.metrics.find((metric) => metric.id === id)?.value ?? 0;
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
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

function relativeTime(value: string | null): string {
  if (!value) return "queued";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "queued";
  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.round(diffHours / 24)}d`;
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
