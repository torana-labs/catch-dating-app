import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_delivery_reviews.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_pending_deliveries.g.dart';

/// Discovery references only. Each delivery controller owns its command and retry.
/// A server page may omit a message whose handoff succeeded without confirmation.
// keepalive: Pending delivery discovery survives closed sheets until confirmation or account reset.
@Riverpod(keepAlive: true)
class EventRehearsalPendingDeliveries
    extends _$EventRehearsalPendingDeliveries {
  AuthenticatedSession? _account;
  @override
  Set<RehearsalDeliveryScope> build() {
    final auth = ref.watch(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    _account = !authState.isSettledData ? null : authState.value;
    return const {};
  }

  void retain(RehearsalDeliveryScope scope, AuthenticatedSession account) {
    if (!identical(_account, account)) return;
    state = Set.unmodifiable({...state, scope});
  }

  void release(RehearsalDeliveryScope scope, AuthenticatedSession? account) {
    if (!identical(_account, account) || !state.contains(scope)) return;
    state = Set.unmodifiable({...state}..remove(scope));
  }
}
