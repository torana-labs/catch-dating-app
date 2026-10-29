import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_sender_preference.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/get_event_assistance_sms_preference_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/get_event_rcs_preference_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/get_event_whatsapp_preference_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/list_event_rcs_preferences_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/list_event_sms_preferences_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/list_event_whatsapp_preferences_callable_request.g.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_sender_preference_repository.g.dart';

enum _PreferenceAction { list, read, write }

/// Each channel retains its own callable, payload and closed response parser.
class EventSenderPreferenceRepository {
  const EventSenderPreferenceRepository(this._functions);
  final FirebaseFunctions _functions;

  Future<EventSenderPreferencePage> list(
    EventSenderPreferenceScope scope, {
    String? cursor,
  }) {
    EventSenderPreferencePage.requireCursor(scope.channel, cursor);
    final input = switch (scope.channel) {
      EventSenderChannel.sms => ListEventSmsPreferencesCallableRequest(
        eventId: scope.eventId,
        attendeeId: scope.attendeeId,
        cursor: cursor,
      ).toJson(),
      EventSenderChannel.whatsapp =>
        ListEventWhatsappPreferencesCallableRequest(
          eventId: scope.eventId,
          attendeeId: scope.attendeeId,
          cursor: cursor,
        ).toJson(),
      EventSenderChannel.rcs => ListEventRcsPreferencesCallableRequest(
        eventId: scope.eventId,
        attendeeId: scope.attendeeId,
        cursor: cursor,
      ).toJson(),
    };
    return _call(
      scope,
      _PreferenceAction.list,
      input,
      (raw) => EventSenderPreferencePage.fromCallableData(
        raw,
        expectedScope: scope,
        after: cursor,
      ),
    );
  }

  Future<EventSenderPreferenceView> fetch(
    EventSenderPreferenceScope scope,
    String senderId,
  ) {
    assistanceId(senderId);
    final input = switch (scope.channel) {
      EventSenderChannel.sms => GetEventAssistanceSmsPreferenceCallableRequest(
        eventId: scope.eventId,
        attendeeId: scope.attendeeId,
        senderId: senderId,
      ).toJson(),
      EventSenderChannel.whatsapp => GetEventWhatsappPreferenceCallableRequest(
        eventId: scope.eventId,
        attendeeId: scope.attendeeId,
        senderId: senderId,
      ).toJson(),
      EventSenderChannel.rcs => GetEventRcsPreferenceCallableRequest(
        eventId: scope.eventId,
        attendeeId: scope.attendeeId,
        senderId: senderId,
      ).toJson(),
    };
    return _call(scope, _PreferenceAction.read, input, (raw) {
      final result = EventSenderPreferenceResult.fromCallableData(
        raw,
        expectedScope: scope,
        expectedSenderId: senderId,
      );
      if (result.outcome != EventSenderPreferenceOutcome.read) {
        throw const FormatException('Invalid event message review outcome.');
      }
      return result.view;
    });
  }

  Future<EventSenderPreferenceResult> apply(
    EventSenderPreferenceChange change,
  ) => _call(change.snapshot.scope, _PreferenceAction.write, change.toJson(), (
    raw,
  ) {
    final result = EventSenderPreferenceResult.fromCallableData(
      raw,
      expectedScope: change.snapshot.scope,
      expectedSenderId: change.snapshot.senderId,
    );
    result.requireChange(change);
    return result;
  });

  Future<T> _call<T>(
    EventSenderPreferenceScope scope,
    _PreferenceAction action,
    Map<String, Object?> input,
    T Function(Object?) decode,
  ) {
    final callable = switch ((scope.channel, action)) {
      (EventSenderChannel.sms, _PreferenceAction.list) =>
        'listEventSmsPreferences',
      (EventSenderChannel.sms, _PreferenceAction.read) =>
        'getEventAssistanceSmsPreference',
      (EventSenderChannel.sms, _PreferenceAction.write) =>
        'setEventAssistanceSmsPreference',
      (EventSenderChannel.whatsapp, _PreferenceAction.list) =>
        'listEventWhatsappPreferences',
      (EventSenderChannel.whatsapp, _PreferenceAction.read) =>
        'getEventWhatsappPreference',
      (EventSenderChannel.whatsapp, _PreferenceAction.write) =>
        'setEventWhatsappPreference',
      (EventSenderChannel.rcs, _PreferenceAction.list) =>
        'listEventRcsPreferences',
      (EventSenderChannel.rcs, _PreferenceAction.read) =>
        'getEventRcsPreference',
      (EventSenderChannel.rcs, _PreferenceAction.write) =>
        'setEventRcsPreference',
    };
    return withBackendErrorContext(
      () async {
        final response = await _functions
            .httpsCallable(callable)
            .call<Object?>(input);
        return decode(response.data);
      },
      context: BackendErrorContext(
        service: BackendService.functions,
        action: switch (action) {
          _PreferenceAction.list => 'load event message senders',
          _PreferenceAction.read => 'review event message preferences',
          _PreferenceAction.write => 'save event message preferences',
        },
        resource: callable,
      ),
      mapper: mapMissingCallableAsUnavailable,
    );
  }
}

@riverpod
EventSenderPreferenceRepository eventSenderPreferenceRepository(Ref ref) =>
    EventSenderPreferenceRepository(ref.watch(firebaseFunctionsProvider));
