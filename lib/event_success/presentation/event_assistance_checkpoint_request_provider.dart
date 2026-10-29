import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_provider.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_checkpoint_request_provider.g.dart';

typedef CheckpointRequestSessionFuture =
    Future<EventAssistanceCheckpointRequestSession>;

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

  void reload() {
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    if (!authState.isSettledData || authState.value == null) {
      return;
    }
    ref.invalidate(
      eventAssistanceCheckpointForAccountProvider(
        scope,
        account: authState.value!,
      ),
    );
    ref.invalidate(
      eventAssistanceCheckpointRequestForAccountProvider(
        scope,
        account: switch (auth) {
          AsyncData(:final value) => value,
          AsyncError(:final error) => throw error,
          AsyncLoading() => throw AssertionError(),
        },
      ),
    );
  }
}

@Riverpod(retry: _noCheckpointRequestReadRetry)
CheckpointRequestSessionFuture eventAssistanceCheckpointRequestForAccount(
  Ref ref,
  EventAssistanceCheckpointScope scope, {
  required AuthenticatedSession account,
}) async {
  ref.watch(authenticatedSessionProvider);
  requireCheckpointRequestAccount(ref, account);
  final checkpoint = await ref.watch(
    eventAssistanceCheckpointForAccountProvider(scope, account: account).future,
  );
  requireCheckpointRequestAccount(ref, account);
  final operator = await ref
      .watch(eventAssistanceDepartureRepositoryProvider)
      .fetch(scope.group, actorUid: account.uid);
  requireCheckpointRequestAccount(ref, account);
  if (!checkpoint.isCurrent || operator.actorUid != account.uid) {
    throw checkpointRequestSessionChanged;
  }
  final view = EventAssistanceCheckpointRequestReview(
    checkpoint: checkpoint.view,
    operator: operator,
  );
  final session = EventAssistanceCheckpointRequestSession._(account, view);
  ref.onDispose(() => session._current = false);
  return session;
}

Duration? _noCheckpointRequestReadRetry(int count, Object error) => null;
