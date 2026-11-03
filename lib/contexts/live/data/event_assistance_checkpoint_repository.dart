import 'package:catch_dating_app/contexts/live/data/event_assistance_movement_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_view_identity.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callables/reassign_event_assistance_checkpoint_reporter_callable_request.g.dart';
import 'package:catch_platform/schema_contracts/generated/callables/record_event_assistance_checkpoint_callable_request.g.dart';
import 'package:catch_platform/schema_contracts/generated/callables/set_event_assistance_checkpoint_closeout_callable_request.g.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_checkpoint_repository.g.dart';

/// One departure's checkpoint through a manager listener on
/// `hostEventCheckpointViews`; recording, reassignment and closeout stay
/// commands.
class EventAssistanceCheckpointRepository {
  const EventAssistanceCheckpointRepository(
    this._functions,
    this._firestore, {
    this._clock = const AppClock(),
  });
  final FirebaseFunctions _functions;
  final FirebaseFirestore _firestore;

  /// Applies time to the view on every delivered snapshot.
  final AppClock _clock;

  Future<EventAssistanceCheckpointResult> manageRequest(
    EventAssistanceCheckpointRequestChange change,
  ) => withBackendErrorContext(
    () async {
      final input = switch (change.decision) {
        ReassignCheckpointReporter() => (
          name: 'reassignEventAssistanceCheckpointReporter',
          body: ReassignEventAssistanceCheckpointReporterCallableRequest(
            command: change.command,
            expectedSourceHash: change.sourceHash,
          ).toJson(),
        ),
        CloseCheckpointRequest() || ReopenCheckpointRequest() => (
          name: 'setEventAssistanceCheckpointCloseout',
          body: SetEventAssistanceCheckpointCloseoutCallableRequest(
            command: change.command,
            expectedSourceHash: change.sourceHash,
          ).toJson(),
        ),
      };
      final response = await _functions
          .httpsCallable(input.name)
          .call<Object?>(input.body);
      final result = EventAssistanceCheckpointResult.fromCallableData(
        response.data,
        expectedScope: change.snapshot.scope,
      );
      change.requireResult(result);
      return result;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'update checkpoint request',
      resource: 'eventAssistanceCheckpoints',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );

  /// The checkpoint as a manager reads it, with the manager's reporter
  /// choices when the original request is still outstanding.
  Stream<EventAssistanceCheckpointView> watch(
    EventAssistanceCheckpointScope scope, {
    required String actorUid,
  }) => withBackendErrorStream(
    () => _firestore
        .collection(EventAssistanceMovementViews.checkpoints)
        .doc(checkpointViewId(scope))
        .snapshots()
        .map((snapshot) {
          final data = snapshot.data();
          final result = EventAssistanceCheckpointResult.fromCallableData(
            checkpointReadResponse(
              data,
              scope: scope,
              actorUid: actorUid,
              now: movementViewNow(_clock.now(), [data]),
            ),
            expectedScope: scope,
          );
          return result.view;
        }),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch checkpoint arrivals',
      resource: EventAssistanceMovementViews.checkpoints,
    ),
  );

  Future<EventAssistanceCheckpointResult> apply(
    EventAssistanceCheckpointChange change,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('recordEventAssistanceCheckpoint')
          .call<Object?>(
            RecordEventAssistanceCheckpointCallableRequest(
              command: change.command,
              expectedSourceHash: change.snapshot.sourceHash,
            ).toJson(),
          );
      final result = EventAssistanceCheckpointResult.fromCallableData(
        response.data,
        expectedScope: change.snapshot.scope,
      );
      change.requireResult(result);
      return result;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'record checkpoint arrivals',
      resource: 'eventAssistanceCheckpoints',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}

@riverpod
EventAssistanceCheckpointRepository eventAssistanceCheckpointRepository(
  Ref ref,
) => EventAssistanceCheckpointRepository(
  ref.watch(firebaseFunctionsProvider),
  ref.watch(firebaseFirestoreProvider),
  clock: ref.watch(appClockProvider),
);
