import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_late_join_setting_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting_result.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_setting_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_pending_settings.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_late_join_setting_editor.g.dart';

enum LateJoinSettingEditorPhase {
  choosing,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef LateJoinSettingMutationKey = ({
  EventAssistanceGroupScope scope,
  AuthenticatedSession account,
});

sealed class LateJoinSettingEditorState {
  const LateJoinSettingEditorState();
  bool get canDismiss => switch (this) {
    LateJoinSettingForm(:final phase) =>
      phase != LateJoinSettingEditorPhase.submitting,
    LateJoinSettingIdle() || LateJoinSettingFormUnavailable() => true,
  };
}

final class LateJoinSettingIdle extends LateJoinSettingEditorState {
  const LateJoinSettingIdle();
}

final class LateJoinSettingFormUnavailable extends LateJoinSettingEditorState {
  const LateJoinSettingFormUnavailable(this.error);
  final Object error;
}

final class LateJoinSettingForm extends LateJoinSettingEditorState {
  const LateJoinSettingForm._(
    this._review, {
    this.phase = LateJoinSettingEditorPhase.choosing,
    this.change,
    this.result,
    this.error,
  });
  final LateJoinSettingSession _review;
  LateJoinSettingSession get review => _review;
  final LateJoinSettingEditorPhase phase;
  LateJoinPreference? get decision => change?.preference;
  final LateJoinSettingChange? change;
  final LateJoinSettingResult? result;
  final Object? error;
  bool get canSelect =>
      phase == LateJoinSettingEditorPhase.choosing && review.isCurrent;
  bool get canSubmit => canSelect && change != null;
  bool get canEdit => canSelect;
  bool get canRetry => phase == LateJoinSettingEditorPhase.retryRequired;
  bool get canReload =>
      phase == LateJoinSettingEditorPhase.choosing ||
      phase == LateJoinSettingEditorPhase.refreshRequired;
  LateJoinSettingForm _after(
    LateJoinSettingEditorPhase phase, {
    required LateJoinSettingChange change,
    LateJoinSettingResult? result,
    Object? error,
  }) => LateJoinSettingForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// One event or group owns one pending late arrival preference across page refresh and sheet closure.
@riverpod
class EventAssistanceLateJoinSettingEditor
    extends _$EventAssistanceLateJoinSettingEditor {
  static final changeMutation = Mutation<LateJoinSettingResult>();
  static LateJoinSettingMutationKey mutationKey(
    LateJoinSettingSession review,
  ) => (scope: review.view.scope, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<LateJoinSettingResult>? _inFlight;
  LateJoinSettingChange? _pending;
  void Function()? _releasePending;

  @override
  LateJoinSettingEditorState build(EventAssistanceGroupScope scope) {
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
      return LateJoinSettingFormUnavailable(
        authState.error ?? settingReviewSessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const LateJoinSettingIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(LateJoinSettingSession review) {
    if (!_current(review.account, _epoch)) {
      throw settingReviewSessionChanged;
    }
    final page = ref.read(
      eventAssistanceLateJoinSettingProvider(review.view.scope),
    );
    if (review.view.scope != scope ||
        page.isLoading ||
        page.hasError ||
        !review.isCurrent ||
        !identical(page.asData?.value, review)) {
      throw const ValidationException(
        'Reload the current late arrival settings.',
      );
    }
  }

  /// A refreshed page cannot replace this scope’s unresolved decision.
  void open(LateJoinSettingSession review) {
    if (!_current(review.account, _epoch)) {
      throw settingReviewSessionChanged;
    }
    if (review.view.scope != scope) {
      throw const ValidationException(
        'Choose the reviewed late arrival settings.',
      );
    }
    if (_pending != null || _inFlight != null) return;
    _requireReview(review);
    state = LateJoinSettingForm._(review);
  }

  void reload() {
    if (!ref.mounted) return;
    final form = state;
    if (form is! LateJoinSettingForm ||
        !form.canReload ||
        _pending != null ||
        _inFlight != null) {
      return;
    }
    ref
        .read(
          eventAssistanceLateJoinSettingProvider(
            form.review.view.scope,
          ).notifier,
        )
        .reload();
    state = const LateJoinSettingIdle();
  }

  void select(LateJoinPreference? decision) {
    if (!ref.mounted) return;
    final form = state;
    if (form is! LateJoinSettingForm || !form.canSelect || _pending != null) {
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
              requestId: 'setting:$id',
              preference: decision,
            );
      state = LateJoinSettingForm._(form.review, change: change);
    } catch (error) {
      state = LateJoinSettingForm._(form.review, error: error);
    }
  }

  Future<LateJoinSettingResult> submit() {
    if (!ref.mounted) return Future.error(settingReviewSessionChanged);
    final form = state;
    if (form is! LateJoinSettingForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(settingReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) return Future.value(result);
    if (!form.canSubmit || _pending != null) {
      return Future.error(
        const ValidationException(
          'Review a late arrival preference before continuing.',
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

  Future<LateJoinSettingResult> retry() {
    if (!ref.mounted) return Future.error(settingReviewSessionChanged);
    final form = state;
    if (form is! LateJoinSettingForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(settingReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException(
          'There is no late arrival preference to retry.',
        ),
      );
    }
    return _submit(form, _pending!);
  }

  Future<LateJoinSettingResult> _submit(
    LateJoinSettingForm form,
    LateJoinSettingChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<LateJoinSettingResult>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(LateJoinSettingEditorPhase.submitting, change: change);
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
        .read(eventAssistancePendingSettingsProvider.notifier)
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
          .read(eventAssistancePendingSettingsProvider.notifier)
          .release(scope, _account);
    }
    _pending = null;
    final release = _releasePending;
    _releasePending = null;
    release?.call();
  }

  void _refresh() {
    ref.invalidate(eventAssistanceLateJoinSettingForAccountProvider);
  }

  void _publish(LateJoinSettingForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<LateJoinSettingResult> _apply(
    LateJoinSettingForm form,
    LateJoinSettingChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventAssistanceLateJoinSettingCommandsProvider)
          .apply(change);
      if (!_current(form.review.account, epoch)) {
        throw settingReviewSessionChanged;
      }
      result.requireChange(change, actorUid: form.review.account.uid);
      _clearPending();
      _refresh();
      _publish(
        form._after(
          LateJoinSettingEditorPhase.saved,
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
                ? LateJoinSettingEditorPhase.refreshRequired
                : LateJoinSettingEditorPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
