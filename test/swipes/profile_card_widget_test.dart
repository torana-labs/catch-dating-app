import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:catch_dating_app/contexts/events/parts/event_backdrop_image.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_body.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_surface.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';

Widget _profileCardHarness({required ThemeData theme}) {
  final profile = buildPublicProfile(
    name: 'Manan',
    age: 26,
  ).copyWith(city: 'in-mp-indore', relationshipGoal: RelationshipGoal.casual);

  return ProviderScope(
    child: MaterialApp(
      theme: theme,
      home: Scaffold(
        body: Center(
          child: SizedBox(
            width: 340,
            height: 820,
            child: ProfileSurface(profile: profile),
          ),
        ),
      ),
    ),
  );
}

Future<void> _scrollToProfileSection(WidgetTester tester, String title) async {
  // Profile sections are lazy; content assertions must not depend on cache extent.
  await tester.scrollUntilVisible(
    find.text(title),
    300,
    scrollable: find
        .descendant(
          of: find.byKey(ProfileBody.scrollViewKey),
          matching: find.byType(Scrollable),
        )
        .first,
  );
  await tester.pump();
}

void main() {
  testWidgets(
    'ProfileSurface renders polished missing-photo state in light mode',
    (tester) async {
      final semantics = tester.ensureSemantics();

      await tester.pumpWidget(_profileCardHarness(theme: AppTheme.light));
      await tester.pump();

      expect(find.byType(EventBackdropImage), findsOneWidget);
      expect(
        find.text('A PERFECT EVENT WITH ME LOOKS LIKE...'),
        findsOneWidget,
      );
      await _scrollToProfileSection(tester, 'RUNNING RHYTHM');
      expect(find.text('5:00-7:00/km'), findsWidgets);
      expect(find.text('RUNNING RHYTHM'), findsOneWidget);
      await _scrollToProfileSection(tester, 'DETAILS');
      expect(find.text('DETAILS'), findsOneWidget);
      expect(find.text('LOOKING FOR'), findsNothing);
      expect(find.text('Something casual'), findsOneWidget);
      expect(
        tester.getSemantics(find.byType(ProfileSurface)).hint,
        'Preview how your profile appears to other runners. Scroll to read the full profile.',
      );
      semantics.dispose();
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('ProfileSurface renders the same content in dark mode', (
    tester,
  ) async {
    await tester.pumpWidget(_profileCardHarness(theme: AppTheme.dark));
    await tester.pump();

    expect(find.byType(EventBackdropImage), findsOneWidget);
    expect(find.text('Manan, 26'), findsOneWidget);
    await _scrollToProfileSection(tester, 'RUNNING RHYTHM');
    expect(find.text('RUNNING RHYTHM'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'ProfileSurface resolves canonical city ids in every profile mode',
    (tester) async {
      final profile = buildPublicProfile(
        name: 'Suvrat',
        age: 26,
      ).copyWith(city: 'in-dl-delhi-ncr', occupation: 'Product designer');

      for (final mode in ProfileSurfaceMode.values) {
        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              theme: AppTheme.light,
              home: Scaffold(
                body: SizedBox(
                  width: 390,
                  height: 844,
                  child: ProfileSurface(profile: profile, mode: mode),
                ),
              ),
            ),
          ),
        );
        await tester.pump();

        expect(
          find.text('PRODUCT DESIGNER · DELHI NCR'),
          findsOneWidget,
          reason: mode.name,
        );
        expect(find.text('IN-DL-DELHI-NCR'), findsNothing, reason: mode.name);
        expect(tester.takeException(), isNull, reason: mode.name);
      }
    },
  );

  testWidgets('ProfileSurface tolerates text scale 1.5 in light and dark', (
    tester,
  ) async {
    final profile = buildPublicProfile(name: 'Manan', age: 26).copyWith(
      city: 'in-mp-indore',
      relationshipGoal: RelationshipGoal.relationship,
      height: 178,
      occupation: 'Product designer',
      company: 'Catch',
      education: EducationLevel.masters,
      drinking: DrinkingHabit.socially,
      workout: WorkoutFrequency.often,
    );

    for (final theme in [AppTheme.light, AppTheme.dark]) {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: theme,
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: const TextScaler.linear(1.5)),
              child: child!,
            ),
            home: Scaffold(
              body: SizedBox(
                width: 390,
                height: 844,
                child: ProfileSurface(profile: profile),
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Manan, 26'), findsOneWidget);
      expect(find.byType(EventBackdropImage), findsOneWidget);
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets('ProfileSurface omits prompt cards when prompts are blank', (
    tester,
  ) async {
    final profile = buildPublicProfile(name: 'Manan', age: 26).copyWith(
      profilePrompts: const [],
      city: 'in-mp-indore',
      relationshipGoal: RelationshipGoal.casual,
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SizedBox(
              width: 340,
              height: 620,
              child: ProfileSurface(profile: profile),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('A PERFECT EVENT WITH ME LOOKS LIKE...'), findsNothing);
    expect(find.text('RUNNING RHYTHM'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ProfileSurface hides reaction controls outside Catches', (
    tester,
  ) async {
    final profile = buildPublicProfile(name: 'Manan', age: 26);

    for (final mode in [
      ProfileSurfaceMode.preview,
      ProfileSurfaceMode.publicProfile,
    ]) {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: SizedBox(
                width: 340,
                height: 620,
                child: ProfileSurface(
                  profile: profile,
                  mode: mode,
                  onReact: (_, _) {},
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(
        find.byTooltip('Like A perfect event with me looks like...'),
        findsNothing,
      );
      expect(
        find.byTooltip('Comment on A perfect event with me looks like...'),
        findsNothing,
      );
    }
  });

  testWidgets(
    'ProfileSurface handles long public profile text without overflow',
    (tester) async {
      final profile =
          buildPublicProfile(
            name: 'A very long display name that should not break the hero',
            age: 26,
            profilePrompts: normalizeProfilePromptAnswers(
              const [],
              legacyBio:
                  'Long easy events, coffee after the finish, and a playlist that keeps the whole group moving without making the card feel cramped.',
            ),
          ).copyWith(
            city: 'in-mp-indore',
            height: 180,
            occupation: 'Senior product designer with an unusually long title',
            company: 'A company with an unusually long name',
          );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: SizedBox(
                width: 340,
                height: 620,
                child: ProfileSurface(profile: profile),
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(
        find.text('A PERFECT EVENT WITH ME LOOKS LIKE...'),
        findsOneWidget,
      );
      await tester.scrollUntilVisible(
        find.text('DETAILS'),
        300,
        scrollable: find
            .descendant(
              of: find.byKey(ProfileBody.scrollViewKey),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tester.pump();
      expect(find.text('DETAILS'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'ProfileSurface renders compatibility reasons and event identity tags',
    (tester) async {
      final viewer = buildUser().copyWith(
        relationshipGoal: RelationshipGoal.relationship,
        activityPreferences: const ActivityPreferences(
          running: RunningPreferences(
            preferredDistances: [PreferredDistance.fiveK],
            runningReasons: [RunReason.community],
            version: currentRunPreferencesVersion,
          ),
        ),
      );
      final profile = buildPublicProfile(name: 'Manan', age: 26).copyWith(
        relationshipGoal: RelationshipGoal.relationship,
        activityPreferences: const ActivityPreferences(
          running: RunningPreferences(
            preferredDistances: [PreferredDistance.fiveK],
            runningReasons: [RunReason.community],
            version: currentRunPreferencesVersion,
          ),
        ),
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: SizedBox(
                width: 340,
                height: 740,
                child: ProfileSurface(
                  profile: profile,
                  viewerProfile: viewer,
                  sharedRunTitle: 'Thursday Morning Event',
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('WHY YOU MIGHT CLICK'), findsOneWidget);
      expect(find.text('You met at Thursday Morning Event'), findsOneWidget);
      await _scrollToProfileSection(tester, 'RUNNING RHYTHM');
      expect(find.text('Social miles'), findsOneWidget);
      expect(find.text('5K regular'), findsOneWidget);
      expect(_chip('Social miles'), findsOneWidget);
      expect(_chip('5K regular'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('ProfileSurface surfaces section reaction controls in Catches', (
    tester,
  ) async {
    ProfileReactionTarget? reactedTarget;
    String? reactedComment;
    final profile = buildPublicProfile(
      name: 'Manan',
      age: 26,
    ).copyWith(city: 'in-mp-indore');

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SizedBox(
              width: 340,
              height: 620,
              child: ProfileSurface(
                profile: profile,
                mode: ProfileSurfaceMode.catches,
                onReact: (target, comment) {
                  reactedTarget = target;
                  reactedComment = comment;
                },
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    await tester.ensureVisible(
      find.byTooltip('Like A perfect event with me looks like...'),
    );
    await tester.tap(
      find.byTooltip('Like A perfect event with me looks like...'),
    );
    await tester.pump();

    expect(reactedTarget?.id, 'profile-prompt-perfectRun');
    expect(reactedTarget?.type, SwipeReactionTargetType.profilePrompt);
    expect(reactedComment, isNull);
  });

  testWidgets('ProfileSurface lets users react to compatibility signals', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(800, 900);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    ProfileReactionTarget? reactedTarget;
    final viewer = buildUser().copyWith(
      activityPreferences: const ActivityPreferences(
        running: RunningPreferences(
          preferredDistances: [PreferredDistance.fiveK],
          runningReasons: [RunReason.community],
          version: currentRunPreferencesVersion,
        ),
      ),
    );
    final profile = buildPublicProfile(name: 'Manan', age: 26).copyWith(
      activityPreferences: const ActivityPreferences(
        running: RunningPreferences(
          preferredDistances: [PreferredDistance.fiveK],
          runningReasons: [RunReason.community],
          version: currentRunPreferencesVersion,
        ),
      ),
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SizedBox(
              width: 340,
              height: 740,
              child: ProfileSurface(
                profile: profile,
                mode: ProfileSurfaceMode.catches,
                viewerProfile: viewer,
                onReact: (target, _) {
                  reactedTarget = target;
                },
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    await tester.ensureVisible(find.byTooltip('Like Why you might click'));
    await tester.tap(find.byTooltip('Like Why you might click'));
    await tester.pump();

    expect(reactedTarget?.id, 'compatibility');
    expect(reactedTarget?.type, SwipeReactionTargetType.compatibility);
  });

  testWidgets('ProfileSurface comment sheet sends a block-specific comment', (
    tester,
  ) async {
    ProfileReactionTarget? reactedTarget;
    String? reactedComment;
    final profile = buildPublicProfile(name: 'Manan', age: 26);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SizedBox(
              width: 340,
              height: 620,
              child: ProfileSurface(
                profile: profile,
                mode: ProfileSurfaceMode.catches,
                onReact: (target, comment) {
                  reactedTarget = target;
                  reactedComment = comment;
                },
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    await tester.ensureVisible(
      find.byTooltip('Comment on A perfect event with me looks like...'),
    );
    await tester.tap(
      find.byTooltip('Comment on A perfect event with me looks like...'),
    );
    await pumpFeatureUi(tester);

    await tester.enterText(find.byType(TextField), 'This is a great hook.');
    await tester.pump();
    await tester.tap(find.text('Send like'));
    await pumpFeatureUi(tester);

    expect(reactedTarget?.id, 'profile-prompt-perfectRun');
    expect(reactedComment, 'This is a great hook.');
  });
}

Finder _chip(String label) {
  return find.widgetWithText(CatchChip, label);
}
