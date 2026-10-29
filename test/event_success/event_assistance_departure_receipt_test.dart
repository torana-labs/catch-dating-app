import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_departure_fixtures.dart';

void main() {
  final change = EventAssistanceDepartureChange.prepare(
    snapshot: departureView(),
    operationId: 'departure:receipt-review',
    destination: departureStop,
  );

  test(
    'a confirmation cannot use a read or another group or account receipt',
    () {
      final read = parseDeparture(departureResponse());
      final foreignScope = departureScope(groupId: 'group:other');
      final foreignGroup = parseDeparture(
        departureResponse(
          scope: foreignScope,
          outcome: 'applied',
          operationRevision: 1,
          revision: 1,
          freshness: 'current',
        ),
        scope: foreignScope,
      );
      final foreignActor = parseDeparture(
        departureResponse(
          actorUid: 'other-host',
          outcome: 'applied',
          operationRevision: 1,
          revision: 1,
          freshness: 'current',
        ),
        actorUid: 'other-host',
      );
      for (final result in [read, foreignGroup, foreignActor]) {
        expect(() => change.requireResult(result), throwsFormatException);
      }
    },
  );

  test(
    'same-revision receipt must describe the confirmed destination and source',
    () {
      for (final response in [
        departureResponse(
          outcome: 'applied',
          operationRevision: 1,
          revision: 1,
          freshness: 'current',
          target: departureMeeting,
        ),
        departureResponse(
          outcome: 'replayed',
          operationRevision: 1,
          revision: 1,
          freshness: 'sourceChanged',
        ),
        departureResponse(
          outcome: 'applied',
          operationRevision: 2,
          revision: 2,
          freshness: 'current',
        ),
      ]) {
        expect(
          () => change.requireResult(parseDeparture(response)),
          throwsFormatException,
        );
      }
    },
  );

  test('a newer replay does not need to match this earlier destination', () {
    final result = parseDeparture(
      departureResponse(
        outcome: 'replayed',
        operationRevision: 1,
        revision: 3,
        freshness: 'current',
        target: departureMeeting,
      ),
    );
    expect(() => change.requireResult(result), returnsNormally);
    expect(result.operationRevision, 1);
    expect(result.view.revision, 3);
  });
}
