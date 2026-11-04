import 'package:catch_dating_app/contexts/live/data/event_assistance_guest_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_view_support.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callables/transfer_event_assistance_group_callable_request.g.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_membership_repository.g.dart';

/// A guest's group membership through a manager listener on
/// `hostEventMembershipViews`; transfers stay commands.
class EventAssistanceMembershipRepository {
  const EventAssistanceMembershipRepository(
    this._functions,
    this._firestore, {
    this._clock = const AppClock(),
  });
  final FirebaseFunctions _functions;
  final FirebaseFirestore _firestore;

  /// Applies time to the view on every delivered snapshot and again when
  /// readiness, a transfer, a receiver's authority or the review window
  /// lapses.
  final AppClock _clock;

  /// The membership as the manager [actorUid] reviews it: only managers can
  /// listen, so every saved group is theirs to move the guest between.
  Stream<EventAssistanceMembershipView> watch(
    EventAssistanceGuestScope scope, {
    required String actorUid,
  }) => withBackendErrorStream(
    () =>
        clockedListener<
              Map<String, Object?>?,
              ({EventAssistanceMembershipView view, DateTime? next})
            >(
              _firestore
                  .collection(EventAssistanceGuestViews.memberships)
                  .doc(membershipViewId(scope))
                  .snapshots()
                  .map((snapshot) => snapshot.data()),
              clock: _clock,
              build: (data, clock) {
                final now = liveViewNow(clock, [data]);
                final view = EventAssistanceMembershipResult.fromCallableData(
                  membershipReadResponse(
                    data,
                    scope: scope,
                    actorUid: actorUid,
                    now: now,
                  ),
                  expectedScope: scope,
                ).view;
                return (view: view, next: membershipNextRebuild(data, now));
              },
              nextRebuildAt: (built) => built.next,
            )
            .map((built) => built.view),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch guest group membership',
      resource: EventAssistanceGuestViews.memberships,
    ),
  );

  Future<EventAssistanceMembershipResult> apply(
    EventAssistanceMembershipChange change,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('transferEventAssistanceGroup')
          .call<Object?>(
            TransferEventAssistanceGroupCallableRequest(
              command: change.command,
              expectedSourceHash: change.snapshot.sourceHash,
            ).toJson(),
          );
      final result = EventAssistanceMembershipResult.fromCallableData(
        response.data,
        expectedScope: change.snapshot.scope,
      );
      change.requireResult(result);
      return result;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'change guest group membership',
      resource: 'eventAssistanceMemberships',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}

@riverpod
EventAssistanceMembershipRepository eventAssistanceMembershipRepository(
  Ref ref,
) => EventAssistanceMembershipRepository(
  ref.watch(firebaseFunctionsProvider),
  ref.watch(firebaseFirestoreProvider),
  clock: ref.watch(appClockProvider),
);
