import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/get_event_assistance_checkpoint_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/reassign_event_assistance_checkpoint_reporter_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/record_event_assistance_checkpoint_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/set_event_assistance_checkpoint_closeout_callable_request.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_checkpoint_repository.g.dart';

class EventAssistanceCheckpointRepository {
  const EventAssistanceCheckpointRepository(this._functions);
  final FirebaseFunctions _functions;

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

  Future<EventAssistanceCheckpointView> fetch(
    EventAssistanceCheckpointScope scope,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('getEventAssistanceCheckpoint')
          .call<Object?>(
            GetEventAssistanceCheckpointCallableRequest(
              context: scope.group.context,
              groupId: scope.group.groupId,
              checkpointId: scope.checkpointId,
              progressRevision: scope.progressRevision,
            ).toJson(),
          );
      final result = EventAssistanceCheckpointResult.fromCallableData(
        response.data,
        expectedScope: scope,
      );
      if (result.outcome != AssistanceCheckpointOutcome.read) {
        throw const FormatException('Invalid checkpoint read outcome.');
      }
      return result.view;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'review checkpoint arrivals',
      resource: 'eventAssistanceCheckpoints',
    ),
    mapper: mapMissingCallableAsUnavailable,
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
) => EventAssistanceCheckpointRepository(ref.watch(firebaseFunctionsProvider));
