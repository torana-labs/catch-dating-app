import 'package:catch_dating_app/contexts/live/domain/event_sms_preference.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callables/get_event_assistance_sms_preference_callable_request.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_sms_preference_repository.g.dart';

/// Enrollment and withdrawal use the verified-participant callable authority:
/// the one event-day preference callable for every channel (issue #2494).
class EventSmsPreferenceRepository {
  const EventSmsPreferenceRepository(this._functions);
  final FirebaseFunctions _functions;

  Future<EventSmsPreferenceView> fetch(EventSmsPreferenceScope scope) =>
      withBackendErrorContext(
        () async {
          final response = await _functions
              .httpsCallable('getEventMessagePreference')
              .call<Object?>({
                'channel': 'sms',
                'request': GetEventAssistanceSmsPreferenceCallableRequest(
                  eventId: scope.eventId,
                  attendeeId: scope.attendeeId,
                  senderId: scope.senderId == 'catch-event-sms'
                      ? null
                      : scope.senderId,
                ).toJson(),
              });
          final result = EventSmsPreferenceResult.fromCallableData(
            response.data,
            expectedScope: scope,
          );
          if (result.outcome != EventSmsPreferenceOutcome.read) {
            throw const FormatException('Invalid event text review outcome.');
          }
          return result.view;
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'load event text preferences',
          resource: 'eventAssistanceSms',
        ),
        mapper: mapMissingCallableAsUnavailable,
      );

  Future<EventSmsPreferenceResult> apply(EventSmsPreferenceChange change) =>
      withBackendErrorContext(
        () async {
          final response = await _functions
              .httpsCallable('setEventMessagePreference')
              .call<Object?>({'channel': 'sms', 'request': change.toJson()});
          final result = EventSmsPreferenceResult.fromCallableData(
            response.data,
            expectedScope: change.snapshot.scope,
          );
          result.requireChange(change);
          return result;
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'save event text preferences',
          resource: 'eventAssistanceSms',
        ),
        mapper: mapMissingCallableAsUnavailable,
      );
}

@riverpod
EventSmsPreferenceRepository eventSmsPreferenceRepository(Ref ref) =>
    EventSmsPreferenceRepository(ref.watch(firebaseFunctionsProvider));
