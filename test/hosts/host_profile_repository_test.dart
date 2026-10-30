import 'package:catch_dating_app/contexts/organizers/data/host_profile_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('HostProfileRepository', () {
    test('decodes Firestore document data into a domain HostProfile', () async {
      final firestore = FakeFirebaseFirestore();
      final createdAt = DateTime.utc(2026, 7, 2, 12);
      final updatedAt = DateTime.utc(2026, 7, 2, 13);
      await firestore
          .collection(HostProfileRepository.collectionPath)
          .doc('host-1')
          .set({
            'displayName': ' Mira Shah ',
            'avatarUrl': 'https://example.test/mira.jpg',
            'roleTitle': 'Lead host',
            'bio': 'Runs intimate events.',
            'status': 'pending',
            'verified': true,
            'linkedClubIds': ['club-1', '', 'club-2'],
            'createdAt': Timestamp.fromDate(createdAt),
            'updatedAt': Timestamp.fromDate(updatedAt),
          });

      final repository = HostProfileRepository(firestore);
      final profile = await repository.watchHostProfile('host-1').first;

      expect(profile, isNotNull);
      expect(profile!.uid, 'host-1');
      expect(profile.displayName, 'Mira Shah');
      expect(profile.avatarUrl, 'https://example.test/mira.jpg');
      expect(profile.roleTitle, 'Lead host');
      expect(profile.bio, 'Runs intimate events.');
      expect(profile.status, HostProfileStatus.pending);
      expect(profile.verified, isTrue);
      expect(profile.linkedOrganizerIds, ['club-1', 'club-2']);
      expect(profile.createdAt?.toUtc(), createdAt);
      expect(profile.updatedAt?.toUtc(), updatedAt);
    });
  });
}
