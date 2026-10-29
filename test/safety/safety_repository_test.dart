import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';

class TestFirebaseFunctions extends Fake implements FirebaseFunctions {
  final callables = <String, TestHttpsCallable>{};

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    return callables.putIfAbsent(name, () => TestHttpsCallable(name));
  }
}

class TestHttpsCallable extends Fake implements HttpsCallable {
  TestHttpsCallable(this.name);

  final String name;
  final calls = <Object?>[];

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    calls.add(parameters);
    return TestHttpsCallableResult<T>(null as T);
  }
}

class TestHttpsCallableResult<T> extends Fake
    implements HttpsCallableResult<T> {
  TestHttpsCallableResult(this.dataValue);

  final T dataValue;

  @override
  T get data => dataValue;
}

class TestFirebaseAuth extends Fake implements FirebaseAuth {
  var signOutCallCount = 0;

  @override
  Future<void> signOut() async {
    signOutCallCount += 1;
  }
}

void main() {
  group('SafetyRepository', () {
    late FakeFirebaseFirestore firestore;
    late TestFirebaseFunctions functions;
    late TestFirebaseAuth auth;
    late SafetyRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      functions = TestFirebaseFunctions();
      auth = TestFirebaseAuth();
      repository = SafetyRepository(firestore, functions, auth);
    });

    test('blockUser delegates to the callable with typed payload', () async {
      await repository.blockUser(targetUserId: 'blocked-1', source: 'chat');

      expect(functions.callables['blockUser']?.calls, [
        {'targetUserId': 'blocked-1', 'source': 'chat'},
      ]);
    });

    test('unblockUser delegates to the callable with typed payload', () async {
      await repository.unblockUser(targetUserId: 'blocked-1');

      expect(functions.callables['unblockUser']?.calls, [
        {'targetUserId': 'blocked-1'},
      ]);
    });

    test('reportUser omits null optional payload fields', () async {
      await repository.reportUser(
        targetUserId: 'reported-1',
        reasonCode: 'harassment',
      );

      expect(functions.callables['reportUser']?.calls, [
        {
          'targetUserId': 'reported-1',
          'source': 'profile',
          'reasonCode': 'harassment',
        },
      ]);
    });

    test('requestAccountDeletion calls backend and signs out', () async {
      await repository.requestAccountDeletion();

      expect(functions.callables['requestAccountDeletion']?.calls, [null]);
      expect(auth.signOutCallCount, 1);
    });
  });
}
