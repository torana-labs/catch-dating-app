import 'package:catch_dating_app/contexts/audience/data/host_roster_intake_repository.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('resume, revise and apply all go through guests.import-list', () async {
    final functions = _Functions()..response = _response(status: 'previewed');
    final repository = HostRosterIntakeRepository(functions);

    final review = await repository.resume('hri_session');
    expect(functions.calls, ['importGuestList']);
    expect(functions.payload, containsPair('mode', 'preview'));
    expect(functions.payload, containsPair('surface', 'catch_host'));
    expect((functions.payload! as Map)['input'], {'sessionId': 'hri_session'});
    expect(review.previewHash, 'p' * 64);
    expect(review.fileName, 'guests.csv');
    expect(review.state, 'review');
    expect(review.rows.single.fieldChanges.single.proposedValue, '+91');
    final key = (functions.payload! as Map)['idempotencyKey'] as String;
    expect(review.idempotencyKey, key);

    functions.response = _response(
      status: 'previewed',
      previewHash: 'q' * 64,
      excluded: ['2'],
    );
    final revised = await repository.setExcludedRows(review, ['2']);
    expect((functions.payload! as Map)['idempotencyKey'], key);
    expect((functions.payload! as Map)['input'], {
      'sessionId': 'hri_session',
      'excludedRowIds': ['2'],
    });
    expect(revised.excludedRowIds, ['2']);

    functions.response = _response(
      status: 'applied',
      previewHash: 'q' * 64,
      excluded: ['2'],
      imported: true,
    );
    final applied = await repository.apply(revised);
    final payload = functions.payload! as Map;
    expect(payload['mode'], 'apply');
    expect(payload['idempotencyKey'], key);
    expect(payload['confirm'], {
      'commandId': 'guests.import-list',
      'previewHash': 'q' * 64,
    });
    expect(applied.state, 'applied');
    expect(applied.result?.createdCount, 1);
    expect(functions.calls.toSet(), {'importGuestList'});
  });

  test('no guest list waiting reads as null', () async {
    final functions = _Functions()
      ..error = FirebaseFunctionsException(
        code: 'not-found',
        message: 'No guest list is waiting for review.',
      );
    final repository = HostRosterIntakeRepository(functions);
    expect(await repository.latestInReviewSessionId(eventId: 'event-1'), null);
    expect((functions.payload! as Map)['input'], {'eventId': 'event-1'});
  });
}

Map<String, Object?> _response({
  required String status,
  String? previewHash,
  List<String> excluded = const [],
  bool imported = false,
}) => {
  'commandId': 'guests.import-list',
  'status': status,
  'previewHash': previewHash ?? 'p' * 64,
  'result': {
    'eventId': 'event-1',
    'sessionId': 'hri_session',
    'revision': 1,
    'reviewHash': 'r' * 64,
    'eligibleForApply': true,
    'fileName': 'guests.csv',
    'excludedRowIds': excluded,
    'counts': {'add': 1, 'update': 0},
    'rows': [
      {
        'rowId': '2',
        'sourceRowNumber': 2,
        'displayName': 'Asha Sample',
        'kind': 'add',
        'issueCode': null,
        'changedFields': ['phone'],
        'externalReference': null,
        'fieldChanges': [
          {
            'field': 'phone',
            'currentValue': null,
            'proposedValue': '+91',
            'origin': 'upload',
          },
        ],
      },
    ],
    'import': imported
        ? {
            'importId': 'imp_1',
            'status': 'completed',
            'createdCount': 1,
            'updatedCount': 0,
            'skippedCount': 0,
          }
        : null,
  },
};

class _Functions extends Fake implements FirebaseFunctions {
  Object? response;
  Object? payload;
  FirebaseFunctionsException? error;
  final calls = <String>[];
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    calls.add(name);
    return _Callable((value) {
      payload = value;
      if (error case final error?) throw error;
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
