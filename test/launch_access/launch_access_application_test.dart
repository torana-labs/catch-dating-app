import 'package:catch_dating_app/contexts/account/domain/launch_access_application.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('LaunchAccessApplicationDraft', () {
    test('requires city, event type, availability, and intent answer', () {
      expect(const LaunchAccessApplicationDraft().canSubmit, isFalse);

      final draft = const LaunchAccessApplicationDraft().copyWith(
        city: 'in-mh-mumbai',
        eventTypes: {LaunchAccessEventType.runClub},
        availabilityWindows: {LaunchAccessAvailabilityWindow.saturdayMornings},
        whyCatch: 'I want to meet people through hosted events.',
      );

      expect(draft.canSubmit, isTrue);
    });

    test('normalizes optional text and converts empty fields to null', () {
      final application = const LaunchAccessApplicationDraft(
        city: ' mumbai ',
        inviteCode: ' FOUNDING-1 ',
        instagramHandle: ' suv ',
        referralSource: ' ',
        whyCatch: ' I want better hosted events. ',
        eventTypes: {LaunchAccessEventType.coffee},
        availabilityWindows: {LaunchAccessAvailabilityWindow.sundayEvenings},
      ).toApplication(uid: 'runner-1');

      expect(application.uid, 'runner-1');
      expect(application.city, 'mumbai');
      expect(application.inviteCode, 'FOUNDING-1');
      expect(application.instagramHandle, 'suv');
      expect(application.referralSource, isNull);
      expect(application.whyCatch, 'I want better hosted events.');
    });
  });

  group('LaunchAccessApplicationStatus', () {
    test(
      'keeps editable statuses separate from profile-unlocking statuses',
      () {
        expect(
          LaunchAccessApplicationStatus.pending.canEditApplication,
          isTrue,
        );
        expect(
          LaunchAccessApplicationStatus.waitlisted.canEditApplication,
          isTrue,
        );
        expect(
          LaunchAccessApplicationStatus.approvedForProfile.canEditApplication,
          isFalse,
        );

        expect(
          LaunchAccessApplicationStatus
              .approvedForProfile
              .unlocksProfileCreation,
          isTrue,
        );
        expect(
          LaunchAccessApplicationStatus.activeMember.unlocksProfileCreation,
          isTrue,
        );
        expect(
          LaunchAccessApplicationStatus.pending.unlocksProfileCreation,
          isFalse,
        );
      },
    );
  });
}
