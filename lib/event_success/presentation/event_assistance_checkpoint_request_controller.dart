import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_checkpoint_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_request_provider.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_checkpoint_request_controller.g.dart';

enum CheckpointRequestPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef CheckpointRequestMutationKey = ({
  EventAssistanceCheckpointScope scope,
  AuthenticatedSession account,
});

sealed class CheckpointRequestEditorState {
  const CheckpointRequestEditorState();
  bool get canDismiss => switch (this) {
    CheckpointRequestForm(:final phase) =>
      phase != CheckpointRequestPhase.submitting,
    CheckpointRequestIdle() || CheckpointRequestUnavailable() => true,
  };
}

final class CheckpointRequestIdle extends CheckpointRequestEditorState {
  const CheckpointRequestIdle();
}

final class CheckpointRequestUnavailable extends CheckpointRequestEditorState {
  const CheckpointRequestUnavailable(this.error);
  final Object error;
}

final class CheckpointRequestForm extends CheckpointRequestEditorState {
  const CheckpointRequestForm._(
    this._review, {
    this.phase = CheckpointRequestPhase.ready,
    this.change,
    this.result,
    this.error,
  });
  final EventAssistanceCheckpointRequestSession _review;
  EventAssistanceCheckpointRequestSession get review => _review;
  final CheckpointRequestPhase phase;
  final EventAssistanceCheckpointRequestChange? change;
  final EventAssistanceCheckpointResult? result;
  final Object? error;
  bool get canSelect =>
      phase == CheckpointRequestPhase.ready && review.view.canAct;
  bool get canSubmit => canSelect && change != null;
  bool get canRetry => phase == CheckpointRequestPhase.retryRequired;
  bool get canReload =>
      phase == CheckpointRequestPhase.ready ||
      phase == CheckpointRequestPhase.refreshRequired;
  CheckpointRequestForm _after(
    CheckpointRequestPhase phase, {
    required EventAssistanceCheckpointRequestChange change,
    EventAssistanceCheckpointResult? result,
    Object? error,
  }) => CheckpointRequestForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// One departure owns one pending request action across review refresh and sheet closure.
@riverpod
class EventAssistanceCheckpointRequestController
    extends _$EventAssistanceCheckpointRequestController {
  static final changeMutation = Mutation<EventAssistanceCheckpointResult>();
  static CheckpointRequestMutationKey mutationKey(
    EventAssistanceCheckpointRequestSession review,
  ) => (scope: review.view.scope, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventAssistanceCheckpointResult>? _inFlight;
  EventAssistanceCheckpointRequestChange? _pending;
  void Function()? _releasePending;

  @override
  CheckpointRequestEditorState build(EventAssistanceCheckpointScope scope) {
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
      return CheckpointRequestUnavailable(
        authState.error ?? checkpointRequestSessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const CheckpointRequestIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(EventAssistanceCheckpointRequestSession review) {
    if (!_current(review.account, _epoch)) {
      throw checkpointRequestSessionChanged;
    }
    final page = ref.read(
      eventAssistanceCheckpointRequestProvider(review.view.scope),
    );
    if (review.view.scope != scope ||
        page.isLoading ||
        page.hasError ||
        !review.isCurrent ||
        !identical(page.asData?.value, review)) {
      throw const ValidationException('Reload the current checkpoint request.');
    }
  }

  /// A refreshed roster cannot replace this departure’s unresolved action.
  void open(EventAssistanceCheckpointRequestSession review) {
    if (!_current(review.account, _epoch)) {
      throw checkpointRequestSessionChanged;
    }
    if (review.view.scope != scope) {
      throw const ValidationException(
        'Choose the reviewed checkpoint departure.',
      );
    }
    if (_pending != null || _inFlight != null) return;
    _requireReview(review);
    state = CheckpointRequestForm._(review);
  }

  void reload() {
    if (!ref.mounted) return;
    final form = state;
    if (form is! CheckpointRequestForm ||
        !form.canReload ||
        _pending != null ||
        _inFlight != null) {
      return;
    }
    ref.read(eventAssistanceCheckpointRequestProvider(scope).notifier).reload();
    state = const CheckpointRequestIdle();
  }

  void select(CheckpointRequestDecision? decision) {
    if (!ref.mounted) return;
    final form = state;
    if (form is! CheckpointRequestForm || !form.canSelect || _pending != null) {
      return;
    }
    try {
      _requireReview(form.review);
      final random = Random.secure();
      final id = List.generate(
        16,
        (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join();
      final change = decision == null
          ? null
          : EventAssistanceCheckpointRequestChange(
              review: form.review.view,
              decision: decision,
              operationId: 'checkpoint-request:$id',
            );
      state = CheckpointRequestForm._(form.review, change: change);
    } catch (error) {
      state = CheckpointRequestForm._(form.review, error: error);
    }
  }

  Future<EventAssistanceCheckpointResult> submit() {
    if (!ref.mounted) return Future.error(checkpointRequestSessionChanged);
    final form = state;
    if (form is! CheckpointRequestForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(checkpointRequestSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) return Future.value(result);
    if (!form.canSubmit || _pending != null) {
      return Future.error(
        const ValidationException(
          'Review a checkpoint request action before continuing.',
        ),
      );
    }
    try {
      _requireReview(form.review);
      return _submit(form, form.change!);
    } catch (error, stackTrace) {
      return Future.error(error, stackTrace);
    }
  }

  Future<EventAssistanceCheckpointResult> retry() {
    if (!ref.mounted) return Future.error(checkpointRequestSessionChanged);
    final form = state;
    if (form is! CheckpointRequestForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(checkpointRequestSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException(
          'There is no checkpoint request action to retry.',
        ),
      );
    }
    return _submit(form, _pending!);
  }

  Future<EventAssistanceCheckpointResult> _submit(
    CheckpointRequestForm form,
    EventAssistanceCheckpointRequestChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventAssistanceCheckpointResult>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(CheckpointRequestPhase.submitting, change: change);
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

  void _refresh() {
    ref.invalidate(
      eventAssistanceCheckpointForAccountProvider(scope, account: _account!),
    );
  }

  void _publish(CheckpointRequestForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<EventAssistanceCheckpointResult> _apply(
    CheckpointRequestForm form,
    EventAssistanceCheckpointRequestChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventAssistanceCheckpointRepositoryProvider)
          .manageRequest(change);
      if (!_current(form.review.account, epoch)) {
        throw checkpointRequestSessionChanged;
      }
      change.requireResult(result);
      _clearPending();
      _refresh();
      _publish(
        form._after(
          CheckpointRequestPhase.saved,
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
          _refresh();
        }
        _publish(
          form._after(
            definitive
                ? CheckpointRequestPhase.refreshRequired
                : CheckpointRequestPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
