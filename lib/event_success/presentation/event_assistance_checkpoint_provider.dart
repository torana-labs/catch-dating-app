import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_checkpoint_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_checkpoint_provider.g.dart';

final class EventAssistanceCheckpointSession {
  EventAssistanceCheckpointSession._(this.account, this.view);
  final AuthenticatedSession account;
  final EventAssistanceCheckpointView view;
  bool _current = true;
  bool get isCurrent => _current;
}

const checkpointSessionChanged = BackendOperationException(
  code: 'session-changed',
  message:
      'Your sign-in changed. Reload checkpoint arrivals before continuing.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review checkpoint arrivals',
    resource: 'eventAssistanceCheckpoints',
  ),
);

void requireCheckpointAccount(Ref ref, AuthenticatedSession expected) {
  if (!ref.mounted) throw checkpointSessionChanged;
  final auth = ref.read(authenticatedSessionProvider);
  final authState = catchAsyncStateFromAsyncValue(auth);
  if (!authState.isSettledData || !identical(authState.value, expected)) {
    throw checkpointSessionChanged;
  }
}

/// The route consumes this outer provider; old-account data is never rendered.
@riverpod
class EventAssistanceCheckpoint extends _$EventAssistanceCheckpoint {
  @override
  AsyncValue<EventAssistanceCheckpointSession> build(
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
      eventAssistanceCheckpointForAccountProvider(
        scope,
        account: switch (auth) {
          AsyncData(:final value) => value,
          AsyncError(:final error) => throw error,
          AsyncLoading() => throw AssertionError(),
        },
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
        account: switch (auth) {
          AsyncData(:final value) => value,
          AsyncError(:final error) => throw error,
          AsyncLoading() => throw AssertionError(),
        },
      ),
    );
  }
}

@Riverpod(retry: _noCheckpointReadRetry)
Future<EventAssistanceCheckpointSession> eventAssistanceCheckpointForAccount(
  Ref ref,
  EventAssistanceCheckpointScope scope, {
  required AuthenticatedSession account,
}) async {
  ref.watch(authenticatedSessionProvider);
  requireCheckpointAccount(ref, account);
  final view = await ref
      .watch(eventAssistanceCheckpointRepositoryProvider)
      .fetch(scope);
  requireCheckpointAccount(ref, account);
  if (view.scope != scope) {
    throw const FormatException('Foreign checkpoint review.');
  }
  final session = EventAssistanceCheckpointSession._(account, view);
  ref.onDispose(() => session._current = false);
  return session;
}

Duration? _noCheckpointReadRetry(int count, Object error) => null;
