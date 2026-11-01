import type {DataMode} from "../../../shared/types/adminTypes";
import {useSystemController} from "../controllers/useSystemController";
import {SystemScreen} from "./SystemScreen";

export function SystemRouteScreen({isSessionReady, mode}: {isSessionReady: boolean; mode: DataMode}) {
  const controller = useSystemController({isSessionReady, mode});
  return (
    <SystemScreen
      activityError={controller.activityError}
      counts={controller.counts}
      filter={controller.filter}
      health={controller.health}
      healthError={controller.healthError}
      isActivityLoading={controller.isActivityLoading}
      onFilterChanged={controller.setFilter}
      onQueryChanged={controller.setQuery}
      onRefresh={() => void controller.refresh()}
      query={controller.query}
      rows={controller.rows}
    />
  );
}
