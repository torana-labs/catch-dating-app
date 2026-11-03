import {AdminWorkbenchStack, EmptyState} from "../../../shared/ui/AdminPrimitives";
import {
  type EventPublishingController,
  useEventPublishingController,
} from "../controllers/useEventPublishingController";
import {useAdminFeedback} from "../../../shared/feedback/AdminFeedbackContext";
import {eventPublishingDirectoryPanels} from "./eventPublishingDirectoryPanels";
// Panels from "./eventPublishingDirectoryPanels.tsx" and sibling modules stay feature-private.

/** An imported event's source record and takedown, for the event page's Takedown tab. */
export function EventPublishingScreen({
  onBackToList,
  selectedExternalEventId,
}: {
  onBackToList?: () => void;
  selectedExternalEventId: string;
}) {
  const {setError: onError, setNotice: onNotice} = useAdminFeedback();
  const controller = useEventPublishingController({
    onError,
    onNotice,
    onSelectExternalEventId: (eventId) => {
      if (!eventId) onBackToList?.();
    },
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
      {controller.selectedExternalEventId ? (
        <eventPublishingDirectoryPanels.ExternalEventDetailView controller={controller} />
      ) : (
        <EmptyState variant="workbench">Open an imported event from Events.</EmptyState>
      )}
    </AdminWorkbenchStack>
  );
}
