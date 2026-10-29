import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_group_staff_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff_change.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_group_staff_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_group_staff_controller.g.dart';

enum GroupStaffPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef GroupStaffMutationKey = ({
  EventAssistanceGroupStaffTarget target,
  AuthenticatedSession account,
});

sealed class GroupStaffEditorState {
  const GroupStaffEditorState();
  bool get canDismiss => switch (this) {
    GroupStaffForm(:final phase) => phase != GroupStaffPhase.submitting,
    GroupStaffIdle() || GroupStaffUnavailable() => true,
  };
}

final class GroupStaffIdle extends GroupStaffEditorState {
  const GroupStaffIdle();
}

final class GroupStaffUnavailable extends GroupStaffEditorState {
  const GroupStaffUnavailable(this.error);
  final Object error;
}

final class GroupStaffForm extends GroupStaffEditorState {
  const GroupStaffForm._(
    this._review, {
    this.phase = GroupStaffPhase.ready,
    this.change,
    this.result,
    this.error,
  });
  final EventAssistanceGroupStaffSession _review;
  EventAssistanceGroupStaffSession get review => _review;
  final GroupStaffPhase phase;
  final EventAssistanceGroupStaffChange? change;
  final EventAssistanceGroupStaffResult? result;
  final Object? error;
  bool get canSelect => phase == GroupStaffPhase.ready;
  bool get canSubmit => canSelect && change != null;
  bool get canRetry => phase == GroupStaffPhase.retryRequired;
  bool get canReload =>
      phase == GroupStaffPhase.ready ||
      phase == GroupStaffPhase.refreshRequired;
  GroupStaffForm _after(
    GroupStaffPhase phase, {
    required EventAssistanceGroupStaffChange change,
    EventAssistanceGroupStaffResult? result,
    Object? error,
  }) => GroupStaffForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// One verified staff account owns one pending group duty decision across lookup refresh and closure.
@riverpod
class EventAssistanceGroupStaffController
    extends _$EventAssistanceGroupStaffController {
  static final changeMutation = Mutation<EventAssistanceGroupStaffResult>();
  static GroupStaffMutationKey mutationKey(
    EventAssistanceGroupStaffSession review,
  ) => (target: review.view.target, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventAssistanceGroupStaffResult>? _inFlight;
  EventAssistanceGroupStaffChange? _pending;
  void Function()? _releasePending;

  @override
  GroupStaffEditorState build(EventAssistanceGroupStaffTarget target) {
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
      return GroupStaffUnavailable(authState.error ?? groupStaffSessionChanged);
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const GroupStaffIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(EventAssistanceGroupStaffSession review) {
    if (!_current(review.account, _epoch)) throw groupStaffSessionChanged;
    final page = ref.read(
      eventAssistanceGroupStaffProvider(review.view.lookup),
    );
    if (review.view.target != target ||
        page.isLoading ||
        page.hasError ||
        !review.isCurrent ||
        !identical(page.asData?.value, review)) {
      throw const ValidationException('Reload the current group staff.');
    }
  }

  /// A refreshed review cannot replace an unresolved decision for this staff account.
  void open(EventAssistanceGroupStaffSession review) {
    if (!_current(review.account, _epoch)) throw groupStaffSessionChanged;
    if (review.view.target != target) {
      throw const ValidationException('Choose the reviewed staff account.');
    }
    if (_pending != null || _inFlight != null) return;
    _requireReview(review);
    state = GroupStaffForm._(review);
  }

  void select(AssistanceGroupStaffDecision? decision) {
    final form = state;
    if (form is! GroupStaffForm || !form.canSelect || _pending != null) return;
    try {
      _requireReview(form.review);
      final random = Random.secure();
      final id = List.generate(
        16,
        (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join();
      final change = decision == null
          ? null
          : EventAssistanceGroupStaffChange(
              snapshot: form.review.view,
              decision: decision,
              actorUid: form.review.account.uid,
              operationId: 'group-staff:$id',
            );
      state = GroupStaffForm._(form.review, change: change);
    } catch (error) {
      state = GroupStaffForm._(form.review, error: error);
    }
  }

  Future<EventAssistanceGroupStaffResult> submit() {
    final form = state;
    if (form is! GroupStaffForm || !_current(form.review.account, _epoch)) {
      return Future.error(groupStaffSessionChanged);
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

  Future<EventAssistanceGroupStaffResult> retry() {
    final form = state;
    if (form is! GroupStaffForm || !_current(form.review.account, _epoch)) {
      return Future.error(groupStaffSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException('There is no group decision to retry.'),
      );
    }
    return _submit(form, _pending!);
  }

  Future<EventAssistanceGroupStaffResult> _submit(
    GroupStaffForm form,
    EventAssistanceGroupStaffChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventAssistanceGroupStaffResult>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(GroupStaffPhase.submitting, change: change);
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
    ref.invalidate(eventAssistanceGroupStaffForAccountProvider);
  }

  void _publish(GroupStaffForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<EventAssistanceGroupStaffResult> _apply(
    GroupStaffForm form,
    EventAssistanceGroupStaffChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventAssistanceGroupStaffRepositoryProvider)
          .apply(change);
      if (!_current(form.review.account, epoch)) {
        throw groupStaffSessionChanged;
      }
      change.requireResult(result);
      _clearPending();
      _refresh();
      _publish(
        form._after(GroupStaffPhase.saved, change: change, result: result),
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
                ? GroupStaffPhase.refreshRequired
                : GroupStaffPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
