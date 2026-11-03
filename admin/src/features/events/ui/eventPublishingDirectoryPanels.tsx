import {ArrowLeft, CalendarDays, ExternalLink, FileWarning, RefreshCw, Search} from "lucide-react";
import {
  AdminButton,
  AdminDetailScreenStack,
  AdminEventSupplyReviewGrid,
  AdminMetricCard,
  AdminMetricGrid,
  AdminStatusGrid,
  AdminToolbar,
  EmptyState,
  PageHeader,
  Panel,
  SegmentedControl,
  StateRow,
} from "../../../shared/ui/AdminPrimitives";
import {
  type ExternalEventSupplyFilter,
  type EventPublishingController,
} from "../controllers/useEventPublishingController";
import {eventPublishingSupplyPanels} from "./eventPublishingSupplyPanels";

function ExternalEventDetailView({
  controller,
}: {
  controller: EventPublishingController;
}) {
  if (controller.selectedExternalEventId) {
    return (
      <AdminDetailScreenStack>
        <PageHeader
          actions={
            <AdminButton
              icon={<ArrowLeft size={15} strokeWidth={1.9} />}
              onClick={() => controller.selectExternalEvent(null)}
            >
              Events
            </AdminButton>
          }
          title={controller.selectedExternalEvent?.title ?? "External event"}
        />
        <Panel
          span={2}
          icon={controller.isExternalDetailError ||
            (!controller.isExternalListLoading && !controller.selectedExternalEvent) ?
            <FileWarning size={18} strokeWidth={1.9} /> :
            <ExternalLink size={18} strokeWidth={1.9} />}
          title={controller.isExternalListLoading ? "Loading external event" :
            controller.isExternalDetailError ? "Unable to load external event" :
              controller.selectedExternalEvent ? "Source record" : "External event unavailable"}
          action={controller.isExternalListLoading ? "Loading" :
            controller.isExternalDetailError ? (
              <AdminButton
                icon={<RefreshCw size={15} strokeWidth={1.9} />}
                onClick={() => void controller.refreshExternalList()}
              >
                Retry
              </AdminButton>
            ) : controller.selectedExternalEvent?.publicationStatus ?? "Bounded source query"}
        >
          {controller.isExternalListLoading ? (
            <EmptyState variant="workbench">
              Checking the current external-event inventory.
            </EmptyState>
          ) : controller.isExternalDetailError ? (
            <EmptyState variant="workbench">
              We could not check this event. Retry to load its current details.
            </EmptyState>
          ) : !controller.selectedExternalEvent ? (
            <EmptyState
              variant="workbench"
              icon={<FileWarning size={16} strokeWidth={1.9} />}
            >
              This record was not found in the current external-event inventory.
              Refresh the inventory or return to the list and select another event.
            </EmptyState>
          ) : null}
          <AdminEventSupplyReviewGrid>
            {controller.selectedExternalEvent ? (
              <eventPublishingSupplyPanels.ExternalEventSupplyDetail
                event={controller.selectedExternalEvent}
              />
            ) : null}
            {controller.isExternalListLoading || controller.isExternalDetailError ||
              controller.selectedExternalEvent ? (
                // Keep the same event's draft mounted through a pending/failed
                // read. A null event hides all controls; confirmed absence or
                // a different selected id retires the draft.
                <eventPublishingSupplyPanels.ExternalEventTakedownPanel
                  key={controller.selectedExternalEventId}
                  event={controller.selectedExternalEvent}
                  isSubmitting={controller.isTakingDownExternalEvent}
                  onTakedown={controller.takedownExternalEvent}
                />
              ) : null}
          </AdminEventSupplyReviewGrid>
        </Panel>
      </AdminDetailScreenStack>
    );
  }

  return null;
}

export const eventPublishingDirectoryPanels = {
  ExternalEventDetailView,
};
