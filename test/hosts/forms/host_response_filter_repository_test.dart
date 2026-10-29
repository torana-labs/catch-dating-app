import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('response page exposes the server-owned published version scope', () {
    final page = HostFormResponsePage.fromCallableData(const {
      'organizerId': 'org',
      'items': <Object?>[],
      'nextCursor': null,
      'versionScope': {'activeVersionId': 'form_v3', 'publishedVersion': 3},
    });
    expect(page.versionScope?.activeVersionId, 'form_v3');
    expect(page.versionScope?.publishedVersion, 3);
  });
  test(
    'multiple answers and combined questions survive pagination serialization',
    () async {
      final functions = _Functions();
      final repository = HostFormsRepository(functions);
      const request = HostFormResponseListRequest(
        organizerId: 'org',
        formId: 'form',
        versionId: 'form_v2',
        answerFilters: {
          'city': {'Mumbai', 'Delhi'},
          'diet': {'vegetarian', 'vegan'},
        },
      );
      await repository.listResponses(request.copyWith(cursor: 'next'));
      expect(functions.payload['cursor'], 'next');
      expect(functions.payload['versionId'], 'form_v2');
      expect(functions.payload['answerFilters'], [
        {
          'questionId': 'city',
          'values': ['Delhi', 'Mumbai'],
        },
        {
          'questionId': 'diet',
          'values': ['vegan', 'vegetarian'],
        },
      ]);
      expect(request.copyWith(cursor: 'next').versionId, 'form_v2');
      expect(
        request,
        isNot(
          const HostFormResponseListRequest(
            organizerId: 'org',
            formId: 'form',
            versionId: 'form_v1',
            answerFilters: {
              'city': {'Mumbai', 'Delhi'},
              'diet': {'vegetarian', 'vegan'},
            },
          ),
        ),
      );
    },
  );
}

class _Functions extends Fake implements FirebaseFunctions {
  Map<Object?, Object?> payload = {};
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _Callable((value) => payload = value);
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.onCall);
  final void Function(Map<Object?, Object?>) onCall;
  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    onCall(parameters as Map<Object?, Object?>);
    return _Result<T>(
      {'organizerId': 'org', 'items': [], 'nextCursor': null} as T,
    );
  }
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);
  @override
  final T data;
}
