import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_accountability_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_accountability_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_host_guests_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_accountability_controller.g.dart';

enum AccountabilityPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef AccountabilityMutationKey = ({
  EventAssistanceGuestScope guest,
  AuthenticatedSession account,
});

sealed class AccountabilityEditorState {
  const AccountabilityEditorState();
  bool get canDismiss => switch (this) {
    AccountabilityForm(:final phase) => phase != AccountabilityPhase.submitting,
    AccountabilityIdle() || AccountabilityUnavailable() => true,
  };
}

final class AccountabilityIdle extends AccountabilityEditorState {
  const AccountabilityIdle();
}

final class AccountabilityUnavailable extends AccountabilityEditorState {
  const AccountabilityUnavailable(this.error);
  final Object error;
}

final class AccountabilityForm extends AccountabilityEditorState {
  const AccountabilityForm._(
    this._review, {
    this.phase = AccountabilityPhase.ready,
    this.change,
    this.result,
    this.error,
  });
  final EventAssistanceAccountabilitySession _review;
  EventAssistanceAccountabilitySession get review => _review;
  final AccountabilityPhase phase;
  final EventAssistanceAccountabilityChange? change;
  final EventAssistanceAccountabilityResult? result;
  final Object? error;
  bool get canSelect =>
      phase == AccountabilityPhase.ready && review.view.canResolve;
  bool get canSubmit => canSelect && change != null;
  bool get canRetry => phase == AccountabilityPhase.retryRequired;
  bool get canReload =>
      phase == AccountabilityPhase.ready ||
      phase == AccountabilityPhase.refreshRequired;
  AccountabilityForm _after(
    AccountabilityPhase phase, {
    required EventAssistanceAccountabilityChange change,
    EventAssistanceAccountabilityResult? result,
    Object? error,
  }) => AccountabilityForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// One guest owns one pending visit result across groups, checkpoints and sheet closure.
@riverpod
class EventAssistanceAccountabilityController
    extends _$EventAssistanceAccountabilityController {
  static final changeMutation = Mutation<EventAssistanceAccountabilityResult>();
  static AccountabilityMutationKey mutationKey(
    EventAssistanceAccountabilitySession review,
  ) => (guest: review.view.scope.guest, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventAssistanceAccountabilityResult>? _inFlight;
  EventAssistanceAccountabilityChange? _pending;
  void Function()? _releasePending;

  @override
  AccountabilityEditorState build(EventAssistanceGuestScope guest) {
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
      return AccountabilityUnavailable(
        authState.error ?? accountabilitySessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const AccountabilityIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(EventAssistanceAccountabilitySession review) {
    if (!_current(review.account, _epoch)) throw accountabilitySessionChanged;
    final page = ref.read(
      eventAssistanceAccountabilityProvider(review.view.scope),
    );
    if (review.view.scope.guest != guest ||
        page.isLoading ||
        page.hasError ||
        !review.isCurrent ||
        !identical(page.asData?.value, review)) {
      throw const ValidationException(
        'Reload the current visit accountability.',
      );
    }
  }

  /// Another group or checkpoint review cannot replace this guest’s unresolved decision.
  void open(EventAssistanceAccountabilitySession review) {
    if (!_current(review.account, _epoch)) throw accountabilitySessionChanged;
    if (review.view.scope.guest != guest) {
      throw const ValidationException('Choose the reviewed guest.');
    }
    if (_pending != null || _inFlight != null) return;
    _requireReview(review);
    state = AccountabilityForm._(review);
  }

  /// A new review is allowed only when no earlier decision is unresolved.
  void reload() {
    final form = state;
    if (form is! AccountabilityForm ||
        !form.canReload ||
        _pending != null ||
        _inFlight != null) {
      return;
    }
    _refresh();
    state = const AccountabilityIdle();
  }

  void select(AssistanceVisitDisposition? disposition) {
    final form = state;
    if (form is! AccountabilityForm || !form.canSelect || _pending != null) {
      return;
    }
    try {
      _requireReview(form.review);
      final random = Random.secure();
      final id = List.generate(
        16,
        (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join();
      final change = disposition == null
          ? null
          : EventAssistanceAccountabilityChange(
              snapshot: form.review.view,
              disposition: disposition,
              operationId: 'accountability:$id',
            );
      state = AccountabilityForm._(form.review, change: change);
    } catch (error) {
      state = AccountabilityForm._(form.review, error: error);
    }
  }

  Future<EventAssistanceAccountabilityResult> submit() {
    final form = state;
    if (form is! AccountabilityForm || !_current(form.review.account, _epoch)) {
      return Future.error(accountabilitySessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) return Future.value(result);
    if (!form.canSubmit || _pending != null) {
      return Future.error(
        const ValidationException('Review a visit result before continuing.'),
      );
    }
    try {
      _requireReview(form.review);
      return _submit(form, form.change!);
    } catch (error, stackTrace) {
      return Future.error(error, stackTrace);
    }
  }

  Future<EventAssistanceAccountabilityResult> retry() {
    final form = state;
    if (form is! AccountabilityForm || !_current(form.review.account, _epoch)) {
      return Future.error(accountabilitySessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException('There is no visit result to retry.'),
      );
    }
    return _submit(form, _pending!);
  }

  Future<EventAssistanceAccountabilityResult> _submit(
    AccountabilityForm form,
    EventAssistanceAccountabilityChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventAssistanceAccountabilityResult>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(AccountabilityPhase.submitting, change: change);
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
    ref.invalidate(eventAssistanceAccountabilityForAccountProvider);
    ref.invalidate(eventAssistanceHostGuestsForAccountProvider);
  }

  void _publish(AccountabilityForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<EventAssistanceAccountabilityResult> _apply(
    AccountabilityForm form,
    EventAssistanceAccountabilityChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventAssistanceAccountabilityRepositoryProvider)
          .apply(change);
      if (!_current(form.review.account, epoch)) {
        throw accountabilitySessionChanged;
      }
      change.requireResult(result);
      _clearPending();
      _refresh();
      _publish(
        form._after(AccountabilityPhase.saved, change: change, result: result),
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
                ? AccountabilityPhase.refreshRequired
                : AccountabilityPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
