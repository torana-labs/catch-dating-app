import 'package:catch_dating_app/contexts/discovery/data/event_discovery_repository.dart';
import 'package:catch_dating_app/contexts/events/data/external_event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/external_event.dart';
import 'package:catch_dating_app/core/data/cursor_page.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'explore_discovery_window_controller.g.dart';

@immutable
class ExploreDiscoveryWindowRequest {
  const ExploreDiscoveryWindowRequest({
    required this.internalQuery,
    required this.externalQuery,
  });

  final EventDiscoveryQuery internalQuery;
  final ExternalEventDiscoveryQuery externalQuery;

  @override
  bool operator ==(Object other) {
    return other is ExploreDiscoveryWindowRequest &&
        other.internalQuery == internalQuery &&
        other.externalQuery == externalQuery;
  }

  @override
  int get hashCode => Object.hash(internalQuery, externalQuery);
}

@immutable
class ExploreDiscoveryWindowState {
  const ExploreDiscoveryWindowState({
    required this.internalEvents,
    required this.externalEvents,
    required this.hasMoreInternal,
    required this.hasMoreExternal,
    this.internalCursor,
    this.externalCursor,
    this.isLoadingMore = false,
  });

  final List<Event> internalEvents;
  final List<ExternalEvent> externalEvents;
  final DocumentSnapshot<Event>? internalCursor;
  final DocumentSnapshot<ExternalEvent>? externalCursor;
  final bool hasMoreInternal;
  final bool hasMoreExternal;
  final bool isLoadingMore;

  bool get hasMore => hasMoreInternal || hasMoreExternal;
  bool get isExhaustive => !hasMore;

  ExploreDiscoveryWindowState copyWith({bool? isLoadingMore}) {
    return ExploreDiscoveryWindowState(
      internalEvents: internalEvents,
      externalEvents: externalEvents,
      internalCursor: internalCursor,
      externalCursor: externalCursor,
      hasMoreInternal: hasMoreInternal,
      hasMoreExternal: hasMoreExternal,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }
}

/// Cursor-accumulated internal + external discovery window for Explore.
///
/// The provider family key is the normalized query pair. Changing city,
/// filter, time scope, cohort, or distance therefore creates a fresh first
/// page; loading more mutates only that exact query window.
@riverpod
class ExploreDiscoveryWindow extends _$ExploreDiscoveryWindow {
  @override
  Future<ExploreDiscoveryWindowState> build(
    ExploreDiscoveryWindowRequest request,
  ) async {
    final internalFuture = ref
        .watch(eventDiscoveryRepositoryProvider)
        .fetchDiscoverableEventsPage(request.internalQuery);
    final externalFuture = ref
        .watch(externalEventRepositoryProvider)
        .fetchDiscoverableExternalEventsPage(request.externalQuery);
    final (internalPage, externalPage) = await (
      internalFuture,
      externalFuture,
    ).wait;
    return _fromPages(internalPage, externalPage);
  }

  Future<void> loadNext() async {
    final current = state.asData?.value;
    if (current == null || current.isLoadingMore || !current.hasMore) return;

    state = AsyncData(current.copyWith(isLoadingMore: true));
    try {
      final internalFuture = current.hasMoreInternal
          ? ref
                .read(eventDiscoveryRepositoryProvider)
                .fetchDiscoverableEventsPage(
                  request.internalQuery,
                  startAfter: current.internalCursor,
                )
          : Future.value(CursorPage.empty<Event, DocumentSnapshot<Event>>());
      final externalFuture = current.hasMoreExternal
          ? ref
                .read(externalEventRepositoryProvider)
                .fetchDiscoverableExternalEventsPage(
                  request.externalQuery,
                  startAfter: current.externalCursor,
                )
          : Future.value(
              CursorPage.empty<
                ExternalEvent,
                DocumentSnapshot<ExternalEvent>
              >(),
            );
      final (internalPage, externalPage) = await (
        internalFuture,
        externalFuture,
      ).wait;

      state = AsyncData(
        ExploreDiscoveryWindowState(
          internalEvents: _mergeById(
            current.internalEvents,
            internalPage.items,
            idOf: (event) => event.id,
          ),
          externalEvents: _mergeById(
            current.externalEvents,
            externalPage.items,
            idOf: (event) => event.id,
          ),
          internalCursor: internalPage.nextCursor,
          externalCursor: externalPage.nextCursor,
          hasMoreInternal: internalPage.hasMore,
          hasMoreExternal: externalPage.hasMore,
        ),
      );
    } catch (_) {
      state = AsyncData(current.copyWith(isLoadingMore: false));
      rethrow;
    }
  }
}

ExploreDiscoveryWindowState _fromPages(
  CursorPage<Event, DocumentSnapshot<Event>> internalPage,
  CursorPage<ExternalEvent, DocumentSnapshot<ExternalEvent>> externalPage,
) {
  return ExploreDiscoveryWindowState(
    internalEvents: internalPage.items,
    externalEvents: externalPage.items,
    internalCursor: internalPage.nextCursor,
    externalCursor: externalPage.nextCursor,
    hasMoreInternal: internalPage.hasMore,
    hasMoreExternal: externalPage.hasMore,
  );
}

List<T> _mergeById<T>(
  List<T> current,
  List<T> next, {
  required Object Function(T item) idOf,
}) {
  final seen = <Object>{};
  return List.unmodifiable([
    for (final item in [...current, ...next])
      if (seen.add(idOf(item))) item,
  ]);
}
