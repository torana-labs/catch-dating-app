import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_history_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_history.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_provider.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_departure_history_provider.g.dart';

final class EventAssistanceDepartureHistorySession {
  const EventAssistanceDepartureHistorySession._(this.account, this.page);
  final AuthenticatedSession account;
  final EventAssistanceDepartureHistoryPage page;
}

/// Account-scoped pages never render a previous sign-in's history on refresh.
@riverpod
class EventAssistanceDepartureHistory
    extends _$EventAssistanceDepartureHistory {
  @override
  AsyncValue<EventAssistanceDepartureHistorySession> build(
    EventAssistanceDepartureHistoryQuery query,
  ) {
    final auth = ref.watch(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    if ((authState.isLoading || authState.isRefreshing || authState.retrying)) {
      return const AsyncLoading();
    }
    if (authState.error != null) {
      return AsyncError(authState.error!, authState.stackTrace!);
    }
    final result = ref.watch(
      eventAssistanceDepartureHistoryForAccountProvider(
        query,
        account: switch (auth) {
          AsyncData(:final value) => value,
          AsyncError(:final error) => throw error,
          AsyncLoading() => throw AssertionError(),
        },
      ),
    );
    final resultState = catchAsyncStateFromAsyncValue(result);
    if ((resultState.isLoading ||
        resultState.isRefreshing ||
        resultState.retrying)) {
      return const AsyncLoading();
    }
    if (resultState.error != null) {
      return AsyncError(resultState.error!, resultState.stackTrace!);
    }
    return result;
  }

  void reload() {
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    if (!authState.isSettledData || authState.value == null) {
      return;
    }
    ref.invalidate(
      eventAssistanceDepartureHistoryForAccountProvider(
        query,
        account: switch (auth) {
          AsyncData(:final value) => value,
          AsyncError(:final error) => throw error,
          AsyncLoading() => throw AssertionError(),
        },
      ),
    );
  }
}

@Riverpod(retry: _noHistoryReadRetry)
Future<EventAssistanceDepartureHistorySession>
eventAssistanceDepartureHistoryForAccount(
  Ref ref,
  EventAssistanceDepartureHistoryQuery query, {
  required AuthenticatedSession account,
}) async {
  ref.watch(authenticatedSessionProvider);
  requireCheckpointAccount(ref, account);
  final page = await ref
      .watch(eventAssistanceDepartureHistoryRepositoryProvider)
      .fetch(query, actorUid: account.uid);
  requireCheckpointAccount(ref, account);
  if (page.query != query || page.actorUid != account.uid) {
    throw const FormatException('Foreign departure history page.');
  }
  return EventAssistanceDepartureHistorySession._(account, page);
}

Duration? _noHistoryReadRetry(int count, Object error) => null;
