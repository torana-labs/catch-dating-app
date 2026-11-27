import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/organizer/team_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/organizers_test_helpers.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'organizer_fixtures.dart';

/// The team screen runs the team commands the old team section ran: adding a
/// host by phone, and for the owner, removing someone or handing over the
/// organizer after a confirmation, each with a notice.
void main() {
  Future<FakeOrganizersRepository> pumpTeam(WidgetTester tester) async {
    tester.view.physicalSize = const Size(390, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final repository = FakeOrganizersRepository();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          organizersRepositoryProvider.overrideWith((ref) => repository),
          uidProvider.overrideWith((ref) => Stream.value(organizerOwnerUid)),
          hostOperableOrganizersProvider(
            organizerOwnerUid,
          ).overrideWithValue(AsyncData(<Organizer>[lanternLane()])),
        ],
        child: MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          theme: AppTheme.light,
          builder: catchNoticeOverlayBuilder,
          home: OrganizerTeamScreen(organizerId: lanternLane().id),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    return repository;
  }

  Future<void> choose(WidgetTester tester, String action) async {
    await tester.tap(find.text('Dev Patel'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text(action));
    await pumpFeatureUi(tester);
  }

  testWidgets('the owner adds a host by phone and is told so', (tester) async {
    final repository = await pumpTeam(tester);

    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('team-invite-phone-0')),
        matching: find.byType(TextField),
      ),
      '98201 44718',
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(const ValueKey('team-invite-send')));
    await pumpFeatureUi(tester);

    expect(repository.addedHostOrganizerId, lanternLane().id);
    expect(repository.addedHostPhoneNumber, '+919820144718');
    expect(find.text('Added to your team'), findsOneWidget);
  });

  testWidgets('removing a host asks first, then removes them', (tester) async {
    final repository = await pumpTeam(tester);

    await choose(tester, 'Remove');
    expect(find.text('Remove Dev Patel?'), findsOneWidget);
    await tester.tap(find.text('Remove'));
    await pumpFeatureUi(tester);

    expect(repository.removedHostOrganizerId, lanternLane().id);
    expect(repository.removedHostUid, organizerHostUid);
    expect(find.text('Dev Patel removed.'), findsOneWidget);
  });

  testWidgets('making a host the owner asks first, then hands over', (
    tester,
  ) async {
    final repository = await pumpTeam(tester);

    await choose(tester, 'Make owner');
    expect(find.text('Make Dev Patel the owner?'), findsOneWidget);
    await tester.tap(find.text('Make owner'));
    await pumpFeatureUi(tester);

    expect(repository.transferredOwnershipOrganizerId, lanternLane().id);
    expect(repository.transferredOwnershipUid, organizerHostUid);
    expect(find.text('Ownership transferred to Dev Patel.'), findsOneWidget);
  });

  testWidgets('cancelling the confirmation changes nothing', (tester) async {
    final repository = await pumpTeam(tester);

    await choose(tester, 'Remove');
    await tester.tap(find.text('Cancel'));
    await pumpFeatureUi(tester);

    expect(repository.removedHostUid, isNull);
    expect(find.text('Dev Patel removed.'), findsNothing);
  });
}
