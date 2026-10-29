import 'package:catch_dating_app/contexts/profiles/domain/profile_insights.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

ActivityPreferences runningPrefs({
  int paceMinSecsPerKm = defaultPaceMinSecsPerKm,
  int paceMaxSecsPerKm = defaultPaceMaxSecsPerKm,
  List<PreferredDistance> preferredDistances = const [],
  List<RunReason> runningReasons = const [],
  List<PreferredRunTime> preferredRunTimes = const [],
}) {
  return ActivityPreferences(
    running: RunningPreferences(
      paceMinSecsPerKm: paceMinSecsPerKm,
      paceMaxSecsPerKm: paceMaxSecsPerKm,
      preferredDistances: preferredDistances,
      runningReasons: runningReasons,
      preferredRunTimes: preferredRunTimes,
      version: currentRunPreferencesVersion,
    ),
  );
}

void main() {
  group('profileQualitySummary', () {
    test('scores strong public profiles and omits suggestions', () {
      final base = buildPublicProfile(
        photoUrls: const ['1.jpg', '2.jpg', '3.jpg'],
        profilePrompts: [
          for (final promptId in defaultProfilePromptIds)
            profilePromptAnswerFor(
              definition: profilePromptDefinition(promptId),
              answer: 'A specific answer for $promptId.',
            ),
        ],
      );
      final profile = base.copyWith(
        profilePhotos: [
          base.profilePhotos[0].copyWith(
            prompt: const PhotoPromptAnswer(
              photoIndex: 0,
              promptId: 'proofIRun',
              prompt: 'Proof I actually event',
              caption: 'Morning miles.',
            ),
          ),
          base.profilePhotos[1].copyWith(
            prompt: const PhotoPromptAnswer(
              photoIndex: 1,
              promptId: 'finishLine',
              prompt: 'After the finish line',
              caption: 'Coffee stop.',
            ),
          ),
          base.profilePhotos[2],
        ],
        relationshipGoal: RelationshipGoal.relationship,
        activityPreferences: runningPrefs(
          preferredDistances: const [PreferredDistance.fiveK],
          runningReasons: const [RunReason.community],
          preferredRunTimes: const [PreferredRunTime.morning],
        ),
        occupation: 'Designer',
        workout: WorkoutFrequency.often,
      );

      final summary = profileQualitySummary(profile);

      expect(summary.score, 100);
      expect(summary.isStrong, isTrue);
      expect(summary.suggestions, isEmpty);
    });

    test('returns the highest impact missing suggestions first', () {
      final summary = profileQualitySummary(buildPublicProfile());

      expect(summary.score, lessThan(85));
      expect(summary.suggestions.map((suggestion) => suggestion.kind), [
        ProfileQualitySuggestionKind.photos,
        ProfileQualitySuggestionKind.profilePrompts,
        ProfileQualitySuggestionKind.photoPrompts,
      ]);
    });
  });

  group('emotionalRunTagsForProfile', () {
    test('turns running preferences into emotional tags', () {
      final profile = buildPublicProfile().copyWith(
        activityPreferences: runningPrefs(
          preferredDistances: const [PreferredDistance.halfMarathon],
          runningReasons: const [RunReason.mindfulness, RunReason.social],
          paceMinSecsPerKm: 390,
          paceMaxSecsPerKm: 480,
        ),
      );

      final tags = emotionalRunTagsForProfile(profile);

      expect(tags.map((tag) => tag.label), [
        'Runs for headspace',
        'Social miles',
        'Long-run person',
        'Easy miles',
      ]);
      expect(tags.first.source, EmotionalRunTagSource.selected);
    });

    test('turns preferred event times into emotional tags', () {
      final profile = buildPublicProfile().copyWith(
        activityPreferences: runningPrefs(
          preferredRunTimes: const [
            PreferredRunTime.earlyMorning,
            PreferredRunTime.evening,
          ],
        ),
      );

      final tags = emotionalRunTagsForProfile(profile);

      expect(tags.map((tag) => tag.label), [
        'Morning regular',
        'Evening runner',
      ]);
    });
  });

  group('compatibilityReasonsForProfile', () {
    test('ranks shared event and concrete overlaps', () {
      final viewer = buildUser().copyWith(
        relationshipGoal: RelationshipGoal.relationship,
        activityPreferences: runningPrefs(
          preferredDistances: const [PreferredDistance.fiveK],
          runningReasons: const [RunReason.community],
          preferredRunTimes: const [PreferredRunTime.morning],
        ),
        languages: const [Language.english, Language.hindi],
      );
      final target = buildPublicProfile().copyWith(
        relationshipGoal: RelationshipGoal.relationship,
        activityPreferences: runningPrefs(
          preferredDistances: const [PreferredDistance.fiveK],
          runningReasons: const [RunReason.community],
          preferredRunTimes: const [PreferredRunTime.earlyMorning],
        ),
        languages: const [Language.english],
      );

      final reasons = compatibilityReasonsForProfile(
        targetProfile: target,
        viewerProfile: viewer,
        sharedRunTitle: 'Thursday Morning Event',
      );

      expect(reasons.map((reason) => reason.label), [
        'You met at Thursday Morning Event',
        'You are both looking for long-term relationship',
        'You both run for community',
      ]);
    });

    test(
      'uses shared time-of-day preferences when higher signals are absent',
      () {
        final viewer = buildUser().copyWith(
          activityPreferences: runningPrefs(
            preferredRunTimes: const [
              PreferredRunTime.morning,
              PreferredRunTime.evening,
            ],
          ),
        );
        final target = buildPublicProfile().copyWith(
          activityPreferences: runningPrefs(
            preferredRunTimes: const [
              PreferredRunTime.earlyMorning,
              PreferredRunTime.night,
            ],
          ),
        );

        final reasons = compatibilityReasonsForProfile(
          targetProfile: target,
          viewerProfile: viewer,
        );

        expect(reasons.first.label, 'You both like morning and evening events');
        expect(reasons.first.kind, CompatibilityReasonKind.runTime);
      },
    );
  });
}
