import 'package:catch_dating_app/contexts/profiles/domain/photo_upload_state.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_inline_editors.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_tab_body.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'ProfileTab reveals completed prompts plus exactly the next slot',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 2200);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      for (
        var completedCount = 0;
        completedCount <= maxProfilePromptAnswers;
        completedCount++
      ) {
        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              theme: AppTheme.light,
              home: Scaffold(
                body: ProfileTabBody(
                  user: _profileWithCompletedPrompts(completedCount),
                  uploadState: const PhotoUploadState(),
                  builder: (context, children) => ListView(
                    key: const ValueKey('profile-tab-scroll-view'),
                    padding: CatchInsets.pageBody.copyWith(left: 0, right: 0),
                    children: children,
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.pump();

        final visibleCount = completedCount < maxProfilePromptAnswers
            ? completedCount + 1
            : maxProfilePromptAnswers;
        expect(
          find.byType(ProfileInlinePromptEntryEditor),
          findsNWidgets(visibleCount),
          reason:
              '$completedCount completed prompts should reveal $visibleCount',
        );
        for (var index = 0; index < completedCount; index++) {
          expect(
            find.byKey(ValueKey('profile-prompt-card-$index')),
            findsOneWidget,
          );
        }
        if (completedCount < maxProfilePromptAnswers) {
          expect(
            find.byKey(ValueKey('profile-prompt-add-$completedCount')),
            findsOneWidget,
          );
          expect(
            find.byKey(ValueKey('profile-prompt-add-$visibleCount')),
            findsNothing,
          );
        }
      }
    },
  );
}

UserProfile _profileWithCompletedPrompts(int completedCount) {
  return UserProfile(
    uid: 'profile-prompt-disclosure-user',
    name: 'Profile Tester',
    firstName: 'Profile',
    lastName: 'Tester',
    dateOfBirth: DateTime(1995, 6, 15),
    gender: Gender.man,
    phoneNumber: '+910000000000',
    profileComplete: true,
    interestedInGenders: const [Gender.woman],
    profilePrompts: [
      for (final promptId in defaultProfilePromptIds.take(completedCount))
        profilePromptAnswerFor(
          definition: profilePromptDefinition(promptId),
          answer: 'Answer for $promptId',
        ),
    ],
  );
}
