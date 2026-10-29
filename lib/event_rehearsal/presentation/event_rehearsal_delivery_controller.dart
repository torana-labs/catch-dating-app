import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_delivery_reviews.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_pending_deliveries.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_delivery_controller.g.dart';

final class _RehearsalDeliveryReview {
  const _RehearsalDeliveryReview(this.session, this.delivery);
  final RehearsalAssistanceReview session;
  final RehearsalActionableDelivery delivery;
  AuthenticatedSession get account => session.account;
}

enum RehearsalDeliveryPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef RehearsalDeliveryMutationKey = ({
  RehearsalDeliveryScope scope,
  AuthenticatedSession account,
});

sealed class RehearsalDeliveryEditorState {
  const RehearsalDeliveryEditorState();
  bool get canDismiss => switch (this) {
    RehearsalDeliveryForm(:final phase) =>
      phase != RehearsalDeliveryPhase.submitting,
    RehearsalDeliveryIdle() || RehearsalDeliveryUnavailable() => true,
  };
}

final class RehearsalDeliveryIdle extends RehearsalDeliveryEditorState {
  const RehearsalDeliveryIdle();
}

final class RehearsalDeliveryUnavailable extends RehearsalDeliveryEditorState {
  const RehearsalDeliveryUnavailable(this.error);
  final Object error;
}

final class RehearsalDeliveryForm extends RehearsalDeliveryEditorState {
  const RehearsalDeliveryForm._(
    this._review, {
    this.phase = RehearsalDeliveryPhase.ready,
    this.change,
    this.result,
    this.error,
  });
  final _RehearsalDeliveryReview _review;
  RehearsalAssistanceReview get review => _review.session;
  RehearsalActionableDelivery get delivery => _review.delivery;
  final RehearsalDeliveryPhase phase;
  final RehearsalAssistanceChange? change;
  final EventRehearsalBootstrap? result;
  final Object? error;
  bool get canTakeOver =>
      phase == RehearsalDeliveryPhase.ready && review.isCurrent;
  bool get canRetry => phase == RehearsalDeliveryPhase.retryRequired;
  bool get canReload =>
      phase == RehearsalDeliveryPhase.ready ||
      phase == RehearsalDeliveryPhase.refreshRequired;
  RehearsalDeliveryForm _after(
    RehearsalDeliveryPhase phase, {
    required RehearsalAssistanceChange change,
    EventRehearsalBootstrap? result,
    Object? error,
  }) => RehearsalDeliveryForm._(
    _review,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// One message owns one pending request across page refreshes and sheet closure.
@riverpod
class EventRehearsalDeliveryController
    extends _$EventRehearsalDeliveryController {
  static final handoffMutation = Mutation<EventRehearsalBootstrap>();
  static RehearsalDeliveryMutationKey mutationKey(
    RehearsalAssistanceReview review,
    RehearsalActionableDelivery delivery,
  ) => (scope: delivery.scope, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventRehearsalBootstrap>? _inFlight;
  RehearsalAssistanceChange? _pending;
  void Function()? _releasePending;

  @override
  RehearsalDeliveryEditorState build(RehearsalDeliveryScope scope) {
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
      return RehearsalDeliveryUnavailable(
        authState.error ?? rehearsalReviewSessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const RehearsalDeliveryIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(_RehearsalDeliveryReview review) {
    if (!_current(review.account, _epoch)) throw rehearsalReviewSessionChanged;
    if (review.delivery.scope != scope) {
      throw const ValidationException('Review this message before continuing.');
    }
    final page = ref.read(eventRehearsalAssistanceProvider(scope.sessionId));
    if (page.isLoading ||
        page.hasError ||
        !review.session.isCurrent ||
        !identical(page.asData?.value, review.session) ||
        !(review.session.snapshot.deliveryReviews?.deliveries.any(
              (row) => identical(row, review.delivery),
            ) ??
            false)) {
      throw const ValidationException('Reload the current practice delivery.');
    }
  }

  /// A refreshed review cannot replace an unresolved command for this message.
  void open(
    RehearsalAssistanceReview review,
    RehearsalActionableDelivery delivery,
  ) {
    if (!_current(review.account, _epoch)) throw rehearsalReviewSessionChanged;
    if (delivery.scope != scope) {
      throw const ValidationException('Choose the reviewed practice message.');
    }
    if (_pending != null || _inFlight != null) return;
    final selected = _RehearsalDeliveryReview(review, delivery);
    _requireReview(selected);
    state = RehearsalDeliveryForm._(selected);
  }

  Future<EventRehearsalBootstrap> takeOver() {
    final form = state;
    if (form is! RehearsalDeliveryForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(rehearsalReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) return Future.value(result);
    if (!form.canTakeOver || _pending != null) {
      return Future.error(
        const ValidationException('Resolve the pending handoff first.'),
      );
    }
    try {
      _requireReview(form._review);
      final random = Random.secure();
      final id = List.generate(
        16,
        (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join();
      return _submit(
        form,
        RehearsalAssistanceChange(
          snapshot: form.review.snapshot,
          command: RehearsalTakeDelivery(
            snapshot: form.delivery,
            actorUid: form.review.account.uid,
          ),
          clientActionId: 'handoff_$id',
        ),
      );
    } catch (error, stackTrace) {
      return Future.error(error, stackTrace);
    }
  }

  void reload() {
    final form = state;
    if (form is RehearsalDeliveryForm && !form.canReload) {
      throw const ValidationException('Confirm the pending handoff first.');
    }
    if (_pending != null || _inFlight != null) {
      throw const ValidationException('Confirm the pending handoff first.');
    }
    state = const RehearsalDeliveryIdle();
  }

  Future<EventRehearsalBootstrap> retry() {
    final form = state;
    if (form is! RehearsalDeliveryForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(rehearsalReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException('There is no handoff to retry.'),
      );
    }
    return _submit(form, _pending!);
  }

  Future<EventRehearsalBootstrap> _submit(
    RehearsalDeliveryForm form,
    RehearsalAssistanceChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventRehearsalBootstrap>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(RehearsalDeliveryPhase.submitting, change: change);
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
        .read(eventRehearsalPendingDeliveriesProvider.notifier)
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
          .read(eventRehearsalPendingDeliveriesProvider.notifier)
          .release(scope, _account);
    }
    _pending = null;
    final release = _releasePending;
    _releasePending = null;
    release?.call();
  }

  void _refresh(AuthenticatedSession account) {
    ref.invalidate(eventRehearsalProvider(scope.sessionId));
    ref.invalidate(
      eventRehearsalAssistanceForAccountProvider(
        scope.sessionId,
        account: account,
      ),
    );
  }

  void _publish(RehearsalDeliveryForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<EventRehearsalBootstrap> _apply(
    RehearsalDeliveryForm form,
    RehearsalAssistanceChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventRehearsalRepositoryProvider)
          .applyAssistance(change);
      if (!_current(form.review.account, epoch)) {
        throw rehearsalReviewSessionChanged;
      }
      change.requireResult(result);
      _clearPending();
      _refresh(form.review.account);
      _publish(
        form._after(
          RehearsalDeliveryPhase.saved,
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
                ? RehearsalDeliveryPhase.refreshRequired
                : RehearsalDeliveryPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
