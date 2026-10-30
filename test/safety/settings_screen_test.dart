import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/force_update_provider.dart';
import 'package:catch_dating_app/contexts/payments/data/host_membership_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profiles_lookup.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/analytics/host_analytics_choice.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/safety/presentation/settings_controller.dart';
import 'package:catch_dating_app/safety/presentation/settings_keys.dart';
import 'package:catch_dating_app/safety/presentation/settings_screen.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart';

import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';

void main() {
  testWidgets('Host analytics requires a choice and can be withdrawn', (
    tester,
  ) async {
    String? stored;
    final analytics = AppAnalytics(
      reporter: const NoOpAnalyticsReporter(),
      shouldCollect: false,
      hostRole: true,
      hostChoiceStore: HostAnalyticsChoiceStore(
        read: () async => stored,
        write: (value) async {
          stored = value;
          return true;
        },
      ),
    );
    await analytics.initialize();
    final container = _settingsContainer(
      user: buildUser(),
      blockedUsers: const [],
      analytics: analytics,
    );
    addTearDown(container.dispose);
    await _pumpSettings(tester, container);
    final row = find.byKey(const ValueKey('host-analytics-privacy'));
    if (!AppConfig.appRole.isHost) {
      expect(row, findsNothing);
      expect(stored, isNull);
      return;
    }
    await tester.scrollUntilVisible(row, 300);
    await tester.tap(row);
    await pumpFeatureUi(tester);
    expect(stored, isNull);
    expect(
      find.textContaining('Names, contact details, guest data'),
      findsOneWidget,
    );
    await tester.tap(find.text('Allow analytics'));
    await pumpFeatureUi(tester);
    expect(analytics.hostAnalyticsChoiceGranted, isTrue);
    expect(find.text('Allowed on this device'), findsOneWidget);
    await tester.tap(row);
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Keep analytics off'));
    await pumpFeatureUi(tester);
    expect(analytics.hostAnalyticsChoiceGranted, isFalse);
    expect(stored, contains('"analytics":false'));
  });

  for (final entry in <String, Stream<UserProfile?>>{
    'missing': Stream.value(null),
    'loading': const Stream.empty(),
    'error': Stream.error(StateError('unavailable')),
  }.entries) {
    testWidgets(
      'profile-unavailable settings keep account actions without preference writes ${entry.key}',
      (tester) async {
        final container = _settingsContainer(
          user: buildUser(),
          profileStream: entry.value,
          blockedUsers: const [],
        );
        addTearDown(container.dispose);
        await _pumpSettings(tester, container);
        expect(
          tester
              .widget<CatchField>(find.byKey(SettingsKeys.weeklyDigestSwitch))
              .onToggle,
          isNull,
        );
        expect(
          tester
              .widget<CatchField>(find.byKey(SettingsKeys.showOnMapSwitch))
              .onToggle,
          isNull,
        );
        expect(
          tester.widget<CatchField>(find.byKey(SettingsKeys.signOutRow)).onTap,
          isNotNull,
        );
        expect(
          tester
              .widget<CatchField>(find.byKey(SettingsKeys.deleteAccountRow))
              .onTap,
          isNotNull,
        );
      },
    );
  }

  testWidgets('renders profile-backed settings and empty blocked state', (
    tester,
  ) async {
    final container = _settingsContainer(
      user: buildUser(phoneNumber: '+919876543210'),
      blockedUsers: const [],
    );
    addTearDown(container.dispose);

    await _pumpSettings(tester, container);

    expect(find.text('+91 9876543210'), findsOneWidget);
    expect(find.text('No blocked accounts'), findsOneWidget);
    expect(find.byKey(SettingsKeys.showOnMapSwitch), findsOneWidget);
    expect(find.byKey(SettingsKeys.weeklyDigestSwitch), findsOneWidget);
    expect(find.byKey(SettingsKeys.showInCrossPathsSwitch), findsOneWidget);
    expect(find.text('Edit profile'), findsNothing);
    expect(find.text('Privacy policy'), findsNothing);
    expect(find.text('Terms'), findsNothing);
    expect(find.text('1.0.1'), findsOneWidget);
    expect(find.text('Catch 1.0.1 · made in Bombay'), findsOneWidget);
    expect(_topBarMaterial(tester).color, CatchTokens.editorialLight.bg);
  });

  testWidgets(
    'shows the private Cross Paths toggle as a shipped privacy control',
    (tester) async {
      final userRepository = _FakeSettingsUserProfileRepository();
      final container = _settingsContainer(
        user: buildUser().copyWith(prefsShowInCrossPaths: false),
        blockedUsers: const [],
        userRepository: userRepository,
      );
      addTearDown(container.dispose);

      await _pumpSettings(tester, container);
      await tester.scrollUntilVisible(
        find.byKey(SettingsKeys.showInCrossPathsSwitch),
        300,
      );
      await tester.tap(find.byKey(SettingsKeys.showInCrossPathsSwitch));
      await pumpFeatureUi(tester);

      expect(userRepository.updatedFields, {'prefsShowInCrossPaths': true});
    },
  );

  testWidgets('settings rows align to the section text lane', (tester) async {
    final container = _settingsContainer(
      user: buildUser(phoneNumber: '+919876543210'),
      blockedUsers: const [],
    );
    addTearDown(container.dispose);

    await _pumpSettings(tester, container);

    final sectionLeft = tester.getTopLeft(find.text('ACCOUNT')).dx;
    final rowTextLeft = tester.getTopLeft(find.text('Phone number')).dx;

    expect(
      rowTextLeft - sectionLeft,
      moreOrLessEquals(CatchFieldRow.textLaneInset, epsilon: 0.5),
    );
  });

  testWidgets('renders profile provider loading state without blank rows', (
    tester,
  ) async {
    final container = _settingsContainer(
      user: buildUser(),
      profileStream: const Stream.empty(),
      blockedUsers: const [],
    );
    addTearDown(container.dispose);

    await _pumpSettings(tester, container);

    expect(find.text('Loading'), findsNWidgets(2));
    expect(find.text('No blocked accounts'), findsOneWidget);
  });

  testWidgets('renders blocked accounts row skeleton while loading', (
    tester,
  ) async {
    final container = _settingsContainer(
      user: buildUser(),
      blockedUsers: const [],
      blockedUsersStream: const Stream.empty(),
    );
    addTearDown(container.dispose);

    await _pumpSettings(tester, container);

    expect(find.byType(CatchSkeleton), findsWidgets);
    expect(find.text('No blocked accounts'), findsNothing);
  });

  testWidgets('renders profile provider errors through inline error state', (
    tester,
  ) async {
    final container = _settingsContainer(
      user: buildUser(),
      profileStream: Stream.error(StateError('profile failed')),
      blockedUsers: const [],
    );
    addTearDown(container.dispose);

    await _pumpSettings(tester, container);

    expect(find.text('Unavailable'), findsNWidgets(2));
    expect(find.bySubtype<CatchErrorState>(), findsOneWidget);
  });

  testWidgets('preference switches write through SettingsController', (
    tester,
  ) async {
    final userRepository = _FakeSettingsUserProfileRepository();
    final container = _settingsContainer(
      user: buildUser().copyWith(prefsWeeklyDigest: false),
      userRepository: userRepository,
      blockedUsers: const [],
    );
    addTearDown(container.dispose);

    await _pumpSettings(tester, container);
    await tester.tap(find.byKey(SettingsKeys.weeklyDigestSwitch));
    await pumpFeatureUi(tester);

    expect(userRepository.updatedUid, 'runner-1');
    expect(userRepository.updatedFields, {'prefsWeeklyDigest': true});
  });

  testWidgets('failed preference writes roll back optimistic switch state', (
    tester,
  ) async {
    final userRepository = _FakeSettingsUserProfileRepository(
      throwOnUpdate: true,
    );
    final container = _settingsContainer(
      user: buildUser().copyWith(prefsWeeklyDigest: false),
      userRepository: userRepository,
      blockedUsers: const [],
    );
    addTearDown(container.dispose);

    await _pumpSettings(tester, container);
    await tester.tap(find.byKey(SettingsKeys.weeklyDigestSwitch));
    await pumpFeatureUi(tester);

    final weeklyDigestField = tester.widget<CatchField>(
      find.byKey(SettingsKeys.weeklyDigestSwitch),
    );
    expect(weeklyDigestField.toggled, isFalse);
    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
  });

  testWidgets('pending settings write freezes the whole settings surface', (
    tester,
  ) async {
    final pendingWrite = Completer<void>();
    final container = _settingsContainer(
      user: buildUser(),
      blockedUsers: [
        BlockedUser(
          uid: 'blocked-1',
          source: 'chat',
          createdAt: DateTime(2026, 5),
        ),
      ],
    );
    addTearDown(container.dispose);

    await _pumpSettings(tester, container);
    final write = SettingsController.savePreferenceMutation.run(
      container,
      (_) => pendingWrite.future,
    );
    await tester.pump();

    final pendingTopBar = tester.widget<CatchTopBar>(find.byType(CatchTopBar));
    expect(pendingTopBar.navigation.mode, CatchTopBarNavigationMode.back);
    expect((pendingTopBar.leading! as CatchIconAction).onPressed, isNull);
    expect(
      tester
          .widget<CatchField>(find.byKey(SettingsKeys.weeklyDigestSwitch))
          .onToggle,
      isNull,
    );
    expect(
      tester
          .widget<CatchField>(find.byKey(SettingsKeys.reviewHistoryRow))
          .onTap,
      isNull,
    );
    expect(
      tester
          .widget<CatchField>(find.byKey(SettingsKeys.deleteAccountRow))
          .onTap,
      isNull,
    );
    expect(
      tester.widget<CatchField>(find.byKey(SettingsKeys.signOutRow)).onTap,
      isNull,
    );
    expect(
      tester
          .widget<CatchButton>(
            find.byKey(SettingsKeys.unblockButton('blocked-1')),
          )
          .onPressed,
      isNull,
    );
    expect(
      find.byWidgetPredicate((widget) => widget is PopScope && !widget.canPop),
      findsOneWidget,
    );

    pendingWrite.complete();
    await write;
    await tester.pump();
  });

  testWidgets('blocked account rows use profile data and unblock controller', (
    tester,
  ) async {
    final safetyRepository = _FakeSettingsSafetyRepository();
    final container = _settingsContainer(
      user: buildUser(),
      safetyRepository: safetyRepository,
      blockedUsers: [
        BlockedUser(
          uid: 'blocked-1',
          source: 'chat',
          createdAt: DateTime(2026, 5),
        ),
      ],
      publicProfiles: {
        'blocked-1': buildPublicProfile(uid: 'blocked-1', name: 'Riya'),
      },
    );
    addTearDown(container.dispose);

    await _pumpSettings(tester, container);

    expect(find.text('Riya'), findsOneWidget);
    expect(find.text('chat'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.byKey(SettingsKeys.unblockButton('blocked-1')),
      240,
    );
    await tester.tap(find.byKey(SettingsKeys.unblockButton('blocked-1')));
    await pumpFeatureUi(tester);

    expect(safetyRepository.unblockedUserId, 'blocked-1');
    expect(find.text('Account unblocked.'), findsOneWidget);
  });

  testWidgets('account section owns profile history actions and sign out', (
    tester,
  ) async {
    final authRepository = _FakeSettingsAuthRepository();
    final container = _settingsContainer(
      user: buildUser(),
      blockedUsers: const [],
      authRepository: authRepository,
    );
    addTearDown(container.dispose);

    await _pumpSettings(tester, container);

    expect(find.byKey(SettingsKeys.reviewHistoryRow), findsOneWidget);
    expect(find.byKey(SettingsKeys.paymentHistoryRow), findsOneWidget);
    expect(find.byKey(SettingsKeys.hostAppRow), findsOneWidget);
    expect(find.byKey(SettingsKeys.launchAccessRow), findsOneWidget);
    expect(find.byKey(SettingsKeys.signOutRow), findsOneWidget);

    await tester.ensureVisible(find.byKey(SettingsKeys.signOutRow));
    await tester.pump();
    await tester.tap(find.byKey(SettingsKeys.signOutRow));
    await pumpFeatureUi(tester);

    expect(authRepository.signOutCallCount, 1);
  });

  testWidgets('host app row opens the central handoff link', (tester) async {
    Uri? launchedUri;
    LaunchMode? launchMode;
    final container = _settingsContainer(
      user: buildUser(),
      blockedUsers: const [],
      externalUrlLauncher: (uri, {mode = LaunchMode.platformDefault}) async {
        launchedUri = uri;
        launchMode = mode;
        return true;
      },
    );
    addTearDown(container.dispose);

    await _pumpSettings(tester, container);
    await tester.tap(find.byKey(SettingsKeys.hostAppRow));
    await pumpFeatureUi(tester);

    expect(launchedUri, Uri.parse('https://catchdates.com/host'));
    expect(launchMode, LaunchMode.externalApplication);
  });

  testWidgets(
    'pending host handoff freezes settings and false result is visible',
    (tester) async {
      final launchResult = Completer<bool>();
      var launchCallCount = 0;
      final container = _settingsContainer(
        user: buildUser(),
        blockedUsers: const [],
        externalUrlLauncher: (uri, {mode = LaunchMode.platformDefault}) {
          launchCallCount += 1;
          return launchResult.future;
        },
      );
      addTearDown(container.dispose);

      await _pumpSettings(tester, container);
      await tester.tap(find.byKey(SettingsKeys.hostAppRow));
      await tester.pump();

      expect(
        find.descendant(
          of: find.byKey(SettingsKeys.hostAppRow),
          matching: find.byType(CatchLoadingIndicator),
        ),
        findsOneWidget,
      );
      expect(
        tester
            .widget<CatchField>(find.byKey(SettingsKeys.reviewHistoryRow))
            .onTap,
        isNull,
      );
      expect(
        find.byWidgetPredicate(
          (widget) => widget is PopScope && !widget.canPop,
        ),
        findsOneWidget,
      );

      await tester.tap(find.byKey(SettingsKeys.hostAppRow));
      await tester.pump();
      expect(launchCallCount, 1);

      launchResult.complete(false);
      await pumpFeatureUi(tester);
      expect(
        find.text('Could not open that link. Please try again.'),
        findsOneWidget,
      );
    },
  );

  testWidgets('host handoff reports a thrown launcher failure', (tester) async {
    final container = _settingsContainer(
      user: buildUser(),
      blockedUsers: const [],
      externalUrlLauncher: (uri, {mode = LaunchMode.platformDefault}) async =>
          throw StateError('launcher unavailable'),
    );
    addTearDown(container.dispose);

    await _pumpSettings(tester, container);
    await tester.tap(find.byKey(SettingsKeys.hostAppRow));
    await pumpFeatureUi(tester);

    expect(
      find.text('Could not open that link. Please try again.'),
      findsOneWidget,
    );
  });

  testWidgets('delete account confirmation delegates to controller', (
    tester,
  ) async {
    final safetyRepository = _FakeSettingsSafetyRepository();
    final container = _settingsContainer(
      user: buildUser(),
      safetyRepository: safetyRepository,
      blockedUsers: const [],
    );
    addTearDown(container.dispose);

    await _pumpSettings(tester, container);
    await tester.scrollUntilVisible(
      find.byKey(SettingsKeys.deleteAccountRow),
      300,
    );
    await tester.pump();
    await tester.tap(find.byKey(SettingsKeys.deleteAccountRow));
    await pumpFeatureUi(tester);

    expect(find.text('Delete account?'), findsOneWidget);

    await tester.tap(find.text('Delete'));
    await tester.pump();

    expect(safetyRepository.requestDeletionCallCount, 1);
  });
}

Material _topBarMaterial(WidgetTester tester) {
  return tester.widget<Material>(
    find
        .descendant(
          of: find.byType(CatchTopBar),
          matching: find.byType(Material),
        )
        .first,
  );
}

ProviderContainer _settingsContainer({
  required UserProfile user,
  required List<BlockedUser> blockedUsers,
  Stream<List<BlockedUser>>? blockedUsersStream,
  Stream<UserProfile?>? profileStream,
  UserProfileRepository? userRepository,
  SafetyRepository? safetyRepository,
  AuthRepository? authRepository,
  ExternalUrlLauncher? externalUrlLauncher,
  AppAnalytics? analytics,
  Map<String, PublicProfile> publicProfiles = const {},
}) {
  final container = ProviderContainer(
    overrides: [
      if (analytics != null)
        appAnalyticsProvider.overrideWith((ref) => analytics),
      uidProvider.overrideWith((ref) => Stream.value(user.uid)),
      watchMyHostMembershipsProvider(
        user.uid,
      ).overrideWith((ref) => Stream.value(const [])),
      appPackageInfoProvider.overrideWith(
        (ref) async => (version: '1.0.1', buildNumber: '3'),
      ),
      authRepositoryProvider.overrideWithValue(
        authRepository ?? _FakeSettingsAuthRepository(),
      ),
      if (externalUrlLauncher != null)
        externalUrlLauncherProvider.overrideWithValue(externalUrlLauncher),
      watchUserProfileProvider.overrideWith(
        (ref) => profileStream ?? Stream.value(user),
      ),
      userProfileRepositoryProvider.overrideWith(
        (ref) => userRepository ?? _FakeSettingsUserProfileRepository(),
      ),
      safetyRepositoryProvider.overrideWith(
        (ref) => safetyRepository ?? _FakeSettingsSafetyRepository(),
      ),
      watchBlockedUsersProvider.overrideWith(
        (ref) => blockedUsersStream ?? Stream.value(blockedUsers),
      ),
      publicProfilesByIdsProvider(
        PublicProfilesQuery(blockedUsers.map((blocked) => blocked.uid)),
      ).overrideWith((ref) async => publicProfiles),
    ],
  );
  return container;
}

Future<void> _pumpSettings(
  WidgetTester tester,
  ProviderContainer container,
) async {
  tester.view.devicePixelRatio = 1.0;
  tester.view.physicalSize = const Size(390, 1400);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: AppTheme.light,
        builder: catchNoticeOverlayBuilder,
        home: const _SettingsTestPrimer(child: SettingsScreen()),
      ),
    ),
  );
  await tester.pump();
  await tester.pump();
}

class _SettingsTestPrimer extends ConsumerWidget {
  const _SettingsTestPrimer({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(uidProvider);
    return child;
  }
}

class _FakeSettingsUserProfileRepository extends Fake
    implements UserProfileRepository {
  _FakeSettingsUserProfileRepository({this.throwOnUpdate = false});

  final bool throwOnUpdate;
  String? updatedUid;
  Map<String, dynamic>? updatedFields;

  @override
  Future<void> updateUserProfile({
    required String uid,
    required UpdateUserProfilePatch patch,
    String action = 'update profile',
  }) async {
    if (throwOnUpdate) {
      throw Exception('update failed');
    }
    updatedUid = uid;
    updatedFields = Map<String, dynamic>.from(patch.toFieldsJson());
  }
}

class _FakeSettingsSafetyRepository extends Fake implements SafetyRepository {
  int requestDeletionCallCount = 0;
  String? unblockedUserId;

  @override
  Future<void> requestAccountDeletion() async {
    requestDeletionCallCount += 1;
  }

  @override
  Future<void> unblockUser({required String targetUserId}) async {
    unblockedUserId = targetUserId;
  }
}

class _FakeSettingsAuthRepository extends Fake implements AuthRepository {
  int signOutCallCount = 0;

  @override
  Future<void> signOut() async {
    signOutCallCount += 1;
  }
}
