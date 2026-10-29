import 'package:catch_dating_app/contexts/profiles/domain/profile_insights.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_card_content.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_view.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_view_mapper.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter_test/flutter_test.dart';

final _l10n = AppLocalizationsEn();

void main() {
  group('profileViewFromCardContent', () {
    test('maps public profile content into the handoff body sequence', () {
      final content = ProfileCardContent(
        primaryPhoto: (
          url: 'https://img.example/main.jpg',
          prompt: const PhotoPromptAnswer(
            photoIndex: 0,
            promptId: 'startLine',
            prompt: 'At the start line',
          ),
        ),
        additionalPhotos: const [
          (
            url: 'https://img.example/two.jpg',
            prompt: PhotoPromptAnswer(
              photoIndex: 1,
              promptId: 'finishLine',
              prompt: 'After the finish line',
            ),
          ),
          (
            url: 'https://img.example/three.jpg',
            prompt: PhotoPromptAnswer(
              photoIndex: 2,
              promptId: 'coffee',
              prompt: 'Post-run table',
            ),
          ),
        ],
        attributes: [
          (icon: CatchIcons.work, text: 'Designer at Catch'),
          (icon: CatchIcons.measure, text: '170 cm'),
        ],
        lifestyle: [(icon: CatchIcons.sustainability, text: 'Vegetarian')],
        relationshipGoal: RelationshipGoal.casual,
        profilePrompts: const [
          ProfilePromptAnswer(
            promptId: 'perfectRun',
            prompt: 'A perfect event with me looks like...',
            answer: 'A relaxed 5K and coffee after.',
          ),
        ],
        insights: const ProfileCardInsights(
          quality: ProfileQualitySummary(
            score: 100,
            completedItems: 1,
            totalItems: 1,
            suggestions: [],
          ),
          confidenceSignals: [
            ProfileConfidenceSignal(
              kind: ProfileConfidenceSignalKind.completeProfile,
              label: 'Verified photos',
            ),
          ],
          emotionalRunTags: [
            EmotionalRunTag(
              kind: EmotionalRunTagKind.socialMiles,
              label: 'Social miles',
              source: EmotionalRunTagSource.selected,
            ),
          ],
          compatibilityReasons: [
            CompatibilityReason(
              kind: CompatibilityReasonKind.sharedRun,
              label: 'You met at Thursday 5K',
            ),
          ],
        ),
      );

      final view = profileViewFromCardContent(
        content,
        l10n: _l10n,
        name: 'Maya',
        age: 29,
        running: const RunningPreferences(
          preferredDistances: [PreferredDistance.fiveK],
          runningReasons: [RunReason.social],
          preferredRunTimes: [PreferredRunTime.morning],
          version: currentRunPreferencesVersion,
        ),
      );

      expect(view.heroReaction?.label, 'Main photo');
      expect(view.sections[0], isA<ProfileCompatibilitySectionData>());
      expect(view.sections[1], isA<ProfilePromptSectionData>());
      expect(view.sections[2], isA<ProfileRunningSectionData>());
      expect(view.sections[3], isA<ProfilePhotoSectionData>());
      expect(view.sections[4], isA<ProfilePhotoSectionData>());
      expect(view.sections[5], isA<ProfileFactsSectionData>());
      expect(view.sections[6], isA<ProfileFactsSectionData>());

      final details = view.sections[5] as ProfileFactsSectionData;
      expect(details.title, 'Details');
      expect(details.reaction?.preview, contains('Something casual'));
      expect(details.facts.map((fact) => fact.text), [
        'Something casual',
        'Designer at Catch',
        '170 cm',
      ]);

      final lifestyle = view.sections[6] as ProfileFactsSectionData;
      expect(lifestyle.title, 'Lifestyle');
      expect(lifestyle.facts.single.text, 'Vegetarian');
    });
  });
}
