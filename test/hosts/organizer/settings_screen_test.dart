import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/force_update_provider.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_profile_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/hosts/organizer/settings_screen.dart';
import 'package:catch_dating_app/pages/account/settings_controller.dart';
import 'package:catch_kernel/brand.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/repo_file.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

// Carries the account checks the old organiser screen account menu had:
// deleting the account with confirmation, and the help, terms and privacy
// links opening outside the app. A host with no organizer reaches this
// screen from the Organiser tab.

class _DeletionController extends SettingsController {
  int requests = 0;
  final completion = Completer<void>();

  @override
  Future<void> requestAccountDeletion() {
    requests++;
    return completion.future;
  }
}

void _useProdLegalUrlDefines() {
  final defines =
      jsonDecode(repoFile('tool/env/dart_defines/prod.json').readAsStringSync())
          as Map<String, dynamic>;
  AppConfig.overrideLegalUrlDefinesForTesting(defines.cast<String, String>());
  addTearDown(AppConfig.resetLegalUrlDefinesOverrideForTesting);
}

Future<void> _pump(
  WidgetTester tester, {
  SettingsController? controller,
  ExternalUrlLauncher? launcher,
}) async {
  tester.view.physicalSize = const Size(390, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    routes: [
      GoRoute(path: '/', builder: (_, _) => const OrganizerSettingsScreen()),
      GoRoute(
        path: Routes.startScreen.path,
        builder: (_, _) => const Text('Signed out after deletion'),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('host-1')),
        hostOperableOrganizersProvider(
          'host-1',
        ).overrideWithValue(const AsyncData(<Organizer>[])),
        watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
        watchHostProfileProvider(
          'host-1',
        ).overrideWith((ref) => Stream.value(null)),
        appPackageInfoProvider.overrideWith(
          (ref) => Future.error(StateError('no package info in tests')),
        ),
        if (controller != null)
          settingsControllerProvider.overrideWith(() => controller),
        if (launcher != null)
          externalUrlLauncherProvider.overrideWithValue(launcher),
      ],
      child: MaterialApp.router(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        routerConfig: router,
        builder: (_, child) => CatchNoticeOverlay(child: child!),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

Future<void> _openDeletion(WidgetTester tester) async {
  await tester.tap(find.byKey(const ValueKey('settings-row-delete')));
  await pumpFeatureUi(tester);
}

void main() {
  testWidgets('a host with no organizer can cancel account deletion', (
    tester,
  ) async {
    final controller = _DeletionController();
    await _pump(tester, controller: controller);
    await _openDeletion(tester);
    expect(find.textContaining('Shared business records'), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await pumpFeatureUi(tester);
    expect(controller.requests, 0);
  });

  testWidgets('deletion needs confirmation, then signs out to the start', (
    tester,
  ) async {
    final controller = _DeletionController();
    await _pump(tester, controller: controller);
    await _openDeletion(tester);
    expect(controller.requests, 0);
    await tester.tap(find.text('Delete'));
    await pumpFeatureUi(tester);
    expect(controller.requests, 1);
    controller.completion.complete();
    await pumpFeatureUi(tester);
    expect(find.text('Signed out after deletion'), findsOneWidget);
  });

  testWidgets('a failed deletion keeps the account screen', (tester) async {
    final controller = _DeletionController();
    await _pump(tester, controller: controller);
    await _openDeletion(tester);
    await tester.tap(find.text('Delete'));
    await pumpFeatureUi(tester);
    controller.completion.completeError(StateError('Deletion unavailable'));
    await pumpFeatureUi(tester);
    expect(find.text('Signed out after deletion'), findsNothing);
    expect(find.byKey(const ValueKey('settings-row-delete')), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  for (final (label, expected) in [
    ('Privacy', '${Brand.webOrigin}/privacy/'),
    ('Terms', '${Brand.webOrigin}/terms/'),
    ('Guides', '${Brand.webOrigin}/help/'),
  ]) {
    testWidgets('$label opens outside the app', (tester) async {
      _useProdLegalUrlDefines();
      Uri? launched;
      LaunchMode? launchMode;
      await _pump(
        tester,
        launcher: (uri, {mode = LaunchMode.platformDefault}) async {
          launched = uri;
          launchMode = mode;
          return true;
        },
      );
      await tester.tap(find.text(label));
      await pumpFeatureUi(tester);
      expect(launched, Uri.parse(expected));
      expect(launchMode, LaunchMode.externalApplication);
    });
  }

  testWidgets('unconfigured help links are hidden', (tester) async {
    AppConfig.overrideLegalUrlDefinesForTesting(const {});
    addTearDown(AppConfig.resetLegalUrlDefinesOverrideForTesting);
    await _pump(tester);
    expect(find.text('Privacy'), findsNothing);
    expect(find.text('Terms'), findsNothing);
    expect(find.text('Guides'), findsNothing);
    expect(find.byKey(const ValueKey('settings-row-delete')), findsOneWidget);
  });

  testWidgets('a link that will not open says so', (tester) async {
    _useProdLegalUrlDefines();
    await _pump(
      tester,
      launcher: (uri, {mode = LaunchMode.platformDefault}) async =>
          throw StateError('launcher unavailable'),
    );
    await tester.tap(find.text('Privacy'));
    await pumpFeatureUi(tester);
    expect(
      find.text('Could not open that link. Please try again.'),
      findsOneWidget,
    );
  });
}
