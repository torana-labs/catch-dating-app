import 'dart:async';

import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_controller.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_screen.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_surface.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';

void main() {
  testWidgets('PublicProfileScreen renders profile skeleton while loading', (
    tester,
  ) async {
    final controller = StreamController<PublicProfile?>();
    addTearDown(controller.close);

    await _pumpPublicProfile(tester, targetStream: controller.stream);
    await tester.pump();

    expect(find.byType(CatchRouteScaffold), findsOneWidget);
    expect(find.byType(ProfileSurfaceSkeleton), findsOneWidget);
    expect(find.byType(CatchLoadingIndicator), findsNothing);
  });

  testWidgets(
    'PublicProfileScreen keeps initial profile visible while stream loads',
    (tester) async {
      final controller = StreamController<PublicProfile?>();
      final profile = buildPublicProfile(name: 'Riya');
      addTearDown(controller.close);

      await _pumpPublicProfile(
        tester,
        targetStream: controller.stream,
        initialProfile: profile,
      );
      await tester.pump();

      expect(find.byType(PublicProfileBody), findsOneWidget);
      expect(find.byType(ProfileSurfaceSkeleton), findsNothing);
      expect(find.text('Riya'), findsWidgets);
    },
  );

  testWidgets(
    'PublicProfileScreen shows branded empty state when unavailable',
    (tester) async {
      await _pumpPublicProfile(
        tester,
        targetStream: Stream<PublicProfile?>.value(null),
      );
      await pumpFeatureUi(tester);

      expect(find.byType(CatchEmptyState), findsOneWidget);
      expect(find.text('Profile unavailable'), findsOneWidget);
      expect(
        find.text('This profile is no longer available on Catch.'),
        findsOneWidget,
      );
    },
  );

  testWidgets('PublicProfileScreen shows branded error state on load failure', (
    tester,
  ) async {
    await _pumpPublicProfile(
      tester,
      targetStream: Stream<PublicProfile?>.error(
        StateError('profile stream failed'),
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.bySubtype<CatchErrorState>(), findsOneWidget);
    expect(find.text('Profile unavailable'), findsOneWidget);
    expect(find.text('Reload profile'), findsOneWidget);
  });

  testWidgets('PublicProfileScreen report sheet uses shared action rows', (
    tester,
  ) async {
    final profile = buildPublicProfile(name: 'Riya');
    await _pumpPublicProfile(
      tester,
      targetStream: Stream<PublicProfile?>.value(profile),
    );
    await pumpFeatureUi(tester);

    await tester.tap(find.byIcon(CatchIcons.more));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Report'));
    await pumpFeatureUi(tester);

    expect(find.text('Report Riya'), findsOneWidget);
    expect(find.byType(CatchField), findsNWidgets(4));
    expect(find.text('Harassment or abuse'), findsOneWidget);
  });

  testWidgets(
    'PublicProfileScreen reports the selected reason with success feedback',
    (tester) async {
      final safetyRepository = _FakePublicProfileSafetyRepository();
      final profile = buildPublicProfile(name: 'Riya');
      await _pumpPublicProfile(
        tester,
        targetStream: Stream<PublicProfile?>.value(profile),
        safetyRepository: safetyRepository,
      );
      await pumpFeatureUi(tester);

      await tester.tap(find.byIcon(CatchIcons.more));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Report'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Fake or misleading profile'));
      await pumpFeatureUi(tester);

      expect(safetyRepository.reportCalls, [
        (targetUserId: 'runner-1', reasonCode: 'fake_or_misleading_profile'),
      ]);
      expect(find.text('Report submitted.'), findsOneWidget);
    },
  );

  testWidgets('PublicProfileScreen surfaces report mutation failures', (
    tester,
  ) async {
    final safetyRepository = _FakePublicProfileSafetyRepository(
      failReports: true,
    );
    final profile = buildPublicProfile(name: 'Riya');
    await _pumpPublicProfile(
      tester,
      targetStream: Stream<PublicProfile?>.value(profile),
      safetyRepository: safetyRepository,
    );
    await pumpFeatureUi(tester);

    await tester.tap(find.byIcon(CatchIcons.more));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Report'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Fake or misleading profile'));
    await pumpFeatureUi(tester);

    expect(safetyRepository.reportCalls, [
      (targetUserId: 'runner-1', reasonCode: 'fake_or_misleading_profile'),
    ]);
    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
    expect(find.text('Report submitted.'), findsNothing);
  });

  testWidgets(
    'PublicProfileScreen surfaces block mutation failures after confirmation',
    (tester) async {
      final safetyRepository = _FakePublicProfileSafetyRepository(
        failBlocks: true,
      );
      final profile = buildPublicProfile(name: 'Riya');
      await _pumpPublicProfile(
        tester,
        targetStream: Stream<PublicProfile?>.value(profile),
        safetyRepository: safetyRepository,
      );
      await pumpFeatureUi(tester);

      await tester.tap(find.byIcon(CatchIcons.more));
      await pumpFeatureUi(tester);
      await tester.tap(
        find.ancestor(of: find.text('Block'), matching: find.byType(InkWell)),
      );
      await pumpFeatureUi(tester);
      await tester.tap(find.widgetWithText(CatchButton, 'Block'));
      await pumpFeatureUi(tester);

      expect(safetyRepository.blockCalls, ['runner-1']);
      expect(
        find.text('Something went wrong. Please try again.'),
        findsOneWidget,
      );
      expect(find.text('Riya has been blocked.'), findsNothing);
    },
  );

  testWidgets(
    'PublicProfileScreen blocks users with success feedback and route pop',
    (tester) async {
      final safetyRepository = _FakePublicProfileSafetyRepository();
      final profile = buildPublicProfile(name: 'Riya');
      await _pumpPublicProfile(
        tester,
        targetStream: Stream<PublicProfile?>.value(profile),
        safetyRepository: safetyRepository,
        includePreviousRoute: true,
      );
      await pumpFeatureUi(tester);

      await tester.tap(find.byIcon(CatchIcons.more));
      await pumpFeatureUi(tester);
      await tester.tap(
        find.ancestor(of: find.text('Block'), matching: find.byType(InkWell)),
      );
      await pumpFeatureUi(tester);
      await tester.tap(find.widgetWithText(CatchButton, 'Block'));
      await pumpFeatureUi(tester);

      expect(safetyRepository.blockCalls, ['runner-1']);
      expect(find.text('Riya has been blocked.'), findsOneWidget);
      expect(find.text('Previous route'), findsOneWidget);
    },
  );
}

Future<void> _pumpPublicProfile(
  WidgetTester tester, {
  required Stream<PublicProfile?> targetStream,
  PublicProfile? initialProfile,
  SafetyRepository? safetyRepository,
  bool includePreviousRoute = false,
}) async {
  final viewer = buildUser(uid: 'viewer-1', name: 'Viewer');
  final container = ProviderContainer(
    overrides: [
      watchUserProfileProvider.overrideWith((ref) => Stream.value(viewer)),
      watchPublicProfileProvider(
        'runner-1',
      ).overrideWith((ref) => targetStream),
      safetyRepositoryProvider.overrideWithValue(
        safetyRepository ?? _FakePublicProfileSafetyRepository(),
      ),
    ],
  );
  PublicProfileController.blockUserMutation.reset(container);
  PublicProfileController.reportUserMutation.reset(container);
  addTearDown(container.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: AppTheme.light,
        builder: catchNoticeOverlayBuilder,
        home: includePreviousRoute
            ? null
            : PublicProfileScreen(
                uid: 'runner-1',
                initialProfile: initialProfile,
              ),
        initialRoute: includePreviousRoute ? '/profile' : null,
        routes: includePreviousRoute
            ? {
                '/': (_) =>
                    const Scaffold(body: Center(child: Text('Previous route'))),
                '/profile': (_) => PublicProfileScreen(
                  uid: 'runner-1',
                  initialProfile: initialProfile,
                ),
              }
            : const <String, WidgetBuilder>{},
      ),
    ),
  );
}

class _FakePublicProfileSafetyRepository extends Fake
    implements SafetyRepository {
  _FakePublicProfileSafetyRepository({
    this.failBlocks = false,
    this.failReports = false,
  });

  final bool failBlocks;
  final bool failReports;
  final reportCalls = <({String targetUserId, String? reasonCode})>[];
  final blockCalls = <String>[];

  @override
  Future<void> reportUser({
    required String targetUserId,
    String source = 'profile',
    String? reasonCode,
    String? contextId,
    String? notes,
  }) async {
    reportCalls.add((targetUserId: targetUserId, reasonCode: reasonCode));
    if (failReports) {
      throw StateError('report failed');
    }
  }

  @override
  Future<void> blockUser({
    required String targetUserId,
    String source = 'profile',
  }) async {
    blockCalls.add(targetUserId);
    if (failBlocks) {
      throw StateError('block failed');
    }
  }
}
