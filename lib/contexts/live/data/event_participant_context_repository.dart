import 'package:catch_dating_app/contexts/live/domain/event_participant_context.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callables/get_event_assistance_participant_context_callable_request.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_participant_context_repository.g.dart';

class EventParticipantContextRepository {
  const EventParticipantContextRepository(this._functions);
  final FirebaseFunctions _functions;
  Future<EventParticipantContext> fetch({
    required String eventId,
    required String subjectUid,
  }) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('getEventAssistanceParticipantContext')
          .call<Object?>(
            GetEventAssistanceParticipantContextCallableRequest(
              eventId: eventId,
            ).toJson(),
          );
      return EventParticipantContext.fromCallableData(
        response.data,
        eventId: eventId,
        subjectUid: subjectUid,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'resolve own event attendee identity',
      resource: 'eventAttendees',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}

@riverpod
EventParticipantContextRepository eventParticipantContextRepository(Ref ref) =>
    EventParticipantContextRepository(ref.watch(firebaseFunctionsProvider));
