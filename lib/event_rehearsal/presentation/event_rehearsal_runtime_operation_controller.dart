import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_operation_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_operations.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_runtime_operation_controller.g.dart';

enum RehearsalRuntimeOperationKind { reveal, outcomes }

enum RehearsalRuntimeOperationPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

final class RehearsalRuntimeOperationState {
  const RehearsalRuntimeOperationState({
    this.phase = RehearsalRuntimeOperationPhase.ready,
    this.kind,
    this.error,
  });

  final RehearsalRuntimeOperationPhase phase;
  final RehearsalRuntimeOperationKind? kind;
  final Object? error;

  bool get isSubmitting => phase == RehearsalRuntimeOperationPhase.submitting;
  bool get canSubmit =>
      phase == RehearsalRuntimeOperationPhase.ready ||
      phase == RehearsalRuntimeOperationPhase.saved;
  bool get canRetry => phase == RehearsalRuntimeOperationPhase.retryRequired;
}

/// Owns one exact runtime request until the backend proves its outcome.
///
/// A multi-unit outcome round advances through one revision-fenced command at
/// a time. If a response is uncertain, the current command and action id stay
/// frozen; a retry resumes that command before it builds the remaining ones.
@riverpod
class EventRehearsalRuntimeOperationController
    extends _$EventRehearsalRuntimeOperationController {
  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventRehearsalBootstrap>? _inFlight;
  _PendingRuntimeOperation? _pending;
  void Function()? _releasePending;

  @override
  RehearsalRuntimeOperationState build(String sessionId) {
    final auth = ref.watch(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    _epoch++;
    _account = null;
    _inFlight = null;
    _clearPending();
    ref.onDispose(() {
      _epoch++;
      _clearPending();
    });
    if (!authState.isSettledData || authState.value == null) {
      return RehearsalRuntimeOperationState(
        phase: RehearsalRuntimeOperationPhase.refreshRequired,
        error: authState.error ?? _sessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const RehearsalRuntimeOperationState();
  }

  Future<EventRehearsalBootstrap> changeReveal({
    required EventRehearsalBootstrap snapshot,
    required RehearsalRevealAction decision,
    int? expectedRound,
    int? countdownSeconds,
  }) {
    final account = _requireCurrent(snapshot);
    if (_inFlight case final inFlight?) return inFlight;
    if (_pending case final _PendingRevealOperation pending?) {
      if (!pending.matches(
        decision: decision,
        expectedRound: expectedRound,
        countdownSeconds: countdownSeconds,
      )) {
        return Future.error(
          const ValidationException(
            'Retry the pending practice reveal before choosing another action.',
          ),
        );
      }
      return _submit(account, pending);
    }
    if (_pending != null || !state.canSubmit) {
      return Future.error(
        const ValidationException(
          'Review the pending practice operation before continuing.',
        ),
      );
    }
    final review = snapshot.revealReview;
    if (review == null) {
      return Future.error(
        const ValidationException('Reload the current practice reveal.'),
      );
    }
    final targetRound = decision == RehearsalRevealAction.cancelPending
        ? null
        : review.pendingRound ?? review.publishedRound + 1;
    if (expectedRound != targetRound ||
        decision == RehearsalRevealAction.startCountdown &&
            countdownSeconds != review.countdownSeconds) {
      return Future.error(
        const ValidationException('Reload the current practice reveal.'),
      );
    }
    try {
      final pending = _PendingRevealOperation(
        change: RehearsalRevealChange(
          snapshot: snapshot,
          decision: decision,
          decisionId: _newId('practice-reveal-decision'),
          clientActionId: _newId('practice-reveal'),
        ),
        expectedRound: expectedRound,
        countdownSeconds: countdownSeconds,
      );
      return _submit(account, pending);
    } catch (error, stackTrace) {
      return Future.error(error, stackTrace);
    }
  }

  Future<EventRehearsalBootstrap> recordOutcomes({
    required EventRehearsalBootstrap snapshot,
    required int expectedRevision,
    required int roundIndex,
    required List<EventSuccessUnitOutcomeEntryInput> entries,
  }) {
    final account = _requireCurrent(snapshot);
    if (_inFlight case final inFlight?) return inFlight;
    if (_pending case final _PendingOutcomeRound pending?) {
      if (!pending.matches(roundIndex: roundIndex, entries: entries)) {
        return Future.error(
          const ValidationException(
            'Retry the pending practice round before recording another one.',
          ),
        );
      }
      return _submit(account, pending);
    }
    if (_pending != null || !state.canSubmit) {
      return Future.error(
        const ValidationException(
          'Review the pending practice operation before continuing.',
        ),
      );
    }
    final review = snapshot.outcomeReview;
    if (review == null ||
        review.revision != expectedRevision ||
        roundIndex < 0 ||
        roundIndex > 10000 ||
        entries.length != review.unitIds.length ||
        entries.map((entry) => entry.unitId).toSet().length != entries.length ||
        !review.unitIds.every(
          (unitId) => entries.any((entry) => entry.unitId == unitId),
        ) ||
        !_validOutcomeEntries(review, entries)) {
      return Future.error(
        const ValidationException('Reload the current practice outcomes.'),
      );
    }
    try {
      final pending = _PendingOutcomeRound(
        snapshot,
        roundIndex: roundIndex,
        entries: List.unmodifiable(entries),
        clientActionIds: [
          for (var index = 0; index < entries.length; index++)
            _newId('practice-outcome'),
        ],
      );
      return _submit(account, pending);
    } catch (error, stackTrace) {
      return Future.error(error, stackTrace);
    }
  }

  Future<EventRehearsalBootstrap> retry() {
    final account = _account;
    final pending = _pending;
    if (!ref.mounted || account == null) {
      return Future.error(_sessionChanged);
    }
    if (_inFlight case final inFlight?) return inFlight;
    if (!state.canRetry || pending == null) {
      return Future.error(
        const ValidationException('There is no practice operation to retry.'),
      );
    }
    return _submit(account, pending);
  }

  AuthenticatedSession _requireCurrent(EventRehearsalBootstrap snapshot) {
    final account = _account;
    if (!ref.mounted ||
        account == null ||
        snapshot.session.id != sessionId ||
        !_current(account, _epoch)) {
      throw _sessionChanged;
    }
    final staff = snapshot.staffReview;
    if (staff != null && (!staff.isManager || staff.hostUid != account.uid)) {
      throw const ValidationException(
        'Review runtime actions as the rehearsal Host.',
      );
    }
    return account;
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  Future<EventRehearsalBootstrap> _submit(
    AuthenticatedSession account,
    _PendingRuntimeOperation pending,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventRehearsalBootstrap>();
    final tracked = completion.future;
    _pending = pending;
    _inFlight = tracked;
    _retainPending(account);
    state = RehearsalRuntimeOperationState(
      phase: RehearsalRuntimeOperationPhase.submitting,
      kind: pending.kind,
    );
    unawaited(
      _apply(account, pending, epoch)
          .then(
            completion.complete,
            onError: (Object error, StackTrace stackTrace) {
              completion.completeError(error, stackTrace);
            },
          )
          .whenComplete(() {
            if (identical(_inFlight, tracked)) _inFlight = null;
          }),
    );
    return tracked;
  }

  Future<EventRehearsalBootstrap> _apply(
    AuthenticatedSession account,
    _PendingRuntimeOperation pending,
    int epoch,
  ) async {
    try {
      final result = await pending.apply(
        ref.read(eventRehearsalRepositoryProvider),
      );
      if (!_current(account, epoch)) throw _sessionChanged;
      _inFlight = null;
      _clearPending();
      _refresh();
      state = RehearsalRuntimeOperationState(
        phase: RehearsalRuntimeOperationPhase.saved,
        kind: pending.kind,
      );
      return result;
    } catch (error) {
      if (_current(account, epoch)) {
        final definitive =
            error is AppException &&
            {
              'aborted',
              'permission-denied',
              'unauthenticated',
              'sign-in-required',
              'session-changed',
              'failed-precondition',
              'not-found',
              'invalid-argument',
              'callable-unavailable',
            }.contains(error.code);
        if (definitive) {
          _clearPending();
          _refresh();
        }
        _inFlight = null;
        state = RehearsalRuntimeOperationState(
          phase: definitive
              ? RehearsalRuntimeOperationPhase.refreshRequired
              : RehearsalRuntimeOperationPhase.retryRequired,
          kind: pending.kind,
          error: error,
        );
      }
      rethrow;
    }
  }

  void _retainPending(AuthenticatedSession account) {
    if (_releasePending != null) return;
    final lease = ref.keepAlive();
    final auth = ref.container.listen(authenticatedSessionProvider, (_, next) {
      if (next.isLoading ||
          next.hasError ||
          !identical(next.asData?.value, account)) {
        _epoch++;
        _account = null;
        _inFlight = null;
        _clearPending();
        if (ref.mounted) ref.invalidateSelf();
      }
    });
    _releasePending = () {
      auth.close();
      lease.close();
    };
  }

  void _clearPending() {
    _pending = null;
    final release = _releasePending;
    _releasePending = null;
    release?.call();
  }

  void _refresh() => ref.invalidate(eventRehearsalProvider(sessionId));
}

sealed class _PendingRuntimeOperation {
  RehearsalRuntimeOperationKind get kind;
  Future<EventRehearsalBootstrap> apply(EventRehearsalRepository repository);
}

final class _PendingRevealOperation extends _PendingRuntimeOperation {
  _PendingRevealOperation({
    required this.change,
    required this.expectedRound,
    required this.countdownSeconds,
  });

  final RehearsalRevealChange change;
  final int? expectedRound;
  final int? countdownSeconds;

  @override
  RehearsalRuntimeOperationKind get kind =>
      RehearsalRuntimeOperationKind.reveal;

  bool matches({
    required RehearsalRevealAction decision,
    required int? expectedRound,
    required int? countdownSeconds,
  }) =>
      change.decision == decision &&
      this.expectedRound == expectedRound &&
      this.countdownSeconds == countdownSeconds;

  @override
  Future<EventRehearsalBootstrap> apply(EventRehearsalRepository repository) =>
      repository.applyOperation(change);
}

final class _PendingOutcomeRound extends _PendingRuntimeOperation {
  _PendingOutcomeRound(
    this._snapshot, {
    required this.roundIndex,
    required this.entries,
    required this.clientActionIds,
  });

  EventRehearsalBootstrap _snapshot;
  final int roundIndex;
  final List<EventSuccessUnitOutcomeEntryInput> entries;
  final List<String> clientActionIds;
  var _index = 0;
  RehearsalOutcomeChange? _current;

  @override
  RehearsalRuntimeOperationKind get kind =>
      RehearsalRuntimeOperationKind.outcomes;

  bool matches({
    required int roundIndex,
    required List<EventSuccessUnitOutcomeEntryInput> entries,
  }) =>
      this.roundIndex == roundIndex &&
      entries.length == this.entries.length &&
      entries.indexed.every(
        (item) => _sameMap(item.$2.toJson(), this.entries[item.$1].toJson()),
      );

  @override
  Future<EventRehearsalBootstrap> apply(
    EventRehearsalRepository repository,
  ) async {
    while (_index < entries.length) {
      final input = entries[_index];
      final change = _current ??= RehearsalOutcomeChange(
        snapshot: _snapshot,
        unitId: input.unitId,
        round: roundIndex,
        outcome: _rehearsalOutcome(input),
        clientActionId: clientActionIds[_index],
      );
      _snapshot = await repository.applyOperation(change);
      _current = null;
      _index++;
    }
    return _snapshot;
  }
}

RehearsalOutcomeValue _rehearsalOutcome(
  EventSuccessUnitOutcomeEntryInput input,
) => switch (input) {
  EventSuccessCompletionOutcomeInput(:final completed) =>
    RehearsalCompletionOutcome(completed),
  EventSuccessScoreOutcomeInput(:final score) => RehearsalScoreOutcome(
    score.toDouble(),
  ),
  EventSuccessRankOutcomeInput(:final rank) => RehearsalRankOutcome(
    rank.toDouble(),
  ),
};

bool _validOutcomeEntries(
  RehearsalOutcomeReview review,
  List<EventSuccessUnitOutcomeEntryInput> entries,
) => switch (review.kind) {
  RehearsalOutcomeKind.none => false,
  RehearsalOutcomeKind.completion => entries.every(
    (entry) => entry is EventSuccessCompletionOutcomeInput,
  ),
  RehearsalOutcomeKind.score => entries.every(
    (entry) =>
        entry is EventSuccessScoreOutcomeInput &&
        entry.score.isFinite &&
        entry.score.abs() <= 9007199254740991,
  ),
  RehearsalOutcomeKind.rank => () {
    final ranks = entries
        .whereType<EventSuccessRankOutcomeInput>()
        .map((entry) => entry.rank)
        .toList(growable: false);
    if (ranks.length != entries.length) return false;
    ranks.sort();
    return ranks.indexed.every((item) => item.$2 == item.$1 + 1);
  }(),
};

bool _sameMap(Map<String, Object?> left, Map<String, Object?> right) =>
    left.length == right.length &&
    left.entries.every((entry) => right[entry.key] == entry.value);

String _newId(String prefix) {
  final random = Random.secure();
  final suffix = List.generate(
    16,
    (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
  ).join();
  return '${prefix}_$suffix';
}

const _sessionChanged = ValidationException(
  'Sign in again and reload the current dress rehearsal.',
  code: 'session-changed',
);
