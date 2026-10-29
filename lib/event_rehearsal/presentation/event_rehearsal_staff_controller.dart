import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_staff_change.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_staff_controller.g.dart';

enum RehearsalStaffPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef RehearsalStaffMutationKey = ({
  String sessionId,
  AuthenticatedSession account,
});

sealed class RehearsalStaffEditorState {
  const RehearsalStaffEditorState();
  bool get canDismiss => switch (this) {
    RehearsalStaffForm(:final phase) => phase != RehearsalStaffPhase.submitting,
    RehearsalStaffIdle() || RehearsalStaffUnavailable() => true,
  };
}

final class RehearsalStaffIdle extends RehearsalStaffEditorState {
  const RehearsalStaffIdle();
}

final class RehearsalStaffUnavailable extends RehearsalStaffEditorState {
  const RehearsalStaffUnavailable(this.error);
  final Object error;
}

final class RehearsalStaffForm extends RehearsalStaffEditorState {
  const RehearsalStaffForm._(
    this._review, {
    this.phase = RehearsalStaffPhase.ready,
    this.change,
    this.result,
    this.error,
    this.draftName,
  });
  final RehearsalAssistanceReview _review;
  RehearsalAssistanceReview get review => _review;
  final RehearsalStaffPhase phase;
  final RehearsalStaffChange? change;
  final EventRehearsalBootstrap? result;
  final Object? error;
  final String? draftName;
  bool get canSelect => phase == RehearsalStaffPhase.ready;
  bool get canSubmit => canSelect && change != null && error == null;
  bool get canRetry => phase == RehearsalStaffPhase.retryRequired;
  bool get canReload =>
      phase == RehearsalStaffPhase.ready ||
      phase == RehearsalStaffPhase.refreshRequired;
  RehearsalStaffForm _after(
    RehearsalStaffPhase phase, {
    required RehearsalStaffChange change,
    EventRehearsalBootstrap? result,
    Object? error,
  }) => RehearsalStaffForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
    draftName: draftName,
  );
}

/// One rehearsal owns one unresolved staff edit, including new synthetic staff.
/// Refresh, dismissal and a different selection cannot replace its frozen request.
@riverpod
class EventRehearsalStaffController extends _$EventRehearsalStaffController {
  static final changeMutation = Mutation<EventRehearsalBootstrap>();
  static RehearsalStaffMutationKey mutationKey(
    RehearsalAssistanceReview review,
  ) => (sessionId: review.snapshot.session.id, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventRehearsalBootstrap>? _inFlight;
  RehearsalStaffChange? _pending;
  void Function()? _releasePending;

  @override
  RehearsalStaffEditorState build(String sessionId) {
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
      return RehearsalStaffUnavailable(
        authState.error ?? rehearsalReviewSessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const RehearsalStaffIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(RehearsalAssistanceReview review) {
    if (!_current(review.account, _epoch)) throw rehearsalReviewSessionChanged;
    final page = ref.read(eventRehearsalAssistanceProvider(sessionId));
    if (review.snapshot.session.id != sessionId ||
        review.snapshot.staffReview?.isManager != true ||
        review.snapshot.staffReview?.hostUid != review.account.uid ||
        page.isLoading ||
        page.hasError ||
        !review.isCurrent ||
        !identical(page.asData?.value, review)) {
      throw const ValidationException('Reload the current group staff.');
    }
  }

  /// A refreshed review cannot replace an unresolved staff decision for this run.
  void open(RehearsalAssistanceReview review) {
    if (!_current(review.account, _epoch)) throw rehearsalReviewSessionChanged;
    if (review.snapshot.session.id != sessionId ||
        review.snapshot.staffReview?.isManager != true ||
        review.snapshot.staffReview?.hostUid != review.account.uid) {
      throw const ValidationException(
        'Review practice staff as the rehearsal Host.',
      );
    }
    if (_pending != null || _inFlight != null) return;
    _requireReview(review);
    state = RehearsalStaffForm._(review);
  }

  /// Start with the existing duty or the first configured group and event end.
  /// Configuration is optional; a pending save always takes precedence.
  void configure(
    RehearsalAssistanceReview review, {
    required String defaultName,
    String? operatorId,
    String? groupId,
  }) {
    open(review);
    if (_pending != null || _inFlight != null) return;
    final staff = review.snapshot.staffReview!;
    final operator = staff.operators[operatorId];
    final proposedGroup =
        groupId ??
        operator?.duties.keys.firstOrNull ??
        staff.groups.keys.where((id) => id != 'event:whole').firstOrNull ??
        'event:whole';
    final group = staff.groups.containsKey(proposedGroup)
        ? proposedGroup
        : staff.groups.keys.where((id) => id != 'event:whole').firstOrNull ??
              'event:whole';
    final previous = operator?.duties[group];
    final duties = staff.groups[group]?.availableDuties;
    final duty = duties?.contains(previous?.duty) == true
        ? previous!.duty
        : duties?.contains(AssistanceGroupDuty.pacer) == true
        ? AssistanceGroupDuty.pacer
        : AssistanceGroupDuty.lead;
    final end =
        staff.session.virtualStartedAt!.millisecondsSinceEpoch +
        staff.session.setup.durationMinutes * 60000;
    final random = Random.secure();
    final id = List.generate(
      16,
      (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
    ).join();
    select(
      operatorId: operatorId ?? 'practice-staff:$id',
      displayName: operator?.displayName ?? defaultName,
      groupId: group,
      decision: AssistanceAssignGroupDuty(
        duty: duty,
        expiresAt: previous != null && previous.expiresAt > staff.serverTime
            ? previous.expiresAt
            : end,
      ),
    );
  }

  void close() {
    if (_pending == null && _inFlight == null) {
      state = const RehearsalStaffIdle();
    }
  }

  void select({
    required String operatorId,
    required String displayName,
    required String groupId,
    required AssistanceGroupStaffDecision? decision,
  }) {
    final form = state;
    if (form is! RehearsalStaffForm || !form.canSelect || _pending != null) {
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
          : RehearsalStaffChange(
              snapshot: form.review.snapshot.staffReview!,
              operatorId: operatorId,
              displayName: displayName,
              groupId: groupId,
              decision: decision,
              clientActionId: 'practice_staff_$id',
            );
      state = RehearsalStaffForm._(
        form.review,
        change: change,
        draftName: displayName,
      );
    } catch (error) {
      state = RehearsalStaffForm._(
        form.review,
        change: form.change,
        error: error,
        draftName: displayName,
      );
    }
  }

  Future<EventRehearsalBootstrap> submit() {
    if (!ref.mounted) return Future.error(rehearsalReviewSessionChanged);
    final form = state;
    if (form is! RehearsalStaffForm || !_current(form.review.account, _epoch)) {
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
      _requireReview(form.review);
      return _submit(form, form.change!);
    } catch (error, stackTrace) {
      return Future.error(error, stackTrace);
    }
  }

  Future<EventRehearsalBootstrap> retry() {
    if (!ref.mounted) return Future.error(rehearsalReviewSessionChanged);
    final form = state;
    if (form is! RehearsalStaffForm || !_current(form.review.account, _epoch)) {
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
    RehearsalStaffForm form,
    RehearsalStaffChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventRehearsalBootstrap>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(RehearsalStaffPhase.submitting, change: change);
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
    ref.invalidate(eventRehearsalProvider(sessionId));
    ref.invalidate(eventRehearsalAssistanceForAccountProvider);
  }

  void _publish(RehearsalStaffForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<EventRehearsalBootstrap> _apply(
    RehearsalStaffForm form,
    RehearsalStaffChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventRehearsalRepositoryProvider)
          .applyStaff(change);
      if (!_current(form.review.account, epoch)) {
        throw rehearsalReviewSessionChanged;
      }
      change.requireResult(result);
      _clearPending();
      _refresh();
      _publish(
        form._after(RehearsalStaffPhase.saved, change: change, result: result),
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
                ? RehearsalStaffPhase.refreshRequired
                : RehearsalStaffPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
