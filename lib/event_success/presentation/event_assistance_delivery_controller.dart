import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_deliveries_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_deliveries_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_pending_deliveries.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_delivery_controller.g.dart';

enum AssistanceDeliveryPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

typedef AssistanceDeliveryMutationKey = ({
  EventAssistanceDeliveryScope scope,
  AuthenticatedSession account,
});

sealed class AssistanceDeliveryEditorState {
  const AssistanceDeliveryEditorState();
  bool get canDismiss => switch (this) {
    AssistanceDeliveryForm(:final phase) =>
      phase != AssistanceDeliveryPhase.submitting,
    AssistanceDeliveryIdle() || AssistanceDeliveryUnavailable() => true,
  };
}

final class AssistanceDeliveryIdle extends AssistanceDeliveryEditorState {
  const AssistanceDeliveryIdle();
}

final class AssistanceDeliveryUnavailable
    extends AssistanceDeliveryEditorState {
  const AssistanceDeliveryUnavailable(this.error);
  final Object error;
}

final class AssistanceDeliveryForm extends AssistanceDeliveryEditorState {
  const AssistanceDeliveryForm._({
    required this.review,
    this.phase = AssistanceDeliveryPhase.ready,
    this.change,
    this.result,
    this.error,
  });
  final EventAssistanceDeliveryReview review;
  final AssistanceDeliveryPhase phase;
  final EventAssistanceDeliveryChange? change;
  final EventAssistanceDeliveryResult? result;
  final Object? error;
  bool get canTakeOver =>
      phase == AssistanceDeliveryPhase.ready && review.isCurrent;
  bool get canRetry => phase == AssistanceDeliveryPhase.retryRequired;
  bool get canReload =>
      phase == AssistanceDeliveryPhase.ready ||
      phase == AssistanceDeliveryPhase.refreshRequired;
  AssistanceDeliveryForm _after(
    AssistanceDeliveryPhase phase, {
    required EventAssistanceDeliveryChange change,
    EventAssistanceDeliveryResult? result,
    Object? error,
  }) => AssistanceDeliveryForm._(
    review: review,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// One message owns one pending request across page refreshes and sheet closure.
@riverpod
class EventAssistanceDeliveryController
    extends _$EventAssistanceDeliveryController {
  static final handoffMutation = Mutation<EventAssistanceDeliveryResult>();
  static AssistanceDeliveryMutationKey mutationKey(
    EventAssistanceDeliveryReview review,
  ) => (scope: review.delivery.scope, account: review.account);

  int _epoch = 0;
  AuthenticatedSession? _account;
  Future<EventAssistanceDeliveryResult>? _inFlight;
  EventAssistanceDeliveryChange? _pending;
  void Function()? _releasePending;

  @override
  AssistanceDeliveryEditorState build(EventAssistanceDeliveryScope scope) {
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
      return AssistanceDeliveryUnavailable(
        authState.error ?? deliveryReviewSessionChanged,
      );
    }
    _account = switch (auth) {
      AsyncData(:final value) => value,
      AsyncError(:final error) => throw error,
      AsyncLoading() => throw AssertionError(),
    };
    return const AssistanceDeliveryIdle();
  }

  bool _current(AuthenticatedSession account, int epoch) {
    if (!ref.mounted || epoch != _epoch || !identical(_account, account)) {
      return false;
    }
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    return authState.isSettledData && identical(authState.value, account);
  }

  void _requireReview(EventAssistanceDeliveryReview review) {
    if (!_current(review.account, _epoch)) throw deliveryReviewSessionChanged;
    if (review.delivery.scope != scope) {
      throw const ValidationException('Review this message before continuing.');
    }
    final page = ref.read(
      eventAssistanceDeliveriesProvider(review.session.page.query),
    );
    if (page.isLoading ||
        page.hasError ||
        !review.isCurrent ||
        !identical(page.asData?.value, review.session)) {
      throw const ValidationException('Reload the current delivery review.');
    }
  }

  /// A new page cannot replace an unresolved command for this same message.
  void open(EventAssistanceDeliveryReview review) {
    if (!_current(review.account, _epoch)) throw deliveryReviewSessionChanged;
    if (review.delivery.scope != scope) {
      throw const ValidationException('Choose the reviewed message.');
    }
    if (_pending != null || _inFlight != null) return;
    _requireReview(review);
    state = AssistanceDeliveryForm._(review: review);
  }

  Future<EventAssistanceDeliveryResult> takeOver() {
    final form = state;
    if (form is! AssistanceDeliveryForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(deliveryReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) return Future.value(result);
    if (!form.canTakeOver || _pending != null) {
      return Future.error(
        const ValidationException('Resolve the pending handoff first.'),
      );
    }
    try {
      _requireReview(form.review);
      final random = Random.secure();
      final id = List.generate(
        16,
        (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join();
      return _submit(
        form,
        EventAssistanceDeliveryChange(
          snapshot: form.review.delivery,
          actorUid: form.review.account.uid,
          operationId: 'handoff:$id',
        ),
      );
    } catch (error, stackTrace) {
      return Future.error(error, stackTrace);
    }
  }

  void reload() {
    final form = state;
    if (form is AssistanceDeliveryForm && !form.canReload) {
      throw const ValidationException('Confirm the pending handoff first.');
    }
    if (_pending != null || _inFlight != null) {
      throw const ValidationException('Confirm the pending handoff first.');
    }
    state = const AssistanceDeliveryIdle();
  }

  Future<EventAssistanceDeliveryResult> retry() {
    final form = state;
    if (form is! AssistanceDeliveryForm ||
        !_current(form.review.account, _epoch)) {
      return Future.error(deliveryReviewSessionChanged);
    }
    if (_inFlight case final pending?) return pending;
    if (!form.canRetry || _pending == null) {
      return Future.error(
        const ValidationException('There is no handoff to retry.'),
      );
    }
    return _submit(form, _pending!);
  }

  Future<EventAssistanceDeliveryResult> _submit(
    AssistanceDeliveryForm form,
    EventAssistanceDeliveryChange change,
  ) {
    final epoch = _epoch;
    final completion = Completer<EventAssistanceDeliveryResult>();
    final tracked = completion.future;
    _inFlight = tracked;
    _pending = change;
    _retainPending(form.review.account);
    state = form._after(AssistanceDeliveryPhase.submitting, change: change);
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
        .read(eventAssistancePendingDeliveriesProvider.notifier)
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
          .read(eventAssistancePendingDeliveriesProvider.notifier)
          .release(scope, _account);
    }
    _pending = null;
    final release = _releasePending;
    _releasePending = null;
    release?.call();
  }

  void _publish(AssistanceDeliveryForm form) {
    // Error/ready callbacks can act before the previous async stack unwinds.
    _inFlight = null;
    state = form;
  }

  Future<EventAssistanceDeliveryResult> _apply(
    AssistanceDeliveryForm form,
    EventAssistanceDeliveryChange change,
    int epoch,
  ) async {
    try {
      final result = await ref
          .read(eventAssistanceDeliveriesRepositoryProvider)
          .apply(change);
      if (!_current(form.review.account, epoch)) {
        throw deliveryReviewSessionChanged;
      }
      result.requireChange(change);
      _clearPending();
      ref.invalidate(eventAssistanceDeliveriesForAccountProvider);
      _publish(
        form._after(
          AssistanceDeliveryPhase.saved,
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
          ref.invalidate(eventAssistanceDeliveriesForAccountProvider);
        }
        _publish(
          form._after(
            definitive
                ? AssistanceDeliveryPhase.refreshRequired
                : AssistanceDeliveryPhase.retryRequired,
            change: change,
            error: error,
          ),
        );
      }
      rethrow;
    }
  }
}
