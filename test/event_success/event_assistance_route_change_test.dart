import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_route_change.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_departure_fixtures.dart';
import 'event_assistance_participation_fixtures.dart';

EventAssistanceGroupProgressView _departed({
  String reporter = 'anyAuthorizedOperator',
  bool withAlternative = true,
  bool eventOpen = true,
}) => parseDeparture(
  departureResponse(
    revision: 1,
    freshness: 'current',
    reporter: reporter,
    withAlternative: withAlternative,
    eventOpen: eventOpen,
  ),
).view;

EventAssistanceRouteChange _change(EventAssistanceGroupProgressView view) =>
    EventAssistanceRouteChange.prepare(
      snapshot: view,
      operationId: 'route:1',
      decisionId: 'route-decision:1',
      alternativeId: departureAlternative,
    );

void main() {
  group('who can change a live route', () {
    test('the event lead, after departure, with another alternative', () {
      expect(_departed().canChangeRoute, isTrue);
    });

    test('nobody before the group departs', () {
      final view = parseDeparture(
        departureResponse(withAlternative: true),
      ).view;
      expect(view.canConfirm, isTrue);
      expect(view.canChangeRoute, isFalse);
    });

    test('not a group lead, who reports only for themselves', () {
      expect(_departed(reporter: 'selfOnly').canChangeRoute, isFalse);
    });

    test('not when the active route is the only alternative', () {
      expect(_departed(withAlternative: false).canChangeRoute, isFalse);
    });

    test('not once the event has closed', () {
      expect(_departed(eventOpen: false).canChangeRoute, isFalse);
    });
  });

  test('a progress the route change wrote still reads', () {
    final view = parseDeparture(
      departureResponse(
        revision: 2,
        freshness: 'current',
        routeDecisionId: 'route-decision:1',
      ),
    ).view;
    expect(view.progress!.routeDecisionId, 'route-decision:1');
  });

  test('the command carries the reviewed revision, source and choice', () {
    final view = _departed();
    expect(_change(view).command, {
      'kind': 'changeRoute',
      'context': departureScope().context,
      'eventId': 'event-1',
      'operationId': 'route:1',
      'payload': {
        'routeRevision': 1,
        'groupId': departureScope().groupId,
        'expectedSourceHash': 'a' * 64,
        'alternativeId': departureAlternative,
        'decisionId': 'route-decision:1',
      },
    });
  });

  test('only another current alternative can be chosen', () {
    final view = _departed();
    expect(
      () => EventAssistanceRouteChange.prepare(
        snapshot: view,
        operationId: 'route:1',
        decisionId: 'route-decision:1',
        alternativeId: view.destinations.first.alternativeId,
      ),
      throwsArgumentError,
    );
    expect(
      () => EventAssistanceRouteChange.prepare(
        snapshot: view,
        operationId: 'route:1',
        decisionId: 'route-decision:1',
        alternativeId: 'alternative:${'9' * 64}',
      ),
      throwsArgumentError,
    );
    expect(() => _change(_departed(reporter: 'selfOnly')), throwsStateError);
  });

  group('the receipt', () {
    Map<String, Object?> applied({String decisionId = 'route-decision:1'}) =>
        departureResponse(
          outcome: 'applied',
          operationRevision: 2,
          revision: 2,
          freshness: 'current',
          target: departureMeeting,
          withAlternative: true,
          routeDecisionId: decisionId,
        );

    test('matches the decision it names', () {
      final change = _change(_departed());
      change.requireResult(parseDeparture(applied()));
    });

    test('rejects another decision at the same revision', () {
      final change = _change(_departed());
      expect(
        () => change.requireResult(
          parseDeparture(applied(decisionId: 'route-decision:other')),
        ),
        throwsFormatException,
      );
    });

    test('rejects a read, which records nothing', () {
      final change = _change(_departed());
      expect(
        () => change.requireResult(
          parseDeparture(
            departureResponse(
              revision: 1,
              freshness: 'current',
              withAlternative: true,
            ),
          ),
        ),
        throwsFormatException,
      );
    });
  });

  test('the repository calls the live route callable once', () async {
    final functions = ParticipationTestFunctions()
      ..response = departureResponse(
        outcome: 'applied',
        operationRevision: 2,
        revision: 2,
        freshness: 'current',
        target: departureMeeting,
        withAlternative: true,
        routeDecisionId: 'route-decision:1',
      );
    final repository = EventAssistanceDepartureRepository(
      functions,
      FakeFirebaseFirestore(),
    );
    final change = _change(_departed());
    final result = await repository.changeRoute(change);
    expect(result.view.progress!.destination, departureMeeting);
    expect(functions.calls.map((call) => call.name), [
      'changeEventAssistanceRoute',
    ]);
    expect(functions.calls.single.input, {'command': change.command});
  });
}
