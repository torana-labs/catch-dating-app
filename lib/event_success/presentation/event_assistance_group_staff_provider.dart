import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_group_staff_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_group_staff_provider.g.dart';

final class EventAssistanceGroupStaffSession {
  EventAssistanceGroupStaffSession._(this.account, this.view);
  final AuthenticatedSession account;
  final EventAssistanceGroupStaffView view;
  bool _current = true;
  bool get isCurrent => _current;
}

const groupStaffSessionChanged = BackendOperationException(
  code: 'session-changed',
  message: 'Your sign-in changed. Reload group staff before continuing.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review group staff',
    resource: 'eventStaffGrants',
  ),
);

void requireGroupStaffAccount(Ref ref, AuthenticatedSession expected) {
  if (!ref.mounted) throw groupStaffSessionChanged;
  final auth = ref.read(authenticatedSessionProvider);
  final authState = catchAsyncStateFromAsyncValue(auth);
  if (!authState.isSettledData || !identical(authState.value, expected)) {
    throw groupStaffSessionChanged;
  }
}

/// The route consumes this outer provider; old-account data is never rendered.
@riverpod
class EventAssistanceGroupStaff extends _$EventAssistanceGroupStaff {
  @override
  AsyncValue<EventAssistanceGroupStaffSession> build(
    EventAssistanceGroupStaffLookup lookup,
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
      eventAssistanceGroupStaffForAccountProvider(
        lookup,
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
      eventAssistanceGroupStaffForAccountProvider(
        lookup,
        account: switch (auth) {
          AsyncData(:final value) => value,
          AsyncError(:final error) => throw error,
          AsyncLoading() => throw AssertionError(),
        },
      ),
    );
  }
}

@Riverpod(retry: _noGroupStaffReadRetry)
Future<EventAssistanceGroupStaffSession> eventAssistanceGroupStaffForAccount(
  Ref ref,
  EventAssistanceGroupStaffLookup lookup, {
  required AuthenticatedSession account,
}) async {
  ref.watch(authenticatedSessionProvider);
  requireGroupStaffAccount(ref, account);
  final view = await ref
      .watch(eventAssistanceGroupStaffRepositoryProvider)
      .fetch(lookup);
  requireGroupStaffAccount(ref, account);
  if (view.lookup != lookup) {
    throw const FormatException('Foreign group staff lookup.');
  }
  final session = EventAssistanceGroupStaffSession._(account, view);
  ref.onDispose(() => session._current = false);
  return session;
}

Duration? _noGroupStaffReadRetry(int count, Object error) => null;
