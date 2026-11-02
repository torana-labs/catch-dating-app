import type {DataMode} from "../../../shared/types/adminTypes";
import {useSystemController} from "../controllers/useSystemController";
import {SystemScreen} from "./SystemScreen";

export function SystemRouteScreen({
  canOpenPath,
  canReadHostAnalytics,
  isSessionReady,
  mode,
  onOpenPath,
}: {
  canOpenPath: (path: string) => boolean;
  canReadHostAnalytics: boolean;
  isSessionReady: boolean;
  mode: DataMode;
  onOpenPath: (path: string) => void;
}) {
  const controller = useSystemController({canReadHostAnalytics, isSessionReady, mode});
  return (
    <SystemScreen
      activityError={controller.activityError}
      canOpenPath={canOpenPath}
      counts={controller.counts}
      filter={controller.filter}
      hasMore={controller.hasMore}
      isActivityLoading={controller.isActivityLoading}
      isLoadingMore={controller.isLoadingMore}
      onFilterChanged={controller.setFilter}
      onLoadMore={() => void controller.loadMore()}
      onOpenPath={onOpenPath}
      onQueryChanged={controller.setQuery}
      onRefresh={() => void controller.refresh()}
      onRetrySource={(id) => void controller.retrySource(id)}
      onRowSelected={controller.select}
      onSignalSelected={controller.selectSignal}
      query={controller.query}
      rows={controller.rows}
      selected={controller.selected}
      selectedSignal={controller.selectedSignal}
      signals={controller.signals}
      sources={controller.sources}
    />
  );
}
