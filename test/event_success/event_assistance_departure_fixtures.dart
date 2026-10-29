import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';

const departureNow = 1788790000000;
const departureActor = 'manager-1';

EventAssistanceGroupScope departureScope({String groupId = 'event:whole'}) =>
    EventAssistanceGroupScope(
      organizerId: 'organizer-1',
      eventId: 'event-1',
      groupId: groupId,
    );

const departureStop = AssistanceItineraryStop(
  itineraryId: 'event-1:itinerary',
  stopId: 'second',
);
const departureMeeting = AssistanceFixedPlace(
  placeId: 'meeting',
  lateEntry: AssistanceLateEntry.allowed,
);

Map<String, Object?> departureResponse({
  String actorUid = departureActor,
  String outcome = 'read',
  int? operationRevision,
  int revision = 0,
  String freshness = 'unconfirmed',
  bool eventOpen = true,
  bool runtimeLive = true,
  String authority = 'canConfirm',
  String reporter = 'anyAuthorizedOperator',
  int validUntil = departureNow + 100000,
  EventAssistanceGroupScope? scope,
  AssistanceJoiningTarget target = departureStop,
}) {
  final currentScope = scope ?? departureScope();
  final current = revision > 0;
  final oldSource = freshness == 'sourceChanged';
  return {
    'outcome': outcome,
    'operationRevision': operationRevision,
    'actorUid': actorUid,
    'departureAuthority': {
      'kind': authority,
      'validUntil': validUntil,
      if (authority == 'canConfirm') 'checkpointReporter': reporter,
    },
    'view': {
      'context': currentScope.context,
      'groupId': currentScope.groupId,
      'serverTime': departureNow,
      'revision': revision,
      'sourceHash': 'a' * 64,
      'eventOpen': eventOpen,
      'runtimeLive': runtimeLive,
      'freshness': freshness,
      'progress': !current
          ? null
          : {
              'schemaVersion': 1,
              'progressId': 'progress:${'b' * 64}',
              'context': currentScope.context,
              'groupId': currentScope.groupId,
              'revision': revision,
              'destination': target.toJson(),
              'sourceHash': (oldSource ? 'c' : 'a') * 64,
              'confirmedBy': actorUid,
              'confirmedAt': departureNow - 10,
              'operationId': 'departure:previous',
              'requestHash': 'd' * 64,
              'createdAt': departureNow - 20,
              'updatedAt': departureNow - 10,
            },
      'guidance': !current || oldSource || !eventOpen || !runtimeLive
          ? null
          : {
              'revision': revision,
              'destination': target.toJson(),
              'materialKey': 'e' * 64,
              'text': 'Join us at the second stop.',
              'validUntil': departureNow + 200000,
            },
      'destinations': [
        {
          'alternativeId': 'alternative:${'f' * 64}',
          'target': target.toJson(),
          'label': 'Second stop',
          'location': {
            'name': 'Second stop',
            'address': null,
            'placeId': null,
            'latitude': 12.9,
            'longitude': 77.6,
            'notes': '',
          },
        },
      ],
    },
  };
}

Map<String, Object?> departureRawView(Map<String, Object?> response) =>
    response['view']! as Map<String, Object?>;

EventAssistanceGroupProgressResult parseDeparture(
  Map<String, Object?> response, {
  EventAssistanceGroupScope? scope,
  String actorUid = departureActor,
}) => EventAssistanceGroupProgressResult.fromCallableData(
  response,
  expectedScope: scope ?? departureScope(),
  expectedActorUid: actorUid,
);

EventAssistanceGroupProgressView departureView() =>
    parseDeparture(departureResponse()).view;

Map<String, Object?> departureRosterResponse({
  List<String> attendeeIds = const ['guest-1'],
  int revision = 0,
  int serverTime = departureNow + 1,
}) => {
  'context': departureScope().context,
  'groupId': departureScope().groupId,
  'serverTime': serverTime,
  'progressRevision': revision,
  'selection': {'attendeeIds': attendeeIds, 'expectedSourceHash': 'f' * 64},
};
