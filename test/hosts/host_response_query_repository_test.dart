import 'package:catch_dating_app/contexts/forms/data/host_response_query_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const request = HostResponseQueryRequest(
    organizerId: 'org',
    formId: 'form',
    versionId: 'form_v3',
    limit: 1,
  );

  test('gateway sends bare typed request and parses the exact page', () async {
    final functions = _Functions((_) => _page);
    final gateway = HostResponseQueryRepository(functions);
    final page = await gateway.query(request.withCursor('page-two'));
    expect(functions.names, ['queryOrganizerFormResponses']);
    expect(functions.payload?['organizerId'], 'org');
    expect(functions.payload?['versionId'], 'form_v3');
    expect(functions.payload?['cursor'], 'page-two');
    expect(functions.payload?.containsKey('query'), isFalse);
    expect(page.form.title, 'Sunday run RSVP');
    expect(page.items.single.responseId, 'kabir');
    expect(page.selectedIds, {'kabir'});
    expect(page.fieldCatalog.single.questionId, 'city');
  });

  test('structured stale detail becomes typed app failure', () async {
    final functions = _Functions(
      (_) => throw FirebaseFunctionsException(
        code: 'aborted',
        message: 'opaque server message',
        details: const {'reason': 'response-query-stale', 'action': 'refresh'},
      ),
    );
    final gateway = HostResponseQueryRepository(functions);
    await expectLater(
      gateway.query(request),
      throwsA(
        isA<BackendOperationException>().having(
          (error) => error.code,
          'code',
          'response-query-stale',
        ),
      ),
    );
  });

  test('unrelated aborted error does not become stale', () async {
    final functions = _Functions(
      (_) => throw FirebaseFunctionsException(
        code: 'aborted',
        message: 'another operation failed',
        details: const {'reason': 'different'},
      ),
    );
    await expectLater(
      HostResponseQueryRepository(functions).query(request),
      throwsA(
        isA<AppException>().having((error) => error.code, 'code', 'aborted'),
      ),
    );
  });

  test(
    'missing endpoint and malformed page remain normalized failures',
    () async {
      final missing = _Functions(
        (_) => throw FirebaseFunctionsException(
          code: 'not-found',
          message: 'Function not found',
        ),
      );
      await expectLater(
        HostResponseQueryRepository(missing).query(request),
        throwsA(
          isA<AppException>().having(
            (error) => error.code,
            'code',
            'callable-unavailable',
          ),
        ),
      );
      final malformed = _Functions((_) => const {'items': <Object?>[]});
      await expectLater(
        HostResponseQueryRepository(malformed).query(request),
        throwsA(
          isA<AppException>().having(
            (error) => error.code,
            'code',
            'unexpected',
          ),
        ),
      );
    },
  );
}

const _page = {
  'form': {
    'formId': 'form',
    'title': 'Sunday run RSVP',
    'versionId': 'form_v3',
    'version': 3,
  },
  'fieldCatalog': [
    {
      'questionId': 'city',
      'label': 'City',
      'kind': 'singleChoice',
      'operators': ['choiceAny'],
      'sortable': true,
      'options': [
        {'value': 'Delhi', 'label': 'Delhi'},
      ],
    },
  ],
  'items': [
    {
      'responseId': 'kabir',
      'formId': 'form',
      'formTitle': 'Sunday run RSVP',
      'versionId': 'form_v3',
      'version': 3,
      'status': 'submitted',
      'identityKind': 'anonymous',
      'identity': {
        'displayName': 'Guest kabir',
        'email': null,
        'phoneE164': null,
        'origin': 'anonymous',
      },
      'sourceLinkId': null,
      'submittedAtMillis': 1000,
      'withdrawnAtMillis': null,
    },
  ],
  'total': 1,
  'nextCursor': null,
  'selectedIds': ['kabir'],
  'queryHash': 'query-one',
  'resultHash': 'result-one',
};

class _Functions extends Fake implements FirebaseFunctions {
  _Functions(this.respond);

  final Object? Function(Map<Object?, Object?>) respond;
  final List<String> names = [];
  Map<Object?, Object?>? payload;

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    names.add(name);
    return _Callable((value) {
      payload = value;
      return respond(value);
    });
  }
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.respond);
  final Object? Function(Map<Object?, Object?>) respond;

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async =>
      _Result<T>(respond(parameters as Map<Object?, Object?>) as T);
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);

  @override
  final T data;
}
