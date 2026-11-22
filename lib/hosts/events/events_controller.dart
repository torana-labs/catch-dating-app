import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/programmes/data/organizer_program_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/events/events_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'events_controller.g.dart';

/// Which organizer the Events tab lists, and the day it treats as today.
@immutable
class HostEventsRequest {
  HostEventsRequest({required this.organizerId, required DateTime now})
    : day = DateTime(now.year, now.month, now.day);

  final String organizerId;

  /// The start of today: coming events end after it, past events before it.
  final DateTime day;

  @override
  bool operator ==(Object other) =>
      other is HostEventsRequest &&
      other.organizerId == organizerId &&
      other.day == day;

  @override
  int get hashCode => Object.hash(organizerId, day);
}

/// The organizer's programmes for the Events tab, live from
/// `organizerProgramViews` with their counts (#2306), archived ones left
/// out. A failed read leaves the Programmes section out rather than failing
/// Events.
@riverpod
List<OrganizerProgramListRow> hostEventsProgrammes(
  Ref ref,
  String organizerId,
) {
  final rows = ref.watch(organizerProgramRowsStreamProvider(organizerId)).value;
  return List<OrganizerProgramListRow>.unmodifiable([
    // The tab lists one page of programmes.
    for (final row in (rows ?? const <OrganizerProgramListRow>[]).take(
      OrganizerProgramViewsRepository.pageSize,
    ))
      if (!row.isArchived) row,
  ]);
}

/// The Events tab: the coming events and the drafts through their
/// listeners, past events through the events read owner, and the
/// programmes. The listeners keep Upcoming and the drafts current; the
/// screen calls [refreshHostEventsHistory] when Create or a workspace
/// returns, so an event published or cancelled there moves to Past.
@riverpod
HostEventsState hostEventsController(Ref ref, HostEventsRequest request) {
  final upcomingValue = ref.watch(
    watchActiveEventsForOrganizerProvider(
      ActiveOrganizerEventsQuery(
        organizerId: request.organizerId,
        day: request.day,
      ),
    ),
  );
  final upcoming = upcomingValue.value;
  if (upcoming == null) {
    return switch (upcomingValue) {
      AsyncValue(:final error?) => HostEventsState(
        status: HostEventsStatus.error,
        error: error,
      ),
      _ => const HostEventsState.loading(),
    };
  }
  final session = ref.watch(authenticatedSessionProvider).value;
  final timeline = session == null
      ? null
      : catchAsyncStateFromAsyncValue(
          ref.watch(
            hostEventsTimelineControllerProvider(
              HostEventsTimelineRequest(
                organizerId: request.organizerId,
                sessionBoundary: request.day,
                session: session,
              ),
            ),
          ),
        );
  final history = timeline?.value;
  final draftsValue = catchAsyncStateFromAsyncValue(
    ref.watch(hostEventDraftsProvider(request.organizerId, request.day)),
  );
  final drafts = draftsValue.value;
  final programmes = ref.watch(
    hostEventsProgrammesProvider(request.organizerId),
  );
  final past = <Event>[...?history?.pastEvents, ...?history?.cancelledEvents]
    ..sort((a, b) => b.startTime.compareTo(a.startTime));
  return HostEventsState(
    status: HostEventsStatus.ready,
    upcoming: upcoming,
    drafts: List.unmodifiable(drafts?.events ?? const []),
    past: List<Event>.unmodifiable(past),
    programmes: programmes,
    historyLoading:
        history == null && timeline?.error == null ||
        (history?.loadingMorePast ?? false) ||
        drafts == null && draftsValue.error == null,
    historyFailed:
        timeline?.error != null ||
        history?.pastError != null ||
        draftsValue.error != null && drafts == null,
  );
}

/// Reads drafts and past events again, after Create or an event workspace
/// returns to the tab.
void refreshHostEventsHistory(WidgetRef ref) =>
    ref.invalidate(hostEventsTimelineControllerProvider);

/// Starts the Events reads again after one failed.
void retryHostEventsReads(WidgetRef ref, HostEventsRequest request) {
  ref.invalidate(
    watchActiveEventsForOrganizerProvider(
      ActiveOrganizerEventsQuery(
        organizerId: request.organizerId,
        day: request.day,
      ),
    ),
  );
  ref.invalidate(hostEventsTimelineControllerProvider);
  ref.invalidate(hostEventDraftsProvider(request.organizerId, request.day));
  ref.invalidate(organizerProgramRowsStreamProvider(request.organizerId));
}
