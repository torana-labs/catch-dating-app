import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_help_requests.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_publication.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_view_model.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_assistance_editor.g.dart';

enum RehearsalAssistancePhase {
  choosing,
  submitting,
  retryRequired,
  refreshRequired,
  applied,
}

sealed class RehearsalAssistanceEditorState {
  const RehearsalAssistanceEditorState();
  bool get canDismiss => switch (this) {
    RehearsalAssistanceForm(:final phase) =>
      phase != RehearsalAssistancePhase.submitting,
    RehearsalAssistanceIdle() || RehearsalAssistanceUnavailable() => true,
  };
}

final class RehearsalAssistanceIdle extends RehearsalAssistanceEditorState {
  const RehearsalAssistanceIdle();
}

final class RehearsalAssistanceUnavailable
    extends RehearsalAssistanceEditorState {
  const RehearsalAssistanceUnavailable._(this.error);
  final Object error;
}

final class RehearsalAssistanceForm extends RehearsalAssistanceEditorState {
  const RehearsalAssistanceForm._({
    required this.review,
    this.change,
    this.phase = RehearsalAssistancePhase.choosing,
    this.result,
    this.error,
  });
  final RehearsalAssistanceReview review;
  final RehearsalAssistanceChange? change;
  final RehearsalAssistancePhase phase;
  final EventRehearsalBootstrap? result;
  final Object? error;
  bool get canEdit => phase == RehearsalAssistancePhase.choosing;
  bool get canSubmit =>
      canEdit && change != null ||
      phase == RehearsalAssistancePhase.retryRequired;
  bool get canReload =>
      phase == RehearsalAssistancePhase.choosing ||
      phase == RehearsalAssistancePhase.refreshRequired;
  RehearsalAssistanceForm _after(
    RehearsalAssistancePhase phase, {
    EventRehearsalBootstrap? result,
    Object? error,
  }) => RehearsalAssistanceForm._(
    review: review,
    change: change,
    phase: phase,
    result: result,
    error: error,
  );
}

/// One unresolved command per rehearsal. Applied means its receipt was verified;
/// it never promotes an accepted send or reported intention into delivery/arrival.
@riverpod
class EventRehearsalAssistanceEditor extends _$EventRehearsalAssistanceEditor {
  static final applyMutation = Mutation<EventRehearsalBootstrap>();
  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventRehearsalBootstrap>? _inFlight;
  RehearsalAssistanceChange? _pending;
  RehearsalMovementPage? _movementPage;
  void Function()? _releasePending;
  void Function()? _cancelReviewListener;

  @override
  RehearsalAssistanceEditorState build(String sessionId) {
    final auth = ref.watch(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    _epoch++;
    _account = null;
    _clearPending();
    _inFlight = null;
    _movementPage = null;
    _cancelReviewListener?.call();
    _cancelReviewListener = null;
    ref.onDispose(() {
      _epoch++;
      _clearPending();
    });
    if (!authState.isSettledData || authState.value == null) {
      return RehearsalAssistanceUnavailable._(
        authState.error ?? rehearsalReviewSessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const RehearsalAssistanceIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  RehearsalAssistanceForm? get _form => switch (state) {
    final RehearsalAssistanceForm form => form,
    _ => null,
  };
  RehearsalAssistanceReview get _review => _form!.review;

  /// One rehearsal owns an unresolved operation across refreshed reviews and roles.
  void open(RehearsalAssistanceReview review) {
    if (!_current(review.account, _epoch)) throw rehearsalReviewSessionChanged;
    if (review.snapshot.session.id != sessionId) throw rehearsalReviewExpired;
    if (_pending != null || _inFlight != null) return;
    _requireReview(review);
    _cancelReviewListener?.call();
    _movementPage = null;
    state = RehearsalAssistanceForm._(review: review);
    final subscription = ref.listen(
      eventRehearsalAssistanceProvider(
        sessionId,
        practiceOperatorId: review.snapshot.staffReview?.practiceOperatorId,
      ),
      (_, next) {
        final form = _form;
        if (!_current(review.account, _epoch)) return;
        if (form == null || !identical(form.review, review) || !form.canEdit) {
          return;
        }
        if (next.isLoading ||
            next.hasError ||
            !identical(next.asData?.value, review)) {
          state = form._after(
            RehearsalAssistancePhase.refreshRequired,
            error: rehearsalReviewExpired,
          );
        }
      },
    );
    _cancelReviewListener = subscription.close;
  }

  void reload() {
    final form = _form;
    if (form == null ||
        !form.canReload ||
        _pending != null ||
        _inFlight != null) {
      return;
    }
    _refresh();
    state = const RehearsalAssistanceIdle();
  }

  void _requireReview(RehearsalAssistanceReview review) {
    if (!_current(review.account, _epoch)) throw rehearsalReviewSessionChanged;
    final page = ref.read(
      eventRehearsalAssistanceProvider(
        sessionId,
        practiceOperatorId: review.snapshot.staffReview?.practiceOperatorId,
      ),
    );
    if (review.snapshot.session.id != sessionId ||
        !review.isCurrent ||
        page.isLoading ||
        page.hasError ||
        !identical(page.asData?.value, review)) {
      throw rehearsalReviewExpired;
    }
  }

  void _requireCurrentReview() => _requireReview(_review);

  void select(RehearsalAssistanceCommand? command) => _select(() => command);

  void selectPublication(
    RehearsalPublicationDraft draft,
    RehearsalMovementPage movement,
  ) => _select(() {
    _requireMovement(draft, movement);
    return draft.prepare(_review.snapshot);
  }, movement: movement);

  void selectAutomation(
    RehearsalPublicationDraft draft,
    List<RehearsalDeliveryOutcome> outcomes,
    RehearsalMovementPage movement,
  ) => _select(() {
    _requireMovement(draft, movement);
    return draft.configure(_review.snapshot, outcomes);
  }, movement: movement);

  void _requireMovement(
    RehearsalPublicationDraft draft,
    RehearsalMovementPage movement,
  ) {
    if (!identical(draft.movement, movement.snapshot)) {
      throw rehearsalReviewExpired;
    }
    _requireMovementPage(movement);
  }

  void _requireMovementPage(RehearsalMovementPage movement) {
    requireRehearsalReviewAccount(ref, movement.account);
    final current = ref.read(
      eventRehearsalMovementProvider(movement.snapshot.selection),
    );
    if (!identical(movement.account, _review.account) ||
        !movement.isCurrent ||
        current.isLoading ||
        current.hasError ||
        !identical(current.asData?.value, movement)) {
      throw rehearsalReviewExpired;
    }
  }

  void selectHelpResolution(
    RehearsalOpenHelpCase request,
    AssistanceCaseDecision decision,
  ) => _select(
    () => RehearsalResolveAssistance(
      snapshot: request,
      actorUid: _review.account.uid,
      decision: decision,
    ),
  );

  void _select(
    RehearsalAssistanceCommand? Function() resolve, {
    RehearsalMovementPage? movement,
  }) {
    final form = _form;
    if (form == null || !form.canEdit) return;
    try {
      _requireCurrentReview();
      final command = resolve();
      if (command is RehearsalTakeDelivery) {
        throw const ValidationException(
          'Use the delivery review to take over this message.',
        );
      }
      if (command is RehearsalTransferGroup) {
        throw const ValidationException(
          'Use the membership review to change this group.',
        );
      }
      if (command is RehearsalResolveAccountability) {
        throw const ValidationException(
          'Use the visit review to record this decision.',
        );
      }
      final change = command == null
          ? null
          : RehearsalAssistanceChange(
              snapshot: _review.snapshot,
              command: command,
              clientActionId: _newActionId(),
            );
      _movementPage = movement;
      state = RehearsalAssistanceForm._(review: _review, change: change);
    } catch (error) {
      if (_current(form.review.account, _epoch)) {
        _movementPage = null;
        state = RehearsalAssistanceForm._(
          review: _review,
          error: error,
          phase: _review.isCurrent
              ? RehearsalAssistancePhase.choosing
              : RehearsalAssistancePhase.refreshRequired,
        );
      }
    }
  }

  Future<EventRehearsalBootstrap> submit() {
    final form = _form;
    if (form == null || !_current(form.review.account, _epoch)) {
      return Future.error(rehearsalReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) return Future.value(result);
    if (!form.canSubmit) {
      return Future.error(
        const ValidationException(
          'Choose a practice action before continuing.',
        ),
      );
    }
    try {
      if (form.phase == RehearsalAssistancePhase.choosing) {
        _requireCurrentReview();
        if (_movementPage case final movement?) _requireMovementPage(movement);
      } else if (!identical(form.change, _pending)) {
        throw const ValidationException(
          'Resolve the original practice action first.',
        );
      }
      return _submit(form);
    } catch (error, stackTrace) {
      if (_current(form.review.account, _epoch)) {
        state = form._after(
          RehearsalAssistancePhase.refreshRequired,
          error: error,
        );
      }
      return Future.error(error, stackTrace);
    }
  }

  Future<EventRehearsalBootstrap> _submit(RehearsalAssistanceForm form) {
    final epoch = _epoch;
    final completion = Completer<EventRehearsalBootstrap>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = form.change!;
    _retainPending(form.review.account);
    state = form._after(RehearsalAssistancePhase.submitting);
    unawaited(
      _apply(form, epoch)
          .then(
            completion.complete,
            onError: (Object error, StackTrace stackTrace) =>
                completion.completeError(error, stackTrace),
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
    // Detached sheets pause their normal dependencies. Keep auth transitions observable.
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
    if (_movementPage case final movement?) {
      ref.invalidate(
        eventRehearsalMovementForAccountProvider(
          movement.snapshot.selection,
          account: movement.account,
        ),
      );
    }
    ref.invalidate(eventRehearsalProvider(sessionId));
    ref.invalidate(eventRehearsalAssistanceForAccountProvider);
  }

  void _publish(RehearsalAssistanceForm form) {
    _inFlight = null;
    state = form;
  }

  Future<EventRehearsalBootstrap> _apply(
    RehearsalAssistanceForm form,
    int epoch,
  ) async {
    final change = form.change!;
    try {
      final result = await ref
          .read(eventRehearsalAssistanceCommandsProvider)
          .apply(change);
      if (!_current(form.review.account, epoch)) {
        throw rehearsalReviewSessionChanged;
      }
      change.requireResult(result);
      _clearPending();
      _refresh();
      _publish(form._after(RehearsalAssistancePhase.applied, result: result));
      return result;
    } catch (error) {
      if (_current(form.review.account, epoch)) {
        final refresh = _needsFreshReview(error);
        if (refresh) {
          _clearPending();
          _refresh();
        }
        _publish(
          form._after(
            refresh
                ? RehearsalAssistancePhase.refreshRequired
                : RehearsalAssistancePhase.retryRequired,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}

String _newActionId() {
  final random = Random.secure();
  return 'practice_${List.generate(16, (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0')).join()}';
}

bool _needsFreshReview(Object error) =>
    error is AppException &&
    {
      'aborted',
      'permission-denied',
      'unauthenticated',
      'sign-in-required',
      'session-changed',
      'review-changed',
      'failed-precondition',
      'not-found',
      'invalid-argument',
    }.contains(error.code);
