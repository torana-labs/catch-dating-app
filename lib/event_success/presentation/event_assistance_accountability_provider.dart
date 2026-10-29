import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_accountability_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_accountability_provider.g.dart';

typedef AccountabilitySessionFuture =
    Future<EventAssistanceAccountabilitySession>;

final class EventAssistanceAccountabilitySession {
  EventAssistanceAccountabilitySession._(this.account, this.view);
  final AuthenticatedSession account;
  final EventAssistanceAccountabilityView view;
  bool _current = true;
  bool get isCurrent => _current;
}

const accountabilitySessionChanged = BackendOperationException(
  code: 'session-changed',
  message:
      'Your sign-in changed. Reload visit accountability before continuing.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review visit accountability',
    resource: 'eventAttendees',
  ),
);

void requireAccountabilityAccount(Ref ref, AuthenticatedSession expected) {
  if (!ref.mounted) throw accountabilitySessionChanged;
  final auth = ref.read(authenticatedSessionProvider);
  final authState = catchAsyncStateFromAsyncValue(auth);
  if (!authState.isSettledData || !identical(authState.value, expected)) {
    throw accountabilitySessionChanged;
  }
}

/// The route consumes this outer provider; old-account data is never rendered.
@riverpod
class EventAssistanceAccountability extends _$EventAssistanceAccountability {
  @override
  AsyncValue<EventAssistanceAccountabilitySession> build(
    EventAssistanceAccountabilityScope scope,
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
      eventAssistanceAccountabilityForAccountProvider(
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
      eventAssistanceAccountabilityForAccountProvider(
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

@Riverpod(retry: _noAccountabilityReadRetry)
AccountabilitySessionFuture eventAssistanceAccountabilityForAccount(
  Ref ref,
  EventAssistanceAccountabilityScope scope, {
  required AuthenticatedSession account,
}) async {
  ref.watch(authenticatedSessionProvider);
  requireAccountabilityAccount(ref, account);
  final view = await ref
      .watch(eventAssistanceAccountabilityRepositoryProvider)
      .fetch(scope);
  requireAccountabilityAccount(ref, account);
  if (view.scope != scope) {
    throw const FormatException('Foreign accountability review.');
  }
  final session = EventAssistanceAccountabilitySession._(account, view);
  ref.onDispose(() => session._current = false);
  return session;
}

Duration? _noAccountabilityReadRetry(int count, Object error) => null;
