import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_sms_preference_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_sms_preference.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_sms_preference_controller.g.dart';

enum EventSmsPreferencePhase { ready, saving, uncertain, refreshRequired }

enum EventSmsPreferenceNotice { none, saved, changed }

sealed class EventSmsPreferenceState {
  const EventSmsPreferenceState();
}

final class EventSmsPreferenceHidden extends EventSmsPreferenceState {
  const EventSmsPreferenceHidden();
}

final class EventSmsPreferenceLoading extends EventSmsPreferenceState {
  const EventSmsPreferenceLoading();
}

final class EventSmsPreferenceFailure extends EventSmsPreferenceState {
  const EventSmsPreferenceFailure(this.error);
  final Object error;
}

/// A form review belongs to one uninterrupted account and controller load.
final class EventSmsPreferenceReview {
  const EventSmsPreferenceReview._(this.account, this.view);
  final AuthenticatedSession account;
  final EventSmsPreferenceView view;
}

final class EventSmsPreferenceReady extends EventSmsPreferenceState {
  const EventSmsPreferenceReady._(
    this.review, {
    this.phase = EventSmsPreferencePhase.ready,
    this.notice = EventSmsPreferenceNotice.none,
    this.error,
  });
  final EventSmsPreferenceReview review;
  final EventSmsPreferencePhase phase;
  final EventSmsPreferenceNotice notice;
  final Object? error;
  bool get canEnable =>
      phase == EventSmsPreferencePhase.ready && review.view.canEnable;
  bool get canDisable =>
      phase == EventSmsPreferencePhase.ready && review.view.canDisable;
  bool get canRetry => phase == EventSmsPreferencePhase.uncertain;
  bool get canRefresh =>
      phase == EventSmsPreferencePhase.ready ||
      phase == EventSmsPreferencePhase.refreshRequired;
}

const _sessionChanged = BackendOperationException(
  code: 'session-changed',
  message: 'Reload event texts after signing in again.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review event text preferences',
    resource: 'eventAssistanceSms',
  ),
);

/// One participant's explicit SMS choice; reads and retries never enroll them.
@riverpod
class EventSmsPreferenceController extends _$EventSmsPreferenceController {
  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<void>? _readInFlight;
  Future<EventSmsPreferenceResult>? _writeInFlight;
  EventSmsPreferenceChange? _pending;
  void Function()? _releasePending;

  @override
  EventSmsPreferenceState build(EventSmsPreferenceScope scope) {
    final auth = ref.watch(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    final epoch = ++_epoch;
    _account = null;
    _readInFlight = null;
    _writeInFlight = null;
    _clearPending();
    ref.onDispose(() {
      _epoch++;
      _clearPending();
    });
    if ((authState.isLoading || authState.isRefreshing || authState.retrying)) {
      return const EventSmsPreferenceLoading();
    }
    if (authState.error != null) {
      return authState.error is SignInRequiredException
          ? const EventSmsPreferenceHidden()
          : EventSmsPreferenceFailure(authState.error!);
    }
    final account = _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    // Defer the read until the initial loading state has been published.
    unawaited(Future<void>.microtask(() => _load(account, epoch)));
    return const EventSmsPreferenceLoading();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch) return false;
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  Future<void> _load(AuthenticatedSession account, int epoch) {
    if (!_current(account, epoch)) return Future.value();
    if (_readInFlight case final pending?) return pending;
    late final Future<void> tracked;
    tracked = _fetch(account, epoch).whenComplete(() {
      if (identical(_readInFlight, tracked)) _readInFlight = null;
    });
    _readInFlight = tracked;
    return tracked;
  }

  Future<void> _fetch(AuthenticatedSession account, int epoch) async {
    try {
      final view = await ref
          .read(eventSmsPreferenceRepositoryProvider)
          .fetch(scope);
      if (!_current(account, epoch)) return;
      if (view.scope != scope) {
        throw const FormatException(
          'Event text review belongs to another guest.',
        );
      }
      state = view.isOptionalOfferHidden
          ? const EventSmsPreferenceHidden()
          : EventSmsPreferenceReady._(
              EventSmsPreferenceReview._(account, view),
            );
    } catch (error) {
      if (_current(account, epoch)) state = EventSmsPreferenceFailure(error);
    }
  }

  /// Used on explicit refresh or route resume. An unresolved write is retained.
  Future<void> refresh() {
    final account = _account;
    if (account == null ||
        !_current(account, _epoch) ||
        _pending != null ||
        _writeInFlight != null) {
      return Future.value();
    }
    if (_readInFlight case final pending?) return pending;
    state = const EventSmsPreferenceLoading();
    return _load(account, _epoch);
  }

  Future<EventSmsPreferenceResult> enable(EventSmsPreferenceReview review) =>
      _change(review, EventSmsPreferenceDecision.grant);
  Future<EventSmsPreferenceResult> disable(EventSmsPreferenceReview review) =>
      _change(review, EventSmsPreferenceDecision.revoke);

  Future<EventSmsPreferenceResult> _change(
    EventSmsPreferenceReview review,
    EventSmsPreferenceDecision decision,
  ) {
    if (!_current(review.account, _epoch)) {
      return Future.error(_sessionChanged);
    }
    final current = state;
    if (current is! EventSmsPreferenceReady ||
        !identical(current.review, review)) {
      return Future.error(
        const ValidationException('Review the current event text preference.'),
      );
    }
    if (_writeInFlight case final pending?
        when _pending?.decision == decision) {
      return pending;
    }
    if (_pending != null ||
        (decision == EventSmsPreferenceDecision.grant
            ? !current.canEnable
            : !current.canDisable)) {
      return Future.error(
        const ValidationException(
          'Resolve the current event text change before choosing again.',
        ),
      );
    }
    final random = Random.secure();
    final id = List.generate(
      16,
      (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
    ).join();
    final change = review.view.prepareChange(
      requestId: 'sms:$id',
      decision: decision,
    );
    return _submit(review, change);
  }

  Future<EventSmsPreferenceResult> retry(EventSmsPreferenceReview review) {
    if (!_current(review.account, _epoch)) {
      return Future.error(_sessionChanged);
    }
    final current = state;
    if (current is! EventSmsPreferenceReady ||
        !identical(current.review, review) ||
        _pending == null) {
      return Future.error(
        const ValidationException(
          'There is no pending event text change to retry.',
        ),
      );
    }
    if (_writeInFlight case final pending?) return pending;
    if (!current.canRetry) {
      return Future.error(
        const ValidationException('Reload the current event text preference.'),
      );
    }
    return _submit(review, _pending!);
  }

  Future<EventSmsPreferenceResult> _submit(
    EventSmsPreferenceReview review,
    EventSmsPreferenceChange change,
  ) {
    final epoch = _epoch;
    _pending = change;
    _retainPending(review.account);
    state = EventSmsPreferenceReady._(
      review,
      phase: EventSmsPreferencePhase.saving,
    );
    late final Future<EventSmsPreferenceResult> tracked;
    tracked = _apply(review, change, epoch).whenComplete(() {
      if (identical(_writeInFlight, tracked)) _writeInFlight = null;
    });
    _writeInFlight = tracked;
    return tracked;
  }

  void _retainPending(AuthenticatedSession account) {
    if (_releasePending != null) return;
    final lease = ref.keepAlive();
    // Keep an uncertain decision after its sheet closes, while observing auth
    // outside Riverpod's paused dependencies for this pending request only.
    final auth = ref.container.listen(authenticatedSessionProvider, (_, next) {
      if (next.isLoading ||
          next.hasError ||
          !identical(next.asData?.value, account)) {
        _epoch++;
        _account = null;
        _readInFlight = null;
        _writeInFlight = null;
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

  void _publishReady(EventSmsPreferenceReady next) {
    // A retry callback can run before the previous async stack unwinds.
    _writeInFlight = null;
    state = next;
  }

  Future<EventSmsPreferenceResult> _apply(
    EventSmsPreferenceReview review,
    EventSmsPreferenceChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventSmsPreferenceRepositoryProvider)
          .apply(change);
      if (!_current(review.account, epoch)) throw _sessionChanged;
      result.requireChange(change);
      _clearPending();
      _publishReady(
        EventSmsPreferenceReady._(
          EventSmsPreferenceReview._(review.account, result.view),
          notice: result.outcome == EventSmsPreferenceOutcome.conflict
              ? EventSmsPreferenceNotice.changed
              : EventSmsPreferenceNotice.saved,
        ),
      );
      return result;
    } catch (error) {
      _publishApplyFailure(review, error, epoch);
      rethrow;
    }
  }

  void _publishApplyFailure(
    EventSmsPreferenceReview review,
    Object error,
    int epoch,
  ) {
    if (!_current(review.account, epoch)) return;
    final refresh =
        error is AppException &&
        {
          'invalid-argument',
          'failed-precondition',
          'permission-denied',
          'unauthenticated',
          'sign-in-required',
          'callable-unavailable',
        }.contains(error.code);
    if (refresh) _clearPending();
    _publishReady(
      EventSmsPreferenceReady._(
        review,
        error: error,
        phase: refresh
            ? EventSmsPreferencePhase.refreshRequired
            : EventSmsPreferencePhase.uncertain,
      ),
    );
  }
}
