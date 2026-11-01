import {AdminWorkbenchStack, EmptyState} from "../../../shared/ui/AdminPrimitives";
import {
  type EventPublishingController,
  useEventPublishingController,
} from "../controllers/useEventPublishingController";
import {useAdminFeedback} from "../../../shared/feedback/AdminFeedbackContext";
import {eventPublishingDirectoryPanels} from "./eventPublishingDirectoryPanels";
// Panels from "./eventPublishingDirectoryPanels.tsx" and sibling modules stay feature-private.

/**
 * The editors the event page's tabs host: a Catch event's canonical editor (Page), or an imported
 * event's source record and takedown (Takedown). The Events directory lists events itself.
 */
export function EventPublishingScreen({
  onBackToList,
  selectedEventId = null,
  selectedExternalEventId = null,
}: {
  onBackToList?: () => void;
  selectedEventId?: string | null;
  selectedExternalEventId?: string | null;
}) {
  const {setError: onError, setNotice: onNotice} = useAdminFeedback();
  const controller = useEventPublishingController({
    activeWorkspace: selectedExternalEventId ? "external" : "directory",
    onBackToList,
    onError,
    onNotice,
    onSelectExternalEventId: (eventId) => {
      if (!eventId) onBackToList?.();
    },
    selectedEventId,
    selectedExternalEventId,
  });
  return <EventPublishingWorkspace controller={controller} />;
}

export function EventPublishingWorkspace({
  controller,
}: {
  controller: EventPublishingController;
}) {
  return (
    <AdminWorkbenchStack compact>
      {controller.view === "detail" ? (
        <eventPublishingDirectoryPanels.EventDetailView controller={controller} />
      ) : controller.view === "external" && controller.selectedExternalEventId ? (
        <eventPublishingDirectoryPanels.ExternalEventDetailView controller={controller} />
      ) : (
        <EmptyState variant="workbench">Open an event from Events to edit it.</EmptyState>
      )}
    </AdminWorkbenchStack>
  );
}
