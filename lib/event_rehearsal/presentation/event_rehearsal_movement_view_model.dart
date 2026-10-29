import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_movement_view_model.g.dart';

final class RehearsalMovementPage {
  RehearsalMovementPage._(this.account, this.session, this.snapshot);
  final AuthenticatedSession account;
  final EventRehearsalBootstrap session;
  final RehearsalMovementReview snapshot;
  bool _current = true;
  bool get isCurrent => _current;
}

@riverpod
class EventRehearsalMovement extends _$EventRehearsalMovement {
  @override
  AsyncValue<RehearsalMovementPage> build(
    RehearsalMovementSelection selection,
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
      eventRehearsalMovementForAccountProvider(
        selection,
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
      eventRehearsalMovementForAccountProvider(
        selection,
        account: switch (auth) {
          AsyncData(:final value) => value,
          AsyncError(:final error) => throw error,
          AsyncLoading() => throw AssertionError(),
        },
      ),
    );
  }
}

/// These deliberate reads must describe one runtime revision. Polling can never
/// replace one half of a pending Host review or silently cross a reset.
@Riverpod(retry: _noMovementRetry)
Future<RehearsalMovementPage> eventRehearsalMovementForAccount(
  Ref ref,
  RehearsalMovementSelection selection, {
  required AuthenticatedSession account,
}) async {
  ref.watch(authenticatedSessionProvider);
  requireRehearsalReviewAccount(ref, account);
  final repository = ref.watch(eventRehearsalRepositoryProvider);
  final session = await repository.fetch(selection.scope.sessionId);
  requireRehearsalReviewAccount(ref, account);
  if (rehearsalMovementScope(session.session, selection.scope.groupId) !=
      selection.scope) {
    throw rehearsalReviewExpired;
  }
  final snapshot = await repository.fetchMovement(
    snapshot: session,
    selection: selection,
    actorUid: account.uid,
  );
  requireRehearsalReviewAccount(ref, account);
  if (snapshot.selection != selection ||
      snapshot.hostUid != account.uid ||
      !identical(snapshot.session, session.session)) {
    throw rehearsalReviewExpired;
  }
  final page = RehearsalMovementPage._(account, session, snapshot);
  ref.onDispose(() => page._current = false);
  return page;
}

Duration? _noMovementRetry(int retryCount, Object error) => null;
