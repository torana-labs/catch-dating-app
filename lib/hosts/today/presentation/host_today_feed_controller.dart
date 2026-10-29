import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/data/host_attention_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
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
    this.attentionGeneratedAt,
    this.attentionHorizonEndsAt,
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
  final DateTime? attentionGeneratedAt;
  final DateTime? attentionHorizonEndsAt;
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

    final eventRepository = evaluationRef.watch(eventRepositoryProvider);
    final activeFuture = _captureOptional(
      () => eventRepository.fetchActiveEventsPage(
        organizerId: request.organizerId,
        sessionBoundary: request.sessionBoundary,
      ),
    );
    final attentionFuture = _captureOptional(
      () => evaluationRef
          .read(hostAttentionRepositoryProvider)
          .fetch(request.organizerId),
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
    _OptionalLoad<HostAttentionProjection>? attention;
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
          ),
        if (attendance?.error case final error?)
          HostTodayAttentionIssue(
            source: HostTodayAttentionIssueSource.attendanceOutbox,
            error: error,
            stackTrace: attendance!.stackTrace!,
          ),
      ];
      // Rebuild from the original sources, never from an already merged list.
      // In particular, a later projection supplies the local rows' policy.
      final items = <HostAttentionItem>[
        ...?projection?.items,
        if (attendance?.value case final outbox?)
          ..._attendanceItems(
            outbox,
            activeEvents: activeEvents,
            accountId: request.accountId,
            now: request.sessionBoundary,
            policyVersion: projection?.policyVersion,
          ),
      ]..sort(_compareAttentionItems);
      return HostTodayFeedData(
        activeEvents: activeEvents,
        pastEvents: List<Event>.unmodifiable(history?.value ?? const []),
        attentionItems: List<HostAttentionItem>.unmodifiable(items),
        attentionCoverage: projection?.coverage ?? const [],
        attentionIssues: List<HostTodayAttentionIssue>.unmodifiable(issues),
        attentionGeneratedAt: projection?.generatedAt,
        attentionHorizonEndsAt: projection?.horizonEndsAt,
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
    Future<void> publish<T>(
      Future<_OptionalLoad<T>> source,
      void Function(_OptionalLoad<T>) accept,
    ) async {
      try {
        await initialPublication;
      } on Object {
        return;
      }
      final result = await source;
      if (!isCurrentEvaluation()) return;
      if (state.isLoading || state.asData == null) return;
      // All slots belong to this evaluation. Update and compose synchronously
      // so sibling completions cannot restore an older source snapshot.
      accept(result);
      state = AsyncData(compose());
    }

    unawaited(publish(attentionFuture, (value) => attention = value));
    unawaited(publish(attendanceFuture, (value) => attendance = value));
    unawaited(publish(historyFuture, (value) => history = value));
    return compose();
  }

  void retry() {
    ref.invalidateSelf();
  }
}

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
  required int? policyVersion,
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
      policyVersion: policyVersion,
      resolutionVersion: 1,
      assignedHostUid: accountId,
      openedAt: entry.createdAt,
      dueAt: dueAt,
      // Local observations remain actionable until replayed or dismissed.
      expiresAt: null,
    );
  }
}

int _compareAttentionItems(HostAttentionItem left, HostAttentionItem right) {
  final urgency = left.urgency.index.compareTo(right.urgency.index);
  if (urgency != 0) return urgency;
  final blocking = (right.blocking ? 1 : 0).compareTo(left.blocking ? 1 : 0);
  if (blocking != 0) return blocking;
  final dueAt = left.dueAt.compareTo(right.dueAt);
  if (dueAt != 0) return dueAt;
  return left.id.compareTo(right.id);
}
