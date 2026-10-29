import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/bookings/domain/host_attendance_window.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';

enum HostEventManageSection { setup, guests, live, report }

/// The one primary Host workspace appropriate for the event right now.
///
/// Route aliases can still request legacy Setup / Guests / Live / Report
/// destinations, but lifecycle owns the rendered workspace. Guests becomes an
/// edge drawer instead of a competing top-level screen.
enum HostEventWorkspacePhase { preparation, runtime, recap }

HostEventWorkspacePhase hostEventWorkspacePhaseFor({
  required Event event,
  required DateTime now,
}) {
  final attendanceState = hostEventAttendanceStateFor(event: event, now: now);
  if (event.isCancelled || !now.isBefore(event.endTime)) {
    return HostEventWorkspacePhase.recap;
  }
  if (attendanceState == HostEventAttendanceState.open) {
    return HostEventWorkspacePhase.runtime;
  }
  return HostEventWorkspacePhase.preparation;
}

class HostEventManageScreenState {
  const HostEventManageScreenState({
    required this.requestedSection,
    required this.phase,
    required this.eventTitle,
    required this.openRosterInitially,
  });

  factory HostEventManageScreenState.resolve({
    required Event event,
    required HostEventManageSection requestedSection,
    required DateTime now,
  }) {
    return HostEventManageScreenState(
      requestedSection: requestedSection,
      phase: hostEventWorkspacePhaseFor(event: event, now: now),
      eventTitle: hostManageEventTitle(event),
      openRosterInitially: requestedSection == HostEventManageSection.guests,
    );
  }

  final HostEventManageSection requestedSection;
  final HostEventWorkspacePhase phase;
  final String eventTitle;
  final bool openRosterInitially;
}

enum HostEventManageActionIntent { editEvent, cancelEvent, deleteEvent }

enum HostEventManageActionDestination {
  editEventRoute,
  cancelConfirmation,
  deleteConfirmation,
}

class HostEventManageActionEffect {
  const HostEventManageActionEffect({
    required this.destination,
    required this.event,
    this.pathParameters = const <String, String>{},
  });

  factory HostEventManageActionEffect.resolve({
    required HostEventManageActionIntent intent,
    required Event event,
  }) {
    return switch (intent) {
      HostEventManageActionIntent.editEvent => HostEventManageActionEffect(
        destination: HostEventManageActionDestination.editEventRoute,
        event: event,
        pathParameters: {'clubId': event.clubId, 'eventId': event.id},
      ),
      HostEventManageActionIntent.cancelEvent => HostEventManageActionEffect(
        destination: HostEventManageActionDestination.cancelConfirmation,
        event: event,
      ),
      HostEventManageActionIntent.deleteEvent => HostEventManageActionEffect(
        destination: HostEventManageActionDestination.deleteConfirmation,
        event: event,
      ),
    };
  }

  final HostEventManageActionDestination destination;
  final Event event;
  final Map<String, String> pathParameters;
}

class HostEventActionDisplayState {
  const HostEventActionDisplayState({
    required this.hasKnownActivity,
    required this.cancelEventPending,
    required this.deleteEventPending,
    required this.isMutating,
    required this.showEditAction,
    required this.showCancelledState,
    required this.showCancelAction,
    required this.showDeleteAction,
    required this.cancelDetail,
    required this.deleteDetail,
  });

  factory HostEventActionDisplayState.resolve({
    required Event event,
    required EventParticipationRoster? roster,
    required AppLocalizations l10n,
    required bool cancelEventPending,
    required bool deleteEventPending,
  }) {
    final hasKnownActivity =
        hostManageBookedCount(event, roster) > 0 ||
        hostManageCheckedInCount(event, roster) > 0 ||
        hostManageWaitlistedCount(event, roster) > 0;
    final isMutating = cancelEventPending || deleteEventPending;
    final isCancelled = event.isCancelled;
    return HostEventActionDisplayState(
      hasKnownActivity: hasKnownActivity,
      cancelEventPending: cancelEventPending,
      deleteEventPending: deleteEventPending,
      isMutating: isMutating,
      showEditAction: !isCancelled,
      showCancelledState: isCancelled,
      showCancelAction: !isCancelled,
      showDeleteAction: !isCancelled && !hasKnownActivity,
      cancelDetail: cancelEventPending
          ? l10n.hostsEventActionCancelling
          : l10n.hostsEventActionCancelDetail,
      deleteDetail: deleteEventPending
          ? l10n.hostsEventActionDeleting
          : l10n.hostsEventActionDeleteDetail,
    );
  }

  final bool hasKnownActivity;
  final bool cancelEventPending;
  final bool deleteEventPending;
  final bool isMutating;
  final bool showEditAction;
  final bool showCancelledState;
  final bool showCancelAction;
  final bool showDeleteAction;
  final String cancelDetail;
  final String deleteDetail;
}

class HostReportSummaryDisplayState {
  const HostReportSummaryDisplayState({
    required this.grossEstimateInPaise,
    required this.checkedInCount,
    required this.noShowCount,
    required this.waitlistCount,
    required this.currencyCode,
  });

  factory HostReportSummaryDisplayState.resolve({
    required int totalCount,
    required int checkedInCount,
    required int waitlistCount,
    required int priceInPaise,
    required String currencyCode,
  }) {
    final noShowCount = totalCount - checkedInCount;
    final grossEstimateInPaise = totalCount * priceInPaise;
    return HostReportSummaryDisplayState(
      grossEstimateInPaise: grossEstimateInPaise,
      checkedInCount: checkedInCount,
      noShowCount: noShowCount,
      waitlistCount: waitlistCount,
      currencyCode: currencyCode,
    );
  }

  final int grossEstimateInPaise;
  final int checkedInCount;
  final int noShowCount;
  final int waitlistCount;
  final String currencyCode;

  String summary(AppLocalizations l10n) => l10n
      .hostsHostEventManageScreenStateVisiblecopyPriceinpaiseGrossEstimateCheckedincount(
        priceInPaise: EventFormatters.priceInPaise(
          grossEstimateInPaise,
          currencyCode: currencyCode,
        ),
        checkedInCount: checkedInCount,
        noShowCount: noShowCount,
        waitlistCount: waitlistCount,
      );
}

extension HostEventManageSectionLabel on HostEventManageSection {
  String label(AppLocalizations l10n) {
    return switch (this) {
      HostEventManageSection.setup =>
        l10n.hostsHostEventManageScreenStateLabelSetup,
      HostEventManageSection.guests =>
        l10n.hostsHostEventManageScreenStateLabelGuests,
      HostEventManageSection.live =>
        l10n.hostsHostEventManageScreenStateLabelLive,
      HostEventManageSection.report =>
        l10n.hostsHostEventManageScreenStateLabelReport,
    };
  }
}

String hostManageEventTitle(Event event) {
  if (event.eventFormat.isDistanceBased) return event.title;
  final weekday = EventFormatters.longWeekday(event.startTime);
  return '$weekday ${event.eventFormat.eventTitleLabel}';
}

int hostManageBookedCount(Event event, EventParticipationRoster? roster) {
  final rosterCount = roster?.bookedCount;
  if (rosterCount == null) return event.signedUpCount;
  return rosterCount > event.signedUpCount ? rosterCount : event.signedUpCount;
}

int hostManageCheckedInCount(Event event, EventParticipationRoster? roster) {
  final rosterCount = roster?.checkedInCount;
  if (rosterCount == null) return event.attendedCount;
  return rosterCount > event.attendedCount ? rosterCount : event.attendedCount;
}

int hostManageWaitlistedCount(Event event, EventParticipationRoster? roster) {
  final rosterCount = roster?.waitlistedCount;
  if (rosterCount == null) return event.waitlistCount;
  return rosterCount > event.waitlistCount ? rosterCount : event.waitlistCount;
}

bool hostShowsCapacityNotice(Event event) {
  if (event.isFull) return true;
  return event.effectiveWaitlistedCohortCounts.values.any((count) => count > 0);
}

String hostEventManageLifecycleLabel(
  AppLocalizations l10n, {
  required Event event,
  required HostEventWorkspacePhase phase,
}) => event.isCancelled
    ? l10n.hostsHostEventManageWorkspaceCancelled
    : switch (phase) {
        HostEventWorkspacePhase.preparation =>
          l10n.hostsHostEventManageWorkspacePreparation,
        HostEventWorkspacePhase.runtime =>
          l10n.hostsHostEventManageWorkspaceRuntime,
        HostEventWorkspacePhase.recap =>
          l10n.hostsHostEventManageWorkspaceRecap,
      };
