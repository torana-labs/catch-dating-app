import 'package:catch_dating_app/contexts/live/data/event_assistance_movement_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_view_identity.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callables/confirm_event_assistance_departure_callable_request.g.dart';
import 'package:catch_platform/schema_contracts/generated/callables/get_event_assistance_departure_roster_callable_request.g.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_departure_repository.g.dart';

/// The group's progress through a manager listener on
/// `hostEventGroupProgressViews`; roster review and departure confirmation
/// stay commands. No direct progress, attendance or messaging writes.
class EventAssistanceDepartureRepository {
  const EventAssistanceDepartureRepository(
    this._functions,
    this._firestore, {
    this._clock = const AppClock(),
  });
  final FirebaseFunctions _functions;
  final FirebaseFirestore _firestore;

  /// Applies time to the view on every delivered snapshot.
  final AppClock _clock;

  /// The group's view as a manager reads it. Only managers can listen, so
  /// the departure authority is the manager's (canConfirm, any reporter).
  Stream<EventAssistanceGroupProgressView> watch(
    EventAssistanceGroupScope scope, {
    required String actorUid,
  }) => withBackendErrorStream(
    () => _firestore
        .collection(EventAssistanceMovementViews.groupProgress)
        .doc(groupProgressViewId(scope))
        .snapshots()
        .map((snapshot) {
          final data = snapshot.data();
          final result = EventAssistanceGroupProgressResult.fromCallableData(
            groupProgressReadResponse(
              data,
              scope: scope,
              actorUid: actorUid,
              now: movementViewNow(_clock.now(), [data]),
            ),
            expectedScope: scope,
            expectedActorUid: actorUid,
          );
          return result.view;
        }),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch group departure',
      resource: EventAssistanceMovementViews.groupProgress,
    ),
  );

  Future<EventAssistanceDepartureRosterReview> reviewRoster(
    EventAssistanceGroupProgressView snapshot,
    EventAssistanceDepartureRosterSelection selection,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('getEventAssistanceDepartureRoster')
          .call<Object?>(
            GetEventAssistanceDepartureRosterCallableRequest(
              context: snapshot.scope.context,
              groupId: snapshot.scope.groupId,
              attendeeIds: selection.attendeeIds,
            ).toJson(),
          );
      return EventAssistanceDepartureRosterReview.fromCallableData(
        response.data,
        snapshot: snapshot,
        expectedSelection: selection,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'review departure roster',
      resource: 'eventAssistanceDepartureRosters',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );

  Future<EventAssistanceGroupProgressResult> confirm(
    EventAssistanceDepartureChange change,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('confirmEventAssistanceDeparture')
          .call<Object?>(
            ConfirmEventAssistanceDepartureCallableRequest(
              command: change.command,
              expectedSourceHash: change.snapshot.sourceHash,
            ).toJson(),
          );
      final result = EventAssistanceGroupProgressResult.fromCallableData(
        response.data,
        expectedScope: change.snapshot.scope,
        expectedActorUid: change.snapshot.actorUid,
      );
      change.requireResult(result);
      return result;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'confirm group departure',
      resource: 'eventAssistanceGroupProgress',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}

@riverpod
EventAssistanceDepartureRepository eventAssistanceDepartureRepository(
  Ref ref,
) => EventAssistanceDepartureRepository(
  ref.watch(firebaseFunctionsProvider),
  ref.watch(firebaseFirestoreProvider),
  clock: ref.watch(appClockProvider),
);
