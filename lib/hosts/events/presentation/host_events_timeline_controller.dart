import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_view_reads.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_summary_reads.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_platform/firebase/cursor_page.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_events_timeline_controller.g.dart';

@riverpod
PrivateEventSetupRepository privateEventSetupTimelineRepository(Ref ref) {
  ref.watch(authenticatedSessionProvider);
  return PrivateEventSetupRepository(
    ref.read(firebaseFunctionsProvider),
    summaries: HostEventSummaryReads(
      HostSummaryReader(
        ref.watch(firebaseFirestoreProvider),
        actorId: () => ref.read(firebaseAuthProvider).currentUser?.uid,
      ),
    ),
    views: ref.watch(hostEventSetupViewReadsProvider),
  );
}

/// The organizer's unpublished events starting on or after [from], soonest
/// first, as a listener: a draft saved, published or cancelled in Create or
/// a workspace shows on return without a reread.
@riverpod
Stream<HostEventDraftWindow> hostEventDrafts(
  Ref ref,
  String organizerId,
  DateTime from,
) => ref
    .watch(privateEventSetupTimelineRepositoryProvider)
    .watchDrafts(organizerId: organizerId, from: from);

@immutable
class HostEventsTimelineRequest {
  const HostEventsTimelineRequest({
    required this.organizerId,
    required this.sessionBoundary,
    required this.session,
  });

  final String organizerId;
  final DateTime sessionBoundary;
  final AuthenticatedSession? session;

  @override
  bool operator ==(Object other) =>
      other is HostEventsTimelineRequest &&
      other.organizerId == organizerId &&
      other.sessionBoundary == sessionBoundary &&
      identical(other.session, session);

  @override
  int get hashCode => Object.hash(organizerId, sessionBoundary, session);
}

@immutable
class HostEventsTimelineData {
  const HostEventsTimelineData({
    required this.activeEvents,
    required this.pastEvents,
    required this.activeCursor,
    required this.pastCursor,
    required this.hasMoreActive,
    required this.hasMorePast,
    this.cancelledEvents = const <Event>[],
    this.cancelledCursor,
    this.hasMoreCancelled = false,
    this.historyInitialized = true,
    this.loadingMoreActive = false,
    this.loadingMorePast = false,
    this.activeLoadMoreError,
    this.pastError,
    this.pastStackTrace,
  });

  final List<Event> activeEvents;
  final List<Event> pastEvents;
  final List<Event> cancelledEvents;
  final PageCursor<Event>? activeCursor;
  final PageCursor<Event>? pastCursor;
  final PageCursor<Event>? cancelledCursor;
  final bool hasMoreActive;
  final bool hasMorePast;
  final bool hasMoreCancelled;
  final bool historyInitialized;
  final bool loadingMoreActive;
  final bool loadingMorePast;
  final Object? activeLoadMoreError;
  final Object? pastError;
  final StackTrace? pastStackTrace;

  List<Event> get allEvents {
    final byId = <String, Event>{
      for (final event in pastEvents) event.id: event,
      for (final event in activeEvents) event.id: event,
    };
    return List.unmodifiable(byId.values);
  }

  bool get hasMoreUpcoming => hasMoreActive;
  bool get hasMoreHistory => hasMorePast || hasMoreCancelled;
  bool get canLoadMoreActive => hasMoreUpcoming && !loadingMoreActive;
  bool get canLoadMorePast =>
      historyInitialized && hasMoreHistory && !loadingMorePast;

  HostEventsTimelineData copyWith({
    List<Event>? activeEvents,
    List<Event>? pastEvents,
    List<Event>? cancelledEvents,
    PageCursor<Event>? activeCursor,
    bool clearActiveCursor = false,
    PageCursor<Event>? pastCursor,
    bool clearPastCursor = false,
    PageCursor<Event>? cancelledCursor,
    bool clearCancelledCursor = false,
    bool? hasMoreActive,
    bool? hasMorePast,
    bool? hasMoreCancelled,
    bool? historyInitialized,
    bool? loadingMoreActive,
    bool? loadingMorePast,
    Object? activeLoadMoreError,
    bool clearActiveLoadMoreError = false,
    Object? pastError,
    StackTrace? pastStackTrace,
    bool clearPastError = false,
  }) => HostEventsTimelineData(
    activeEvents: activeEvents ?? this.activeEvents,
    pastEvents: pastEvents ?? this.pastEvents,
    cancelledEvents: cancelledEvents ?? this.cancelledEvents,
    activeCursor: clearActiveCursor ? null : activeCursor ?? this.activeCursor,
    pastCursor: clearPastCursor ? null : pastCursor ?? this.pastCursor,
    cancelledCursor: clearCancelledCursor
        ? null
        : cancelledCursor ?? this.cancelledCursor,
    hasMoreActive: hasMoreActive ?? this.hasMoreActive,
    hasMorePast: hasMorePast ?? this.hasMorePast,
    hasMoreCancelled: hasMoreCancelled ?? this.hasMoreCancelled,
    historyInitialized: historyInitialized ?? this.historyInitialized,
    loadingMoreActive: loadingMoreActive ?? this.loadingMoreActive,
    loadingMorePast: loadingMorePast ?? this.loadingMorePast,
    activeLoadMoreError: clearActiveLoadMoreError
        ? null
        : activeLoadMoreError ?? this.activeLoadMoreError,
    pastError: clearPastError ? null : pastError ?? this.pastError,
    pastStackTrace: clearPastError
        ? null
        : pastStackTrace ?? this.pastStackTrace,
  );
}

@riverpod
class HostEventsTimelineController extends _$HostEventsTimelineController {
  int _generation = 0;

  @override
  Future<HostEventsTimelineData> build(
    HostEventsTimelineRequest request,
  ) async {
    final generation = ++_generation;
    ref.onDispose(() => ++_generation);
    // Account changes must invalidate published reads even when private setup
    // is disabled. Capture every dependency before starting asynchronous work.
    final identity = switch (ref.watch(authenticatedSessionProvider)) {
      AsyncValue(isLoading: true) => null,
      AsyncData(:final value) => value,
      AsyncError(:final error, :final stackTrace)
          when request.session == null =>
        Error.throwWithStackTrace(error, stackTrace),
      AsyncLoading() || AsyncError() => null,
    };
    if (identity == null || !identical(request.session, identity)) {
      // A caller switches families when its opaque session changes. The old
      // family may briefly retain a listener, but must start no new reads.
      return Completer<HostEventsTimelineData>().future;
    }
    final previous = state.value;
    final repository = ref.watch(eventRepositoryProvider);
    final active = _capture(
      () => repository.fetchActiveEventsPage(
        organizerId: request.organizerId,
        sessionBoundary: request.sessionBoundary,
      ),
    );
    final past = _capture(
      () => repository.fetchPastEventsPage(
        organizerId: request.organizerId,
        sessionBoundary: request.sessionBoundary,
      ),
    );
    final cancelled = _capture(
      () =>
          repository.fetchCancelledEventsPage(organizerId: request.organizerId),
    );

    // Reads run independently, but failures retain the source order: active,
    // past, cancelled. Every started future already has an error handler.
    final activePage = _valueOrThrow(await active);
    if (ref.mounted &&
        generation == _generation &&
        identical(
          request.session,
          ref.read(authenticatedSessionProvider).asData?.value,
        )) {
      unawaited(_finishInitialHistory(generation, future, past, cancelled));
    }
    return _initialState(activePage, previous).copyWith(loadingMorePast: true);
  }

  Future<void> _finishInitialHistory(
    int generation,
    Future<HostEventsTimelineData> initial,
    Future<AsyncValue<CursorPage<Event, PageCursor<Event>>>> past,
    Future<AsyncValue<CursorPage<Event, PageCursor<Event>>>> cancelled,
  ) async {
    try {
      // build owns the first AsyncData. History must not be overwritten by its
      // later completion, including when every repository answers immediately.
      await initial;
      final pastResult = await past;
      final cancelledResult = await cancelled;
      final latest = _currentData(generation);
      if (latest == null) return;
      final failure = pastResult.hasError ? pastResult : cancelledResult;
      state = AsyncData(
        _appendPast(
          latest.copyWith(
            pastEvents: pastResult.hasError ? null : const [],
            cancelledEvents: cancelledResult.hasError ? null : const [],
          ),
          pastResult.asData?.value,
          cancelledResult.asData?.value,
        ).copyWith(
          loadingMorePast: false,
          historyInitialized: !failure.hasError,
          pastError: failure.error,
          pastStackTrace: failure.stackTrace,
        ),
      );
    } on Object catch (error, stackTrace) {
      if (_currentData(generation) == null) return;
      state = AsyncError(error, stackTrace);
    }
  }

  Future<void> loadMoreActive() async {
    if (!ref.mounted) return;
    final generation = _generation;
    final current = _currentData(generation);
    if (current == null || !current.canLoadMoreActive) return;
    final request = this.request;
    final repository = ref.read(eventRepositoryProvider);
    state = AsyncData(
      current.copyWith(loadingMoreActive: true, clearActiveLoadMoreError: true),
    );
    try {
      final page = current.hasMoreActive
          ? await repository.fetchActiveEventsPage(
              organizerId: request.organizerId,
              sessionBoundary: request.sessionBoundary,
              startAfter: current.activeCursor,
            )
          : null;
      final latest = _currentData(generation);
      if (latest == null) return;
      state = AsyncData(
        _appendActive(latest, page).copyWith(loadingMoreActive: false),
      );
    } on Object catch (error) {
      final latest = _currentData(generation);
      if (latest == null) return;
      state = AsyncData(
        latest.copyWith(loadingMoreActive: false, activeLoadMoreError: error),
      );
    }
  }

  Future<void> loadMorePast() async {
    if (!ref.mounted) return;
    final generation = _generation;
    final current = _currentData(generation);
    if (current == null || !current.canLoadMorePast) return;
    final request = this.request;
    final repository = ref.read(eventRepositoryProvider);
    state = AsyncData(
      current.copyWith(loadingMorePast: true, clearPastError: true),
    );
    try {
      final page = current.hasMorePast
          ? await repository.fetchPastEventsPage(
              organizerId: request.organizerId,
              sessionBoundary: request.sessionBoundary,
              startAfter: current.pastCursor,
            )
          : null;
      if (_currentData(generation) == null) return;
      final cancelledPage = current.hasMoreCancelled
          ? await repository.fetchCancelledEventsPage(
              organizerId: request.organizerId,
              startAfter: current.cancelledCursor,
            )
          : null;
      final latest = _currentData(generation);
      if (latest == null) return;
      state = AsyncData(
        _appendPast(
          latest,
          page,
          cancelledPage,
        ).copyWith(loadingMorePast: false),
      );
    } on Object catch (error, stackTrace) {
      final latest = _currentData(generation);
      if (latest == null) return;
      state = AsyncData(
        latest.copyWith(
          loadingMorePast: false,
          pastError: error,
          pastStackTrace: stackTrace,
        ),
      );
    }
  }

  Future<void> retryPast() async {
    if (!ref.mounted) return;
    final generation = _generation;
    final current = _currentData(generation);
    if (current == null || current.loadingMorePast) return;
    final request = this.request;
    final repository = ref.read(eventRepositoryProvider);
    if (current.historyInitialized && current.hasMoreHistory) {
      await loadMorePast();
      return;
    }
    state = AsyncData(
      current.copyWith(loadingMorePast: true, clearPastError: true),
    );
    final past = _capture(
      () => repository.fetchPastEventsPage(
        organizerId: request.organizerId,
        sessionBoundary: request.sessionBoundary,
      ),
    );
    final cancelled = _capture(
      () =>
          repository.fetchCancelledEventsPage(organizerId: request.organizerId),
    );
    final pastResult = await past;
    final cancelledResult = await cancelled;
    final latest = _currentData(generation);
    if (latest == null) return;
    final failure = pastResult.hasError ? pastResult : cancelledResult;
    state = AsyncData(
      _appendPast(
        latest.copyWith(
          pastEvents: pastResult.hasError ? null : const [],
          cancelledEvents: cancelledResult.hasError ? null : const [],
        ),
        pastResult.asData?.value,
        cancelledResult.asData?.value,
      ).copyWith(
        historyInitialized: !failure.hasError,
        loadingMorePast: false,
        pastError: failure.error,
        pastStackTrace: failure.stackTrace,
      ),
    );
  }

  // A page response updates its own lane in the latest state. Never restore a
  // pre-await snapshot over the other tab's progress, or a refreshed session.
  HostEventsTimelineData? _currentData(int generation) =>
      ref.mounted &&
          generation == _generation &&
          identical(
            request.session,
            ref.read(authenticatedSessionProvider).asData?.value,
          )
      ? state.asData?.value
      : null;
}

// Capture synchronous throws as well as asynchronous failures immediately, so
// concurrently started reads cannot report an unhandled error while awaiting a
// higher-priority source.
T _valueOrThrow<T>(AsyncValue<T> result) {
  if (result.hasError) {
    Error.throwWithStackTrace(result.error!, result.stackTrace!);
  }
  return result.requireValue;
}

Future<AsyncValue<T>> _capture<T>(Future<T> Function() read) async {
  try {
    return AsyncData(await read());
  } on Object catch (error, stackTrace) {
    return AsyncError(error, stackTrace);
  }
}

HostEventsTimelineData _initialState(
  CursorPage<Event, PageCursor<Event>> activePage,
  HostEventsTimelineData? previous,
) => HostEventsTimelineData(
  activeEvents: activePage.items,
  pastEvents: previous?.pastEvents ?? const [],
  cancelledEvents: previous?.cancelledEvents ?? const [],
  activeCursor: activePage.nextCursor,
  pastCursor: previous?.pastCursor,
  cancelledCursor: previous?.cancelledCursor,
  hasMoreActive: activePage.hasMore,
  hasMorePast: previous?.hasMorePast ?? false,
  hasMoreCancelled: previous?.hasMoreCancelled ?? false,
  historyInitialized: false,
);

HostEventsTimelineData _appendActive(
  HostEventsTimelineData current,
  CursorPage<Event, PageCursor<Event>>? page,
) => page == null
    ? current
    : current.copyWith(
        activeEvents: _mergeEvents(current.activeEvents, page.items),
        activeCursor: page.nextCursor,
        clearActiveCursor: page.nextCursor == null,
        hasMoreActive: page.hasMore,
        clearActiveLoadMoreError: true,
      );

HostEventsTimelineData _appendPast(
  HostEventsTimelineData current,
  CursorPage<Event, PageCursor<Event>>? page,
  CursorPage<Event, PageCursor<Event>>? cancelledPage,
) => current.copyWith(
  pastEvents: page == null
      ? current.pastEvents
      : _mergeEvents(current.pastEvents, page.items),
  pastCursor: page?.nextCursor,
  clearPastCursor: page != null && page.nextCursor == null,
  hasMorePast: page?.hasMore,
  cancelledEvents: cancelledPage == null
      ? current.cancelledEvents
      : _mergeEvents(current.cancelledEvents, cancelledPage.items),
  cancelledCursor: cancelledPage?.nextCursor,
  clearCancelledCursor:
      cancelledPage != null && cancelledPage.nextCursor == null,
  hasMoreCancelled: cancelledPage?.hasMore,
  clearPastError: true,
);

List<Event> _mergeEvents(Iterable<Event> current, Iterable<Event> next) {
  final byId = <String, Event>{
    for (final event in current) event.id: event,
    for (final event in next) event.id: event,
  };
  return List.unmodifiable(byId.values);
}
