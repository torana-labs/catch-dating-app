import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/get_event_assistance_participation_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/set_event_assistance_participation_callable_request.g.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_participation_repository.g.dart';

/// Uses the current server authority; it has no attendance or Firestore writer.
class EventAssistanceParticipationRepository {
  const EventAssistanceParticipationRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<EventAssistanceParticipationView> fetch(
    EventAssistanceGuestScope scope,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('getEventAssistanceParticipation')
          .call<Object?>(
            GetEventAssistanceParticipationCallableRequest(
              context: scope.context,
              attendeeId: scope.attendeeId,
            ).toJson(),
          );
      final result = EventAssistanceParticipationResult.fromCallableData(
        response.data,
        expectedScope: scope,
      );
      if (result.outcome != EventParticipationOutcome.read) {
        throw const FormatException('Invalid participation read outcome.');
      }
      return result.view;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'load guest participation',
      resource: 'eventAssistanceGuests',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );

  Future<EventAssistanceParticipationResult> apply(
    EventAssistanceParticipationChange change,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('setEventAssistanceParticipation')
          .call<Object?>(
            SetEventAssistanceParticipationCallableRequest(
              command: change.command,
              expectedSourceHash: change.snapshot.sourceHash,
            ).toJson(),
          );
      final result = EventAssistanceParticipationResult.fromCallableData(
        response.data,
        expectedScope: change.snapshot.scope,
      );
      result.requireChange(change);
      // A replay can return a newer current view. Keep its receipt revision
      // separate; never overwrite that view with the originally requested state.
      return result;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'update guest participation',
      resource: 'eventAssistanceGuests',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}

/// Typed mutation seam used by the participation editor.
final class EventAssistanceParticipationCommands {
  const EventAssistanceParticipationCommands(this._repository);

  final EventAssistanceParticipationRepository _repository;

  Future<EventAssistanceParticipationResult> apply(
    EventAssistanceParticipationChange change,
  ) => _repository.apply(change);
}

@riverpod
EventAssistanceParticipationRepository eventAssistanceParticipationRepository(
  Ref ref,
) => EventAssistanceParticipationRepository(
  ref.watch(firebaseFunctionsProvider),
);

@riverpod
EventAssistanceParticipationCommands eventAssistanceParticipationCommands(
  Ref ref,
) => EventAssistanceParticipationCommands(
  ref.watch(eventAssistanceParticipationRepositoryProvider),
);
