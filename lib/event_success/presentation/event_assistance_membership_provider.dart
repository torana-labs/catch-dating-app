import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_membership_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_membership_provider.g.dart';

final class EventAssistanceMembershipSession {
  EventAssistanceMembershipSession._(this.account, this.view);
  final AuthenticatedSession account;
  final EventAssistanceMembershipView view;
  bool _current = true;
  bool get isCurrent => _current;
}

const membershipSessionChanged = BackendOperationException(
  code: 'session-changed',
  message: 'Your sign-in changed. Reload group membership before continuing.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review group membership',
    resource: 'eventAssistanceMemberships',
  ),
);

void requireMembershipAccount(Ref ref, AuthenticatedSession expected) {
  if (!ref.mounted) throw membershipSessionChanged;
  final auth = ref.read(authenticatedSessionProvider);
  final authState = catchAsyncStateFromAsyncValue(auth);
  if (!authState.isSettledData || !identical(authState.value, expected)) {
    throw membershipSessionChanged;
  }
}

/// The route consumes this outer provider; old-account data is never rendered.
@riverpod
class EventAssistanceMembership extends _$EventAssistanceMembership {
  @override
  AsyncValue<EventAssistanceMembershipSession> build(
    EventAssistanceGuestScope scope,
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
      eventAssistanceMembershipForAccountProvider(
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

  /// Restarts the listener only after it ended in an error; a healthy one
  /// already delivers every change.
  void reload() {
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    if (!authState.isSettledData || authState.value == null) {
      return;
    }
    final account = authState.value!;
    if (ref
        .read(
          eventAssistanceMembershipForAccountProvider(scope, account: account),
        )
        .hasError) {
      ref.invalidate(
        eventAssistanceMembershipForAccountProvider(scope, account: account),
      );
    }
  }
}

/// The guest's membership for one sign-in period, as this manager reviews
/// it. It is a Firestore listener: no cache tags or lifetime, and writes
/// never invalidate it. Each delivery is a new session and retires the
/// previous one.
@Riverpod(retry: _noMembershipReadRetry)
Stream<EventAssistanceMembershipSession> eventAssistanceMembershipForAccount(
  Ref ref,
  EventAssistanceGuestScope scope, {
  required AuthenticatedSession account,
}) {
  ref.watch(authenticatedSessionProvider);
  requireMembershipAccount(ref, account);
  EventAssistanceMembershipSession? latest;
  ref.onDispose(() => latest?._current = false);
  return ref
      .watch(eventAssistanceMembershipRepositoryProvider)
      .watch(scope, actorUid: account.uid)
      .map((view) {
        requireMembershipAccount(ref, account);
        if (view.scope != scope) {
          throw const FormatException('Foreign membership review.');
        }
        latest?._current = false;
        return latest = EventAssistanceMembershipSession._(account, view);
      });
}

// A listener error is shown with a retry; it is never retried silently.
Duration? _noMembershipReadRetry(int count, Object error) => null;
