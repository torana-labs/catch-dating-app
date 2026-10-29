import 'package:catch_dating_app/contexts/profiles/domain/photo_upload_state.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo_policy.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_edit_tab_state.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_photo_intent_factory.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

const PhotoUploadState _idleUploadState = PhotoUploadState();
final _today = DateTime(2026, 6, 24);
final _l10n = AppLocalizationsEn();

void main() {
  test('SelfProfileEditTabState maps photo grid delete and loading state', () {
    final user = buildUser(
      photoUrls: List.generate(
        minimumProfilePhotoCount + 1,
        (index) => 'https://example.com/photo_$index.jpg',
      ),
    );

    final state = SelfProfileEditTabState.fromProfile(
      l10n: _l10n,
      user: user,
      today: _today,
      uploadState: PhotoUploadState.fromLegacy(loadingIndices: {2}),
    );

    expect(
      state.photoGrid.profilePhotos,
      hasLength(minimumProfilePhotoCount + 1),
    );
    expect(state.photoGrid.loadingIndices, {2});
    expect(state.photoGrid.canDeletePhotos, isTrue);
  });

  test('SelfProfileEditTabState disables delete at minimum photo count', () {
    final user = buildUser(
      photoUrls: List.generate(
        minimumProfilePhotoCount,
        (index) => 'https://example.com/photo_$index.jpg',
      ),
    );

    final state = SelfProfileEditTabState.fromProfile(
      l10n: _l10n,
      user: user,
      today: _today,
      uploadState: _idleUploadState,
    );

    expect(state.photoGrid.canDeletePhotos, isFalse);
  });

  test('SelfProfileEditTabState derives prompt slots and available ids', () {
    final usedPrompt = profilePromptDefinition('afterEvent');
    final user = buildUser(
      profilePrompts: [
        profilePromptAnswerFor(
          definition: profilePromptDefinition(profilePromptPerfectEventId),
          answer: 'Here for the event.',
        ),
        profilePromptAnswerFor(
          definition: usedPrompt,
          answer: 'Post-run coffee.',
        ),
      ],
    );

    final state = SelfProfileEditTabState.fromProfile(
      l10n: _l10n,
      user: user,
      today: _today,
      uploadState: _idleUploadState,
    );

    expect(state.completedPromptCount, 2);
    expect(state.promptSlots, hasLength(maxProfilePromptAnswers));
    expect(state.promptSlots[0].currentPromptId, profilePromptPerfectEventId);
    expect(state.promptSlots[0].isAddAffordance, isFalse);
    expect(state.promptSlots[1].currentPromptId, usedPrompt.id);
    expect(state.promptSlots[1].isAddAffordance, isFalse);
    expect(state.promptSlots[2].currentPromptId, isNull);
    expect(
      state.promptSlots[2].availablePromptIds,
      isNot(contains(profilePromptPerfectEventId)),
    );
    expect(
      state.promptSlots[2].availablePromptIds,
      isNot(contains(usedPrompt.id)),
    );
  });

  test(
    'SelfProfileEditTabState derives basics and profile section row descriptors',
    () {
      final user =
          buildUser(
            name: 'Suvrat Garg',
            displayName: 'S.',
            phoneNumber: '+919876543210',
          ).copyWith(
            height: 178,
            instagramHandle: 'suvrat_events',
            occupation: 'Engineer',
            company: 'Catch',
          );

      final state = SelfProfileEditTabState.fromProfile(
        l10n: _l10n,
        user: user,
        today: _today,
        uploadState: _idleUploadState,
      );

      expect(state.basicRows.map((row) => row.label), [
        'Display name',
        'Date of birth',
        'Gender',
        'Phone',
        'Email',
        'Instagram',
        'Height',
      ]);
      expect(state.aboutRows.map((row) => row.label), [
        'City',
        'Job title',
        'Company',
        'Education',
        'Religion',
        'Languages',
        'Looking for',
      ]);
      expect(state.runningRows.map((row) => row.label), [
        'Pace range',
        'Distances',
        'Motivation',
        'Run times',
      ]);
      expect(state.lifestyleRows.map((row) => row.label), [
        'Drinking',
        'Smoking',
        'Workout',
        'Diet',
        'Children',
      ]);

      final displayName = state.basicRows.first as CatchFormTextRow;
      expect(displayName.fieldName, 'displayName');
      expect(displayName.currentValue, 'S.');
      expect(displayName.currentFieldValue, 'S.');

      final phone =
          state.basicRows.singleWhere((row) => row.id == 'phoneNumber')
              as CatchFormReadRow;
      expect(phone.body, '+919876543210');

      final instagram =
          state.basicRows.singleWhere((row) => row.id == 'instagramHandle')
              as CatchFormTextRow;
      expect(instagram.currentValue, 'suvrat_events');
      expect(instagram.currentFieldValue, 'suvrat_events');
      expect(instagram.leadingUnit, isNull);
      final handle = 'a' * 30;
      var draft = TextEditingValue(text: '@$handle');
      for (final formatter in instagram.effectiveInputFormatters!) {
        draft = formatter.formatEditUpdate(TextEditingValue.empty, draft);
      }
      expect(draft.text, handle);
      expect(instagram.validate(instagram.normalizeInput!(draft.text)), isNull);
      expect(instagram.toFieldValue!(''), isNull);

      final height =
          state.basicRows.singleWhere((row) => row.id == 'height')
              as CatchFormCustomRow;
      expect(height.accordionKey, 'height');

      final education =
          state.aboutRows.singleWhere((row) => row.id == 'education')
              as CatchFormSingleChoiceRow;
      expect(education.allowEmptySelection, isTrue);
      expect(education.showOptionalLabel, isTrue);

      final religion =
          state.aboutRows.singleWhere((row) => row.id == 'religion')
              as CatchFormSingleChoiceRow;
      expect(religion.allowEmptySelection, isTrue);
      expect(religion.showOptionalLabel, isTrue);

      final languages =
          state.aboutRows.singleWhere((row) => row.id == 'languages')
              as CatchFormMultiChoiceRow;
      expect(languages.allowEmptySelection, isTrue);
      expect(languages.showOptionalLabel, isTrue);

      for (final id in ['city', 'relationshipGoal']) {
        final row =
            state.aboutRows.singleWhere((row) => row.id == id)
                as CatchFormSingleChoiceRow;
        expect(row.allowEmptySelection, isTrue);
        expect(row.showOptionalLabel, isTrue);
      }

      final paceRange =
          state.runningRows.first as SelfProfileRangeFieldRowDescriptor;
      expect(paceRange.id, 'pace-range');
      expect(paceRange.currentMin, user.paceMinSecsPerKm);
      expect(paceRange.currentMax, user.paceMaxSecsPerKm);

      expect(
        state.aboutSectionRows.map((row) => row.label).take(3),
        orderedEquals(['Display name', 'Date of birth', 'Gender']),
      );
    },
  );

  test(
    'SelfProfilePhotoIntentFactory resolves editor and mutation intents',
    () {
      const controller = SelfProfilePhotoIntentFactory();
      final state = SelfProfileEditTabState.fromProfile(
        l10n: _l10n,
        user: buildUser(
          photoUrls: [
            'https://example.com/photo_0.jpg',
            'https://example.com/photo_1.jpg',
            'https://example.com/photo_2.jpg',
          ],
        ),
        today: _today,
        uploadState: _idleUploadState,
      );

      final existingPhoto = controller.editorRequest(
        state: state.photoGrid,
        index: 1,
      );
      final emptySlot = controller.editorRequest(
        state: state.photoGrid,
        index: 5,
      );
      final delete = controller.deleteIntent(2);
      final reorder = controller.reorderIntent(fromIndex: 2, toIndex: 0);

      expect(existingPhoto.index, 1);
      expect(existingPhoto.photo?.url, 'https://example.com/photo_1.jpg');
      expect(existingPhoto.canDelete, isTrue);
      expect(emptySlot.index, 5);
      expect(emptySlot.photo, isNull);
      expect(emptySlot.canDelete, isTrue);
      expect(delete.index, 2);
      expect(reorder.fromIndex, 2);
      expect(reorder.toIndex, 0);
    },
  );
}
