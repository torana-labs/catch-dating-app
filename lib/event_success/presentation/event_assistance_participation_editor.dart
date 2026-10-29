import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_participation_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_host_guests_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_participation_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_participation_editor.g.dart';

enum EventParticipationChoice { active, temporaryBreak, departed }

enum EventParticipationEditorPhase {
  choosing,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef EventParticipationMutationKey = ({
  EventAssistanceGuestScope scope,
  AuthenticatedSession account,
});

sealed class EventParticipationEditorState {
  const EventParticipationEditorState();
  bool get canDismiss => switch (this) {
    EventParticipationForm(:final phase) =>
      phase != EventParticipationEditorPhase.submitting,
    EventParticipationIdle() || EventParticipationUnavailable() => true,
  };
}

final class EventParticipationIdle extends EventParticipationEditorState {
  const EventParticipationIdle();
}

final class EventParticipationUnavailable
    extends EventParticipationEditorState {
  const EventParticipationUnavailable(this.error);
  final Object error;
}

final class EventParticipationForm extends EventParticipationEditorState {
  const EventParticipationForm._(
    this._review, {
    this.phase = EventParticipationEditorPhase.choosing,
    this.change,
    this.result,
    this.error,
  });
  final EventParticipationSession _review;
  EventParticipationSession get review => _review;
  final EventParticipationEditorPhase phase;
  final EventAssistanceParticipationChange? change;
  final EventAssistanceParticipationResult? result;
  final Object? error;
  bool get canSelect =>
      phase == EventParticipationEditorPhase.choosing &&
      review.isCurrent &&
      review.view.canChange;
  bool get canEdit => canSelect;
  EventParticipationChoice? get choice => switch (change?.participation) {
    EventParticipationActive() => EventParticipationChoice.active,
    EventParticipationOnBreak() => EventParticipationChoice.temporaryBreak,
    EventParticipationDeparted() => EventParticipationChoice.departed,
    null => null,
  };
  String? get returnPointId => switch (change?.participation) {
    EventParticipationOnBreak(:final resumeAtUnit) => resumeAtUnit,
    _ => null,
  };
  bool get showsReturnPoint =>
      choice == EventParticipationChoice.temporaryBreak &&
      review.view.returnPoints.isNotEmpty;
  bool get canSubmit => canSelect && change != null;
  bool get canRetry => phase == EventParticipationEditorPhase.retryRequired;
  bool get canReload =>
      phase == EventParticipationEditorPhase.choosing ||
      phase == EventParticipationEditorPhase.refreshRequired;
  EventParticipationForm _after(
    EventParticipationEditorPhase phase, {
    required EventAssistanceParticipationChange change,
    EventAssistanceParticipationResult? result,
    Object? error,
  }) => EventParticipationForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// One guest owns one pending participation decision across review refresh and closure.
@riverpod
class EventAssistanceParticipationEditor
    extends _$EventAssistanceParticipationEditor {
  static final changeMutation = Mutation<EventAssistanceParticipationResult>();
  static EventParticipationMutationKey mutationKey(
    EventParticipationSession review,
  ) => (scope: review.view.scope, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventAssistanceParticipationResult>? _inFlight;
  EventAssistanceParticipationChange? _pending;
  void Function()? _releasePending;

  @override
  EventParticipationEditorState build(EventAssistanceGuestScope scope) {
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
      return EventParticipationUnavailable(
        authState.error ?? participationSessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const EventParticipationIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(EventParticipationSession review) {
    if (!_current(review.account, _epoch)) throw participationSessionChanged;
    final page = ref.read(eventAssistanceParticipationReviewProvider(scope));
    if (review.view.scope != scope ||
        page.isLoading ||
        page.hasError ||
        !review.isCurrent ||
        !identical(page.asData?.value, review)) {
      throw const ValidationException(
        'Reload the current guest participation.',
      );
    }
  }

  /// A refreshed review cannot replace an unresolved decision for this guest.
  void open(EventParticipationSession review) {
    if (!_current(review.account, _epoch)) throw participationSessionChanged;
    if (review.view.scope != scope) {
      throw const ValidationException('Choose the reviewed guest.');
    }
    if (_pending != null || _inFlight != null) return;
    _requireReview(review);
    state = EventParticipationForm._(review);
  }

  void reload() {
    final form = state;
    if (form is! EventParticipationForm ||
        !form.canReload ||
        _pending != null ||
        _inFlight != null) {
      return;
    }
    _refresh(form.review.account);
    state = const EventParticipationIdle();
  }

  void select(EventParticipationChoice choice) {
    final form = state;
    if (form is! EventParticipationForm ||
        !form.canSelect ||
        _pending != null) {
      return;
    }
    _stage(form, switch (choice) {
      EventParticipationChoice.active =>
        const EventAssistanceParticipation.active(),
      EventParticipationChoice.departed =>
        const EventAssistanceParticipation.departed(),
      EventParticipationChoice.temporaryBreak =>
        EventAssistanceParticipation.onBreak(resumeAtUnit: form.returnPointId),
    });
  }

  void selectReturnPoint(String? unitId) {
    final form = state;
    if (form is! EventParticipationForm ||
        !form.canSelect ||
        _pending != null) {
      return;
    }
    if (form.choice != EventParticipationChoice.temporaryBreak ||
        (unitId != null &&
            !form.review.view.returnPoints.any((p) => p.unitId == unitId))) {
      throw ArgumentError('Choose a return point from this event snapshot.');
    }
    _stage(form, EventAssistanceParticipation.onBreak(resumeAtUnit: unitId));
  }

  void _stage(
    EventParticipationForm form,
    EventAssistanceParticipation decision,
  ) {
    try {
      _requireReview(form.review);
      final random = Random.secure();
      final id = List.generate(
        16,
        (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join();
      final change = form.review.view.prepareChange(
        operationId: 'participation:$id',
        participation: decision,
      );
      state = EventParticipationForm._(form.review, change: change);
    } catch (error) {
      state = EventParticipationForm._(form.review, error: error);
    }
  }

  Future<EventAssistanceParticipationResult> submit() {
    final form = state;
    if (form is! EventParticipationForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(participationSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) return Future.value(result);
    if (!form.canSubmit || _pending != null) {
      return Future.error(
        const ValidationException(
          'Review a participation decision before continuing.',
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

  Future<EventAssistanceParticipationResult> retry() {
    final form = state;
    if (form is! EventParticipationForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(participationSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException(
          'There is no participation decision to retry.',
        ),
      );
    }
    return _submit(form, _pending!);
  }

  Future<EventAssistanceParticipationResult> _submit(
    EventParticipationForm form,
    EventAssistanceParticipationChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventAssistanceParticipationResult>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(
      EventParticipationEditorPhase.submitting,
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

  void _refresh(AuthenticatedSession account) {
    ref.invalidate(
      eventAssistanceParticipationForAccountProvider(scope, account: account),
    );
    ref.invalidate(eventAssistanceHostGuestsForAccountProvider);
  }

  void _publish(EventParticipationForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<EventAssistanceParticipationResult> _apply(
    EventParticipationForm form,
    EventAssistanceParticipationChange change,
    int epoch,
  ) async {
    try {
      if (!_current(form.review.account, epoch)) {
        throw participationSessionChanged;
      }
      final result = await ref
          .read(eventAssistanceParticipationCommandsProvider)
          .apply(change);
      if (!_current(form.review.account, epoch)) {
        throw participationSessionChanged;
      }
      result.requireChange(change);
      _clearPending();
      _refresh(form.review.account);
      _publish(
        form._after(
          EventParticipationEditorPhase.saved,
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
          _refresh(form.review.account);
        }
        _publish(
          form._after(
            definitive
                ? EventParticipationEditorPhase.refreshRequired
                : EventParticipationEditorPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
