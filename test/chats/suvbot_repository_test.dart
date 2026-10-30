import 'package:catch_dating_app/contexts/messaging/data/suvbot_repository.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/schema_contracts.g.dart'
    as schema_contracts;
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

class TestFirebaseFunctions extends Fake implements FirebaseFunctions {
  final callables = <String, TestHttpsCallable>{};
  final responseData = <String, Object?>{};

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    return callables.putIfAbsent(
      name,
      () => TestHttpsCallable(name, () => responseData[name]),
    );
  }
}

class TestHttpsCallable extends Fake implements HttpsCallable {
  TestHttpsCallable(this.name, this.responseData);

  final String name;
  final Object? Function() responseData;
  final calls = <Object?>[];

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    calls.add(parameters);
    return TestHttpsCallableResult<T>(responseData() as T);
  }
}

class TestHttpsCallableResult<T> extends Fake
    implements HttpsCallableResult<T> {
  TestHttpsCallableResult(this.dataValue);

  final T dataValue;

  @override
  T get data => dataValue;
}

void main() {
  group('SuvbotRepository', () {
    test('delegates action requests to the Suvbot callable', () async {
      final functions = TestFirebaseFunctions();
      final repository = SuvbotRepository(functions);

      await repository.requestAction(actionId: 'checkDemoState');

      final payload =
          functions.callables['requestSuvbotDemoOperation']?.calls.single;
      expect(payload, {'action': 'checkDemoState'});
      _expectValid('RequestSuvbotDemoOperationCallablePayload', payload);
    });

    test('sends typed message text for Suvbot free text', () async {
      final functions = TestFirebaseFunctions();
      final repository = SuvbotRepository(functions);

      await repository.requestAction(
        actionId: 'message',
        text: 'Can you reset me?',
      );

      final payload =
          functions.callables['requestSuvbotDemoOperation']?.calls.single;
      expect(payload, {'action': 'message', 'text': 'Can you reset me?'});
      _expectValid('RequestSuvbotDemoOperationCallablePayload', payload);
    });

    test('loads backend-provided action descriptors', () async {
      final functions = TestFirebaseFunctions();
      final response = {
        'actions': [
          {
            'id': 'refreshDemoState',
            'label': 'Refresh demo state',
            'description': 'Clear demo state and warm it again.',
            'icon': 'refresh',
            'destructive': true,
          },
          {
            'id': 'matchTesterByPhone',
            'label': 'Match tester',
            'description': 'Create a tester match.',
            'icon': 'personAdd',
            'requiresText': true,
          },
        ],
      };
      _expectValid('ListSuvbotDemoActionsCallableResponse', response);
      functions.responseData['listSuvbotDemoActions'] = response;
      final repository = SuvbotRepository(functions);

      final actions = await repository.fetchActions();

      expect(functions.callables['listSuvbotDemoActions']?.calls, [null]);
      expect(actions, hasLength(2));
      expect(actions.first.id, 'refreshDemoState');
      expect(actions.first.destructive, isTrue);
      expect(actions.last.requiresText, isTrue);
    });

    test('detects deterministic Suvbot conversations', () {
      expect(isSuvbotConversation(matchId: 'suvbot_runner-1'), isTrue);
      expect(
        isSuvbotConversation(matchId: 'match-1', otherUid: suvbotUid),
        isTrue,
      );
      expect(isSuvbotConversation(matchId: 'match-1'), isFalse);
    });
  });
}

void _expectValid(String schemaName, Object? payload) {
  final schema = schema_contracts.schemaContractsByName[schemaName];
  expect(schema, isNotNull, reason: 'Missing generated schema $schemaName');
  final result = JsonSchema.create(schema!).validate(payload);
  expect(
    result.isValid,
    isTrue,
    reason: '$schemaName rejected $payload: ${result.errors}',
  );
}
