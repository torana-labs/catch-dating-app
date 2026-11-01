import {ArrowLeft, CalendarDays, ExternalLink, FileWarning, RefreshCw, Search} from "lucide-react";
import {
  AdminButton,
  AdminDetailScreenStack,
  AdminDirectoryScreenStack,
  AdminEventSupplyReviewGrid,
  AdminMetricCard,
  AdminMetricGrid,
  AdminStatusGrid,
  AdminToolbar,
  EmptyState,
  PageHeader,
  Panel,
  SearchField,
  SegmentedControl,
  StateRow,
} from "../../../shared/ui/AdminPrimitives";
import {
  type ExternalEventSupplyFilter,
  type EventPublishingController,
  type EventPublishingFilter,
} from "../controllers/useEventPublishingController";
import {eventPublishingSupplyPanels} from "./eventPublishingSupplyPanels";
import {eventPublishingEditorPanels} from "./eventPublishingEditorPanels";

function EventDetailView({
  controller,
}: {
  controller: EventPublishingController;
}) {
  const title = controller.event?.title || controller.eventId || "Event";
  return (
    <AdminDetailScreenStack>
      <PageHeader
        actions={
          <AdminButton
            icon={<ArrowLeft size={15} strokeWidth={1.9} />}
            onClick={controller.backToList}
          >
            Directory
          </AdminButton>
        }
        title={title}
      />
      <EventDetailSummary controller={controller} />
      <eventPublishingEditorPanels.EventEditor
        diffRows={controller.diffRows}
        event={controller.event}
        eventId={controller.eventId}
        form={controller.form}
        isDetailLoading={controller.isDetailLoading}
        isSaving={controller.isSaving}
        validationIssues={controller.validationIssues}
        onEventIdChange={controller.setEventId}
        onFormChange={controller.setForm}
        onLoad={() => void controller.selectEvent(controller.eventId)}
        onSave={() => void controller.save()}
      />
    </AdminDetailScreenStack>
  );
}

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

function EventDetailSummary({
  controller,
}: {
  controller: EventPublishingController;
}) {
  const event = controller.event;
  const capacityFill = event && event.capacityLimit > 0 ?
    Math.round((event.bookedCount / event.capacityLimit) * 100) :
    null;
  const checkInRate = event && event.bookedCount > 0 ?
    Math.round((event.checkedInCount / event.bookedCount) * 100) :
    null;
  return (
    <Panel
      span={2}
      icon={<CalendarDays size={18} strokeWidth={1.9} />}
      title="Event status"
      action={event?.status ?? "Not loaded"}
    >
      <AdminMetricGrid ariaLabel="Backed event performance">
        <AdminMetricCard
          label="Capacity fill"
          value={capacityFill === null ? "—" : `${capacityFill}%`}
        />
        <AdminMetricCard
          label="Checked in"
          value={event ? `${event.checkedInCount} (${checkInRate ?? 0}%)` : "—"}
        />
        <AdminMetricCard
          label="Waitlist"
          value={event?.waitlistedCount ?? "—"}
        />
        <AdminMetricCard
          label="Listed price"
          value={event ? eventPublishingEditorPanels.formatMoney(event) : "—"}
        />
      </AdminMetricGrid>
      <AdminStatusGrid>
        <StateRow label="Document" value={event?.eventId ?? controller.eventId} />
        <StateRow label="Organizer" value={event?.organizerName} />
        <StateRow label="City" value={event?.discovery.citySlug} />
        <StateRow label="Venue" value={event?.meetingPoint} />
        <StateRow label="Starts" value={eventPublishingEditorPanels.formatDateTime(event?.startTime)} />
        <StateRow label="Bookings" value={event ? `${event.bookedCount}/${event.capacityLimit}` : null} />
        <StateRow label="Search" value={event?.searchIndexStatus} />
        <StateRow
          label="Changes"
          value={`${controller.diffRows.length} pending`}
        />
      </AdminStatusGrid>
    </Panel>
  );
}

export const eventPublishingDirectoryPanels = {
  EventDetailView,
  ExternalEventDetailView,
};
