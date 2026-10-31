import {FileWarning} from "lucide-react";
import type {DataMode} from "../../../shared/types/adminTypes";
import {
  AdminFeatureLoadingState,
  StatusBanner,
} from "../../../shared/ui/AdminPrimitives";
import {useOverviewController} from "../controllers/useOverviewController";
import {
  OverviewScreen,
  type OverviewQueueDestination,
} from "./OverviewScreen";

export function OverviewRouteScreen({
  adminRoles,
  isSessionReady,
  mode,
  onError,
  onNotice,
  onOpenQueue,
}: {
  adminRoles: string[];
  isSessionReady: boolean;
  mode: DataMode;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  onOpenQueue: (destination: OverviewQueueDestination) => void;
}) {
  const controller = useOverviewController({
    adminRoles,
    isSessionReady,
    mode,
    onError,
    onNotice,
  });

  if (!controller.overview) {
    return controller.overviewError ? (
      <StatusBanner
        icon={<FileWarning size={17} strokeWidth={1.9} />}
        tone="error"
      >
        {controller.overviewError}
      </StatusBanner>
    ) : (
      <AdminFeatureLoadingState label="Loading live overview" />
    );
  }

  return (
    <OverviewScreen
      analyticsOrganizerId={controller.analyticsOrganizerId}
      analyticsEndDate={controller.analyticsEndDate}
      analyticsError={controller.analyticsError}
      analyticsEventId={controller.analyticsEventId}
      analyticsGranularity={controller.analyticsGranularity}
      analyticsLoadedAt={controller.analyticsLoadedAt}
      analyticsRangePreset={controller.analyticsRangePreset}
      analyticsStartDate={controller.analyticsStartDate}
      canLoadAnalytics={controller.canLoadAnalytics}
      hostAnalytics={controller.hostAnalytics}
      isLoading={controller.isLoading}
      isAnalyticsLoading={controller.isAnalyticsLoading}
      isOverviewLoading={controller.isOverviewLoading}
      overview={controller.overview}
      overviewError={controller.overviewError}
      overviewLoadedAt={controller.overviewLoadedAt}
      onAnalyticsOrganizerIdChange={controller.setAnalyticsOrganizerId}
      onAnalyticsEndDateChange={controller.setAnalyticsEndDate}
      onAnalyticsEventIdChange={controller.setAnalyticsEventId}
      onAnalyticsGranularityChange={controller.setAnalyticsGranularity}
      onAnalyticsRangePresetChange={controller.setAnalyticsRangePreset}
      onAnalyticsStartDateChange={controller.setAnalyticsStartDate}
      onClearAnalyticsScope={controller.clearAnalyticsScope}
      onOpenQueue={onOpenQueue}
      onRefresh={() => void controller.refresh()}
      onRefreshAnalytics={() => void controller.refreshAnalytics()}
      onRefreshOverview={() => void controller.refreshOverview()}
    />
  );
}
