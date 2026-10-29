import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_account.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
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

  void reload() {
    final account = ref
        .read(eventAssistanceDepartureAccountProvider)
        .asData
        ?.value;
    if (account == null) return;
    ref.invalidate(
      eventAssistanceDepartureForAccountProvider(scope, account: account),
    );
  }
}

@Riverpod(retry: _noDepartureReadRetry)
Future<EventDepartureSession> eventAssistanceDepartureForAccount(
  Ref ref,
  EventAssistanceGroupScope scope, {
  required EventDepartureAccount account,
}) async {
  // Keep the account identity alive while this read is observed. Watch also
  // cancels this cache entry when authentication changes.
  ref.watch(eventAssistanceDepartureAccountProvider);
  requireDepartureAccount(ref, account);
  final view = await ref
      .watch(eventAssistanceDepartureRepositoryProvider)
      .fetch(scope, actorUid: account.uid);
  requireDepartureAccount(ref, account);
  if (view.scope != scope) {
    throw const FormatException('Foreign departure review.');
  }
  final session = EventDepartureSession._(account: account, view: view);
  ref.onDispose(() => session._current = false);
  return session;
}

// A fresh progress snapshot is an explicit host review, not a background
// replacement for the decision currently being edited.
Duration? _noDepartureReadRetry(int retryCount, Object error) => null;
