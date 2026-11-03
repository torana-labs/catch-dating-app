import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_history_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_history.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_provider.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
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

  /// Restarts the listeners only after they ended in an error.
  void reload() {
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    if (!authState.isSettledData || authState.value == null) {
      return;
    }
    final account = authState.value!;
    if (ref
        .read(
          eventAssistanceDepartureHistoryForAccountProvider(
            query,
            account: account,
          ),
        )
        .hasError) {
      ref.invalidate(
        eventAssistanceDepartureHistoryForAccountProvider(
          query,
          account: account,
        ),
      );
    }
  }
}

/// One history page for one sign-in period: Firestore listeners on the
/// group's view and the page of departure views. No cache tags or lifetime;
/// writes never invalidate it.
@Riverpod(retry: _noHistoryReadRetry)
Stream<EventAssistanceDepartureHistorySession>
eventAssistanceDepartureHistoryForAccount(
  Ref ref,
  EventAssistanceDepartureHistoryQuery query, {
  required AuthenticatedSession account,
}) {
  ref.watch(authenticatedSessionProvider);
  requireCheckpointAccount(ref, account);
  return ref
      .watch(eventAssistanceDepartureHistoryRepositoryProvider)
      .watch(query, actorUid: account.uid)
      .map((page) {
        requireCheckpointAccount(ref, account);
        if (page.query != query || page.actorUid != account.uid) {
          throw const FormatException('Foreign departure history page.');
        }
        return EventAssistanceDepartureHistorySession._(account, page);
      });
}

Duration? _noHistoryReadRetry(int count, Object error) => null;
