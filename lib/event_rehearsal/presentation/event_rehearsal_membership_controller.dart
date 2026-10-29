import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_membership.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_membership_controller.g.dart';

final class _RehearsalMembershipReview {
  const _RehearsalMembershipReview(this.session, this.membership);
  final RehearsalAssistanceReview session;
  final RehearsalMembershipRow membership;
  AuthenticatedSession get account => session.account;
}

enum RehearsalMembershipPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef RehearsalMembershipMutationKey = ({
  RehearsalMembershipScope scope,
  AuthenticatedSession account,
});

sealed class RehearsalMembershipEditorState {
  const RehearsalMembershipEditorState();
  bool get canDismiss => switch (this) {
    RehearsalMembershipForm(:final phase) =>
      phase != RehearsalMembershipPhase.submitting,
    RehearsalMembershipIdle() || RehearsalMembershipUnavailable() => true,
  };
}

final class RehearsalMembershipIdle extends RehearsalMembershipEditorState {
  const RehearsalMembershipIdle();
}

final class RehearsalMembershipUnavailable
    extends RehearsalMembershipEditorState {
  const RehearsalMembershipUnavailable(this.error);
  final Object error;
}

final class RehearsalMembershipForm extends RehearsalMembershipEditorState {
  const RehearsalMembershipForm._(
    this._review, {
    this.phase = RehearsalMembershipPhase.ready,
    this.change,
    this.result,
    this.error,
  });
  final _RehearsalMembershipReview _review;
  RehearsalAssistanceReview get review => _review.session;
  RehearsalMembershipRow get membership => _review.membership;
  final RehearsalMembershipPhase phase;
  final RehearsalAssistanceChange? change;
  final EventRehearsalBootstrap? result;
  final Object? error;
  bool get canSelect =>
      phase == RehearsalMembershipPhase.ready &&
      membership.availability == RehearsalMembershipAvailability.ready &&
      membership.facts.actions.isNotEmpty;
  bool get canSubmit => canSelect && change != null;
  bool get canRetry => phase == RehearsalMembershipPhase.retryRequired;
  bool get canReload =>
      phase == RehearsalMembershipPhase.ready ||
      phase == RehearsalMembershipPhase.refreshRequired;
  RehearsalMembershipForm _after(
    RehearsalMembershipPhase phase, {
    required RehearsalAssistanceChange change,
    EventRehearsalBootstrap? result,
    Object? error,
  }) => RehearsalMembershipForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// One synthetic guest owns one pending group decision across refresh and closure.
@riverpod
class EventRehearsalMembershipController
    extends _$EventRehearsalMembershipController {
  static final changeMutation = Mutation<EventRehearsalBootstrap>();
  static RehearsalMembershipMutationKey mutationKey(
    RehearsalAssistanceReview review,
    RehearsalMembershipRow membership,
  ) => (scope: membership.scope, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventRehearsalBootstrap>? _inFlight;
  RehearsalAssistanceChange? _pending;
  void Function()? _releasePending;

  @override
  RehearsalMembershipEditorState build(RehearsalMembershipScope scope) {
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
      return RehearsalMembershipUnavailable(
        authState.error ?? rehearsalReviewSessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const RehearsalMembershipIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(_RehearsalMembershipReview selected) {
    if (!_current(selected.account, _epoch)) {
      throw rehearsalReviewSessionChanged;
    }
    final page = ref.read(
      eventRehearsalAssistanceProvider(
        scope.sessionId,
        practiceOperatorId:
            selected.session.snapshot.staffReview?.practiceOperatorId,
      ),
    );
    if (selected.membership.scope != scope ||
        selected.membership.hostUid != selected.account.uid ||
        page.isLoading ||
        page.hasError ||
        !selected.session.isCurrent ||
        !identical(page.asData?.value, selected.session) ||
        !(selected.session.snapshot.membershipReviews?.rows.any(
              (row) => identical(row, selected.membership),
            ) ??
            false)) {
      throw const ValidationException(
        'Reload the current practice membership.',
      );
    }
  }

  /// A refreshed review cannot replace an unresolved decision for this guest.
  void open(
    RehearsalAssistanceReview review,
    RehearsalMembershipRow membership,
  ) {
    if (!_current(review.account, _epoch)) throw rehearsalReviewSessionChanged;
    if (membership.scope != scope || membership.hostUid != review.account.uid) {
      throw const ValidationException('Choose the reviewed practice guest.');
    }
    if (_pending != null || _inFlight != null) return;
    final selected = _RehearsalMembershipReview(review, membership);
    _requireReview(selected);
    state = RehearsalMembershipForm._(selected);
  }

  void reload() {
    final form = state;
    if (form is! RehearsalMembershipForm ||
        !form.canReload ||
        _pending != null ||
        _inFlight != null) {
      return;
    }
    _refresh(form.review.account);
    state = const RehearsalMembershipIdle();
  }

  void select(AssistanceMembershipDecision? decision) {
    if (!ref.mounted) return;
    final form = state;
    if (form is! RehearsalMembershipForm ||
        !form.canSelect ||
        _pending != null) {
      return;
    }
    try {
      _requireReview(form._review);
      final random = Random.secure();
      final id = List.generate(
        16,
        (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join();
      final change = decision == null
          ? null
          : RehearsalAssistanceChange(
              snapshot: form.review.snapshot,
              command: RehearsalTransferGroup(
                snapshot: form.membership,
                decision: decision,
              ),
              clientActionId: 'membership_$id',
            );
      state = RehearsalMembershipForm._(form._review, change: change);
    } catch (error) {
      state = RehearsalMembershipForm._(
        form._review,
        error: error,
        phase: form.review.isCurrent
            ? RehearsalMembershipPhase.ready
            : RehearsalMembershipPhase.refreshRequired,
      );
    }
  }

  Future<EventRehearsalBootstrap> submit() {
    if (!ref.mounted) return Future.error(rehearsalReviewSessionChanged);
    final form = state;
    if (form is! RehearsalMembershipForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(rehearsalReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) return Future.value(result);
    if (!form.canSubmit || _pending != null) {
      return Future.error(
        const ValidationException('Review a group decision before continuing.'),
      );
    }
    try {
      _requireReview(form._review);
      return _submit(form, form.change!);
    } catch (error, stackTrace) {
      _publish(
        form._after(
          RehearsalMembershipPhase.refreshRequired,
          change: form.change!,
          error: error,
        ),
      );
      return Future.error(error, stackTrace);
    }
  }

  Future<EventRehearsalBootstrap> retry() {
    if (!ref.mounted) return Future.error(rehearsalReviewSessionChanged);
    final form = state;
    if (form is! RehearsalMembershipForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(rehearsalReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException('There is no group decision to retry.'),
      );
    }
    return _submit(form, _pending!);
  }

  Future<EventRehearsalBootstrap> _submit(
    RehearsalMembershipForm form,
    RehearsalAssistanceChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventRehearsalBootstrap>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(RehearsalMembershipPhase.submitting, change: change);
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

  void _publish(RehearsalMembershipForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<EventRehearsalBootstrap> _apply(
    RehearsalMembershipForm form,
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
          RehearsalMembershipPhase.saved,
          change: change,
          result: result,
        ),
      );
      return result;
    } catch (error) {
      if (!_current(form.review.account, epoch)) {
        throw rehearsalReviewSessionChanged;
      }
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
              ? RehearsalMembershipPhase.refreshRequired
              : RehearsalMembershipPhase.retryRequired,
          change: change,
          error: error,
        ),
      );
      rethrow;
    }
  }
}
