import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_participation_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_participation_provider.g.dart';

final class EventParticipationSession {
  EventParticipationSession._(this.account, this.view);
  final AuthenticatedSession account;
  final EventAssistanceParticipationView view;
  bool _current = true;
  bool get isCurrent => _current;
}

const participationSessionChanged = BackendOperationException(
  code: 'session-changed',
  message:
      'Your sign-in changed. Reload guest participation before continuing.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review guest participation',
    resource: 'eventAssistanceGuests',
  ),
);

void requireParticipationAccount(Ref ref, AuthenticatedSession expected) {
  if (!ref.mounted) throw participationSessionChanged;
  final auth = ref.read(authenticatedSessionProvider);
  final authState = catchAsyncStateFromAsyncValue(auth);
  if (!authState.isSettledData || !identical(authState.value, expected)) {
    throw participationSessionChanged;
  }
}

/// The route consumes this outer provider; old-account data is never rendered.
@riverpod
class EventAssistanceParticipationReview
    extends _$EventAssistanceParticipationReview {
  @override
  AsyncValue<EventParticipationSession> build(EventAssistanceGuestScope scope) {
    final auth = ref.watch(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    if ((authState.isLoading || authState.isRefreshing || authState.retrying)) {
      return const AsyncLoading();
    }
    if (authState.error != null) {
      return AsyncError(authState.error!, authState.stackTrace!);
    }
    final page = ref.watch(
      eventAssistanceParticipationForAccountProvider(
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
      eventAssistanceParticipationForAccountProvider(
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

@Riverpod(retry: _noParticipationReadRetry)
Future<EventParticipationSession> eventAssistanceParticipationForAccount(
  Ref ref,
  EventAssistanceGuestScope scope, {
  required AuthenticatedSession account,
}) async {
  ref.watch(authenticatedSessionProvider);
  requireParticipationAccount(ref, account);
  final view = await ref
      .watch(eventAssistanceParticipationRepositoryProvider)
      .fetch(scope);
  requireParticipationAccount(ref, account);
  if (view.scope != scope) {
    throw const FormatException('Foreign participation review.');
  }
  final session = EventParticipationSession._(account, view);
  ref.onDispose(() => session._current = false);
  return session;
}

Duration? _noParticipationReadRetry(int count, Object error) => null;
