import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/design_fixtures/profile_surface_fixtures.dart';
import 'package:catch_dating_app/image_uploads/shared/profile_photo_editor_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  testWidgets(
    'uses compact canonical chrome and the shared staged prompt selector',
    (tester) async {
      final profile = ProfileSurfaceFixtures.viewer;
      final photos = profile.effectiveProfilePhotos;
      final currentPrompt = photos.first.prompt!;
      final usedPrompt = photos[1].prompt!;
      final repository = _PhotoEditorProfileRepository(profile);

      await _pumpEditor(
        tester,
        repository: repository,
        profile: profile,
        photo: photos.first,
      );

      expect(find.byType(CatchTopBar), findsOneWidget);
      expect(find.text(currentPrompt.displayPrompt), findsOneWidget);

      const fieldKey = ValueKey('profile-photo-prompt-field');
      await tester.ensureVisible(find.byKey(fieldKey));
      await tester.tap(find.byKey(fieldKey));
      await _pumpFieldMotion(tester);

      expect(
        find.byKey(
          ValueKey('catch-field-choice-${currentPrompt.displayPrompt}'),
        ),
        findsOneWidget,
      );
      expect(
        find.byKey(ValueKey('catch-field-choice-${usedPrompt.displayPrompt}')),
        findsNothing,
      );

      const noPromptKey = ValueKey('catch-field-choice-No prompt');
      await tester.ensureVisible(find.byKey(noPromptKey));
      await tester.tap(find.byKey(noPromptKey));
      await tester.pump();

      expect(
        tester
            .widget<CatchButton>(
              find.widgetWithText(CatchButton, 'Save changes'),
            )
            .onPressed,
        isNull,
      );
      await tester.ensureVisible(
        find.byKey(const ValueKey('catch-field-cancel')),
      );
      await tester.tap(find.byKey(const ValueKey('catch-field-cancel')));
      await _pumpFieldMotion(tester);

      expect(
        find.descendant(
          of: find.byKey(fieldKey),
          matching: find.text(currentPrompt.displayPrompt),
        ),
        findsOneWidget,
      );

      await tester.tap(find.byKey(fieldKey));
      await _pumpFieldMotion(tester);
      await tester.ensureVisible(find.byKey(noPromptKey));
      await tester.tap(find.byKey(noPromptKey));
      await tester.pump();
      await tester.ensureVisible(
        find.byKey(const ValueKey('catch-field-done')),
      );
      await tester.tap(find.byKey(const ValueKey('catch-field-done')));
      await _pumpFieldMotion(tester);

      expect(
        tester
            .widget<CatchButton>(
              find.widgetWithText(CatchButton, 'Save changes'),
            )
            .onPressed,
        isNotNull,
      );

      expect(
        find.descendant(
          of: find.byKey(fieldKey),
          matching: find.text('No prompt'),
        ),
        findsOneWidget,
      );
      expect(repository.updatedProfilePhotos, isEmpty);
    },
  );

  testWidgets('preserves an unchanged unknown prompt and its caption on save', (
    tester,
  ) async {
    final original = ProfileSurfaceFixtures.viewer;
    final photos = original.effectiveProfilePhotos;
    const legacyPrompt = PhotoPromptAnswer(
      photoIndex: 0,
      promptId: 'legacy-photo-prompt',
      prompt: 'A legacy photo prompt',
      caption: 'Keep this existing caption.',
    );
    final legacyPhoto = photos.first.copyWith(prompt: legacyPrompt);
    final profile = original.copyWith(
      profilePhotos: [legacyPhoto, ...photos.skip(1)],
    );
    final repository = _PhotoEditorProfileRepository(profile);

    await _pumpEditor(
      tester,
      repository: repository,
      profile: profile,
      photo: legacyPhoto,
    );

    expect(find.text('A legacy photo prompt'), findsOneWidget);
    await tester.ensureVisible(find.text('Save changes'));
    await tester.tap(find.text('Save changes'));
    await tester.pump();
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 100));

    final savedPrompt = repository.updatedProfilePhotos.single.first.prompt;
    expect(savedPrompt?.promptId, 'legacy-photo-prompt');
    expect(savedPrompt?.prompt, 'A legacy photo prompt');
    expect(savedPrompt?.caption, 'Keep this existing caption.');
  });
}

Future<void> _pumpEditor(
  WidgetTester tester, {
  required _PhotoEditorProfileRepository repository,
  required UserProfile profile,
  required ProfilePhoto photo,
}) async {
  tester.view.physicalSize = const Size(393, 852);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final container = ProviderContainer(
    overrides: [
      uidProvider.overrideWith((ref) => Stream.value(profile.uid)),
      watchUserProfileProvider.overrideWith((ref) => Stream.value(profile)),
      userProfileRepositoryProvider.overrideWith((ref) => repository),
    ],
  );
  addTearDown(container.dispose);
  final uidSubscription = container.listen(
    uidProvider,
    (_, _) {},
    fireImmediately: true,
  );
  addTearDown(uidSubscription.close);
  await container.pump();

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: AppTheme.light,
        home: ProfilePhotoEditorScreen(
          index: photo.position,
          photo: photo,
          canDelete: true,
        ),
      ),
    ),
  );
  await tester.pump();
}

Future<void> _pumpFieldMotion(WidgetTester tester) async {
  await tester.pump();
  await pumpFeatureUiFor(tester, const Duration(milliseconds: 500));
}

class _PhotoEditorProfileRepository extends Fake
    implements UserProfileRepository {
  _PhotoEditorProfileRepository(this.currentProfile);

  UserProfile currentProfile;
  final updatedProfilePhotos = <List<ProfilePhoto>>[];

  @override
  Future<UserProfile?> fetchUserProfile({required String? uid}) async =>
      currentProfile;

  @override
  Future<void> updateProfilePhotos({
    required String uid,
    required List<ProfilePhoto> profilePhotos,
  }) async {
    final copied = normalizeProfilePhotos(profilePhotos);
    updatedProfilePhotos.add(copied);
    currentProfile = currentProfile.copyWith(profilePhotos: copied);
  }
}
