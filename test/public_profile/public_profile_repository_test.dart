import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('PublicProfileRepository', () {
    late FakeFirebaseFirestore firestore;
    late PublicProfileRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      repository = PublicProfileRepository(firestore);
    });

    test(
      'fetchPublicProfiles reads documents by uid in requested order',
      () async {
        await _seedProfile(firestore, uid: 'runner-1', name: 'Runner One');
        await _seedProfile(firestore, uid: 'runner-2', name: 'Runner Two');

        final profiles = await repository.fetchPublicProfiles([
          'runner-2',
          'missing-runner',
          'runner-1',
          'runner-2',
        ]);

        expect(profiles.map((profile) => profile.uid), [
          'runner-2',
          'runner-1',
        ]);
        expect(profiles.map((profile) => profile.name), [
          'Runner Two',
          'Runner One',
        ]);
      },
    );
  });
}

Future<void> _seedProfile(
  FakeFirebaseFirestore firestore, {
  required String uid,
  required String name,
}) async {
  final profile = PublicProfile(
    uid: uid,
    name: name,
    age: 30,
    gender: Gender.man,
  );

  await firestore.collection('publicProfiles').doc(uid).set(profile.toJson());
}
