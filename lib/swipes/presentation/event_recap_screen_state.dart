import 'package:catch_dating_app/contexts/connections/domain/swipe_window.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_view_model.dart';

sealed class EventRecapScreenState {
  const EventRecapScreenState();
}

final class EventRecapLoading extends EventRecapScreenState {
  const EventRecapLoading();
}

final class EventRecapError extends EventRecapScreenState {
  const EventRecapError({required this.error, required this.retryIntent});

  final Object error;
  final EventRecapRetryIntent retryIntent;
}

final class EventRecapMissingEvent extends EventRecapScreenState {
  const EventRecapMissingEvent();
}

enum EventRecapProfileLookupStatus { loading, error, ready }

final class EventRecapReady extends EventRecapScreenState {
  const EventRecapReady({
    required this.hero,
    required this.attendeeRows,
    required this.attendeeIds,
    required this.profileLookupStatus,
    required this.profileLookupError,
    required this.selectedVibeIds,
    required this.openDeckIntent,
    required this.openDeckActionEnabled,
  });

  final EventRecapHeaderState hero;
  final List<EventRecapAttendeeRow> attendeeRows;
  final List<String> attendeeIds;
  final EventRecapProfileLookupStatus profileLookupStatus;
  final Object? profileLookupError;
  final Set<String> selectedVibeIds;
  final EventRecapOpenDeckIntent openDeckIntent;
  final bool openDeckActionEnabled;

  bool get hasAttendees => attendeeIds.isNotEmpty;
}

class EventRecapHeaderState {
  const EventRecapHeaderState({
    required this.kicker,
    required this.distanceLabel,
    required this.activityCheckedInLabel,
    required this.whenLabel,
    required this.timeLabel,
    required this.windowLabel,
  });

  final String kicker;
  final String distanceLabel;
  final String activityCheckedInLabel;
  final String whenLabel;
  final String timeLabel;
  final String windowLabel;

  factory EventRecapHeaderState.fromEvent({
    required Event event,
    required int checkedInCount,
    required DateTime now,
    required AppLocalizations l10n,
  }) {
    final closesAt = swipeWindowClosesAt(event);
    final windowLabel = closesAt.isAfter(now)
        ? l10n.swipesEventRecapScreenStateVisiblecopyCatchesOpenUntilTime(
            time: EventFormatters.time(closesAt),
          )
        : l10n.swipesEventRecapScreenStateVisiblecopyCatchWindowClosed;

    return EventRecapHeaderState(
      kicker: l10n.swipesEventRecapScreenStateKickerTouppercaseComplete(
        toUpperCase: event.title.toUpperCase(),
      ),
      distanceLabel: event.distanceLabel,
      activityCheckedInLabel: l10n
          .swipesEventRecapScreenStateVisiblecopyActivitysummarylabelCheckedincountCheckedIn(
            activitySummaryLabel: event.activitySummaryLabel,
            checkedInCount: checkedInCount,
          ),
      whenLabel: event.shortDateLabel,
      timeLabel: event.compactTimeRangeLabel,
      windowLabel: windowLabel,
    );
  }
}

class EventRecapAttendeeRow {
  const EventRecapAttendeeRow._({
    required this.attendeeId,
    required this.profile,
    required this.selected,
    required this.displayName,
    required this.semanticLabel,
    required this.tooltip,
  });

  factory EventRecapAttendeeRow.from({
    required String attendeeId,
    required PublicProfile? profile,
    required bool selected,
    required AppLocalizations l10n,
  }) {
    final displayName =
        profile?.name ?? l10n.swipesEventRecapScreenStateDisplaynameGuest;
    final tooltipName =
        profile?.name ?? l10n.swipesEventRecapScreenStateVisiblecopyGuest;
    return EventRecapAttendeeRow._(
      attendeeId: attendeeId,
      profile: profile,
      selected: selected,
      displayName: displayName,
      semanticLabel: displayName,
      tooltip: selected
          ? l10n.swipesEventRecapScreenStateTooltipRemoveTooltipname(
              tooltipName: tooltipName,
            )
          : l10n.swipesEventRecapScreenStateTooltipRememberTooltipname(
              tooltipName: tooltipName,
            ),
    );
  }

  final String attendeeId;
  final PublicProfile? profile;
  final bool selected;

  final String displayName;
  final String semanticLabel;
  final String tooltip;
}

class EventRecapRetryIntent {
  const EventRecapRetryIntent({required this.eventId});

  final String eventId;
}

class EventRecapOpenDeckIntent {
  const EventRecapOpenDeckIntent({
    required this.eventId,
    required this.selectedVibeIds,
  });

  final String eventId;
  final Set<String> selectedVibeIds;
}

EventRecapScreenState buildEventRecapScreenState({
  required String eventId,
  required CatchAsyncState<EventRecapViewModel?> viewModel,
  required CatchAsyncState<Map<String, PublicProfile>> rosterProfiles,
  required Set<String> selectedVibeIds,
  required AppLocalizations l10n,
  DateTime? now,
}) {
  return switch (viewModel.status) {
    CatchAsyncStatus.loading => const EventRecapLoading(),
    CatchAsyncStatus.error => EventRecapError(
      error: viewModel.error!,
      retryIntent: EventRecapRetryIntent(eventId: eventId),
    ),
    CatchAsyncStatus.data => _eventRecapDataState(
      viewModel: viewModel.value,
      rosterProfiles: rosterProfiles,
      selectedVibeIds: selectedVibeIds,
      l10n: l10n,
      now: now ?? DateTime.now(),
    ),
  };
}

EventRecapScreenState _eventRecapDataState({
  required EventRecapViewModel? viewModel,
  required CatchAsyncState<Map<String, PublicProfile>> rosterProfiles,
  required Set<String> selectedVibeIds,
  required DateTime now,
  required AppLocalizations l10n,
}) {
  if (viewModel == null) return const EventRecapMissingEvent();

  final selected = Set<String>.unmodifiable(selectedVibeIds);
  final resolvedProfiles =
      rosterProfiles.value ?? const <String, PublicProfile>{};
  final attendeeRows = rosterProfiles.status == CatchAsyncStatus.data
      ? [
          for (final attendeeId in viewModel.attendeeIds)
            EventRecapAttendeeRow.from(
              attendeeId: attendeeId,
              profile: resolvedProfiles[attendeeId],
              selected: selected.contains(attendeeId),
              l10n: l10n,
            ),
        ]
      : const <EventRecapAttendeeRow>[];
  final profileLookupStatus = switch (rosterProfiles.status) {
    CatchAsyncStatus.loading => EventRecapProfileLookupStatus.loading,
    CatchAsyncStatus.error => EventRecapProfileLookupStatus.error,
    CatchAsyncStatus.data => EventRecapProfileLookupStatus.ready,
  };

  return EventRecapReady(
    hero: EventRecapHeaderState.fromEvent(
      event: viewModel.event,
      checkedInCount: viewModel.checkedInCount,
      now: now,
      l10n: l10n,
    ),
    attendeeRows: List.unmodifiable(attendeeRows),
    attendeeIds: List.unmodifiable(viewModel.attendeeIds),
    profileLookupStatus: profileLookupStatus,
    profileLookupError: rosterProfiles.error,
    selectedVibeIds: selected,
    openDeckIntent: EventRecapOpenDeckIntent(
      eventId: viewModel.event.id,
      selectedVibeIds: selected,
    ),
    openDeckActionEnabled: true,
  );
}
