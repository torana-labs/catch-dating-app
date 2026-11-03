import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/data/host_attention_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/host_attention_policies.g.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_today_feed_controller.g.dart';

@immutable
class HostTodayFeedRequest {
  const HostTodayFeedRequest({
    required this.organizerId,
    required this.accountId,
    required this.sessionBoundary,
  });

  final String organizerId;
  final String accountId;
  final DateTime sessionBoundary;

  @override
  bool operator ==(Object other) =>
      other is HostTodayFeedRequest &&
      other.organizerId == organizerId &&
      other.accountId == accountId &&
      other.sessionBoundary == sessionBoundary;

  @override
  int get hashCode => Object.hash(organizerId, accountId, sessionBoundary);
}

enum HostTodayAttentionIssueSource { serverProjection, attendanceOutbox }

/// The server's attention evaluation is not a complete all-clear: no
/// evaluation is recorded yet, or a source exceeded the evaluator's cap.
class HostTodayAttentionIncompleteException implements Exception {
  const HostTodayAttentionIncompleteException(this.sourceCoverage);

  final HostAttentionSourceCoverage sourceCoverage;

  @override
  String toString() =>
      'HostTodayAttentionIncompleteException(${sourceCoverage.name})';
}

@immutable
class HostTodayAttentionIssue {
  const HostTodayAttentionIssue({
    required this.source,
    required this.error,
    required this.stackTrace,
  });

  final HostTodayAttentionIssueSource source;
  final Object error;
  final StackTrace stackTrace;
}

@immutable
class HostTodayFeedData {
  const HostTodayFeedData({
    required this.activeEvents,
    required this.pastEvents,
    this.attentionItems = const <HostAttentionItem>[],
    this.attentionCoverage = const <HostAttentionCoverage>[],
    this.attentionIssues = const <HostTodayAttentionIssue>[],
    this.attentionEvaluatedAt,
    this.localAttendanceMerged = false,
    this.attentionPending = false,
    this.attendancePending = false,
    this.historyPending = false,
    this.historyError,
    this.historyStackTrace,
  });

  final List<Event> activeEvents;
  final List<Event> pastEvents;
  final List<HostAttentionItem> attentionItems;
  final List<HostAttentionCoverage> attentionCoverage;
  final List<HostTodayAttentionIssue> attentionIssues;

  /// When the server last evaluated the attention queue.
  final DateTime? attentionEvaluatedAt;
  final bool localAttendanceMerged;
  final bool attentionPending;
  final bool attendancePending;
  final bool historyPending;
  final Object? historyError;
  final StackTrace? historyStackTrace;

  bool get hasPendingSources =>
      attentionPending || attendancePending || historyPending;

  bool get hasPastEvents => pastEvents.isNotEmpty;
  bool get hasAttentionIssues => attentionIssues.isNotEmpty;
}

@riverpod
class HostTodayFeedController extends _$HostTodayFeedController {
  int _generation = 0;

  @override
  Future<HostTodayFeedData> build(HostTodayFeedRequest request) async {
    final evaluationRef = ref;
    final generation = ++_generation;
    evaluationRef.onDispose(() => _generation += 1);
    bool isCurrentEvaluation() =>
        evaluationRef.mounted && generation == _generation;

    // Listen before any await, so a rebuild (retry, re-entry, resume)
    // re-subscribes to the same attention listener instead of closing it.
    // Values that arrive before the first state is published join it.
    _OptionalLoad<HostAttentionProjection>? attention;
    Future<void> Function()? republish;
    evaluationRef.listen<AsyncValue<HostAttentionProjection>>(
      hostAttentionProjectionProvider(request.organizerId),
      (_, next) {
        if (!isCurrentEvaluation()) return;
        final load = _attentionLoad(next);
        if (load == null) return;
        attention = load;
        if (republish case final publishLatest?) unawaited(publishLatest());
      },
      fireImmediately: true,
    );

    final eventRepository = evaluationRef.watch(eventRepositoryProvider);
    final activeFuture = _captureOptional(
      () => eventRepository.fetchActiveEventsPage(
        organizerId: request.organizerId,
        sessionBoundary: request.sessionBoundary,
      ),
    );
    final attendanceFuture = _captureOptional(
      () => evaluationRef
          .read(hostAttendanceOutboxProvider)
          .loadAll(accountId: request.accountId, now: request.sessionBoundary),
    );
    final historyFuture = _captureOptional(
      () async => (await eventRepository.fetchPastEventsPage(
        organizerId: request.organizerId,
        sessionBoundary: request.sessionBoundary,
      )).items,
    );
    final active = await activeFuture;
    if (!isCurrentEvaluation()) {
      throw StateError('Today feed evaluation was disposed.');
    }
    if (active.error case final error?) {
      Error.throwWithStackTrace(error, active.stackTrace!);
    }
    final activeEvents = List<Event>.unmodifiable(active.value!.items);
    _OptionalLoad<HostAttendanceOutboxSummary>? attendance;
    _OptionalLoad<List<Event>>? history;

    HostTodayFeedData compose() {
      final projection = attention?.value;
      final issues = <HostTodayAttentionIssue>[
        if (attention?.error case final error?)
          HostTodayAttentionIssue(
            source: HostTodayAttentionIssueSource.serverProjection,
            error: error,
            stackTrace: attention!.stackTrace!,
          )
        else if (projection != null && !projection.isComplete)
          HostTodayAttentionIssue(
            source: HostTodayAttentionIssueSource.serverProjection,
            error: HostTodayAttentionIncompleteException(
              projection.sourceCoverage,
            ),
            stackTrace: StackTrace.empty,
          ),
        if (attendance?.error case final error?)
          HostTodayAttentionIssue(
            source: HostTodayAttentionIssueSource.attendanceOutbox,
            error: error,
            stackTrace: attendance!.stackTrace!,
          ),
      ];
      // Rebuild from the original sources, never from an already merged list.
      final items = <HostAttentionItem>[
        ...?projection?.items,
        if (attendance?.value case final outbox?)
          ..._attendanceItems(
            outbox,
            activeEvents: activeEvents,
            accountId: request.accountId,
            now: request.sessionBoundary,
          ),
      ]..sort(compareHostAttentionItems);
      return HostTodayFeedData(
        activeEvents: activeEvents,
        pastEvents: List<Event>.unmodifiable(history?.value ?? const []),
        attentionItems: List<HostAttentionItem>.unmodifiable(items),
        attentionCoverage: projection?.coverage ?? const [],
        attentionIssues: List<HostTodayAttentionIssue>.unmodifiable(issues),
        attentionEvaluatedAt: projection?.evaluatedAt,
        localAttendanceMerged: attendance?.value != null,
        attentionPending: attention == null,
        attendancePending: attendance == null,
        historyPending: history == null,
        historyError: history?.error,
        historyStackTrace: history?.stackTrace,
      );
    }

    // Riverpod publishes build's first AsyncData before completing this future.
    // Even already-completed optional reads must wait for that publication;
    // otherwise build could overwrite their updates with its initial result.
    final initialPublication = future;
    Future<void> republishAfterInitial() async {
      try {
        await initialPublication;
      } on Object {
        return;
      }
      if (!isCurrentEvaluation()) return;
      if (state.isLoading || state.asData == null) return;
      // All slots belong to this evaluation. Compose synchronously so sibling
      // completions cannot restore an older source snapshot.
      state = AsyncData(compose());
    }

    republish = republishAfterInitial;
    Future<void> publish<T>(
      Future<_OptionalLoad<T>> source,
      void Function(_OptionalLoad<T>) accept,
    ) async {
      final result = await source;
      if (!isCurrentEvaluation()) return;
      accept(result);
      await republishAfterInitial();
    }

    unawaited(publish(attendanceFuture, (value) => attendance = value));
    unawaited(publish(historyFuture, (value) => history = value));
    return compose();
  }

  /// Re-reads the events and the local outbox. The attention listener is
  /// not invalidated: it is already live and re-subscribed by the rebuild.
  void retry() {
    ref.invalidateSelf();
  }
}

/// An attention listener value as an optional load; null while it has
/// produced nothing yet.
_OptionalLoad<HostAttentionProjection>? _attentionLoad(
  AsyncValue<HostAttentionProjection> value,
) => switch (value) {
  AsyncValue(:final error?, :final stackTrace) => _OptionalLoad.error(
    error,
    stackTrace ?? StackTrace.current,
  ),
  AsyncValue(hasValue: true, :final value?) => _OptionalLoad.data(value),
  _ => null,
};

Future<_OptionalLoad<T>> _captureOptional<T>(Future<T> Function() load) async {
  try {
    return _OptionalLoad<T>.data(await load());
  } on Object catch (error, stackTrace) {
    return _OptionalLoad<T>.error(error, stackTrace);
  }
}

@immutable
class _OptionalLoad<T> {
  const _OptionalLoad._({this.value, this.error, this.stackTrace});

  const _OptionalLoad.data(T value) : this._(value: value);

  const _OptionalLoad.error(Object error, StackTrace stackTrace)
    : this._(error: error, stackTrace: stackTrace);

  final T? value;
  final Object? error;
  final StackTrace? stackTrace;
}

Iterable<HostAttentionItem> _attendanceItems(
  HostAttendanceOutboxSummary outbox, {
  required List<Event> activeEvents,
  required String accountId,
  required DateTime now,
}) sync* {
  final eventsById = <String, Event>{
    for (final event in activeEvents) event.id: event,
  };
  for (final entry in outbox.entries) {
    final needsReview = entry.status == HostAttendanceOutboxStatus.needsReview;
    final reviewAt = entry.createdAt.add(HostAttendanceOutbox.reviewAfter);
    final dueAt = needsReview ? now : reviewAt;
    yield HostAttentionItem(
      id: 'local-attendance-${entry.clientOperationId}',
      kind: HostAttentionKind.attendanceSync,
      scope: HostAttentionScope.event,
      sourceOwner: HostAttentionSourceOwner.hostAttendanceOutbox,
      sourceId: entry.clientOperationId,
      sourceRevision: [
        entry.expectedRevision,
        entry.desiredCheckedIn,
        entry.status.name,
        entry.lastErrorCode ?? '',
      ].join(':'),
      eventId: entry.eventId,
      status: HostAttentionStatus.open,
      consequence: HostAttentionConsequence.requiresReconciliation,
      blocking: false,
      urgency: needsReview
          ? HostAttentionUrgency.immediate
          : HostAttentionUrgency.upcoming,
      destination: HostAttentionDestination(
        route: HostAttentionDestinationRoute.hostEventManage,
        section: 'guests',
        eventId: entry.eventId,
      ),
      context: HostAttentionContext(
        eventName: eventsById[entry.eventId]?.title,
        count: 1,
        errorCode: entry.lastErrorCode,
      ),
      dedupeKey: 'attendanceSync:${entry.clientOperationId}',
      policyVersion: hostAttentionPolicyVersion,
      resolutionVersion: 1,
      assignedHostUid: accountId,
      openedAt: entry.createdAt,
      dueAt: dueAt,
      // Local observations remain actionable until replayed or dismissed.
      expiresAt: null,
    );
  }
}
