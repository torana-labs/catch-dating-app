import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_membership_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_host_guests_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_membership_controller.g.dart';

enum MembershipPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef MembershipMutationKey = ({
  EventAssistanceGuestScope scope,
  AuthenticatedSession account,
});

sealed class MembershipEditorState {
  const MembershipEditorState();
  bool get canDismiss => switch (this) {
    MembershipForm(:final phase) => phase != MembershipPhase.submitting,
    MembershipIdle() || MembershipUnavailable() => true,
  };
}

final class MembershipIdle extends MembershipEditorState {
  const MembershipIdle();
}

final class MembershipUnavailable extends MembershipEditorState {
  const MembershipUnavailable(this.error);
  final Object error;
}

final class MembershipForm extends MembershipEditorState {
  const MembershipForm._(
    this._review, {
    this.phase = MembershipPhase.ready,
    this.change,
    this.result,
    this.error,
  });
  final EventAssistanceMembershipSession _review;
  EventAssistanceMembershipSession get review => _review;
  final MembershipPhase phase;
  final EventAssistanceMembershipChange? change;
  final EventAssistanceMembershipResult? result;
  final Object? error;
  bool get canSelect => phase == MembershipPhase.ready;
  bool get canSubmit => canSelect && change != null;
  bool get canRetry => phase == MembershipPhase.retryRequired;
  bool get canReload =>
      phase == MembershipPhase.ready ||
      phase == MembershipPhase.refreshRequired;
  MembershipForm _after(
    MembershipPhase phase, {
    required EventAssistanceMembershipChange change,
    EventAssistanceMembershipResult? result,
    Object? error,
  }) => MembershipForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// One guest owns one pending group decision across review refresh and closure.
@riverpod
class EventAssistanceMembershipController
    extends _$EventAssistanceMembershipController {
  static final changeMutation = Mutation<EventAssistanceMembershipResult>();
  static MembershipMutationKey mutationKey(
    EventAssistanceMembershipSession review,
  ) => (scope: review.view.scope, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventAssistanceMembershipResult>? _inFlight;
  EventAssistanceMembershipChange? _pending;
  void Function()? _releasePending;

  @override
  MembershipEditorState build(EventAssistanceGuestScope scope) {
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
      return MembershipUnavailable(authState.error ?? membershipSessionChanged);
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const MembershipIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(EventAssistanceMembershipSession review) {
    if (!_current(review.account, _epoch)) throw membershipSessionChanged;
    final page = ref.read(eventAssistanceMembershipProvider(scope));
    if (review.view.scope != scope ||
        page.isLoading ||
        page.hasError ||
        !review.isCurrent ||
        !identical(page.asData?.value, review)) {
      throw const ValidationException('Reload the current group membership.');
    }
  }

  /// A refreshed review cannot replace an unresolved decision for this guest.
  void open(EventAssistanceMembershipSession review) {
    if (!_current(review.account, _epoch)) throw membershipSessionChanged;
    if (review.view.scope != scope) {
      throw const ValidationException('Choose the reviewed guest.');
    }
    if (_pending != null || _inFlight != null) return;
    _requireReview(review);
    state = MembershipForm._(review);
  }

  void reload() {
    final form = state;
    if (form is! MembershipForm ||
        !form.canReload ||
        _pending != null ||
        _inFlight != null) {
      return;
    }
    _refresh(form.review.account);
    state = const MembershipIdle();
  }

  void select(AssistanceMembershipDecision? decision) {
    final form = state;
    if (form is! MembershipForm || !form.canSelect || _pending != null) return;
    try {
      _requireReview(form.review);
      final random = Random.secure();
      final id = List.generate(
        16,
        (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join();
      final change = decision == null
          ? null
          : EventAssistanceMembershipChange(
              snapshot: form.review.view,
              decision: decision,
              actorUid: form.review.account.uid,
              operationId: 'membership:$id',
            );
      state = MembershipForm._(form.review, change: change);
    } catch (error) {
      state = MembershipForm._(form.review, error: error);
    }
  }

  Future<EventAssistanceMembershipResult> submit() {
    final form = state;
    if (form is! MembershipForm || !_current(form.review.account, _epoch)) {
      return Future.error(membershipSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) return Future.value(result);
    if (!form.canSubmit || _pending != null) {
      return Future.error(
        const ValidationException('Review a group decision before continuing.'),
      );
    }
    try {
      _requireReview(form.review);
      return _submit(form, form.change!);
    } catch (error, stackTrace) {
      return Future.error(error, stackTrace);
    }
  }

  Future<EventAssistanceMembershipResult> retry() {
    final form = state;
    if (form is! MembershipForm || !_current(form.review.account, _epoch)) {
      return Future.error(membershipSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException('There is no group decision to retry.'),
      );
    }
    return _submit(form, _pending!);
  }

  Future<EventAssistanceMembershipResult> _submit(
    MembershipForm form,
    EventAssistanceMembershipChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventAssistanceMembershipResult>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(MembershipPhase.submitting, change: change);
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
    ref.invalidate(
      eventAssistanceMembershipForAccountProvider(scope, account: account),
    );
    ref.invalidate(eventAssistanceHostGuestsForAccountProvider);
  }

  void _publish(MembershipForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<EventAssistanceMembershipResult> _apply(
    MembershipForm form,
    EventAssistanceMembershipChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventAssistanceMembershipRepositoryProvider)
          .apply(change);
      if (!_current(form.review.account, epoch)) {
        throw membershipSessionChanged;
      }
      change.requireResult(result);
      _clearPending();
      _refresh(form.review.account);
      _publish(
        form._after(MembershipPhase.saved, change: change, result: result),
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
                ? MembershipPhase.refreshRequired
                : MembershipPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
