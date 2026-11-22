import 'package:catch_dating_app/contexts/programmes/data/program_travel_party_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('detachLeg sends the journey and its revision', () async {
    final functions = _Functions()
      ..response = {
        'entityId': 'leg-2',
        'revision': 1800000000001,
        'alreadyApplied': false,
      };
    final result = await ProgramTravelPartyRepository(
      functions,
    ).detachLeg(programId: 'program-1', legId: 'leg-2', expectedRevision: 7);
    expect(functions.calls, ['detachProgramTravelLeg']);
    expect(functions.payload, {
      'programId': 'program-1',
      'legId': 'leg-2',
      'expectedRevision': 7,
    });
    expect(result.entityId, 'leg-2');
    expect(result.revision, 1800000000001);
  });

  group('guest list check row errors', () {
    ProgramManifestImportResult parse(List<Object?> rowErrors) =>
        ProgramManifestImportResult.fromCallableData({
          'mode': 'preview',
          'totalRows': 2,
          'guestsCreated': 0,
          'guestsUpdated': 1,
          'legsCreated': 0,
          'legsUpdated': 0,
          'householdsCreated': 0,
          'partiesCreated': 0,
          'groupsCreated': 0,
          'rowErrors': rowErrors,
          'alreadyApplied': false,
        });

    test('carry the journey a party blocks, and none otherwise', () {
      final result = parse([
        {
          'index': 0,
          'message': 'Remove this journey from its old party before moving it.',
          'partyJourney': {'legId': 'leg-1', 'revision': 4},
        },
        {'index': 1, 'message': 'Guest name is required.'},
      ]);
      final journey = result.rowErrors[0].partyJourney;
      expect(journey?.legId, 'leg-1');
      expect(journey?.revision, 4);
      expect(result.rowErrors[1].partyJourney, isNull);
    });

    test('refuse a party journey without a revision', () {
      expect(
        () => parse([
          {
            'index': 0,
            'message': 'Remove this journey from its party.',
            'partyJourney': {'legId': 'leg-1'},
          },
        ]),
        throwsFormatException,
      );
    });
  });
}

class _Functions extends Fake implements FirebaseFunctions {
  Object? response;
  Object? payload;
  final calls = <String>[];

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    calls.add(name);
    return _Callable((value) {
      payload = value;
      return response;
    });
  }
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.respond);

  final Object? Function(Object?) respond;

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async =>
      _Result(respond(parameters) as T);
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);

  @override
  final T data;
}
