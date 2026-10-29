import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_auth_mocks/firebase_auth_mocks.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'auth_test_helpers.dart';

void main() {
  group('AuthRepository', () {
    test('currentUser exposes the FirebaseAuth current user', () {
      final user = MockUser(uid: 'user-1', phoneNumber: '+919999999999');
      final auth = RecordingMockFirebaseAuth(signedIn: true, mockUser: user);
      addTearDown(auth.dispose);

      final repository = AuthRepository(auth);

      expect(repository.currentUser, same(user));
    });

    test('verifyPhoneNumber forwards callbacks to FirebaseAuth', () async {
      final auth = RecordingMockFirebaseAuth();
      addTearDown(auth.dispose);
      final repository = AuthRepository(auth);

      var sentVerificationId = '';
      int? sentResendToken;

      await repository.verifyPhoneNumber(
        phoneNumber: '+919999999999',
        codeSent: (verificationId, resendToken) {
          sentVerificationId = verificationId;
          sentResendToken = resendToken;
        },
        verificationFailed: (_) {},
        verificationCompleted: (_) {},
      );

      expect(auth.verifiedPhoneNumber, '+919999999999');
      expect(sentVerificationId, 'verification-id');
      expect(sentResendToken, 0);
    });

    test(
      'signInWithOtp creates a phone credential and signs in with it',
      () async {
        final auth = RecordingMockFirebaseAuth(
          mockUser: MockUser(uid: 'user-1'),
        );
        addTearDown(auth.dispose);
        final repository = AuthRepository(auth);

        await repository.signInWithOtp(
          verificationId: 'verification-id',
          smsCode: '123456',
        );

        expect(auth.signedInCredential, isA<PhoneAuthCredential>());
        expect(repository.currentUser?.uid, 'user-1');
      },
    );

    test('signInWithCredential delegates to FirebaseAuth', () async {
      final auth = RecordingMockFirebaseAuth(mockUser: MockUser(uid: 'user-1'));
      addTearDown(auth.dispose);
      final repository = AuthRepository(auth);
      final credential = PhoneAuthProvider.credential(
        verificationId: 'verification-id',
        smsCode: '123456',
      );

      await repository.signInWithCredential(credential);

      expect(auth.signedInCredential, same(credential));
      expect(repository.currentUser?.uid, 'user-1');
    });

    test('signOut delegates to FirebaseAuth', () async {
      final auth = RecordingMockFirebaseAuth(
        signedIn: true,
        mockUser: MockUser(uid: 'user-1'),
      );
      addTearDown(auth.dispose);
      final repository = AuthRepository(auth);

      await repository.signOut();

      expect(auth.signOutCallCount, 1);
      expect(repository.currentUser, isNull);
    });
  });

  group('auth providers', () {
    test('authRepositoryProvider uses firebaseAuthProvider', () {
      final auth = RecordingMockFirebaseAuth(
        signedIn: true,
        mockUser: MockUser(uid: 'user-1'),
      );
      final container = createAuthTestContainer(
        overrides: [firebaseAuthProvider.overrideWithValue(auth)],
      );
      addTearDown(auth.dispose);
      addTearDown(container.dispose);

      final repository = container.read(authRepositoryProvider);

      expect(repository.currentUser?.uid, 'user-1');
    });

    test('authStateChangesProvider forwards Firebase auth changes', () async {
      final auth = RecordingMockFirebaseAuth();
      final container = createAuthTestContainer(
        overrides: [firebaseAuthProvider.overrideWithValue(auth)],
      );
      addTearDown(auth.dispose);
      addTearDown(container.dispose);

      final events = <String?>[];
      final subscription = container.listen<AsyncValue<User?>>(
        authStateChangesProvider,
        (_, next) => events.add(next.asData?.value?.uid),
        fireImmediately: true,
      );
      addTearDown(subscription.close);

      auth.mockUser = MockUser(uid: 'user-42');
      await auth.signInWithCredential(
        PhoneAuthProvider.credential(
          verificationId: 'verification-id',
          smsCode: '123456',
        ),
      );
      await flushTestEventQueue();

      expect(events, contains('user-42'));
    });

    test('uidProvider maps users into uid values', () async {
      final auth = RecordingMockFirebaseAuth();
      final container = createAuthTestContainer(
        overrides: [firebaseAuthProvider.overrideWithValue(auth)],
      );
      addTearDown(auth.dispose);
      addTearDown(container.dispose);

      final values = <String?>[];
      final subscription = container.listen<AsyncValue<String?>>(
        uidProvider,
        (_, next) => values.add(next.asData?.value),
        fireImmediately: true,
      );
      addTearDown(subscription.close);

      auth.mockUser = MockUser(uid: 'user-7');
      await auth.signInWithCredential(
        PhoneAuthProvider.credential(
          verificationId: 'verification-id',
          smsCode: '123456',
        ),
      );
      await flushTestEventQueue();
      await auth.signOut();
      await flushTestEventQueue();

      expect(values, containsAllInOrder(['user-7', null]));
    });
  });
}
