import 'package:catch_dating_app/contexts/live/domain/event_assistance_host_guests.dart';

const assistanceServerTime = 1788790000000;
const assistanceExpiry = assistanceServerTime + 3600000;

EventAssistanceGuestSelection hostGuestsSelection({
  List<String> attendeeIds = const ['attendee-1'],
}) => EventAssistanceGuestSelection(
  organizerId: 'organizer-1',
  eventId: 'event-1',
  attendeeIds: attendeeIds,
);

Map<String, Object?> hostJoiningGuidance() => {
  'revision': 3,
  'destination': {
    'kind': 'itineraryStop',
    'itineraryId': 'event-1',
    'stopId': 'second',
  },
  'materialKey': 'second-stop',
  'text': 'Meet us at the second stop.',
  'validUntil': assistanceExpiry,
};

Map<String, Object?> hostRecordedWork({
  Map<String, Object?>? observation,
  bool terminal = false,
  String binding = 'current',
  int publishedIntentCount = 0,
}) => {
  'kind': 'recorded',
  'revision': observation == null ? 0 : 3,
  'runStatus': terminal ? 'completed' : 'running',
  'configurationBinding': binding,
  'expiresAt': assistanceExpiry,
  'nextEvaluationAt': terminal ? null : assistanceServerTime + 600000,
  'lastEvaluation': observation == null
      ? null
      : {'at': assistanceServerTime - 1000, 'observation': observation},
  'publishedIntentCount': publishedIntentCount,
};

Map<String, Object?> hostCurrentGuest({
  String attendeeId = 'attendee-1',
  Object? work = const {'kind': 'notEnrolled'},
  Object? intention = const {'kind': 'unknown'},
}) => {
  'kind': 'current',
  'attendeeId': attendeeId,
  'checkedIn': false,
  'episodeId': 'episode:one',
  'participation': {'state': 'active', 'resumeAtUnit': null},
  'intention': intention,
  'work': work,
};

Map<String, Object?> hostGuestsResponse({
  List<Object?>? guests,
  String runtimeStatus = 'configured',
}) => {
  'context': hostGuestsSelection().context,
  'serverTime': assistanceServerTime,
  'coverage': 'selectedAttendees',
  'workflow': 'lateJoin',
  'runtimeStatus': runtimeStatus,
  'guests': guests ?? [hostCurrentGuest()],
};

EventAssistanceHostGuestsView hostGuestsView({
  EventAssistanceGuestSelection? selection,
}) {
  final requested = selection ?? hostGuestsSelection();
  return EventAssistanceHostGuestsView.fromCallableData({
    ...hostGuestsResponse(
      guests: requested.attendeeIds
          .map((id) => hostCurrentGuest(attendeeId: id))
          .toList(),
    ),
    'context': requested.context,
  }, expectedSelection: requested);
}
