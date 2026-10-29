import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_sender_preference_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_sender_preference.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_sender_preference_controller.g.dart';

enum EventSenderPreferencePhase { ready, saving, uncertain, refreshRequired }

enum EventSenderPreferenceNotice { none, saved, changed }

sealed class EventSenderPreferenceState {
  const EventSenderPreferenceState();
}

final class EventSenderPreferenceHidden extends EventSenderPreferenceState {
  const EventSenderPreferenceHidden();
}

final class EventSenderPreferenceLoading extends EventSenderPreferenceState {
  const EventSenderPreferenceLoading();
}

final class EventSenderPreferenceFailure extends EventSenderPreferenceState {
  const EventSenderPreferenceFailure(this.error);
  final Object error;
}

/// Navigation callbacks are bound to one account and one discovery snapshot.
final class EventSenderPreferenceNavigation {
  EventSenderPreferenceNavigation._({
    required this.account,
    required this.serverTime,
    required this.configuredSenderId,
    required List<String> previousSenderIds,
    required this.selectedSenderId,
    required this.nextCursor,
  }) : previousSenderIds = List.unmodifiable(previousSenderIds);
  final AuthenticatedSession account;
  final int serverTime;
  final String? configuredSenderId;
  final List<String> previousSenderIds;
  final String? selectedSenderId;
  final String? nextCursor;
  bool get isEarlier =>
      selectedSenderId != null && selectedSenderId != configuredSenderId;
  bool get canLoadMore => nextCursor != null;
}

/// A checkbox/button callback owns the exact terms that were displayed.
final class EventSenderPreferenceReview {
  const EventSenderPreferenceReview._(this.account, this.view);
  final AuthenticatedSession account;
  final EventSenderPreferenceView view;
}

final class EventSenderPreferenceReady extends EventSenderPreferenceState {
  const EventSenderPreferenceReady._(
    this.navigation,
    this.review, {
    this.phase = EventSenderPreferencePhase.ready,
    this.notice = EventSenderPreferenceNotice.none,
    this.error,
  });
  final EventSenderPreferenceNavigation navigation;
  // Null means a filtered history page has no visible sender yet. More pages
  // remain discoverable without an invented sender or enrollment offer.
  final EventSenderPreferenceReview? review;
  final EventSenderPreferencePhase phase;
  final EventSenderPreferenceNotice notice;
  final Object? error;
  bool get canEnable =>
      phase == EventSenderPreferencePhase.ready &&
      !navigation.isEarlier &&
      (review?.view.canEnable ?? false);
  bool get canDisable =>
      phase == EventSenderPreferencePhase.ready &&
      (review?.view.canDisable ?? false);
  bool get canNavigate => phase == EventSenderPreferencePhase.ready;
  bool get canRetry => phase == EventSenderPreferencePhase.uncertain;
  bool get canRefresh =>
      phase == EventSenderPreferencePhase.ready ||
      phase == EventSenderPreferencePhase.refreshRequired;
}

const _sessionChanged = BackendOperationException(
  code: 'session-changed',
  message: 'Reload event messaging after signing in again.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review event messaging',
    resource: 'eventSenderPreferences',
  ),
);

/// Shared navigation/retry ownership with channel-specific reviewed payloads.
@riverpod
class EventSenderPreferenceController
    extends _$EventSenderPreferenceController {
  int _epoch = 0;
  AuthenticatedSession? _account;
  EventSenderPreferenceNavigation? _navigation;
  EventSenderPreferenceReview? _review;
  Future<void>? _readInFlight;
  Future<EventSenderPreferenceResult>? _writeInFlight;
  EventSenderPreferenceChange? _pending;
  void Function()? _releasePending;

  @override
  EventSenderPreferenceState build(EventSenderPreferenceScope scope) {
    final auth = ref.watch(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    _releasePending?.call();
    _releasePending = null;
    final epoch = ++_epoch;
    _account = null;
    _navigation = null;
    _review = null;
    _readInFlight = null;
    _writeInFlight = null;
    _pending = null;
    ref.onDispose(() {
      _epoch++;
      final release = _releasePending;
      _releasePending = null;
      release?.call();
    });
    if ((authState.isLoading || authState.isRefreshing || authState.retrying)) {
      return const EventSenderPreferenceLoading();
    }
    if (authState.error != null) {
      return authState.error is SignInRequiredException
          ? const EventSenderPreferenceHidden()
          : EventSenderPreferenceFailure(authState.error!);
    }
    final account = _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    unawaited(
      Future<void>.microtask(
        () => _read(account, epoch, () => _discover(account, epoch)),
      ),
    );
    return const EventSenderPreferenceLoading();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch) return false;
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  Future<void> _read(
    AuthenticatedSession account,
    int epoch,
    Future<void> Function() action,
  ) {
    if (!_current(account, epoch)) return Future.value();
    if (_readInFlight case final pending?) return pending;
    state = const EventSenderPreferenceLoading();
    late final Future<void> tracked;
    tracked = Future<void>.sync(action)
        .catchError((Object error) {
          if (_current(account, epoch)) {
            _publishRead(EventSenderPreferenceFailure(error));
          }
        })
        .whenComplete(() {
          if (identical(_readInFlight, tracked)) _readInFlight = null;
        });
    _readInFlight = tracked;
    return tracked;
  }

  void _publishRead(EventSenderPreferenceState next) {
    // A visible ready/error state must be actionable before the read's async
    // stack unwinds. Old completion callbacks cannot clear a newer read.
    _readInFlight = null;
    state = next;
  }

  Future<void> _discover(AuthenticatedSession account, int epoch) async {
    final page = await ref
        .read(eventSenderPreferenceRepositoryProvider)
        .list(scope);
    if (!_current(account, epoch)) return;
    if (page.scope != scope) {
      throw const FormatException(
        'Sender choices belong to another participant.',
      );
    }
    _review = null;
    final navigation = _navigation = EventSenderPreferenceNavigation._(
      account: account,
      serverTime: page.serverTime,
      configuredSenderId: page.configuredSenderId,
      previousSenderIds: page.previousSenderIds,
      selectedSenderId:
          page.configuredSenderId ?? page.previousSenderIds.firstOrNull,
      nextCursor: page.nextCursor,
    );
    await _fetch(navigation, epoch);
  }

  Future<void> _fetch(
    EventSenderPreferenceNavigation navigation,
    int epoch,
  ) async {
    final senderId = navigation.selectedSenderId;
    if (senderId == null) {
      _publishRead(
        navigation.canLoadMore
            ? EventSenderPreferenceReady._(navigation, null)
            : const EventSenderPreferenceHidden(),
      );
      return;
    }
    final view = await ref
        .read(eventSenderPreferenceRepositoryProvider)
        .fetch(scope, senderId);
    if (!_current(navigation.account, epoch)) return;
    if (view.scope != scope || view.senderId != senderId) {
      throw const FormatException(
        'The sender review does not match this selection.',
      );
    }
    final old = _review?.view;
    if (old != null &&
        old.senderId == view.senderId &&
        ((old.revision ?? 0) > (view.revision ?? 0) ||
            old.revision == view.revision &&
                old.serverTime > view.serverTime)) {
      throw const FormatException('Event message review moved backwards.');
    }
    final review = _review = EventSenderPreferenceReview._(
      navigation.account,
      view,
    );
    _publishRead(EventSenderPreferenceReady._(navigation, review));
  }

  /// Route resume refreshes the selected sender, preserving unresolved writes.
  Future<void> refresh() {
    final account = _account;
    if (account == null ||
        !_current(account, _epoch) ||
        _pending != null ||
        _writeInFlight != null) {
      return Future.value();
    }
    if (_readInFlight case final pending?) return pending;
    final navigation = _navigation;
    return _read(
      account,
      _epoch,
      () => navigation?.selectedSenderId == null
          ? _discover(account, _epoch)
          : _fetch(navigation!, _epoch),
    );
  }

  void _requireNavigation(EventSenderPreferenceNavigation navigation) {
    if (!_current(navigation.account, _epoch)) throw _sessionChanged;
    final current = state;
    if (current is! EventSenderPreferenceReady ||
        !current.canNavigate ||
        !identical(current.navigation, navigation) ||
        _pending != null) {
      throw const ValidationException('Review the current sender choices.');
    }
  }

  Future<void> choose(
    EventSenderPreferenceNavigation navigation,
    String senderId,
  ) async {
    _requireNavigation(navigation);
    if (senderId != navigation.configuredSenderId &&
        !navigation.previousSenderIds.contains(senderId)) {
      throw const ValidationException('Choose a sender from this event.');
    }
    if (senderId == navigation.selectedSenderId) return;
    final selected = _navigation = EventSenderPreferenceNavigation._(
      account: navigation.account,
      serverTime: navigation.serverTime,
      configuredSenderId: navigation.configuredSenderId,
      previousSenderIds: navigation.previousSenderIds,
      selectedSenderId: senderId,
      nextCursor: navigation.nextCursor,
    );
    _review = null;
    await _read(navigation.account, _epoch, () => _fetch(selected, _epoch));
  }

  Future<void> loadMore(EventSenderPreferenceNavigation navigation) async {
    _requireNavigation(navigation);
    if (!navigation.canLoadMore) return;
    final epoch = _epoch;
    await _read(navigation.account, epoch, () async {
      final page = await ref
          .read(eventSenderPreferenceRepositoryProvider)
          .list(scope, cursor: navigation.nextCursor);
      if (!_current(navigation.account, epoch)) return;
      if (page.scope != scope ||
          page.nextCursor != null &&
              navigation.nextCursor != null &&
              page.nextCursor!.compareTo(navigation.nextCursor!) <= 0) {
        throw const FormatException('Invalid sender discovery page.');
      }
      if (page.configuredSenderId != navigation.configuredSenderId ||
          page.serverTime < navigation.serverTime) {
        _navigation = null;
        _review = null;
        throw const ValidationException('Sender choices changed. Reload them.');
      }
      final ids = {
        ...navigation.previousSenderIds,
        ...page.previousSenderIds,
      }.toList();
      final next = _navigation = EventSenderPreferenceNavigation._(
        account: navigation.account,
        serverTime: page.serverTime,
        configuredSenderId: page.configuredSenderId,
        previousSenderIds: ids,
        selectedSenderId: navigation.selectedSenderId ?? ids.firstOrNull,
        nextCursor: page.nextCursor,
      );
      if (next.selectedSenderId != navigation.selectedSenderId) {
        await _fetch(next, epoch);
      } else {
        _publishRead(
          next.selectedSenderId == null && !next.canLoadMore
              ? const EventSenderPreferenceHidden()
              : EventSenderPreferenceReady._(next, _review),
        );
      }
    });
  }

  Future<EventSenderPreferenceResult> enable(
    EventSenderPreferenceReview review,
  ) => _change(review, EventSenderPreferenceDecision.grant);
  Future<EventSenderPreferenceResult> disable(
    EventSenderPreferenceReview review,
  ) => _change(review, EventSenderPreferenceDecision.revoke);

  Future<EventSenderPreferenceResult> _change(
    EventSenderPreferenceReview review,
    EventSenderPreferenceDecision decision,
  ) {
    if (!_current(review.account, _epoch)) return Future.error(_sessionChanged);
    final current = state;
    if (current is! EventSenderPreferenceReady ||
        !identical(current.review, review)) {
      return Future.error(
        const ValidationException(
          'Review the current event message preference.',
        ),
      );
    }
    if (_writeInFlight case final pending?
        when _pending?.decision == decision) {
      return pending;
    }
    if (_pending != null ||
        (decision == EventSenderPreferenceDecision.grant
            ? !current.canEnable
            : !current.canDisable)) {
      return Future.error(
        const ValidationException(
          'Resolve the current message preference first.',
        ),
      );
    }
    final random = Random.secure();
    final id = List.generate(
      16,
      (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
    ).join();
    return _submit(
      review,
      review.view.prepareChange(
        requestId: '${scope.channel.name}:$id',
        decision: decision,
      ),
    );
  }

  Future<EventSenderPreferenceResult> retry(
    EventSenderPreferenceReview review,
  ) {
    if (!_current(review.account, _epoch)) return Future.error(_sessionChanged);
    final current = state;
    if (current is! EventSenderPreferenceReady ||
        !identical(current.review, review) ||
        _pending == null) {
      return Future.error(
        const ValidationException('There is no message preference to retry.'),
      );
    }
    if (_writeInFlight case final pending?) return pending;
    if (!current.canRetry) {
      return Future.error(
        const ValidationException('Reload the current message preference.'),
      );
    }
    return _submit(review, _pending!);
  }

  Future<EventSenderPreferenceResult> _submit(
    EventSenderPreferenceReview review,
    EventSenderPreferenceChange change,
  ) {
    final epoch = _epoch;
    _pending = change;
    // Keep an uncertain request available when its sheet closes and reopens.
    // Account invalidation or a definitive result releases this private lease.
    _retainPending(review.account);
    state = EventSenderPreferenceReady._(
      _navigation!,
      review,
      phase: EventSenderPreferencePhase.saving,
    );
    late final Future<EventSenderPreferenceResult> tracked;
    tracked = _apply(review, change, epoch).whenComplete(() {
      if (identical(_writeInFlight, tracked)) _writeInFlight = null;
    });
    _writeInFlight = tracked;
    return tracked;
  }

  void _retainPending(AuthenticatedSession account) {
    if (_releasePending != null) return;
    final lease = ref.keepAlive();
    // Riverpod pauses dependencies when a sheet has no listeners, even while
    // kept alive. Observe auth outside that paused subscription only while an
    // unresolved request exists, so an unseen account change cannot survive it.
    final auth = ref.container.listen(authenticatedSessionProvider, (_, next) {
      if (next.isLoading ||
          next.hasError ||
          !identical(next.asData?.value, account)) {
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

  void _publishReady(EventSenderPreferenceReady next) {
    _writeInFlight = null;
    state = next;
  }

  Future<EventSenderPreferenceResult> _apply(
    EventSenderPreferenceReview review,
    EventSenderPreferenceChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventSenderPreferenceRepositoryProvider)
          .apply(change);
      if (!_current(review.account, epoch)) throw _sessionChanged;
      result.requireChange(change);
      final next = _review = EventSenderPreferenceReview._(
        review.account,
        result.view,
      );
      _publishReady(
        EventSenderPreferenceReady._(
          _navigation!,
          next,
          notice: result.outcome == EventSenderPreferenceOutcome.conflict
              ? EventSenderPreferenceNotice.changed
              : EventSenderPreferenceNotice.saved,
        ),
      );
      _clearPending();
      return result;
    } catch (error) {
      _publishApplyFailure(review, error, epoch);
      rethrow;
    }
  }

  void _publishApplyFailure(
    EventSenderPreferenceReview review,
    Object error,
    int epoch,
  ) {
    if (!_current(review.account, epoch)) return;
    final definitive =
        error is AppException &&
        {
          'invalid-argument',
          'failed-precondition',
          'permission-denied',
          'unauthenticated',
          'sign-in-required',
          'callable-unavailable',
        }.contains(error.code);
    _publishReady(
      EventSenderPreferenceReady._(
        _navigation!,
        review,
        error: error,
        phase: definitive
            ? EventSenderPreferencePhase.refreshRequired
            : EventSenderPreferencePhase.uncertain,
      ),
    );
    if (definitive) _clearPending();
  }
}
