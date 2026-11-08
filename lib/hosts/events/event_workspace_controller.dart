import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_event_staff_repository.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_workspace_controller.g.dart';

/// One event of one organizer, the key of every event screen.
@immutable
class HostEventRequest {
  const HostEventRequest({required this.organizerId, required this.eventId});

  final String organizerId;
  final String eventId;

  @override
  bool operator ==(Object other) =>
      other is HostEventRequest &&
      other.organizerId == organizerId &&
      other.eventId == eventId;

  @override
  int get hashCode => Object.hash(organizerId, eventId);
}

/// The team members with access to the event's door, from the event staff
/// read. It is read once per visit; granting access happens elsewhere.
@riverpod
Future<HostEventStaffList> hostEventWorkspaceStaff(Ref ref, String eventId) =>
    ref.watch(hostEventStaffRepositoryProvider).listStaff(eventId);

/// The event workspace: the event, its roster insight view and attendees,
/// tonight's plan through their listeners; the door team from the staff
/// read; ticket sales from the cached host report.
@riverpod
HostEventWorkspaceState hostEventWorkspaceController(
  Ref ref,
  HostEventRequest request,
) {
  final eventValue = ref.watch(watchEventProvider(request.eventId));
  final event = eventValue.value;
  if (event == null) {
    return switch (eventValue) {
      AsyncValue(:final error?) => HostEventWorkspaceState(
        status: HostEventWorkspaceStatus.error,
        error: error,
      ),
      AsyncValue(hasValue: true) => const HostEventWorkspaceState(
        status: HostEventWorkspaceStatus.missing,
      ),
      _ => const HostEventWorkspaceState.loading(),
    };
  }
  if (event.organizerId != request.organizerId) {
    return const HostEventWorkspaceState(
      status: HostEventWorkspaceStatus.missing,
    );
  }
  final roster = ref.watch(hostEventRosterInsightsProvider(event.id)).value;
  final attendees = ref.watch(watchEventAttendeesProvider(event.id)).value;
  final plan = ref.watch(watchEventSuccessPlanProvider(event.id)).value;
  final staff = catchAsyncStateFromAsyncValue(
    ref.watch(hostEventWorkspaceStaffProvider(event.id)),
  );
  return HostEventWorkspaceState(
    status: HostEventWorkspaceStatus.ready,
    event: event,
    newFaces:
        roster == null ||
            roster.sourceCoverage == HostRosterInsightCoverage.missing
        ? null
        : roster.rows
              .where(
                (row) =>
                    row.signals.contains(HostRosterInsightSignal.firstTime),
              )
              .length,
    people: [
      for (final attendee in (attendees ?? const []).take(3))
        attendee.displayName,
    ],
    planSteps: plan == null
        ? null
        : EventSuccessRuntime(
            plan: plan,
            event: event,
            now: event.startTime,
          ).runOfShowSteps.length,
    door: [
      for (final member
          in staff.value?.members ?? const <HostEventStaffMember>[])
        if (member.status == HostEventStaffStatus.active) member.displayName,
    ],
    doorChecked: staff.value != null || staff.hasError,
    ticketSalesMinor: _ticketSales(ref, event),
  );
}

/// The event's ticket sales from the host report, read through its cache;
/// null while it is first read or when the report does not count them.
num? _ticketSales(Ref ref, Event event) {
  final session = ref.watch(authenticatedSessionProvider).value;
  if (session == null) return null;
  final report = ref
      .watch(
        hostAnalyticsProvider(
          HostAnalyticsRead(
            session,
            HostAnalyticsQuery(
              organizerId: event.organizerId,
              eventId: event.id,
              rangePreset: HostAnalyticsRangePreset.twelveMonths,
            ),
          ),
        ),
      )
      .value;
  final card = report?.data.summaryCards
      .where((card) => card.id == HostAnalyticsMetricIds.revenue)
      .firstOrNull;
  if (card == null || card.status == HostAnalyticsMetricStatus.missing) {
    return null;
  }
  return card.value;
}

/// Starts the workspace reads again after one failed.
void retryHostEventWorkspaceReads(WidgetRef ref, HostEventRequest request) {
  ref.invalidate(watchEventProvider(request.eventId));
  ref.invalidate(hostEventWorkspaceStaffProvider(request.eventId));
}
