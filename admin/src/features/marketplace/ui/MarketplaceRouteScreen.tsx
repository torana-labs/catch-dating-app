import type {DataMode} from "../../../shared/types/adminTypes";
import {useMarketplaceController} from "../controllers/useMarketplaceController";
import {MarketplaceScreen} from "./MarketplaceScreen";

/** Marketplace analytics, split from the old Overview until the Marketplace board replaces it. */
export function MarketplaceRouteScreen({
  adminRoles,
  isSessionReady,
  mode,
  onError,
  onNotice,
}: {
  adminRoles: string[];
  isSessionReady: boolean;
  mode: DataMode;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}) {
  const controller = useMarketplaceController({
    adminRoles,
    isSessionReady,
    mode,
    onError,
    onNotice,
  });

  return (
    <MarketplaceScreen
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
      onAnalyticsOrganizerIdChange={controller.setAnalyticsOrganizerId}
      onAnalyticsEndDateChange={controller.setAnalyticsEndDate}
      onAnalyticsEventIdChange={controller.setAnalyticsEventId}
      onAnalyticsGranularityChange={controller.setAnalyticsGranularity}
      onAnalyticsRangePresetChange={controller.setAnalyticsRangePreset}
      onAnalyticsStartDateChange={controller.setAnalyticsStartDate}
      onClearAnalyticsScope={controller.clearAnalyticsScope}
      onRefresh={() => void controller.refresh()}
    />
  );
}
