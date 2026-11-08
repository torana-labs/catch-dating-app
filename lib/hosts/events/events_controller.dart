import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_inventory_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/events/events_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
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

/// The organizer's programmes, the first page of the programmes read. A
/// failed read leaves the Programmes section out rather than failing Events.
@riverpod
Future<List<OrganizerProgramListRow>> hostEventsProgrammes(
  Ref ref,
  String organizerId,
) async {
  final page = await ref
      .watch(programInventoryRepositoryProvider)
      .listPage(organizerId);
  return List<OrganizerProgramListRow>.unmodifiable(
    page.programs.where((program) => !program.isArchived),
  );
}

/// The Events tab: the coming events through their listener, drafts and
/// past events through the events read owner, and the programmes. Nothing
/// here refreshes on return; the listener keeps Upcoming current.
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
      : ref.watch(
          hostEventsTimelineControllerProvider(
            HostEventsTimelineRequest(
              organizerId: request.organizerId,
              sessionBoundary: request.day,
              session: session,
            ),
          ),
        );
  final history = timeline?.value;
  final programmes =
      ref.watch(hostEventsProgrammesProvider(request.organizerId)).value ??
      const <OrganizerProgramListRow>[];
  final past = <Event>[...?history?.pastEvents, ...?history?.cancelledEvents]
    ..sort((a, b) => b.startTime.compareTo(a.startTime));
  return HostEventsState(
    status: HostEventsStatus.ready,
    upcoming: upcoming,
    drafts: List.unmodifiable(history?.unpublishedUpcoming ?? const []),
    past: List<Event>.unmodifiable(past),
    programmes: programmes,
    historyLoading:
        history == null && !(timeline?.hasError ?? false) ||
        (history?.loadingMorePast ?? false),
    historyFailed: (timeline?.hasError ?? false) || history?.pastError != null,
  );
}

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
  ref.invalidate(hostEventsProgrammesProvider(request.organizerId));
}
