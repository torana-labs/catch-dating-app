import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/confirm_event_assistance_departure_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/get_event_assistance_departure_roster_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/get_event_assistance_group_progress_callable_request.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_departure_repository.g.dart';

/// Live callables only. No direct progress, attendance or messaging writes.
class EventAssistanceDepartureRepository {
  const EventAssistanceDepartureRepository(this._functions);
  final FirebaseFunctions _functions;

  Future<EventAssistanceGroupProgressView> fetch(
    EventAssistanceGroupScope scope, {
    required String actorUid,
  }) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('getEventAssistanceGroupProgress')
          .call<Object?>(
            GetEventAssistanceGroupProgressCallableRequest(
              context: scope.context,
              groupId: scope.groupId,
            ).toJson(),
          );
      final result = EventAssistanceGroupProgressResult.fromCallableData(
        response.data,
        expectedScope: scope,
        expectedActorUid: actorUid,
      );
      if (result.outcome != AssistanceProgressOutcome.read) {
        throw const FormatException('Invalid departure read outcome.');
      }
      return result.view;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'load group departure',
      resource: 'eventAssistanceGroupProgress',
    ),
    mapper: mapMissingCallableAsUnavailable,
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
) => EventAssistanceDepartureRepository(ref.watch(firebaseFunctionsProvider));
