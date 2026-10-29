import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

EventAssistanceGuestScope participationScope({
  String attendeeId = 'attendee-1',
}) => EventAssistanceGuestScope(
  organizerId: 'organizer-1',
  eventId: 'event-1',
  attendeeId: attendeeId,
);

Map<String, Object?> participationResponse({
  String outcome = 'read',
  int? operationRevision,
  int revision = 2,
  String? episodeId = 'episode:one',
  String freshness = 'current',
  Object? participation = const {'state': 'active', 'resumeAtUnit': null},
  bool canChange = true,
  bool checkedIn = false,
}) => {
  'outcome': outcome,
  'operationRevision': operationRevision,
  'view': {
    'context': participationScope().context,
    'attendeeId': 'attendee-1',
    'serverTime': 1788790000000,
    'sourceHash': 'a' * 64,
    'freshness': freshness,
    'revision': revision,
    'episodeId': episodeId,
    'participation': participation,
    'canChange': canChange,
    'checkedIn': checkedIn,
    'resumeUnits': [
      {'unitId': 'itinerary:second', 'label': 'Second stop'},
    ],
  },
};

EventAssistanceParticipationView participationView({bool canChange = true}) =>
    EventAssistanceParticipationResult.fromCallableData(
      participationResponse(canChange: canChange),
      expectedScope: participationScope(),
    ).view;

class ParticipationTestFunctions extends Fake implements FirebaseFunctions {
  Object? response = participationResponse();
  Object? error;
  final calls = <({String name, Object? input})>[];

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _ParticipationCallable(this, name);
}

class _ParticipationCallable extends Fake implements HttpsCallable {
  _ParticipationCallable(this.owner, this.name);
  final ParticipationTestFunctions owner;
  final String name;

  @override
  Future<HttpsCallableResult<T>> call<T>([Object? parameters]) async {
    owner.calls.add((name: name, input: parameters));
    if (owner.error case final error?) throw error;
    return _ParticipationResult<T>(owner.response as T);
  }
}

class _ParticipationResult<T> extends Fake implements HttpsCallableResult<T> {
  _ParticipationResult(this.data);
  @override
  final T data;
}
