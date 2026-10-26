import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_card_content.dart';
import 'package:catch_dating_app/user_profile/domain/profile_prompts.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

final _l10n = AppLocalizationsEn();

ActivityPreferences runningPrefs({
  List<PreferredDistance> preferredDistances = const [],
  List<RunReason> runningReasons = const [],
}) => ActivityPreferences(
  running: RunningPreferences(
    preferredDistances: preferredDistances,
    runningReasons: runningReasons,
    version: currentRunPreferencesVersion,
  ),
);

void main() {
  group('ProfileCardContent', () {
    test('does not expose exact distance on public swipe cards', () {
      final profile = buildPublicProfile();

      final content = ProfileCardContent.fromProfile(profile, l10n: _l10n);

      final hasDistance = content.attributes.any(
        (a) => a.icon == CatchIcons.nearMe,
      );
      expect(hasDistance, isFalse);
    });

    test('derives trimmed card sections from the public profile', () {
      final base = buildPublicProfile(
        uid: 'runner-2',
        photoUrls: const [
          'https://img.example/1.jpg',
          'https://img.example/2.jpg',
          'https://img.example/3.jpg',
        ],
      );
      final profile = base.copyWith(
        profilePrompts: normalizeProfilePromptAnswers(
          const [],
          legacyBio: '  Long events and filter coffee.  ',
        ),
        profilePhotos: [
          base.profilePhotos[0],
          base.profilePhotos[1].copyWith(
            prompt: const PhotoPromptAnswer(
              photoIndex: 1,
              promptId: 'finishLine',
              prompt: 'After the finish line',
              caption: '  Filter coffee stop.  ',
            ),
          ),
          base.profilePhotos[2],
        ],
        height: 170,
        occupation: '  Designer  ',
        company: '  Catch  ',
        education: EducationLevel.masters,
        religion: Religion.hindu,
        languages: const [Language.english, Language.hindi],
        drinking: DrinkingHabit.socially,
        smoking: SmokingHabit.never,
        workout: WorkoutFrequency.often,
        diet: DietaryPreference.vegetarian,
        children: ChildrenStatus.wantSomeday,
      );

      final content = ProfileCardContent.fromProfile(profile, l10n: _l10n);

      expect(content.primaryPhotoUrl, 'https://img.example/1.jpg');
      expect(content.additionalPhotos.map((photo) => photo.url), [
        'https://img.example/2.jpg',
        'https://img.example/3.jpg',
      ]);
      expect(
        content.additionalPhotos.first.prompt?.caption,
        'Filter coffee stop.',
      );
      expect(
        content.profilePrompts.single.answer,
        'Long events and filter coffee.',
      );
      expect(content.hasProfilePrompts, isTrue);
      expect(content.attributes.map((fact) => fact.text), [
        '170 cm',
        'Designer at Catch',
        "Master's",
        'Hindu',
        'English, Hindi',
      ]);
      expect(content.relationshipGoal, isNull);
      expect(content.lifestyle.map((fact) => fact.text), [
        'Socially',
        'Never',
        'Often',
        'Vegetarian',
        'Want someday',
      ]);
      expect(content.insights.quality.score, greaterThan(0));
    });

    test('derives compatibility insights when viewer context is available', () {
      final viewer = buildUser().copyWith(
        relationshipGoal: RelationshipGoal.friendship,
        activityPreferences: runningPrefs(
          preferredDistances: const [PreferredDistance.fiveK],
          runningReasons: const [RunReason.social],
        ),
      );
      final profile = buildPublicProfile().copyWith(
        relationshipGoal: RelationshipGoal.friendship,
        activityPreferences: runningPrefs(
          preferredDistances: const [PreferredDistance.fiveK],
          runningReasons: const [RunReason.social],
        ),
      );

      final content = ProfileCardContent.fromProfile(
        profile,
        l10n: _l10n,
        viewerProfile: viewer,
        sharedRunTitle: 'Friday Evening Event',
      );

      expect(
        content.insights.confidenceSignals.first.label,
        contains('Met at'),
      );
      expect(content.insights.emotionalRunTags.map((tag) => tag.label), [
        'Social miles',
        '5K regular',
      ]);
      expect(
        content.insights.compatibilityReasons.map((reason) => reason.label),
        [
          'You met at Friday Evening Event',
          'You both want new friends',
          'You both run to make friends',
        ],
      );
    });

    test('keeps city and relationship goal out of detail chips', () {
      final profile = buildPublicProfile().copyWith(
        city: 'in-mp-indore',
        relationshipGoal: RelationshipGoal.casual,
      );

      final content = ProfileCardContent.fromProfile(profile, l10n: _l10n);

      expect(content.relationshipGoal, RelationshipGoal.casual);
      expect(
        content.attributes.any((fact) => fact.text == 'Something casual'),
        isFalse,
      );
      expect(
        content.attributes.any((fact) => fact.text == cityLabel('indore')),
        isFalse,
      );
    });

    test('drops blank optional text values', () {
      final profile = buildPublicProfile().copyWith(
        profilePrompts: const [],
        occupation: '   ',
        company: '   ',
      );

      final content = ProfileCardContent.fromProfile(profile, l10n: _l10n);

      expect(content.hasProfilePrompts, isFalse);
      expect(content.attributes, isEmpty);
    });
  });
}
