import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_account.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_departure_provider.g.dart';

/// Identity of one continuous authenticated review period, not just a UID.
/// Signing out and back in as the same person cannot revive an old decision.
typedef EventDepartureAccount = EventAssistanceAccount;

final class EventDepartureSession {
  EventDepartureSession._({required this.account, required this.view}) {
    if (account.uid != view.actorUid) throw departureSessionChanged;
  }
  final EventDepartureAccount account;
  final EventAssistanceGroupProgressView view;
  bool _current = true;
  bool get isCurrent => _current;
}

const departureSessionChanged = BackendOperationException(
  code: 'session-changed',
  message: 'Your sign-in changed. Reload departure details before continuing.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review group departure',
    resource: 'eventAssistanceGroupProgress',
  ),
);

@riverpod
AsyncValue<EventDepartureAccount> eventAssistanceDepartureAccount(Ref ref) =>
    ref.watch(eventAssistanceAccountProvider);

void requireDepartureAccount(Ref ref, EventDepartureAccount expected) {
  if (!ref.mounted) throw departureSessionChanged;
  final current = ref.read(eventAssistanceDepartureAccountProvider);
  if (current.isLoading ||
      current.hasError ||
      !identical(current.asData?.value, expected)) {
    throw departureSessionChanged;
  }
}

@riverpod
class EventAssistanceDeparture extends _$EventAssistanceDeparture {
  @override
  AsyncValue<EventDepartureSession> build(EventAssistanceGroupScope scope) {
    final auth = ref.watch(eventAssistanceDepartureAccountProvider);
    return auth.when(
      skipLoadingOnRefresh: false,
      skipLoadingOnReload: false,
      skipError: false,
      loading: () => const AsyncLoading(),
      error: (error, stackTrace) => AsyncError(error, stackTrace),
      data: (account) => ref.watch(
        eventAssistanceDepartureForAccountProvider(scope, account: account),
      ),
    );
  }

  /// Restarts the listener only after it ended in an error; a healthy one
  /// already delivers every change.
  void reload() {
    final account = ref
        .read(eventAssistanceDepartureAccountProvider)
        .asData
        ?.value;
    if (account == null) return;
    if (ref
        .read(
          eventAssistanceDepartureForAccountProvider(scope, account: account),
        )
        .hasError) {
      ref.invalidate(
        eventAssistanceDepartureForAccountProvider(scope, account: account),
      );
    }
  }
}

/// The group's departure view for one sign-in period. It is a Firestore
/// listener: it declares no cache tags or lifetime and writes never
/// invalidate it. Each delivery is a new session and retires the previous
/// one, so a decision built on an older snapshot asks for a fresh review
/// instead of being replaced in the background.
@Riverpod(retry: _noDepartureReadRetry)
Stream<EventDepartureSession> eventAssistanceDepartureForAccount(
  Ref ref,
  EventAssistanceGroupScope scope, {
  required EventDepartureAccount account,
}) {
  // Keep the account identity alive while this read is observed. Watch also
  // cancels this cache entry when authentication changes.
  ref.watch(eventAssistanceDepartureAccountProvider);
  requireDepartureAccount(ref, account);
  EventDepartureSession? latest;
  ref.onDispose(() => latest?._current = false);
  return ref
      .watch(eventAssistanceDepartureRepositoryProvider)
      .watch(scope, actorUid: account.uid)
      .map((view) {
        requireDepartureAccount(ref, account);
        if (view.scope != scope) {
          throw const FormatException('Foreign departure review.');
        }
        latest?._current = false;
        return latest = EventDepartureSession._(account: account, view: view);
      });
}

// A listener error is shown with a retry; it is never retried silently.
Duration? _noDepartureReadRetry(int retryCount, Object error) => null;
