import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_provider.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_checkpoint_request_provider.g.dart';

final class EventAssistanceCheckpointRequestSession {
  EventAssistanceCheckpointRequestSession._(this.account, this.view);
  final AuthenticatedSession account;
  final EventAssistanceCheckpointRequestReview view;
  bool _current = true;
  bool get isCurrent => _current;
}

const checkpointRequestSessionChanged = BackendOperationException(
  code: 'session-changed',
  message:
      'Your sign-in changed. Reload checkpoint request permissions before continuing.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review checkpoint request',
    resource: 'eventAssistanceCheckpoints',
  ),
);

void requireCheckpointRequestAccount(Ref ref, AuthenticatedSession expected) {
  if (!ref.mounted) throw checkpointRequestSessionChanged;
  final auth = ref.read(authenticatedSessionProvider);
  final authState = catchAsyncStateFromAsyncValue(auth);
  if (!authState.isSettledData || !identical(authState.value, expected)) {
    throw checkpointRequestSessionChanged;
  }
}

/// The route consumes this outer provider; old-account data is never rendered.
@riverpod
class EventAssistanceCheckpointRequest
    extends _$EventAssistanceCheckpointRequest {
  @override
  AsyncValue<EventAssistanceCheckpointRequestSession> build(
    EventAssistanceCheckpointScope scope,
  ) {
    final auth = ref.watch(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    if ((authState.isLoading || authState.isRefreshing || authState.retrying)) {
      return const AsyncLoading();
    }
    if (authState.error != null) {
      return AsyncError(authState.error!, authState.stackTrace!);
    }
    final page = ref.watch(
      eventAssistanceCheckpointRequestForAccountProvider(
        scope,
        account: authState.value!,
      ),
    );
    final pageState = catchAsyncStateFromAsyncValue(page);
    if ((pageState.isLoading || pageState.isRefreshing || pageState.retrying)) {
      return const AsyncLoading();
    }
    if (pageState.error != null) {
      return AsyncError(pageState.error!, pageState.stackTrace!);
    }
    return page;
  }

  /// Restarts the checkpoint and group listeners only after they ended in an
  /// error; healthy ones already deliver every change.
  void reload() {
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    if (!authState.isSettledData || authState.value == null) {
      return;
    }
    final account = authState.value!;
    final checkpoint = eventAssistanceCheckpointForAccountProvider(
      scope,
      account: account,
    );
    final group = eventAssistanceDepartureForAccountProvider(
      scope.group,
      account: account,
    );
    if (ref.read(checkpoint).hasError) ref.invalidate(checkpoint);
    if (ref.read(group).hasError) ref.invalidate(group);
  }
}

/// The checkpoint request review: the checkpoint view and the group's view
/// (the manager's authority) composed on the phone, with no document of its
/// own. A new session follows every delivery of either listener and retires
/// the previous one.
@riverpod
AsyncValue<EventAssistanceCheckpointRequestSession>
eventAssistanceCheckpointRequestForAccount(
  Ref ref,
  EventAssistanceCheckpointScope scope, {
  required AuthenticatedSession account,
}) {
  ref.watch(authenticatedSessionProvider);
  final checkpoint = ref.watch(
    eventAssistanceCheckpointForAccountProvider(scope, account: account),
  );
  final operator = ref.watch(
    eventAssistanceDepartureForAccountProvider(scope.group, account: account),
  );
  final checkpointState = catchAsyncStateFromAsyncValue(checkpoint);
  final operatorState = catchAsyncStateFromAsyncValue(operator);
  if (checkpointState.error case final error?) {
    return AsyncError(error, checkpointState.stackTrace!);
  }
  if (operatorState.error case final error?) {
    return AsyncError(error, operatorState.stackTrace!);
  }
  final checkpointSession = checkpointState.value;
  final operatorSession = operatorState.value;
  if (checkpointSession == null || operatorSession == null) {
    return const AsyncLoading();
  }
  try {
    requireCheckpointRequestAccount(ref, account);
    if (!checkpointSession.isCurrent ||
        operatorSession.view.actorUid != account.uid) {
      throw checkpointRequestSessionChanged;
    }
    final session = EventAssistanceCheckpointRequestSession._(
      account,
      EventAssistanceCheckpointRequestReview(
        checkpoint: checkpointSession.view,
        operator: operatorSession.view,
      ),
    );
    ref.onDispose(() => session._current = false);
    return AsyncData(session);
  } on Object catch (error, stackTrace) {
    return AsyncError(error, stackTrace);
  }
}
