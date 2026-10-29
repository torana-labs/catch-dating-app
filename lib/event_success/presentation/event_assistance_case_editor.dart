import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_cases_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_cases_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_pending_cases.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_case_editor.g.dart';

enum AssistanceCaseEditorPhase {
  choosing,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef AssistanceCaseMutationKey = ({
  EventAssistanceCaseScope scope,
  AuthenticatedSession account,
});

sealed class AssistanceCaseEditorState {
  const AssistanceCaseEditorState();
  bool get canDismiss => switch (this) {
    AssistanceCaseForm(:final phase) =>
      phase != AssistanceCaseEditorPhase.submitting,
    AssistanceCaseIdle() || AssistanceCaseFormUnavailable() => true,
  };
}

final class AssistanceCaseIdle extends AssistanceCaseEditorState {
  const AssistanceCaseIdle();
}

final class AssistanceCaseFormUnavailable extends AssistanceCaseEditorState {
  const AssistanceCaseFormUnavailable(this.error);
  final Object error;
}

final class AssistanceCaseForm extends AssistanceCaseEditorState {
  const AssistanceCaseForm._(
    this._review, {
    this.phase = AssistanceCaseEditorPhase.choosing,
    this.change,
    this.result,
    this.error,
  });
  final EventAssistanceCaseReview _review;
  EventAssistanceCaseReview get review => _review;
  final AssistanceCaseEditorPhase phase;
  AssistanceCaseDecision? get decision => change?.decision;
  final EventAssistanceCaseChange? change;
  final EventAssistanceCaseResult? result;
  final Object? error;
  bool get canSelect =>
      phase == AssistanceCaseEditorPhase.choosing && review.isCurrent;
  bool get canSubmit => canSelect && change != null;
  bool get canEdit => canSelect;
  bool get canRetry => phase == AssistanceCaseEditorPhase.retryRequired;
  bool get canReload =>
      phase == AssistanceCaseEditorPhase.choosing ||
      phase == AssistanceCaseEditorPhase.refreshRequired;
  AssistanceCaseForm _after(
    AssistanceCaseEditorPhase phase, {
    required EventAssistanceCaseChange change,
    EventAssistanceCaseResult? result,
    Object? error,
  }) => AssistanceCaseForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// One case owns one pending decision across page refresh and sheet closure.
@riverpod
class EventAssistanceCaseEditor extends _$EventAssistanceCaseEditor {
  static final changeMutation = Mutation<EventAssistanceCaseResult>();
  static AssistanceCaseMutationKey mutationKey(
    EventAssistanceCaseReview review,
  ) => (scope: review.request.scope, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventAssistanceCaseResult>? _inFlight;
  EventAssistanceCaseChange? _pending;
  void Function()? _releasePending;

  @override
  AssistanceCaseEditorState build(EventAssistanceCaseScope scope) {
    final auth = ref.watch(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    _epoch++;
    _account = null;
    _clearPending(updateIndex: false);
    _inFlight = null;
    ref.onDispose(() {
      _epoch++;
      _clearPending(updateIndex: false);
    });
    if (!authState.isSettledData || authState.value == null) {
      return AssistanceCaseFormUnavailable(
        authState.error ?? caseReviewSessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const AssistanceCaseIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(EventAssistanceCaseReview review) {
    if (!_current(review.account, _epoch)) {
      throw caseReviewSessionChanged;
    }
    final page = ref.read(
      eventAssistanceCasesProvider(review.session.page.query),
    );
    if (review.request.scope != scope ||
        page.isLoading ||
        page.hasError ||
        !review.isCurrent ||
        !identical(page.asData?.value, review.session)) {
      throw const ValidationException('Reload the current help request.');
    }
  }

  /// A refreshed queue cannot replace this case’s unresolved decision.
  void open(EventAssistanceCaseReview review) {
    if (!_current(review.account, _epoch)) {
      throw caseReviewSessionChanged;
    }
    if (review.request.scope != scope) {
      throw const ValidationException('Choose the reviewed help request.');
    }
    if (_pending != null || _inFlight != null) return;
    _requireReview(review);
    state = AssistanceCaseForm._(review);
  }

  void reload() {
    if (!ref.mounted) return;
    final form = state;
    if (form is! AssistanceCaseForm ||
        !form.canReload ||
        _pending != null ||
        _inFlight != null) {
      return;
    }
    ref
        .read(
          eventAssistanceCasesProvider(form.review.session.page.query).notifier,
        )
        .reload();
    state = const AssistanceCaseIdle();
  }

  void select(AssistanceCaseDecision? decision) {
    if (!ref.mounted) return;
    final form = state;
    if (form is! AssistanceCaseForm || !form.canSelect || _pending != null) {
      return;
    }
    try {
      _requireReview(form.review);
      final choices = form.review.session.page.managerOptions;
      if (decision is AssistanceCaseTransfer &&
          decision.managerUid != form.review.account.uid &&
          (choices == null || !choices.contains(decision.managerUid))) {
        throw const ValidationException(
          'Choose a host from this request review.',
        );
      }
      final random = Random.secure();
      final id = List.generate(
        16,
        (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join();
      final change = decision == null
          ? null
          : EventAssistanceCaseChange(
              snapshot: form.review.request,
              actorUid: form.review.account.uid,
              decision: decision,
              operationId: 'case:$id',
            );
      state = AssistanceCaseForm._(form.review, change: change);
    } catch (error) {
      state = AssistanceCaseForm._(form.review, error: error);
    }
  }

  Future<EventAssistanceCaseResult> submit() {
    if (!ref.mounted) return Future.error(caseReviewSessionChanged);
    final form = state;
    if (form is! AssistanceCaseForm || !_current(form.review.account, _epoch)) {
      return Future.error(caseReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) return Future.value(result);
    if (!form.canSubmit || _pending != null) {
      return Future.error(
        const ValidationException(
          'Review a help request action before continuing.',
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

  Future<EventAssistanceCaseResult> retry() {
    if (!ref.mounted) return Future.error(caseReviewSessionChanged);
    final form = state;
    if (form is! AssistanceCaseForm || !_current(form.review.account, _epoch)) {
      return Future.error(caseReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException('There is no help request action to retry.'),
      );
    }
    return _submit(form, _pending!);
  }

  Future<EventAssistanceCaseResult> _submit(
    AssistanceCaseForm form,
    EventAssistanceCaseChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventAssistanceCaseResult>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(AssistanceCaseEditorPhase.submitting, change: change);
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
    ref
        .read(eventAssistancePendingCasesProvider.notifier)
        .retain(scope, account);
    // A kept-alive sheet can have paused provider dependencies. This temporary
    // strong subscription detects unseen sign-out/account changes while pending.
    final auth = ref.container.listen(authenticatedSessionProvider, (_, next) {
      if (next.isLoading ||
          next.hasError ||
          !identical(next.asData?.value, account)) {
        _epoch++;
        _account = null;
        _inFlight = null;
        _clearPending(updateIndex: false);
        if (ref.mounted) ref.invalidateSelf();
      }
    });
    _releasePending = () {
      auth.close();
      lease.close();
    };
  }

  void _clearPending({bool updateIndex = true}) {
    if (updateIndex && _pending != null && ref.mounted) {
      ref
          .read(eventAssistancePendingCasesProvider.notifier)
          .release(scope, _account);
    }
    _pending = null;
    final release = _releasePending;
    _releasePending = null;
    release?.call();
  }

  void _refresh() {
    ref.invalidate(eventAssistanceCasesForAccountProvider);
  }

  void _publish(AssistanceCaseForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<EventAssistanceCaseResult> _apply(
    AssistanceCaseForm form,
    EventAssistanceCaseChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventAssistanceCaseCommandsProvider)
          .apply(change);
      if (!_current(form.review.account, epoch)) {
        throw caseReviewSessionChanged;
      }
      result.requireChange(change);
      _clearPending();
      _refresh();
      _publish(
        form._after(
          AssistanceCaseEditorPhase.saved,
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
                ? AssistanceCaseEditorPhase.refreshRequired
                : AssistanceCaseEditorPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
