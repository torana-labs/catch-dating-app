import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/account/data/force_update_provider.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/safety/presentation/settings_keys.dart';
import 'package:catch_dating_app/safety/presentation/settings_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart';

import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';

/// Configures AppConfig with the release define file the consumer app ships
/// with.
void _useProdLegalUrlDefines() {
  final defines =
      jsonDecode(File('tool/env/dart_defines/prod.json').readAsStringSync())
          as Map<String, dynamic>;
  AppConfig.overrideLegalUrlDefinesForTesting(defines.cast<String, String>());
  addTearDown(AppConfig.resetLegalUrlDefinesOverrideForTesting);
}

Future<void> _pumpSettings(
  WidgetTester tester, {
  required ExternalUrlLauncher launcher,
}) async {
  tester.view.devicePixelRatio = 1.0;
  tester.view.physicalSize = const Size(390, 1400);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        appPackageInfoProvider.overrideWith(
          (ref) async => (version: '1.0.1', buildNumber: '3'),
        ),
        watchUserProfileProvider.overrideWith(
          (ref) => Stream.value(buildUser()),
        ),
        watchBlockedUsersProvider.overrideWith(
          (ref) => Stream.value(const <BlockedUser>[]),
        ),
        externalUrlLauncherProvider.overrideWithValue(launcher),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        builder: catchNoticeOverlayBuilder,
        home: const SettingsScreen(),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

void main() {
  for (final (rowKey, expected) in [
    (SettingsKeys.privacyPolicyRow, 'https://catchdates.com/privacy/'),
    (SettingsKeys.helpSupportRow, 'https://catchdates.com/help/'),
    (SettingsKeys.termsRow, 'https://catchdates.com/terms/'),
  ]) {
    testWidgets('consumer Settings opens $expected externally', (tester) async {
      _useProdLegalUrlDefines();
      Uri? launchedUri;
      LaunchMode? launchMode;
      await _pumpSettings(
        tester,
        launcher: (uri, {mode = LaunchMode.platformDefault}) async {
          launchedUri = uri;
          launchMode = mode;
          return true;
        },
      );

      for (final key in [
        SettingsKeys.privacyPolicyRow,
        SettingsKeys.helpSupportRow,
        SettingsKeys.termsRow,
      ]) {
        expect(find.byKey(key), findsOneWidget);
      }
      await tester.scrollUntilVisible(find.byKey(rowKey), 300);
      await tester.tap(find.byKey(rowKey));
      await pumpFeatureUi(tester);

      expect(launchedUri, Uri.parse(expected));
      expect(launchMode, LaunchMode.externalApplication);
    });
  }

  testWidgets('consumer Settings hides unconfigured legal rows', (
    tester,
  ) async {
    AppConfig.overrideLegalUrlDefinesForTesting(const {});
    addTearDown(AppConfig.resetLegalUrlDefinesOverrideForTesting);
    await _pumpSettings(
      tester,
      launcher: (uri, {mode = LaunchMode.platformDefault}) async => true,
    );

    expect(find.byKey(SettingsKeys.privacyPolicyRow), findsNothing);
    expect(find.byKey(SettingsKeys.helpSupportRow), findsNothing);
    expect(find.byKey(SettingsKeys.termsRow), findsNothing);
    expect(find.byKey(SettingsKeys.deleteAccountRow), findsOneWidget);
  });

  testWidgets('consumer legal link launch failure is visible', (tester) async {
    _useProdLegalUrlDefines();
    await _pumpSettings(
      tester,
      launcher: (uri, {mode = LaunchMode.platformDefault}) async => false,
    );
    await tester.scrollUntilVisible(
      find.byKey(SettingsKeys.privacyPolicyRow),
      300,
    );
    await tester.tap(find.byKey(SettingsKeys.privacyPolicyRow));
    await pumpFeatureUi(tester);

    expect(
      tester
          .widget<CatchField>(find.byKey(SettingsKeys.privacyPolicyRow))
          .onTap,
      isNotNull,
    );
    expect(
      find.text('Could not open that link. Please try again.'),
      findsOneWidget,
    );
  });
}
