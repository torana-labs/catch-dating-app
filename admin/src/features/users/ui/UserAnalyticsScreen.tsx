import {CatchAdminIntakeSectionTitle, CatchBadge, CatchField} from "@catch/web-ui";
import {
  BarChart3,
  Clock3,
  Database,
  FileWarning,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import type {
  UserAnalyticsConnectionSummary,
  UserAnalyticsDataQuality,
  UserAnalyticsGranularity,
  UserAnalyticsMetricCard,
  UserAnalyticsProfileSummary,
  UserAnalyticsRangePreset,
  UserAnalyticsResponse,
  UserAnalyticsTrendPoint,
} from "../../../shared/types/adminTypes";
import {
  AdminButton,
  AdminEditorGrid,
  AdminEditorPanel,
  AdminFieldGrid,
  AdminIntakeSection,
  AdminMetricCard,
  AdminMetricGrid,
  AdminRoadmapList,
  AdminRoadmapListItem,
  AdminRowTitle,
  AdminSecondaryDisclosure,
  AdminTagList,
  AdminToolbar,
  AdminTrendSeries,
  AdminWorkbenchNote,
  AdminWorkbenchStack,
  AlertRow,
  DataTable,
  EmptyState,
  Panel,
  QualityList,
  SegmentedControl,
  selectOptions,
  StateRow,
  StatusBanner,
} from "../../../shared/ui/AdminPrimitives";
import {
  type UserAnalyticsController,
  type UserLookupContract,
  useUserAnalyticsController,
} from "../controllers/useUserAnalyticsController";

export function UserAnalyticsScreen({
  handoffRequestId,
  handoffUserId,
  onError,
  onNotice,
}: {
  handoffRequestId?: number | null;
  handoffUserId?: string | null;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}) {
  const controller = useUserAnalyticsController({
    handoffRequestId,
    handoffUserId,
    onError,
    onNotice,
  });
  return <UserAnalyticsWorkspace controller={controller} />;
}

export function UserAnalyticsWorkspace({
  controller,
}: {
  controller: UserAnalyticsController;
}) {
  const customRangeIssue = controller.rangePreset !== "custom" ? null :
    !controller.startDate || !controller.endDate ?
      "Choose both start and end dates." :
    Date.parse(controller.startDate) > Date.parse(controller.endDate) ?
      "Start date must be on or before end date." :
      null;
  return (
    <AdminWorkbenchStack>
      <Panel
        icon={<Search size={18} strokeWidth={1.9} />}
        title="Exact UID lookup"
        action={controller.isLoading ? "Loading new user" : "read-only"}
        span={2}
      >
        <AdminToolbar>
          <CatchField
            recipe="input"
            title="users/{uid}"
            onChanged={controller.setUserId}
            inputHint="user uid"
            value={controller.userId}
          />
          <SegmentedControl<UserAnalyticsRangePreset>
            ariaLabel="User analytics range"
            options={[
              {id: "7d", label: "7d"},
              {id: "30d", label: "30d"},
              {id: "90d", label: "90d"},
              {id: "month", label: "Month"},
              {id: "custom", label: "Custom"},
            ]}
            value={controller.rangePreset}
            onChange={controller.setRangePreset}
          />
          <CatchField
            recipe="select"
            title="Group by"
            onChanged={(value) => controller.setGranularity((value ?? "") as UserAnalyticsGranularity)}
            {...selectOptions([
              {value: "day", label: "Day"},
              {value: "week", label: "Week"},
              {value: "month", label: "Month"},
            ])}
            value={controller.granularity}
          />
          <AdminButton
            disabled={controller.isLoading ||
              !controller.lookupContract.canLoad ||
              Boolean(customRangeIssue)}
            icon={<RefreshCw size={15} strokeWidth={1.9} />}
            onClick={() => void controller.load()}
            variant="primary"
          >
            Load
          </AdminButton>
        </AdminToolbar>
        {controller.rangePreset === "custom" && (
          <AdminFieldGrid columns={2}>
            <CatchField
              recipe="input"
              title="Start date"
              onChanged={controller.setStartDate}
              value={controller.startDate}
              keyboardType="date"
            />
            <CatchField
              recipe="input"
              title="End date"
              onChanged={controller.setEndDate}
              value={controller.endDate}
              keyboardType="date"
            />
          </AdminFieldGrid>
        )}
        {customRangeIssue ? (
          <AlertRow
            icon={<FileWarning size={16} strokeWidth={1.9} />}
            title="Invalid custom range"
            tone="warning"
          >
            {customRangeIssue}
          </AlertRow>
        ) : null}
        {!controller.lookupContract.canLoad ? (
          <AlertRow
            icon={<FileWarning size={16} strokeWidth={1.9} />}
            title={controller.lookupContract.statusLabel}
            tone="warning"
          >
            {controller.lookupContract.statusDetail}
          </AlertRow>
        ) : null}
      </Panel>

      <UserLookupContractPanel contract={controller.lookupContract} />

      {controller.viewState === "loading" ? (
        <EmptyState variant="workbench" icon={<Clock3 size={16} strokeWidth={1.9} />}>
          Loading aggregate analytics for {controller.lookupContract.normalizedUserId}.
        </EmptyState>
      ) : controller.viewState === "forbidden" ||
        controller.viewState === "missing" ||
        controller.viewState === "error" ? (
        <Panel
          icon={<FileWarning size={18} strokeWidth={1.9} />}
          title={controller.viewState === "forbidden" ?
            "Analytics access denied" :
            controller.viewState === "missing" ?
              "No analytics rows" :
              "Analytics unavailable"}
          action="retry available"
          span={2}
        >
          <AdminWorkbenchNote>
            {controller.errorMessage ??
              "No aggregate analytics are available for this exact UID and range."}
          </AdminWorkbenchNote>
          <AdminButton
            icon={<RefreshCw size={15} strokeWidth={1.9} />}
            onClick={() => void controller.load()}
          >
            Retry data load
          </AdminButton>
        </Panel>
      ) : controller.report ? (
        <>
          <StatusBanner
            icon={<ShieldCheck size={17} strokeWidth={1.9} />}
            tone="success"
          >
            Loaded report for {controller.report.scope.userId}.
          </StatusBanner>
          <UserHeadlineMetrics report={controller.report} />
          <UserAnalyticsReportView report={controller.report} />
        </>
      ) : (
        <EmptyState
          variant="workbench"
          icon={<Clock3 size={16} strokeWidth={1.9} />}
        >
          Enter an exact Firebase Auth UID and choose a range to load aggregate analytics.
        </EmptyState>
      )}
    </AdminWorkbenchStack>
  );
}

const userHeadlineMetricIds = [
  "profileViews",
  "mutualCatches",
  "chatsStarted",
  "eventsAttended",
] as const;

function UserHeadlineMetrics({report}: {report: UserAnalyticsResponse}) {
  return (
    <AdminMetricGrid ariaLabel="User outcome metrics">
      {userHeadlineMetricIds.map((metricId) => {
        const metric = report.summaryCards.find((item) => item.id === metricId);
        return (
          <AdminMetricCard
            caption={metric?.caption}
            key={metricId}
            label={metric?.label ?? metricId}
            tone={metric?.status === "ready" ? "normal" : "attention"}
            value={metric ? formatMetricValue(metric) : "—"}
          />
        );
      })}
    </AdminMetricGrid>
  );
}

function UserLookupContractPanel({
  contract,
}: {
  contract: UserLookupContract;
}) {
  return (
    <Panel
      span={2}
      icon={<ShieldCheck size={18} strokeWidth={1.9} />}
      title="Privacy and action boundary"
      action="aggregate-only"
    >
      <AdminWorkbenchNote>
        Reads aggregate analytics for one exact UID. It does not search identity,
        expose raw scoring data, or provide account, safety, support, or payment actions.
      </AdminWorkbenchNote>
      <AdminSecondaryDisclosure summary="View exact scope and unavailable capabilities">
        <QualityList>
          <StateRow label="Normalized uid" value={contract.normalizedUserId} />
          <StateRow label="Target path" value={contract.targetPath} />
          <StateRow label="Allowed source" value={contract.allowedSources.join(", ")} />
        </QualityList>
        <AdminWorkbenchStack compact>
          <AdminIntakeSection>
            <CatchAdminIntakeSectionTitle>Unavailable here</CatchAdminIntakeSectionTitle>
            <AdminTagList>
              {contract.unavailableDomains.map((domain) => (
                <CatchBadge key={domain} label={domain} />
              ))}
            </AdminTagList>
          </AdminIntakeSection>
          <AdminIntakeSection>
            <CatchAdminIntakeSectionTitle>Blocked actions</CatchAdminIntakeSectionTitle>
            <AdminTagList>
              {contract.blockedActions.map((action) => (
                <CatchBadge key={action} label={action} />
              ))}
            </AdminTagList>
          </AdminIntakeSection>
        </AdminWorkbenchStack>
      </AdminSecondaryDisclosure>
    </Panel>
  );
}

function UserAnalyticsReportView({report}: {report: UserAnalyticsResponse}) {
  return (
    <AdminWorkbenchStack>
      <Panel
        span={2}
        icon={<BarChart3 size={18} strokeWidth={1.9} />}
        title="Activity summary"
        action={`${report.trend.length} buckets`}
      >
        <ActivityTrend points={report.trend} />
      </Panel>
      <AdminEditorGrid>
        <SummaryPanel
          connection={report.connectionSummary}
          profile={report.profileSummary}
        />
        <Panel
          icon={<UserRound size={18} strokeWidth={1.9} />}
          title="Report scope"
          action={report.range.granularity}
        >
          <QualityList>
            <StateRow label="User" value={`users/${report.scope.userId}`} />
            <StateRow label="Report generated at" value={formatDateTime(report.generatedAt)} />
            <StateRow label="Range start" value={formatDateTime(report.range.startDate)} />
            <StateRow label="Range end" value={formatDateTime(report.range.endDate)} />
            <StateRow label="Group by" value={report.range.granularity} />
            <StateRow label="Timezone" value={report.timezone} />
          </QualityList>
        </Panel>
      </AdminEditorGrid>
      <AdminEditorGrid>
        <Panel
          icon={<Sparkles size={18} strokeWidth={1.9} />}
          title="Coaching references"
          action={`${report.coachingTipRefs.length} refs`}
        >
          <AdminRoadmapList>
            {report.coachingTipRefs.map((tip) => (
              <AdminRoadmapListItem key={tip.id}>
                <Sparkles size={15} strokeWidth={1.9} />
                <span>
                  <strong>{tip.copyKey}</strong> · priority {tip.priority} ·{" "}
                  {tip.metricIds.join(", ")}
                </span>
              </AdminRoadmapListItem>
            ))}
          </AdminRoadmapList>
        </Panel>

        <DataQualityPanel rows={report.dataQuality} />
      </AdminEditorGrid>
    </AdminWorkbenchStack>
  );
}

function ActivityTrend({points}: {points: UserAnalyticsTrendPoint[]}) {
  return (
    <AdminTrendSeries
      ariaLabel="User activity summary"
      emptyLabel="No activity buckets are available for this range."
      points={points.map((point) => ({
        label: `${formatDate(point.periodStart)} – ${formatDate(point.periodEnd)}`,
        values: point.metrics,
      }))}
      series={[
        {id: "profileViews", label: "Profile views"},
        {id: "mutualCatches", label: "Mutual catches"},
        {id: "chatsStarted", label: "Chats started"},
        {id: "eventsAttended", label: "Events attended"},
      ]}
    />
  );
}

function SummaryPanel({
  connection,
  profile,
}: {
  connection: UserAnalyticsConnectionSummary;
  profile: UserAnalyticsProfileSummary;
}) {
  return (
    <Panel
      icon={<Database size={18} strokeWidth={1.9} />}
      title="Aggregate summary"
      action="user-safe"
    >
      <QualityList>
        <StateRow label="Outgoing likes" value={connection.outgoingLikes} />
        <StateRow label="Incoming likes" value={connection.incomingLikes} />
        <StateRow label="Private interest" value={connection.privateInterestReceived} />
        <StateRow label="Mutual catches" value={connection.mutualCatches} />
        <StateRow label="Chats started" value={connection.chatsStarted} />
        <StateRow label="Messages sent" value={connection.chatMessagesSent} />
        <StateRow label="Profile dwell" value={`${profile.profileDwellSeconds}s`} />
        <StateRow label="Top photo" value={profile.topPhotoId} />
        <StateRow label="Active minutes" value={profile.activeMinutes} />
      </QualityList>
    </Panel>
  );
}

function DataQualityPanel({rows}: {rows: UserAnalyticsDataQuality[]}) {
  return (
    <Panel
      icon={<FileWarning size={18} strokeWidth={1.9} />}
      title="Data quality"
      action={`${rows.filter((row) => row.state !== "ok").length} warnings`}
    >
      <QualityList>
        {rows.map((row) => (
          <StateRow
            key={row.id}
            label={row.id}
            value={(
              <>
              <CatchBadge label={row.state} />{" "}
              {row.detail}
              </>
            )}
          />
        ))}
      </QualityList>
    </Panel>
  );
}

function formatMetricValue(metric: UserAnalyticsMetricCard): string {
  if (metric.unit === "percent") return `${metric.value}%`;
  if (metric.unit === "duration_seconds") return `${metric.value}s`;
  return numberValue(metric.value);
}

function numberValue(value: number | undefined): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDateTime(value: string): string {
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
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
}
