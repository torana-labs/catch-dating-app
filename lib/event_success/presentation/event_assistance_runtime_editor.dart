import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_runtime_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_result.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_senders.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_runtime_editor.g.dart';

enum AssistanceRuntimeEditorPhase {
  choosing,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef AssistanceRuntimeMutationKey = ({
  EventAssistanceRuntimeScope scope,
  AuthenticatedSession account,
});

sealed class AssistanceRuntimeEditorState {
  const AssistanceRuntimeEditorState();
  bool get canDismiss => switch (this) {
    AssistanceRuntimeForm(:final phase) =>
      phase != AssistanceRuntimeEditorPhase.submitting,
    AssistanceRuntimeIdle() || AssistanceRuntimeFormUnavailable() => true,
  };
}

final class AssistanceRuntimeIdle extends AssistanceRuntimeEditorState {
  const AssistanceRuntimeIdle();
}

final class AssistanceRuntimeFormUnavailable
    extends AssistanceRuntimeEditorState {
  const AssistanceRuntimeFormUnavailable(this.error);
  final Object error;
}

final class AssistanceRuntimeForm extends AssistanceRuntimeEditorState {
  const AssistanceRuntimeForm._(
    this._review, {
    this.phase = AssistanceRuntimeEditorPhase.choosing,
    this.change,
    this.result,
    this.error,
  });
  final AssistanceRuntimeSession _review;
  AssistanceRuntimeSession get review => _review;
  final AssistanceRuntimeEditorPhase phase;
  AssistanceRuntimeCommand? get decision => change?.command;
  final AssistanceRuntimeChange? change;
  final AssistanceRuntimeResult? result;
  final Object? error;
  bool get canSelect =>
      phase == AssistanceRuntimeEditorPhase.choosing && review.isCurrent;
  bool get canSubmit => canSelect && change != null;
  bool get canEdit => canSelect;
  bool get canRetry => phase == AssistanceRuntimeEditorPhase.retryRequired;
  bool get canReload =>
      phase == AssistanceRuntimeEditorPhase.choosing ||
      phase == AssistanceRuntimeEditorPhase.refreshRequired;
  AssistanceRuntimeForm _after(
    AssistanceRuntimeEditorPhase phase, {
    required AssistanceRuntimeChange change,
    AssistanceRuntimeResult? result,
    Object? error,
  }) => AssistanceRuntimeForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// One event owns one pending automation decision across page refresh and sheet closure.
@riverpod
class EventAssistanceRuntimeEditor extends _$EventAssistanceRuntimeEditor {
  static final changeMutation = Mutation<AssistanceRuntimeResult>();
  static AssistanceRuntimeMutationKey mutationKey(
    AssistanceRuntimeSession review,
  ) => (scope: review.view.scope, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<AssistanceRuntimeResult>? _inFlight;
  AssistanceRuntimeChange? _pending;
  void Function()? _releasePending;

  @override
  AssistanceRuntimeEditorState build(EventAssistanceRuntimeScope scope) {
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
      return AssistanceRuntimeFormUnavailable(
        authState.error ?? runtimeReviewSessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const AssistanceRuntimeIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(AssistanceRuntimeSession review) {
    if (!_current(review.account, _epoch)) {
      throw runtimeReviewSessionChanged;
    }
    final page = ref.read(eventAssistanceRuntimeProvider(review.view.scope));
    if (review.view.scope != scope ||
        page.isLoading ||
        page.hasError ||
        !review.isCurrent ||
        !identical(page.asData?.value, review)) {
      throw const ValidationException(
        'Reload the current automation settings.',
      );
    }
  }

  /// A refreshed page cannot replace this event’s unresolved decision.
  void open(AssistanceRuntimeSession review) {
    if (!_current(review.account, _epoch)) {
      throw runtimeReviewSessionChanged;
    }
    if (review.view.scope != scope) {
      throw const ValidationException(
        'Choose the reviewed automation settings.',
      );
    }
    if (_pending != null || _inFlight != null) return;
    _requireReview(review);
    state = AssistanceRuntimeForm._(review);
  }

  void reload() {
    if (!ref.mounted) return;
    final form = state;
    if (form is! AssistanceRuntimeForm ||
        !form.canReload ||
        _pending != null ||
        _inFlight != null) {
      return;
    }
    ref
        .read(eventAssistanceRuntimeProvider(form.review.view.scope).notifier)
        .reload();
    state = const AssistanceRuntimeIdle();
  }

  void select(
    AssistanceRuntimeCommand? decision, {
    AssistanceRuntimeSenderDirectory? senders,
  }) {
    if (!ref.mounted) return;
    final form = state;
    if (form is! AssistanceRuntimeForm || !form.canSelect || _pending != null) {
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
          : form.review.view.prepareChange(
              requestId: 'runtime:$id',
              command: decision,
              reviewedSenders: decision is AssistanceRuntimeConfigure
                  ? senders?.requireReview(form.review)
                  : null,
            );
      state = AssistanceRuntimeForm._(form.review, change: change);
    } catch (error) {
      state = AssistanceRuntimeForm._(form.review, error: error);
    }
  }

  Future<AssistanceRuntimeResult> submit() {
    if (!ref.mounted) return Future.error(runtimeReviewSessionChanged);
    final form = state;
    if (form is! AssistanceRuntimeForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(runtimeReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) return Future.value(result);
    if (!form.canSubmit || _pending != null) {
      return Future.error(
        const ValidationException(
          'Review an automation decision before continuing.',
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

  Future<AssistanceRuntimeResult> retry() {
    if (!ref.mounted) return Future.error(runtimeReviewSessionChanged);
    final form = state;
    if (form is! AssistanceRuntimeForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(runtimeReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException('There is no automation decision to retry.'),
      );
    }
    return _submit(form, _pending!);
  }

  Future<AssistanceRuntimeResult> _submit(
    AssistanceRuntimeForm form,
    AssistanceRuntimeChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<AssistanceRuntimeResult>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(
      AssistanceRuntimeEditorPhase.submitting,
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

  void _refresh() {
    ref.invalidate(eventAssistanceRuntimeForAccountProvider);
  }

  void _publish(AssistanceRuntimeForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<AssistanceRuntimeResult> _apply(
    AssistanceRuntimeForm form,
    AssistanceRuntimeChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventAssistanceRuntimeCommandsProvider)
          .apply(change);
      if (!_current(form.review.account, epoch)) {
        throw runtimeReviewSessionChanged;
      }
      result.requireChange(change, actorUid: form.review.account.uid);
      _clearPending();
      _refresh();
      _publish(
        form._after(
          AssistanceRuntimeEditorPhase.saved,
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
                ? AssistanceRuntimeEditorPhase.refreshRequired
                : AssistanceRuntimeEditorPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
