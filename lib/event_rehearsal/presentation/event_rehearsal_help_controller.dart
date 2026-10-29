import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_help_requests.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_pending_help.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_help_controller.g.dart';

final class _RehearsalHelpReview {
  const _RehearsalHelpReview(this.session, this.request);
  final RehearsalAssistanceReview session;
  final RehearsalOpenHelpCase request;
  AuthenticatedSession get account => session.account;
  bool get isCurrent => session.isCurrent;
  RehearsalHelpScope get scope => rehearsalHelpScope(session.snapshot, request);
}

enum RehearsalHelpEditorPhase {
  choosing,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef RehearsalHelpMutationKey = ({
  RehearsalHelpScope scope,
  AuthenticatedSession account,
});

sealed class RehearsalHelpEditorState {
  const RehearsalHelpEditorState();
  bool get canDismiss => switch (this) {
    RehearsalHelpForm(:final phase) =>
      phase != RehearsalHelpEditorPhase.submitting,
    RehearsalHelpIdle() || RehearsalHelpFormUnavailable() => true,
  };
}

final class RehearsalHelpIdle extends RehearsalHelpEditorState {
  const RehearsalHelpIdle();
}

final class RehearsalHelpFormUnavailable extends RehearsalHelpEditorState {
  const RehearsalHelpFormUnavailable(this.error);
  final Object error;
}

final class RehearsalHelpForm extends RehearsalHelpEditorState {
  const RehearsalHelpForm._(
    this._review, {
    this.phase = RehearsalHelpEditorPhase.choosing,
    this.change,
    this.result,
    this.error,
  });
  final _RehearsalHelpReview _review;
  RehearsalAssistanceReview get review => _review.session;
  RehearsalOpenHelpCase get request => _review.request;
  final RehearsalHelpEditorPhase phase;
  AssistanceCaseDecision? get decision =>
      (change?.command as RehearsalResolveAssistance?)?.decision;
  final RehearsalAssistanceChange? change;
  final EventRehearsalBootstrap? result;
  final Object? error;
  bool get canSelect =>
      phase == RehearsalHelpEditorPhase.choosing && review.isCurrent;
  bool get canSubmit => canSelect && change != null;
  bool get canEdit => canSelect;
  bool get canRetry => phase == RehearsalHelpEditorPhase.retryRequired;
  bool get canReload =>
      phase == RehearsalHelpEditorPhase.choosing ||
      phase == RehearsalHelpEditorPhase.refreshRequired;
  RehearsalHelpForm _after(
    RehearsalHelpEditorPhase phase, {
    required RehearsalAssistanceChange change,
    EventRehearsalBootstrap? result,
    Object? error,
  }) => RehearsalHelpForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// One case owns one pending decision across page refresh and sheet closure.
@riverpod
class EventRehearsalHelpController extends _$EventRehearsalHelpController {
  static final changeMutation = Mutation<EventRehearsalBootstrap>();
  static RehearsalHelpMutationKey mutationKey(
    RehearsalAssistanceReview review,
    RehearsalOpenHelpCase request,
  ) => (
    scope: rehearsalHelpScope(review.snapshot, request),
    account: review.account,
  );

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventRehearsalBootstrap>? _inFlight;
  RehearsalAssistanceChange? _pending;
  void Function()? _releasePending;

  @override
  RehearsalHelpEditorState build(RehearsalHelpScope scope) {
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
      return RehearsalHelpFormUnavailable(
        authState.error ?? rehearsalReviewSessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const RehearsalHelpIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(_RehearsalHelpReview review) {
    if (!_current(review.account, _epoch)) {
      throw rehearsalReviewSessionChanged;
    }
    final page = ref.read(
      eventRehearsalAssistanceProvider(
        scope.sessionId,
        practiceOperatorId:
            review.session.snapshot.staffReview?.practiceOperatorId,
      ),
    );
    if (review.scope != scope ||
        page.isLoading ||
        page.hasError ||
        !review.isCurrent ||
        !identical(page.asData?.value, review.session)) {
      throw const ValidationException('Reload the current help request.');
    }
  }

  /// A refreshed queue cannot replace this case’s unresolved decision.
  void open(RehearsalAssistanceReview session, RehearsalOpenHelpCase request) {
    final review = _RehearsalHelpReview(session, request);
    if (!_current(review.account, _epoch)) {
      throw rehearsalReviewSessionChanged;
    }
    if (review.scope != scope) {
      throw const ValidationException('Choose the reviewed help request.');
    }
    if (_pending != null || _inFlight != null) return;
    _requireReview(review);
    state = RehearsalHelpForm._(review);
  }

  void reload() {
    if (!ref.mounted) return;
    final form = state;
    if (form is! RehearsalHelpForm ||
        !form.canReload ||
        _pending != null ||
        _inFlight != null) {
      return;
    }
    ref
        .read(
          eventRehearsalAssistanceProvider(
            scope.sessionId,
            practiceOperatorId:
                form.review.snapshot.staffReview?.practiceOperatorId,
          ).notifier,
        )
        .reload();
    state = const RehearsalHelpIdle();
  }

  void select(AssistanceCaseDecision? decision) {
    if (!ref.mounted) return;
    final form = state;
    if (form is! RehearsalHelpForm || !form.canSelect || _pending != null) {
      return;
    }
    try {
      _requireReview(form._review);
      final choices = form.review.snapshot.helpRequests?.managerOptions;
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
          : RehearsalAssistanceChange(
              snapshot: form.review.snapshot,
              command: RehearsalResolveAssistance(
                snapshot: form.request,
                actorUid: form.review.account.uid,
                decision: decision,
              ),
              clientActionId: 'help_$id',
            );
      state = RehearsalHelpForm._(form._review, change: change);
    } catch (error) {
      state = RehearsalHelpForm._(form._review, error: error);
    }
  }

  Future<EventRehearsalBootstrap> submit() {
    if (!ref.mounted) return Future.error(rehearsalReviewSessionChanged);
    final form = state;
    if (form is! RehearsalHelpForm || !_current(form.review.account, _epoch)) {
      return Future.error(rehearsalReviewSessionChanged);
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
      _requireReview(form._review);
      return _submit(form, form.change!);
    } catch (error, stackTrace) {
      return Future.error(error, stackTrace);
    }
  }

  Future<EventRehearsalBootstrap> retry() {
    if (!ref.mounted) return Future.error(rehearsalReviewSessionChanged);
    final form = state;
    if (form is! RehearsalHelpForm || !_current(form.review.account, _epoch)) {
      return Future.error(rehearsalReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException('There is no help request action to retry.'),
      );
    }
    return _submit(form, _pending!);
  }

  Future<EventRehearsalBootstrap> _submit(
    RehearsalHelpForm form,
    RehearsalAssistanceChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventRehearsalBootstrap>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(RehearsalHelpEditorPhase.submitting, change: change);
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
    ref.read(eventRehearsalPendingHelpProvider.notifier).retain(scope, account);
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
          .read(eventRehearsalPendingHelpProvider.notifier)
          .release(scope, _account);
    }
    _pending = null;
    final release = _releasePending;
    _releasePending = null;
    release?.call();
  }

  void _refresh() {
    ref.invalidate(eventRehearsalProvider(scope.sessionId));
    ref.invalidate(eventRehearsalAssistanceForAccountProvider);
  }

  void _publish(RehearsalHelpForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<EventRehearsalBootstrap> _apply(
    RehearsalHelpForm form,
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
      _refresh();
      _publish(
        form._after(
          RehearsalHelpEditorPhase.saved,
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
                ? RehearsalHelpEditorPhase.refreshRequired
                : RehearsalHelpEditorPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
