import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability_change.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/get_event_assistance_accountability_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/resolve_event_assistance_accountability_callable_request.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_accountability_repository.g.dart';

class EventAssistanceAccountabilityRepository {
  const EventAssistanceAccountabilityRepository(this._functions);
  final FirebaseFunctions _functions;
  Future<EventAssistanceAccountabilityView> fetch(
    EventAssistanceAccountabilityScope scope,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('getEventAssistanceAccountability')
          .call<Object?>(
            GetEventAssistanceAccountabilityCallableRequest(
              context: scope.group.context,
              groupId: scope.group.groupId,
              attendeeId: scope.attendeeId,
              checkpoint: scope.checkpoint?.toJson(),
            ).toJson(),
          );
      final result = EventAssistanceAccountabilityResult.fromCallableData(
        response.data,
        expectedScope: scope,
      );
      if (result.outcome != AssistanceAccountabilityOutcome.read) {
        throw const FormatException('Invalid accountability read outcome.');
      }
      return result.view;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'review guest visit result',
      resource: 'eventAttendees',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
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
);
