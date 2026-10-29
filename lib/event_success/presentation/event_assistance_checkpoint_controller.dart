import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_checkpoint_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_change.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_checkpoint_controller.g.dart';

enum CheckpointPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef CheckpointMutationKey = ({
  EventAssistanceCheckpointScope scope,
  AuthenticatedSession account,
});

sealed class CheckpointEditorState {
  const CheckpointEditorState();
  bool get canDismiss => switch (this) {
    CheckpointForm(:final phase) => phase != CheckpointPhase.submitting,
    CheckpointIdle() || CheckpointUnavailable() => true,
  };
}

final class CheckpointIdle extends CheckpointEditorState {
  const CheckpointIdle();
}

final class CheckpointUnavailable extends CheckpointEditorState {
  const CheckpointUnavailable(this.error);
  final Object error;
}

final class CheckpointForm extends CheckpointEditorState {
  const CheckpointForm._(
    this._review, {
    this.phase = CheckpointPhase.ready,
    this.change,
    this.result,
    this.error,
  });
  final EventAssistanceCheckpointSession _review;
  EventAssistanceCheckpointSession get review => _review;
  final CheckpointPhase phase;
  final EventAssistanceCheckpointChange? change;
  final EventAssistanceCheckpointResult? result;
  final Object? error;
  bool get canSelect => phase == CheckpointPhase.ready && review.view.canReport;
  bool get canSubmit => canSelect && change != null;
  bool get canRetry => phase == CheckpointPhase.retryRequired;
  bool get canReload =>
      phase == CheckpointPhase.ready ||
      phase == CheckpointPhase.refreshRequired ||
      phase == CheckpointPhase.saved;
  CheckpointForm _after(
    CheckpointPhase phase, {
    required EventAssistanceCheckpointChange change,
    EventAssistanceCheckpointResult? result,
    Object? error,
  }) => CheckpointForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// One recorded departure owns one pending checkpoint report across review refresh and sheet closure.
@riverpod
class EventAssistanceCheckpointController
    extends _$EventAssistanceCheckpointController {
  static final changeMutation = Mutation<EventAssistanceCheckpointResult>();
  static CheckpointMutationKey mutationKey(
    EventAssistanceCheckpointSession review,
  ) => (scope: review.view.scope, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventAssistanceCheckpointResult>? _inFlight;
  EventAssistanceCheckpointChange? _pending;
  void Function()? _releasePending;

  @override
  CheckpointEditorState build(EventAssistanceCheckpointScope scope) {
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
      return CheckpointUnavailable(authState.error ?? checkpointSessionChanged);
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const CheckpointIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(EventAssistanceCheckpointSession review) {
    if (!_current(review.account, _epoch)) throw checkpointSessionChanged;
    final page = ref.read(eventAssistanceCheckpointProvider(review.view.scope));
    if (review.view.scope != scope ||
        page.isLoading ||
        page.hasError ||
        !review.isCurrent ||
        !identical(page.asData?.value, review)) {
      throw const ValidationException(
        'Reload the current checkpoint arrivals.',
      );
    }
  }

  /// A refreshed roster cannot replace this departure’s unresolved report.
  void open(EventAssistanceCheckpointSession review) {
    if (!_current(review.account, _epoch)) throw checkpointSessionChanged;
    if (review.view.scope != scope) {
      throw const ValidationException(
        'Choose the reviewed checkpoint departure.',
      );
    }
    if (_pending != null || _inFlight != null) return;
    _requireReview(review);
    state = CheckpointForm._(review);
  }

  void reload() {
    if (!ref.mounted) return;
    final form = state;
    if (form is! CheckpointForm ||
        !form.canReload ||
        _pending != null ||
        _inFlight != null) {
      return;
    }
    _refresh();
    state = const CheckpointIdle();
  }

  void select(AssistanceCheckpointObservation? decision) {
    final form = state;
    if (form is! CheckpointForm || !form.canSelect || _pending != null) {
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
          : EventAssistanceCheckpointChange(
              snapshot: form.review.view,
              decision: decision,
              actorUid: form.review.account.uid,
              operationId: 'checkpoint:$id',
            );
      state = CheckpointForm._(form.review, change: change);
    } catch (error) {
      state = CheckpointForm._(form.review, error: error);
    }
  }

  Future<EventAssistanceCheckpointResult> submit() {
    final form = state;
    if (form is! CheckpointForm || !_current(form.review.account, _epoch)) {
      return Future.error(checkpointSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) return Future.value(result);
    if (!form.canSubmit || _pending != null) {
      return Future.error(
        const ValidationException(
          'Review a checkpoint report before continuing.',
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
    final form = state;
    if (form is! CheckpointForm || !_current(form.review.account, _epoch)) {
      return Future.error(checkpointSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException('There is no checkpoint report to retry.'),
      );
    }
    return _submit(form, _pending!);
  }

  Future<EventAssistanceCheckpointResult> _submit(
    CheckpointForm form,
    EventAssistanceCheckpointChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventAssistanceCheckpointResult>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(CheckpointPhase.submitting, change: change);
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

  void _publish(CheckpointForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<EventAssistanceCheckpointResult> _apply(
    CheckpointForm form,
    EventAssistanceCheckpointChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventAssistanceCheckpointRepositoryProvider)
          .apply(change);
      if (!_current(form.review.account, epoch)) {
        throw checkpointSessionChanged;
      }
      change.requireResult(result);
      _clearPending();
      _refresh();
      _publish(
        form._after(CheckpointPhase.saved, change: change, result: result),
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
                ? CheckpointPhase.refreshRequired
                : CheckpointPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
