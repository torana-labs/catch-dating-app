import 'package:catch_dating_app/contexts/account/data/launch_access_repository.dart';
import 'package:catch_dating_app/contexts/account/domain/launch_access_application.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('LaunchAccessRepository', () {
    late FakeFirebaseFirestore firestore;
    late LaunchAccessRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      repository = LaunchAccessRepository(firestore);
    });

    test('fetchApplication returns null before submission', () async {
      expect(await repository.fetchApplication(uid: 'runner-1'), isNull);
    });

    test('submitApplication creates a pending access application', () async {
      await repository.submitApplication(
        uid: 'runner-1',
        draft: buildLaunchAccessDraft(),
      );

      final application = await repository.fetchApplication(uid: 'runner-1');

      expect(application, isNotNull);
      expect(application!.uid, 'runner-1');
      expect(application.status, LaunchAccessApplicationStatus.pending);
      expect(application.city, 'mumbai');
      expect(application.role, LaunchAccessRole.member);
      expect(application.eventTypes, [LaunchAccessEventType.runClub]);
      expect(application.availabilityWindows, [
        LaunchAccessAvailabilityWindow.saturdayMornings,
      ]);
      expect(application.submissionCount, 1);
      expect(application.createdAt, isNotNull);
      expect(application.submittedAt, isNotNull);
    });

    test('submitApplication updates editable applications', () async {
      await repository.submitApplication(
        uid: 'runner-1',
        draft: buildLaunchAccessDraft(),
      );
      await firestore
          .collection(LaunchAccessRepository.collectionPath)
          .doc('runner-1')
          .update({'status': LaunchAccessApplicationStatus.waitlisted.name});

      await repository.submitApplication(
        uid: 'runner-1',
        draft: buildLaunchAccessDraft(
          city: 'pune',
          role: LaunchAccessRole.both,
        ),
      );

      final application = await repository.fetchApplication(uid: 'runner-1');

      expect(application!.status, LaunchAccessApplicationStatus.waitlisted);
      expect(application.city, 'pune');
      expect(application.role, LaunchAccessRole.both);
      expect(application.submissionCount, 2);
    });

    test(
      'submitApplication does not overwrite approved applications',
      () async {
        await repository.submitApplication(
          uid: 'runner-1',
          draft: buildLaunchAccessDraft(),
        );
        await firestore
            .collection(LaunchAccessRepository.collectionPath)
            .doc('runner-1')
            .update({
              'status': LaunchAccessApplicationStatus.approvedForProfile.name,
            });

        await expectLater(
          repository.submitApplication(
            uid: 'runner-1',
            draft: buildLaunchAccessDraft(city: 'pune'),
          ),
          throwsA(isA<ValidationException>()),
        );

        final application = await repository.fetchApplication(uid: 'runner-1');
        expect(
          application!.status,
          LaunchAccessApplicationStatus.approvedForProfile,
        );
        expect(application.city, 'mumbai');
      },
    );

    test('provider builds from firebaseFirestoreProvider', () async {
      final container = ProviderContainer(
        overrides: [firebaseFirestoreProvider.overrideWithValue(firestore)],
      );
      addTearDown(container.dispose);

      final providerRepository = container.read(launchAccessRepositoryProvider);
      await providerRepository.submitApplication(
        uid: 'runner-1',
        draft: buildLaunchAccessDraft(city: 'in-dl-delhi-ncr'),
      );

      final application = await providerRepository.fetchApplication(
        uid: 'runner-1',
      );
      expect(application!.city, 'in-dl-delhi-ncr');
    });
  });
}

LaunchAccessApplicationDraft buildLaunchAccessDraft({
  String city = 'mumbai',
  LaunchAccessRole role = LaunchAccessRole.member,
}) {
  return LaunchAccessApplicationDraft(
    city: city,
    role: role,
    eventTypes: const {LaunchAccessEventType.runClub},
    availabilityWindows: const {
      LaunchAccessAvailabilityWindow.saturdayMornings,
    },
    whyCatch: 'I want to meet people through better hosted events.',
  );
}
