import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_accountability_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_accountability_provider.g.dart';

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
          eventAssistanceAccountabilityForAccountProvider(
            scope,
            account: account,
          ),
        )
        .hasError) {
      ref.invalidate(
        eventAssistanceAccountabilityForAccountProvider(
          scope,
          account: account,
        ),
      );
    }
  }
}

/// The guest's visit review for one sign-in period. It is a Firestore
/// listener: it declares no cache tags or lifetime and writes never
/// invalidate it. Each delivery is a new session and retires the previous
/// one, so a decision built on an older snapshot asks for a fresh review.
@Riverpod(retry: _noAccountabilityReadRetry)
Stream<EventAssistanceAccountabilitySession>
eventAssistanceAccountabilityForAccount(
  Ref ref,
  EventAssistanceAccountabilityScope scope, {
  required AuthenticatedSession account,
}) {
  ref.watch(authenticatedSessionProvider);
  requireAccountabilityAccount(ref, account);
  EventAssistanceAccountabilitySession? latest;
  ref.onDispose(() => latest?._current = false);
  return ref
      .watch(eventAssistanceAccountabilityRepositoryProvider)
      .watch(scope)
      .map((view) {
        requireAccountabilityAccount(ref, account);
        if (view.scope != scope) {
          throw const FormatException('Foreign accountability review.');
        }
        latest?._current = false;
        return latest = EventAssistanceAccountabilitySession._(account, view);
      });
}

// A listener error is shown with a retry; it is never retried silently.
Duration? _noAccountabilityReadRetry(int count, Object error) => null;
