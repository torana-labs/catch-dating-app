import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

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

void main() {
  group('UserProfileRepository', () {
    late FakeFirebaseFirestore firestore;
    late TestFirebaseFunctions functions;
    late UserProfileRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      functions = TestFirebaseFunctions();
      repository = UserProfileRepository(firestore, functions);
    });

    test('setUserProfile writes the user document', () async {
      final user =
          buildUser(
            uid: 'runner-42',
            name: 'Asha',
            photoUrls: const ['https://img.example/1.jpg'],
            profilePrompts: normalizeProfilePromptAnswers(
              const [],
              legacyBio: 'Long events, coffee, and easy Sunday plans.',
            ),
          ).copyWith(
            occupation: 'Product Designer',
            company: 'Catch',
            relationshipGoal: RelationshipGoal.relationship,
            drinking: DrinkingHabit.socially,
          );

      await repository.setUserProfile(userProfile: user);

      final stored = await repository.fetchUserProfile(uid: 'runner-42');
      expect(stored, user);
    });

    test(
      'updateProfilePhotos delegates to the profile update callable',
      () async {
        final createdAt = DateTime.utc(2026);
        final photos = [
          ProfilePhoto.uploaded(
            position: 0,
            url: 'https://img.example/2.jpg',
            storagePath: 'users/runner-42/photos/0.jpg',
            now: createdAt,
          ),
        ];

        await repository.updateProfilePhotos(
          uid: 'runner-42',
          profilePhotos: photos,
        );

        final callable =
            functions.httpsCallable('updateUserProfile') as TestHttpsCallable;
        final call = callable.calls.single! as Map;
        final fields = call['fields'] as Map;
        final profilePhotos = fields['profilePhotos'] as List;
        expect(profilePhotos, hasLength(1));
        expect(
          (profilePhotos.single as Map)['url'],
          'https://img.example/2.jpg',
        );
      },
    );

    test('updateUserProfile normalizes date values for the callable', () async {
      final date = DateTime.utc(1998);

      await repository.updateUserProfile(
        uid: 'runner-42',
        patch: UpdateUserProfilePatch(name: 'Asha', dateOfBirth: date),
      );

      final callable =
          functions.httpsCallable('updateUserProfile') as TestHttpsCallable;
      expect(callable.calls, [
        {
          'fields': {
            'name': 'Asha',
            'dateOfBirth': date.millisecondsSinceEpoch,
          },
        },
      ]);
    });

    test('updateUserProfile skips empty patches', () async {
      await repository.updateUserProfile(
        uid: 'runner-42',
        patch: UpdateUserProfilePatch.raw(const {}),
      );

      final callable =
          functions.httpsCallable('updateUserProfile') as TestHttpsCallable;
      expect(callable.calls, isEmpty);
    });
  });
}
