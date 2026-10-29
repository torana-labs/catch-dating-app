import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_accountability_controller.g.dart';

final class _RehearsalAccountabilityReview {
  const _RehearsalAccountabilityReview(this.session, this.visit);
  final RehearsalAssistanceReview session;
  final RehearsalActionableAccountability visit;
  AuthenticatedSession get account => session.account;
}

enum RehearsalAccountabilityPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef RehearsalAccountabilityMutationKey = ({
  RehearsalAccountabilityScope scope,
  AuthenticatedSession account,
});

sealed class RehearsalAccountabilityEditorState {
  const RehearsalAccountabilityEditorState();
  bool get canDismiss => switch (this) {
    RehearsalAccountabilityForm(:final phase) =>
      phase != RehearsalAccountabilityPhase.submitting,
    RehearsalAccountabilityIdle() ||
    RehearsalAccountabilityUnavailable() => true,
  };
}

final class RehearsalAccountabilityIdle
    extends RehearsalAccountabilityEditorState {
  const RehearsalAccountabilityIdle();
}

final class RehearsalAccountabilityUnavailable
    extends RehearsalAccountabilityEditorState {
  const RehearsalAccountabilityUnavailable(this.error);
  final Object error;
}

final class RehearsalAccountabilityForm
    extends RehearsalAccountabilityEditorState {
  const RehearsalAccountabilityForm._(
    this._review, {
    this.phase = RehearsalAccountabilityPhase.ready,
    this.change,
    this.result,
    this.error,
  });
  final _RehearsalAccountabilityReview _review;
  RehearsalAssistanceReview get review => _review.session;
  RehearsalActionableAccountability get visit => _review.visit;
  final RehearsalAccountabilityPhase phase;
  final RehearsalAssistanceChange? change;
  final EventRehearsalBootstrap? result;
  final Object? error;
  bool get canResolve => phase == RehearsalAccountabilityPhase.ready;
  bool get canRetry => phase == RehearsalAccountabilityPhase.retryRequired;
  bool get canReload =>
      phase == RehearsalAccountabilityPhase.ready ||
      phase == RehearsalAccountabilityPhase.refreshRequired;
  RehearsalAccountabilityForm _after(
    RehearsalAccountabilityPhase phase, {
    required RehearsalAssistanceChange change,
    EventRehearsalBootstrap? result,
    Object? error,
  }) => RehearsalAccountabilityForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// One synthetic guest owns one pending decision across refresh and closure.
@riverpod
class EventRehearsalAccountabilityController
    extends _$EventRehearsalAccountabilityController {
  static final resolveMutation = Mutation<EventRehearsalBootstrap>();
  static RehearsalAccountabilityMutationKey mutationKey(
    RehearsalAssistanceReview review,
    RehearsalActionableAccountability visit,
  ) => (scope: visit.scope, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventRehearsalBootstrap>? _inFlight;
  RehearsalAssistanceChange? _pending;
  void Function()? _releasePending;

  @override
  RehearsalAccountabilityEditorState build(RehearsalAccountabilityScope scope) {
    final auth = ref.watch(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    _epoch++;
    _account = null;
    _clearPending();
    _inFlight = null;
    ref.onDispose(() {
      _epoch++;
      _clearPending();
    });
    if (!authState.isSettledData || authState.value == null) {
      return RehearsalAccountabilityUnavailable(
        authState.error ?? rehearsalReviewSessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const RehearsalAccountabilityIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(_RehearsalAccountabilityReview review) {
    if (!_current(review.account, _epoch)) throw rehearsalReviewSessionChanged;
    if (review.visit.scope != scope) {
      throw const ValidationException(
        'Review this practice visit before continuing.',
      );
    }
    final page = ref.read(
      eventRehearsalAssistanceProvider(
        scope.sessionId,
        practiceOperatorId:
            review.session.snapshot.staffReview?.practiceOperatorId,
      ),
    );
    if (page.isLoading ||
        page.hasError ||
        !review.session.isCurrent ||
        !identical(page.asData?.value, review.session) ||
        !(review.session.snapshot.accountabilityReviews?.rows.any(
              (row) => identical(row, review.visit),
            ) ??
            false)) {
      throw const ValidationException('Reload the current practice visit.');
    }
  }

  /// A refreshed review cannot replace an unresolved command for this guest.
  void open(
    RehearsalAssistanceReview review,
    RehearsalActionableAccountability visit,
  ) {
    if (!_current(review.account, _epoch)) throw rehearsalReviewSessionChanged;
    if (visit.scope != scope) {
      throw const ValidationException('Choose the reviewed practice guest.');
    }
    if (_pending != null || _inFlight != null) return;
    final selected = _RehearsalAccountabilityReview(review, visit);
    _requireReview(selected);
    state = RehearsalAccountabilityForm._(selected);
  }

  /// Refresh never replaces an unconfirmed visit decision.
  void reload() {
    final form = state;
    if (form is! RehearsalAccountabilityForm ||
        !form.canReload ||
        _pending != null ||
        _inFlight != null) {
      return;
    }
    _refresh(form.review.account);
    state = const RehearsalAccountabilityIdle();
  }

  Future<EventRehearsalBootstrap> resolve(
    AssistanceVisitDisposition disposition,
  ) {
    if (!ref.mounted) return Future.error(rehearsalReviewSessionChanged);
    final form = state;
    if (form is! RehearsalAccountabilityForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(rehearsalReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) {
      if ((form.change?.command as RehearsalResolveAccountability)
              .disposition ==
          disposition) {
        return Future.value(result);
      }
      return Future.error(
        const ValidationException(
          'Review the current visit before correcting it.',
        ),
      );
    }
    if (!form.canResolve || _pending != null) {
      return Future.error(
        const ValidationException('Resolve the pending visit decision first.'),
      );
    }
    try {
      _requireReview(form._review);
      final random = Random.secure();
      final id = List.generate(
        16,
        (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join();
      return _submit(
        form,
        RehearsalAssistanceChange(
          snapshot: form.review.snapshot,
          command: RehearsalResolveAccountability(
            snapshot: form.visit,
            disposition: disposition,
          ),
          clientActionId: 'visit_$id',
        ),
      );
    } catch (error, stackTrace) {
      return Future.error(error, stackTrace);
    }
  }

  Future<EventRehearsalBootstrap> retry() {
    if (!ref.mounted) return Future.error(rehearsalReviewSessionChanged);
    final form = state;
    if (form is! RehearsalAccountabilityForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(rehearsalReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException('There is no visit decision to retry.'),
      );
    }
    return _submit(form, _pending!);
  }

  Future<EventRehearsalBootstrap> _submit(
    RehearsalAccountabilityForm form,
    RehearsalAssistanceChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventRehearsalBootstrap>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(
      RehearsalAccountabilityPhase.submitting,
      change: change,
    );
    unawaited(
      _apply(form, change, epoch)
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

  void _retainPending(AuthenticatedSession account) {
    if (_releasePending != null) return;
    final lease = ref.keepAlive();
    // A kept-alive sheet can have paused provider dependencies. This temporary
    // strong subscription detects unseen sign-out/account changes while pending.
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

  void _refresh(AuthenticatedSession account) {
    ref.invalidate(eventRehearsalProvider(scope.sessionId));
    ref.invalidate(eventRehearsalAssistanceForAccountProvider);
  }

  void _publish(RehearsalAccountabilityForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<EventRehearsalBootstrap> _apply(
    RehearsalAccountabilityForm form,
    RehearsalAssistanceChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventRehearsalRepositoryProvider)
          .applyAssistance(change);
      if (!_current(form.review.account, epoch)) {
        throw rehearsalReviewSessionChanged;
      }
      change.requireResult(result);
      _clearPending();
      _refresh(form.review.account);
      _publish(
        form._after(
          RehearsalAccountabilityPhase.saved,
          change: change,
          result: result,
        ),
      );
      return result;
    } catch (error) {
      if (_current(form.review.account, epoch)) {
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
          _refresh(form.review.account);
        }
        _publish(
          form._after(
            definitive
                ? RehearsalAccountabilityPhase.refreshRequired
                : RehearsalAccountabilityPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
