import 'package:catch_dating_app/contexts/live/data/event_assistance_guest_views.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability_change.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callables/resolve_event_assistance_accountability_callable_request.g.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_accountability_repository.g.dart';

/// A guest's visit result through a manager listener: the event-wide review
/// on `hostEventAccountabilityViews`, a recorded departure's member review on
/// that departure's checkpoint view. Resolving stays a command.
class EventAssistanceAccountabilityRepository {
  const EventAssistanceAccountabilityRepository(
    this._functions,
    this._firestore, {
    this._clock = const AppClock(),
  });
  final FirebaseFunctions _functions;
  final FirebaseFirestore _firestore;

  /// Applies time to the view on every delivered snapshot.
  final AppClock _clock;

  Stream<EventAssistanceAccountabilityView> watch(
    EventAssistanceAccountabilityScope scope,
  ) {
    final checkpoint = scope.checkpoint;
    final resource = checkpoint == null
        ? EventAssistanceGuestViews.accountability
        : EventAssistanceGuestViews.checkpoints;
    return withBackendErrorStream(
      () => _firestore
          .collection(resource)
          .doc(
            checkpoint == null
                ? accountabilityViewId(scope.guest)
                : checkpointAccountabilityViewId(scope.group, checkpoint),
          )
          .snapshots()
          .map((snapshot) {
            final data = snapshot.data();
            final now = guestViewNow(_clock.now(), data);
            return EventAssistanceAccountabilityResult.fromCallableData(
              checkpoint == null
                  ? accountabilityReadResponse(data, scope: scope, now: now)
                  : checkpointAccountabilityReadResponse(
                      data,
                      scope: scope,
                      now: now,
                    ),
              expectedScope: scope,
            ).view;
          }),
      context: BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch guest visit result',
        resource: resource,
      ),
    );
  }

  Future<EventAssistanceAccountabilityResult> apply(
    EventAssistanceAccountabilityChange change,
  ) => withBackendErrorContext(
    () async {
      final scope = change.snapshot.scope;
      final response = await _functions
          .httpsCallable('resolveEventAssistanceAccountability')
          .call<Object?>(
            ResolveEventAssistanceAccountabilityCallableRequest(
              groupId: scope.group.groupId,
              command: change.command,
              expectedSourceHash: change.snapshot.sourceHash,
              checkpoint: scope.checkpoint?.toJson(),
            ).toJson(),
          );
      final result = EventAssistanceAccountabilityResult.fromCallableData(
        response.data,
        expectedScope: scope,
      );
      change.requireResult(result);
      return result;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'record guest visit result',
      resource: 'eventAttendees',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}

@riverpod
EventAssistanceAccountabilityRepository eventAssistanceAccountabilityRepository(
  Ref ref,
) => EventAssistanceAccountabilityRepository(
  ref.watch(firebaseFunctionsProvider),
  ref.watch(firebaseFirestoreProvider),
  clock: ref.watch(appClockProvider),
);
