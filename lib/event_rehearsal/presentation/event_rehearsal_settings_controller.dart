import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_settings_change.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_settings_controller.g.dart';

enum RehearsalSettingsPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef RehearsalSettingsMutationKey = ({
  String sessionId,
  AuthenticatedSession account,
});

sealed class RehearsalSettingsEditorState {
  const RehearsalSettingsEditorState();
  bool get canDismiss => switch (this) {
    RehearsalSettingsForm(:final phase) =>
      phase != RehearsalSettingsPhase.submitting,
    RehearsalSettingsIdle() || RehearsalSettingsUnavailable() => true,
  };
}

final class RehearsalSettingsIdle extends RehearsalSettingsEditorState {
  const RehearsalSettingsIdle();
}

final class RehearsalSettingsUnavailable extends RehearsalSettingsEditorState {
  const RehearsalSettingsUnavailable(this.error);
  final Object error;
}

final class RehearsalSettingsForm extends RehearsalSettingsEditorState {
  const RehearsalSettingsForm._(
    this._review, {
    this.phase = RehearsalSettingsPhase.ready,
    this.change,
    this.result,
    this.error,
    this.groupId,
  });
  final RehearsalAssistanceReview _review;
  RehearsalAssistanceReview get review => _review;
  final RehearsalSettingsPhase phase;
  final RehearsalSettingsChange? change;
  final EventRehearsalBootstrap? result;
  final Object? error;
  final String? groupId;
  bool get canSelect =>
      phase == RehearsalSettingsPhase.ready &&
      review.snapshot.settingsReview?.canConfigure == true;
  bool get canSubmit => canSelect && change != null && error == null;
  bool get canRetry => phase == RehearsalSettingsPhase.retryRequired;
  bool get canReload =>
      phase == RehearsalSettingsPhase.ready ||
      phase == RehearsalSettingsPhase.refreshRequired;
  RehearsalSettingsForm _after(
    RehearsalSettingsPhase phase, {
    required RehearsalSettingsChange change,
    EventRehearsalBootstrap? result,
    Object? error,
  }) => RehearsalSettingsForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
    groupId: groupId,
  );
}

/// One rehearsal owns one unresolved event rule or simulated runtime decision.
/// Refresh, dismissal and a different selection cannot replace its frozen request.
@riverpod
class EventRehearsalSettingsController
    extends _$EventRehearsalSettingsController {
  static final changeMutation = Mutation<EventRehearsalBootstrap>();
  static RehearsalSettingsMutationKey mutationKey(
    RehearsalAssistanceReview review,
  ) => (sessionId: review.snapshot.session.id, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventRehearsalBootstrap>? _inFlight;
  RehearsalSettingsChange? _pending;
  void Function()? _releasePending;
  void Function()? _cancelReviewListener;

  @override
  RehearsalSettingsEditorState build(String sessionId) {
    final auth = ref.watch(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    _epoch++;
    _account = null;
    _clearPending();
    _inFlight = null;
    _cancelReviewListener?.call();
    _cancelReviewListener = null;
    ref.onDispose(() {
      _epoch++;
      _clearPending();
      _cancelReviewListener?.call();
    });
    if (!authState.isSettledData || authState.value == null) {
      return RehearsalSettingsUnavailable(
        authState.error ?? rehearsalReviewSessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const RehearsalSettingsIdle();
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
        review.snapshot.settingsReview == null ||
        page.isLoading ||
        page.hasError ||
        !review.isCurrent ||
        !identical(page.asData?.value, review)) {
      throw const ValidationException('Reload the current practice settings.');
    }
  }

  /// The nullable group selects runtime configuration; a group selects its rule.
  /// A pending decision takes precedence over any newly requested destination.
  void open(RehearsalAssistanceReview review, {String? groupId}) {
    if (!_current(review.account, _epoch)) throw rehearsalReviewSessionChanged;
    if (review.snapshot.session.id != sessionId ||
        review.snapshot.staffReview?.isManager != true ||
        review.snapshot.staffReview?.hostUid != review.account.uid) {
      throw const ValidationException('Review settings as the rehearsal Host.');
    }
    if (_pending != null || _inFlight != null) return;
    _requireReview(review);
    if (groupId != null &&
        !review.snapshot.settingsReview!.groups.containsKey(groupId)) {
      throw const ValidationException('Review a configured practice group.');
    }
    _cancelReviewListener?.call();
    state = RehearsalSettingsForm._(review, groupId: groupId);
    final subscription = ref.listen(
      eventRehearsalAssistanceProvider(sessionId),
      (_, next) {
        final form = state;
        if (!_current(review.account, _epoch) ||
            form is! RehearsalSettingsForm ||
            !identical(form.review, review) ||
            !form.canSelect) {
          return;
        }
        if (next.isLoading ||
            next.hasError ||
            !identical(next.asData?.value, review)) {
          state = RehearsalSettingsForm._(
            review,
            groupId: form.groupId,
            change: form.change,
            phase: RehearsalSettingsPhase.refreshRequired,
            error: rehearsalReviewExpired,
          );
        }
      },
    );
    _cancelReviewListener = subscription.close;
  }

  void reload() {
    final form = state;
    if (form is! RehearsalSettingsForm ||
        !form.canReload ||
        _pending != null ||
        _inFlight != null) {
      return;
    }
    _cancelReviewListener?.call();
    _cancelReviewListener = null;
    _refresh();
    state = const RehearsalSettingsIdle();
  }

  void close() {
    if (_pending == null && _inFlight == null) {
      _cancelReviewListener?.call();
      _cancelReviewListener = null;
      state = const RehearsalSettingsIdle();
    }
  }

  void select(RehearsalSettingsDecision? decision) {
    final form = state;
    if (form is! RehearsalSettingsForm || !form.canSelect || _pending != null) {
      return;
    }
    try {
      _requireReview(form.review);
      if (decision is RehearsalSetRule
          ? decision.groupId != form.groupId
          : decision != null && form.groupId != null) {
        throw const ValidationException(
          'Review this settings decision in its own form.',
        );
      }
      final random = Random.secure();
      final id = List.generate(
        16,
        (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join();
      final change = decision == null
          ? null
          : RehearsalSettingsChange(
              snapshot: form.review.snapshot,
              decision: decision,
              clientActionId: 'practice_settings_$id',
            );
      state = RehearsalSettingsForm._(
        form.review,
        change: change,
        groupId: form.groupId,
      );
    } catch (error) {
      if (_current(form.review.account, _epoch)) {
        state = RehearsalSettingsForm._(
          form.review,
          groupId: form.groupId,
          error: error,
          phase: form.review.isCurrent
              ? RehearsalSettingsPhase.ready
              : RehearsalSettingsPhase.refreshRequired,
        );
      }
    }
  }

  Future<EventRehearsalBootstrap> submit() {
    if (!ref.mounted) return Future.error(rehearsalReviewSessionChanged);
    final form = state;
    if (form is! RehearsalSettingsForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(rehearsalReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) return Future.value(result);
    if (!form.canSubmit || _pending != null) {
      return Future.error(
        const ValidationException(
          'Review a settings decision before continuing.',
        ),
      );
    }
    try {
      _requireReview(form.review);
      return _submit(form, form.change!);
    } catch (error, stackTrace) {
      if (_current(form.review.account, _epoch)) {
        state = RehearsalSettingsForm._(
          form.review,
          groupId: form.groupId,
          change: form.change,
          phase: RehearsalSettingsPhase.refreshRequired,
          error: error,
        );
      }
      return Future.error(error, stackTrace);
    }
  }

  Future<EventRehearsalBootstrap> retry() {
    if (!ref.mounted) return Future.error(rehearsalReviewSessionChanged);
    final form = state;
    if (form is! RehearsalSettingsForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(rehearsalReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException('There is no settings decision to retry.'),
      );
    }
    return _submit(form, _pending!);
  }

  Future<EventRehearsalBootstrap> _submit(
    RehearsalSettingsForm form,
    RehearsalSettingsChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventRehearsalBootstrap>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(RehearsalSettingsPhase.submitting, change: change);
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

  void _publish(RehearsalSettingsForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<EventRehearsalBootstrap> _apply(
    RehearsalSettingsForm form,
    RehearsalSettingsChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventRehearsalRepositoryProvider)
          .applySettings(change);
      if (!_current(form.review.account, epoch)) {
        throw rehearsalReviewSessionChanged;
      }
      change.requireResult(result);
      _clearPending();
      _refresh();
      _publish(
        form._after(
          RehearsalSettingsPhase.saved,
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
                ? RehearsalSettingsPhase.refreshRequired
                : RehearsalSettingsPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
