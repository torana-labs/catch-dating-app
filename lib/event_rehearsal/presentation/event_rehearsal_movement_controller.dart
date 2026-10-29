import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_view_model.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_movement_controller.g.dart';

enum RehearsalMovementPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef RehearsalMovementMutationKey = ({
  RehearsalMovementScope scope,
  AuthenticatedSession account,
});

sealed class RehearsalMovementEditorState {
  const RehearsalMovementEditorState();
  bool get canDismiss => switch (this) {
    RehearsalMovementForm(:final phase) =>
      phase != RehearsalMovementPhase.submitting,
    RehearsalMovementIdle() || RehearsalMovementUnavailable() => true,
  };
}

final class RehearsalMovementIdle extends RehearsalMovementEditorState {
  const RehearsalMovementIdle();
}

final class RehearsalMovementUnavailable extends RehearsalMovementEditorState {
  const RehearsalMovementUnavailable(this.error);
  final Object error;
}

final class RehearsalMovementForm extends RehearsalMovementEditorState {
  const RehearsalMovementForm._(
    this._review, {
    this.phase = RehearsalMovementPhase.ready,
    this.change,
    this.result,
    this.error,
  });
  final RehearsalMovementPage _review;
  RehearsalMovementPage get review => _review;
  final RehearsalMovementPhase phase;
  final RehearsalMovementChange? change;
  final EventRehearsalBootstrap? result;
  final Object? error;
  bool get canSubmit => phase == RehearsalMovementPhase.ready;
  bool get canRetry => phase == RehearsalMovementPhase.retryRequired;
  bool get canReload =>
      phase == RehearsalMovementPhase.ready ||
      phase == RehearsalMovementPhase.refreshRequired ||
      phase == RehearsalMovementPhase.saved;
  RehearsalMovementForm _after(
    RehearsalMovementPhase phase, {
    required RehearsalMovementChange change,
    EventRehearsalBootstrap? result,
    Object? error,
  }) => RehearsalMovementForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// A group owns one pending departure, report or checkpoint decision across
/// refresh and sheet closure. It is never keyed to an arbitrary guest.
@riverpod
class EventRehearsalMovementController
    extends _$EventRehearsalMovementController {
  static final submitMutation = Mutation<EventRehearsalBootstrap>();
  static RehearsalMovementMutationKey mutationKey(
    RehearsalMovementPage review,
  ) => (scope: review.snapshot.scope, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventRehearsalBootstrap>? _inFlight;
  RehearsalMovementChange? _pending;
  void Function()? _releasePending;

  @override
  RehearsalMovementEditorState build(RehearsalMovementScope scope) {
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
      return RehearsalMovementUnavailable(
        authState.error ?? rehearsalReviewSessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const RehearsalMovementIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(RehearsalMovementPage review) {
    if (!_current(review.account, _epoch)) throw rehearsalReviewSessionChanged;
    if (review.snapshot.scope != scope) {
      throw const ValidationException(
        'Review this rehearsal group before continuing.',
      );
    }
    final page = ref.read(
      eventRehearsalMovementProvider(review.snapshot.selection),
    );
    if (page.isLoading ||
        page.hasError ||
        !review.isCurrent ||
        !identical(page.asData?.value, review)) {
      throw const ValidationException(
        'Reload the current rehearsal movement review.',
      );
    }
  }

  void open(RehearsalMovementPage review) {
    if (!_current(review.account, _epoch)) throw rehearsalReviewSessionChanged;
    if (review.snapshot.scope != scope) {
      throw const ValidationException('Choose the reviewed rehearsal group.');
    }
    if (_pending != null || _inFlight != null) return;
    _requireReview(review);
    state = RehearsalMovementForm._(review);
  }

  void reload() {
    if (!ref.mounted) return;
    final form = state;
    if (form is! RehearsalMovementForm ||
        !form.canReload ||
        _pending != null ||
        _inFlight != null) {
      return;
    }
    _refresh(form.review);
    state = const RehearsalMovementIdle();
  }

  Future<EventRehearsalBootstrap> submit(RehearsalMovementCommand command) {
    if (!ref.mounted) return Future.error(rehearsalReviewSessionChanged);
    final form = state;
    if (form is! RehearsalMovementForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(rehearsalReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) {
      if (jsonEncode(form.change!.command.toJson()) ==
              jsonEncode(command.toJson()) &&
          identical(command.snapshot, form.review.snapshot)) {
        return Future.value(result);
      }
      return Future.error(
        const ValidationException(
          'Review current movement before another decision.',
        ),
      );
    }
    if (!form.canSubmit || _pending != null) {
      return Future.error(
        const ValidationException(
          'Resolve the pending movement decision first.',
        ),
      );
    }
    try {
      _requireReview(form.review);
      if (!identical(command.snapshot, form.review.snapshot)) {
        throw const ValidationException(
          'Use the current group and departure review.',
        );
      }
      final random = Random.secure();
      final id = List.generate(
        16,
        (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join();
      return _submit(
        form,
        RehearsalMovementChange(
          command: command,
          clientActionId: 'movement_$id',
        ),
      );
    } catch (error, stackTrace) {
      return Future.error(error, stackTrace);
    }
  }

  Future<EventRehearsalBootstrap> retry() {
    if (!ref.mounted) return Future.error(rehearsalReviewSessionChanged);
    final form = state;
    if (form is! RehearsalMovementForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(rehearsalReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException('There is no movement decision to retry.'),
      );
    }
    return _submit(form, _pending!);
  }

  Future<EventRehearsalBootstrap> _submit(
    RehearsalMovementForm form,
    RehearsalMovementChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventRehearsalBootstrap>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(RehearsalMovementPhase.submitting, change: change);
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

  void _refresh(RehearsalMovementPage review) {
    ref.invalidate(
      eventRehearsalMovementForAccountProvider(
        review.snapshot.selection,
        account: review.account,
      ),
    );
    ref.invalidate(eventRehearsalProvider(scope.sessionId));
    ref.invalidate(eventRehearsalAssistanceForAccountProvider);
  }

  void _publish(RehearsalMovementForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<EventRehearsalBootstrap> _apply(
    RehearsalMovementForm form,
    RehearsalMovementChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventRehearsalRepositoryProvider)
          .applyMovement(change);
      if (!_current(form.review.account, epoch)) {
        throw rehearsalReviewSessionChanged;
      }
      change.requireResult(result);
      _clearPending();
      _refresh(form.review);
      _publish(
        form._after(
          RehearsalMovementPhase.saved,
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
          _refresh(form.review);
        }
        _publish(
          form._after(
            definitive
                ? RehearsalMovementPhase.refreshRequired
                : RehearsalMovementPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
