import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_pending_settings.g.dart';

/// Discovery references only. Each settings editor owns its command and retry.
/// Current event setup may omit a group whose setting save remains unconfirmed.
// keepalive: Pending setting discovery survives closed sheets until confirmation or account reset.
@Riverpod(keepAlive: true)
class EventAssistancePendingSettings extends _$EventAssistancePendingSettings {
  AuthenticatedSession? _account;
  @override
  Set<EventAssistanceGroupScope> build() {
    final auth = ref.watch(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    _account = !authState.isSettledData ? null : authState.value;
    return const {};
  }

  void retain(EventAssistanceGroupScope scope, AuthenticatedSession account) {
    if (!identical(_account, account)) return;
    state = Set.unmodifiable({...state, scope});
  }

  void release(EventAssistanceGroupScope scope, AuthenticatedSession? account) {
    if (!identical(_account, account) || !state.contains(scope)) return;
    state = Set.unmodifiable({...state}..remove(scope));
  }
}
