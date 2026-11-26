import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/force_update_provider.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_profile_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/hosts/organizer/settings_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/catch_test_fonts.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// A host's first profile save creates the profile, then saves the name. The
// host can leave the account screen while the profile is being created; the
// name must still be saved. (Mutation.run takes the WidgetRef as a mutation
// target and only uses its container, which stays usable after the screen
// closes, so this holds without capturing anything.) The profile sheet
// itself failed to open in debug builds: its bio field set minLines above
// the default maxLines.

void main() {
  setUpAll(loadCatchTestFonts);

  testWidgets('the name is saved when the screen closes while the profile is '
      'created', (tester) async {
    tester.view.physicalSize = const Size(390, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final profiles = _Profiles();
    final container = ProviderContainer(
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
        hostProfileRepositoryProvider.overrideWithValue(profiles),
      ],
    );
    addTearDown(container.dispose);
    // The signed-in uid stays readable after the screen is gone.
    final uid = container.listen(uidProvider, (_, _) {});
    addTearDown(uid.close);
    final router = GoRouter(
      routes: [
        GoRoute(path: '/', builder: (_, _) => const OrganizerSettingsScreen()),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
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

    await tester.tap(find.byKey(const ValueKey<String>('settings-row-name')));
    await pumpFeatureUi(tester);
    await tester.enterText(find.byType(TextField).first, 'Asha Example');
    await tester.pump();
    await tester.tap(
      find.byKey(const ValueKey<String>('settings-profile-save')),
    );
    await pumpFeatureUi(tester);
    expect(profiles.ensured, ['Asha Example']);

    await tester.pumpWidget(
      UncontrolledProviderScope(container: container, child: const SizedBox()),
    );
    profiles.ensure.complete();
    await tester.pump();
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(profiles.saved, ['Asha Example']);
    await tester.pump(const Duration(minutes: 1));
  });
}

class _Profiles extends Fake implements HostProfileRepository {
  final ensure = Completer<void>();
  final ensured = <String>[];
  final saved = <String>[];

  @override
  Future<void> ensureHostProfile({
    required String uid,
    required String displayName,
  }) {
    ensured.add(displayName);
    return ensure.future;
  }

  @override
  Future<void> saveHostProfile({
    required String uid,
    required String displayName,
    String? roleTitle,
    String? bio,
  }) async {
    saved.add(displayName);
  }
}
