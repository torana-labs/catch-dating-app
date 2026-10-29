import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_help_requests.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_pending_help.g.dart';

/// Discovery references only. Each case editor owns its command and retry.
/// A server page may omit a case whose save succeeded without confirmation.
// keepalive: Pending case discovery survives closed sheets until confirmation or account reset.
@Riverpod(keepAlive: true)
class EventRehearsalPendingHelp extends _$EventRehearsalPendingHelp {
  AuthenticatedSession? _account;
  @override
  Set<RehearsalHelpScope> build() {
    final auth = ref.watch(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    _account = !authState.isSettledData ? null : authState.value;
    return const {};
  }

  void retain(RehearsalHelpScope scope, AuthenticatedSession account) {
    if (!identical(_account, account)) return;
    state = Set.unmodifiable({...state, scope});
  }

  void release(RehearsalHelpScope scope, AuthenticatedSession? account) {
    if (!identical(_account, account) || !state.contains(scope)) return;
    state = Set.unmodifiable({...state}..remove(scope));
  }
}
