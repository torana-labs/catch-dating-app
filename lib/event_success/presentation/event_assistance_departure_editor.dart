import 'dart:async';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_provider.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_departure_editor.g.dart';

enum EventDepartureFormPhase {
  choosing,
  reviewingRoster,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

/// An account change removes the entire form from the renderable state.
sealed class EventDepartureEditorState {
  const EventDepartureEditorState();

  bool get canDismiss => switch (this) {
    EventDepartureForm(:final phase) =>
      phase != EventDepartureFormPhase.submitting,
    EventDepartureFormIdle() || EventDepartureFormUnavailable() => true,
  };
}

final class EventDepartureFormIdle extends EventDepartureEditorState {
  const EventDepartureFormIdle();
}

final class EventDepartureFormUnavailable extends EventDepartureEditorState {
  const EventDepartureFormUnavailable._(this.error);
  final Object error;
}

final class EventDepartureForm extends EventDepartureEditorState {
  const EventDepartureForm._({
    required this.session,
    this.destination,
    this.selection,
    this.roster,
    this.checkpoint,
    this.phase = EventDepartureFormPhase.choosing,
    this.action,
    this.result,
    this.error,
  });

  final EventDepartureSession session;
  final AssistanceJoiningTarget? destination;
  final EventAssistanceDepartureRosterSelection? selection;
  final EventAssistanceDepartureRosterReview? roster;
  final AssistanceDepartureCheckpointRequest? checkpoint;
  final EventDepartureFormPhase phase;
  final EventDeparturePendingAction? action;
  final EventAssistanceGroupProgressResult? result;
  final Object? error;

  bool get canEdit =>
      phase == EventDepartureFormPhase.choosing && session.view.canConfirm;
  bool get needsRosterReview => selection != null && roster == null;
  bool get canReviewRoster => canEdit && selection != null;
  bool get canSubmit =>
      (canEdit && destination != null && !needsRosterReview) ||
      phase == EventDepartureFormPhase.retryRequired;
  bool get canConfigureCheckpoint =>
      canEdit &&
      roster != null &&
      destination != null &&
      destination is! AssistanceFixedPlace;
  bool get canReload =>
      phase == EventDepartureFormPhase.choosing ||
      phase == EventDepartureFormPhase.refreshRequired;

  EventDepartureForm _withPhase(
    EventDepartureFormPhase phase, {
    EventDeparturePendingAction? action,
    EventAssistanceGroupProgressResult? result,
    Object? error,
  }) => EventDepartureForm._(
    session: session,
    destination: destination,
    selection: selection,
    roster: roster,
    checkpoint: checkpoint,
    phase: phase,
    action: action ?? this.action,
    result: result,
    error: error,
  );
}

/// One group owns its unresolved departure across review refresh and closure.
@riverpod
class EventAssistanceDepartureEditor extends _$EventAssistanceDepartureEditor {
  Future<EventAssistanceGroupProgressResult>? _confirmation;
  Future<EventAssistanceDepartureRosterReview>? _review;
  EventDeparturePendingAction? _pending;
  EventDepartureAccount? _account;
  int _epoch = 0;
  void Function()? _releasePending;

  @override
  EventDepartureEditorState build(EventAssistanceGroupScope scope) {
    final auth = ref.watch(eventAssistanceDepartureAccountProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    ref.watch(eventAssistanceDepartureControllerProvider);
    _epoch++;
    _account = null;
    _confirmation = null;
    _review = null;
    _clearPending();
    ref.onDispose(() {
      _epoch++;
      _clearPending();
    });
    if (!authState.isSettledData || authState.value == null) {
      return EventDepartureFormUnavailable._(
        authState.error ?? departureSessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const EventDepartureFormIdle();
  }

  bool _current(EventDepartureAccount account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(eventAssistanceDepartureAccountProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(EventDepartureSession session) {
    if (!_current(session.account, _epoch)) throw departureSessionChanged;
    final page = ref.read(eventAssistanceDepartureProvider(scope));
    if (session.view.scope != scope ||
        !session.isCurrent ||
        page.isLoading ||
        page.hasError ||
        !identical(page.asData?.value, session)) {
      throw const ValidationException('Reload the current departure details.');
    }
  }

  void open(EventDepartureSession session) {
    if (!_current(session.account, _epoch)) throw departureSessionChanged;
    if (session.view.scope != scope) {
      throw const ValidationException('Choose the reviewed group.');
    }
    if (_pending != null || _confirmation != null || _review != null) return;
    _requireReview(session);
    state = EventDepartureForm._(session: session);
  }

  void reload() {
    final form = _form;
    if (form == null ||
        !form.canReload ||
        _pending != null ||
        _confirmation != null ||
        _review != null) {
      return;
    }
    ref.read(eventAssistanceDepartureProvider(scope).notifier).reload();
    state = const EventDepartureFormIdle();
  }

  EventDepartureForm? get _form => switch (state) {
    final EventDepartureForm form when _current(form.session.account, _epoch) =>
      form,
    _ => null,
  };

  EventDepartureForm? get _editable {
    final form = _form;
    if (form == null || !form.canEdit || _pending != null) return null;
    try {
      _requireReview(form.session);
      return form;
    } catch (error) {
      state = form._withPhase(
        EventDepartureFormPhase.refreshRequired,
        error: error,
      );
      return null;
    }
  }

  void selectDestination(AssistanceJoiningTarget target) {
    final form = _editable;
    if (form == null) return;
    if (!form.session.view.destinations.any((item) => item.target == target)) {
      throw ArgumentError('Choose a destination from this event snapshot.');
    }
    if (form.destination == target) return;
    state = EventDepartureForm._(
      session: form.session,
      destination: target,
      selection: form.selection,
      roster: form.roster,
    );
  }

  /// Null skips recording; an explicit empty selection records nobody.
  void selectRoster(Iterable<String>? attendeeIds) {
    final form = _editable;
    if (form == null) return;
    state = EventDepartureForm._(
      session: form.session,
      destination: form.destination,
      selection: attendeeIds == null
          ? null
          : EventAssistanceDepartureRosterSelection(attendeeIds),
    );
  }

  void setCheckpoint(AssistanceDepartureCheckpointRequest? request) {
    final form = _editable;
    if (form == null) return;
    if (request != null) {
      if (!form.canConfigureCheckpoint) {
        throw const ValidationException(
          'Review the departure roster and choose a route stop first.',
        );
      }
      EventAssistanceDepartureChange.prepare(
        snapshot: form.session.view,
        operationId: 'departure:review',
        destination: form.destination!,
        roster: form.roster,
        checkpoint: request,
      );
    }
    state = EventDepartureForm._(
      session: form.session,
      destination: form.destination,
      selection: form.selection,
      roster: form.roster,
      checkpoint: request,
    );
  }

  Future<EventAssistanceDepartureRosterReview> reviewRoster() {
    final form = _form;
    if (form == null) return Future.error(departureSessionChanged);
    if (_review case final pending?) return pending;
    if (!form.canReviewRoster) {
      return Future.error(
        const ValidationException(
          'Choose the people whose departure you observed.',
        ),
      );
    }
    try {
      _requireReview(form.session);
    } catch (error, stack) {
      state = form._withPhase(
        EventDepartureFormPhase.refreshRequired,
        error: error,
      );
      return Future.error(error, stack);
    }
    final epoch = _epoch;
    final completion = Completer<EventAssistanceDepartureRosterReview>();
    final tracked = completion.future;
    _review = tracked;
    final reviewing = EventDepartureForm._(
      session: form.session,
      destination: form.destination,
      selection: form.selection,
      phase: EventDepartureFormPhase.reviewingRoster,
    );
    state = reviewing;
    unawaited(
      _reviewRoster(reviewing, epoch)
          .then(
            completion.complete,
            onError: (Object error, StackTrace stack) =>
                completion.completeError(error, stack),
          )
          .whenComplete(() {
            if (identical(_review, tracked)) _review = null;
          }),
    );
    return tracked;
  }

  Future<EventAssistanceDepartureRosterReview> _reviewRoster(
    EventDepartureForm reviewing,
    int epoch,
  ) async {
    try {
      final roster = await ref
          .read(eventAssistanceDepartureControllerProvider.notifier)
          .reviewRoster(reviewing.session, reviewing.selection!);
      if (!_current(reviewing.session.account, epoch)) {
        throw departureSessionChanged;
      }
      _requireReview(reviewing.session);
      _review = null;
      state = EventDepartureForm._(
        session: reviewing.session,
        destination: reviewing.destination,
        selection: reviewing.selection,
        roster: roster,
      );
      return roster;
    } catch (error) {
      if (_current(reviewing.session.account, epoch)) {
        _review = null;
        state = reviewing._withPhase(
          _needsFreshReview(error) || !reviewing.session.isCurrent
              ? EventDepartureFormPhase.refreshRequired
              : EventDepartureFormPhase.choosing,
          error: error,
        );
      }
      rethrow;
    }
  }

  /// Retries retain the exact destination, observed roster and operation ID.
  Future<EventAssistanceGroupProgressResult> submit() {
    final form = _form;
    if (form == null) return Future.error(departureSessionChanged);
    if (_confirmation case final pending?) return pending;
    if (form.result case final result?) return Future.value(result);
    if (!form.canSubmit) {
      return Future.error(
        const ValidationException(
          'Review the departure details before confirming.',
        ),
      );
    }
    late final EventDeparturePendingAction action;
    try {
      if (_pending case final pending?) {
        action = pending;
      } else {
        _requireReview(form.session);
        action = ref
            .read(eventAssistanceDepartureControllerProvider.notifier)
            .prepare(
              session: form.session,
              destination: form.destination!,
              roster: form.roster,
              checkpoint: form.checkpoint,
            );
      }
    } catch (error, stack) {
      state = form._withPhase(
        EventDepartureFormPhase.refreshRequired,
        error: error,
      );
      return Future.error(error, stack);
    }
    final epoch = _epoch;
    final completion = Completer<EventAssistanceGroupProgressResult>();
    final tracked = completion.future;
    _confirmation = tracked;
    _pending = action;
    _retainPending(form.session.account);
    final submitted = form._withPhase(
      EventDepartureFormPhase.submitting,
      action: action,
    );
    state = submitted;
    unawaited(
      _confirm(submitted, action, epoch)
          .then(
            completion.complete,
            onError: (Object error, StackTrace stack) =>
                completion.completeError(error, stack),
          )
          .whenComplete(() {
            if (identical(_confirmation, tracked)) _confirmation = null;
          }),
    );
    return tracked;
  }

  void _retainPending(EventDepartureAccount account) {
    if (_releasePending != null) return;
    final lease = ref.keepAlive();
    // A closed sheet may pause dependencies; this subscription still observes
    // sign-out and same-UID reauthentication while an outcome is unresolved.
    final auth = ref.container.listen(eventAssistanceDepartureAccountProvider, (
      _,
      next,
    ) {
      if (next.isLoading ||
          next.hasError ||
          !identical(next.asData?.value, account)) {
        _epoch++;
        _account = null;
        _confirmation = null;
        _review = null;
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

  Future<EventAssistanceGroupProgressResult> _confirm(
    EventDepartureForm submitted,
    EventDeparturePendingAction action,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventAssistanceDepartureControllerProvider.notifier)
          .confirm(action);
      if (!_current(action.session.account, epoch)) {
        throw departureSessionChanged;
      }
      action.change.requireResult(result);
      _clearPending();
      _confirmation = null;
      state = submitted._withPhase(
        EventDepartureFormPhase.saved,
        result: result,
      );
      return result;
    } catch (error) {
      if (_current(action.session.account, epoch)) {
        final definitive = _needsFreshReview(error);
        if (definitive) _clearPending();
        _confirmation = null;
        state = submitted._withPhase(
          definitive
              ? EventDepartureFormPhase.refreshRequired
              : EventDepartureFormPhase.retryRequired,
          error: error,
        );
      }
      rethrow;
    }
  }
}

bool _needsFreshReview(Object error) =>
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
