import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_requests_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/host_request.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/hosts/organizer/selection/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/hosts/today/host_today_controller.dart';
import 'package:catch_dating_app/hosts/today/host_today_screen.dart';
import 'package:catch_dating_app/hosts/today/host_today_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/organizers_test_helpers.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'host_today_fixtures.dart';

Future<void> _pump(WidgetTester tester, {required bool openRequests}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 1400);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('host-1')),
        hostOperableOrganizersProvider(
          'host-1',
        ).overrideWithValue(AsyncData([buildOrganizer(id: 'org-1')])),
        hostOrganizerSelectionProvider(
          'host-1',
        ).overrideWithBuild((ref, notifier) => null),
        watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
        hostTodayControllerProvider.overrideWith(
          (ref, request) => const HostTodayState(status: HostTodayStatus.empty),
        ),
        hostOrganizerRequestsProvider('org-1').overrideWith(
          (ref) => Stream.value(
            HostRequests(
              rows: [
                todayRequest(
                  'zoya',
                  HostRequestKind.request,
                  name: 'Zoya Merchant',
                ),
              ],
              complete: true,
            ),
          ),
        ),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: HostTodayScreen(now: todayNow, openRequests: openRequests),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

void main() {
  testWidgets('the requests link opens the queue over Today once', (
    tester,
  ) async {
    await _pump(tester, openRequests: true);

    expect(find.text('Requests'), findsOneWidget);
    expect(find.text('Zoya Merchant'), findsOneWidget);
  });

  testWidgets('Today alone leaves the queue closed', (tester) async {
    await _pump(tester, openRequests: false);

    expect(find.text('Requests'), findsNothing);
  });
}
