import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/programmes/data/organizer_program_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_inventory_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/events/events_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
import 'package:catch_platform/errors/app_exception.dart';
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

/// The organizer's programmes, live from `organizerProgramViews` (#1339).
@riverpod
Stream<List<Map<Object?, Object?>>> hostEventsProgrammeViews(
  Ref ref,
  String organizerId,
) async* {
  final uid = await ref.watch(uidProvider.future);
  if (uid == null || uid.isEmpty) {
    throw const SignInRequiredException('view your programs');
  }
  // Rows the account's access views admit (creator or organiser manager).
  yield* ref
      .watch(organizerProgramViewsRepositoryProvider)
      .watchProgrammes(organizerId, uid);
}

/// The first `listOrganizerPrograms` page, read for the guest, flying-in and
/// replied counts that stay on that callable (server-trust, #1339).
@riverpod
Future<OrganizerProgramInventoryPage> hostEventsProgrammeCounts(
  Ref ref,
  String organizerId,
) => ref.watch(programInventoryRepositoryProvider).listPage(organizerId);

/// The organizer's programmes for the Events tab: the rows paint from the
/// programme views first, and the counts fill in when the callable returns.
/// A creator who manages nothing lists only through the callable, so its rows
/// stand in when the views read fails. A failed read leaves the Programmes
/// section out rather than failing Events.
@riverpod
List<OrganizerProgramListRow> hostEventsProgrammes(
  Ref ref,
  String organizerId,
) {
  final views = ref.watch(hostEventsProgrammeViewsProvider(organizerId));
  final counted = ref
      .watch(hostEventsProgrammeCountsProvider(organizerId))
      .value
      ?.programs;
  final countsById = {
    for (final row in counted ?? const <OrganizerProgramListRow>[])
      row.programId: row,
  };
  final List<OrganizerProgramListRow> rows;
  try {
    rows = switch (views) {
      AsyncValue(:final value?) => [
        // The callable's first page holds 50 rows; the tab lists as many.
        for (final view in value.take(OrganizerProgramViewsRepository.pageSize))
          _programmeRow(view, countsById),
      ],
      AsyncValue(hasError: true) => counted ?? const [],
      _ => const [],
    };
  } on FormatException {
    return const [];
  }
  return List<OrganizerProgramListRow>.unmodifiable(
    rows.where((program) => !program.isArchived),
  );
}

OrganizerProgramListRow _programmeRow(
  Map<Object?, Object?> view,
  Map<String, OrganizerProgramListRow> countsById,
) {
  final counts = countsById[view['programId']];
  return OrganizerProgramListRow.fromMap({
    ...view,
    if (counts != null) ...{
      'guestCount': counts.guestCount,
      'flyingInCount': counts.flyingInCount,
      'repliedShare': counts.repliedShare,
      'billedMinor': counts.billedMinor,
    },
  });
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
  ref.invalidate(hostEventsProgrammeViewsProvider(request.organizerId));
  ref.invalidate(hostEventsProgrammeCountsProvider(request.organizerId));
}
