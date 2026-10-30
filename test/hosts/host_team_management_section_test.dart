import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_team_management_section.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../organizers/organizers_test_helpers.dart';
import '../test_pump_helpers.dart';

void main() {
  testWidgets('Add host sheet follows handoff copy and submits phone number', (
    tester,
  ) async {
    final repository = FakeOrganizersRepository();
    final organizer = buildOrganizer(
      id: 'owned-club',
      ownerUserId: 'host-1',
      hostProfiles: const [
        OrganizerHostProfile(
          uid: 'host-1',
          displayName: 'Owner Host',
          role: OrganizerHostRole.owner,
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          organizersRepositoryProvider.overrideWith((ref) => repository),
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          builder: catchNoticeOverlayBuilder,
          home: Scaffold(
            body: HostTeamManagementSection(
              organizer: organizer,
              currentUid: 'host-1',
              canManage: true,
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    final addHostRow = find.byWidgetPredicate(
      (widget) => widget is CatchField && widget.title == 'Add host',
    );
    expect(addHostRow, findsOneWidget);
    await tester.tap(addHostRow);
    await pumpFeatureUi(tester);

    expect(find.byType(CatchSheet), findsOneWidget);
    expect(find.text('Add host'), findsWidgets);
    expect(
      find.text('Enter the phone number on their Catch profile.'),
      findsOneWidget,
    );
    expect(find.widgetWithText(CatchButton, 'Add host'), findsOneWidget);

    final phoneField = find.byType(TextField);
    expect(phoneField, findsOneWidget);
    await tester.tap(phoneField);
    await pumpFeatureUi(tester);
    await tester.enterText(phoneField, '98765 43210');
    await tester.tap(find.widgetWithText(CatchButton, 'Add host'));
    await pumpFeatureUi(tester);

    expect(repository.addedHostOrganizerId, 'owned-club');
    expect(repository.addedHostPhoneNumber, '98765 43210');
    expect(find.text('Host added.'), findsOneWidget);
  });

  testWidgets('Remove host confirmation uses shared copy and mutation', (
    tester,
  ) async {
    final repository = FakeOrganizersRepository();
    final organizer = _hostTeamOrganizer();

    await _pumpHostTeamSection(tester, repository: repository, organizer: organizer);

    await tester.tap(find.byKey(const ValueKey('host-team-actions-host-2')));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Remove host'));
    await pumpFeatureUi(tester);

    expect(find.text('Remove host?'), findsOneWidget);
    expect(
      find.text(
        'Rishi Mehta will stay an organizer follower but will lose host tools.',
      ),
      findsOneWidget,
    );

    await tester.tap(find.widgetWithText(CatchButton, 'Remove'));
    await pumpFeatureUi(tester);

    expect(repository.removedHostOrganizerId, 'owned-club');
    expect(repository.removedHostUid, 'host-2');
    expect(find.text('Rishi Mehta removed.'), findsOneWidget);
  });

  testWidgets('Transfer ownership confirmation uses shared copy and mutation', (
    tester,
  ) async {
    final repository = FakeOrganizersRepository();
    final organizer = _hostTeamOrganizer();

    await _pumpHostTeamSection(tester, repository: repository, organizer: organizer);

    await tester.tap(find.byKey(const ValueKey('host-team-actions-host-2')));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Transfer ownership'));
    await pumpFeatureUi(tester);

    expect(find.text('Transfer ownership?'), findsOneWidget);
    expect(
      find.text(
        'Rishi Mehta will become the organizer owner. You will remain a host.',
      ),
      findsOneWidget,
    );

    await tester.tap(find.widgetWithText(CatchButton, 'Transfer'));
    await pumpFeatureUi(tester);

    expect(repository.transferredOwnershipOrganizerId, 'owned-club');
    expect(repository.transferredOwnershipUid, 'host-2');
    expect(find.text('Ownership transferred to Rishi Mehta.'), findsOneWidget);
  });

  testWidgets('Co-host can read the roster without owner mutation controls', (
    tester,
  ) async {
    final repository = FakeOrganizersRepository();
    final organizer = _hostTeamOrganizer();

    await _pumpHostTeamSection(
      tester,
      repository: repository,
      organizer: organizer,
      currentUid: 'host-2',
      canManage: false,
    );

    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchSection && widget.title == 'Host team',
      ),
      findsOneWidget,
    );
    expect(
      tester
          .widgetList<CatchDivider>(
            find.descendant(
              of: find.byType(CatchSection),
              matching: find.byType(CatchDivider),
            ),
          )
          .where((divider) => divider.variant == CatchDividerVariant.section),
      hasLength(1),
    );
    expect(find.text('Owner Host'), findsOneWidget);
    expect(find.text('Rishi Mehta'), findsOneWidget);
    expect(find.byType(CatchField), findsNWidgets(2));
    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchField && widget.title == 'Add host',
      ),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey('host-team-actions-host-1')),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey('host-team-actions-host-2')),
      findsNothing,
    );
  });

  testWidgets('Empty roster remains an explicit canonical team section', (
    tester,
  ) async {
    final repository = FakeOrganizersRepository();
    final organizer = buildOrganizer(
      id: 'empty-team-club',
      hostUserId: null,
      hostProfiles: const [],
    );

    await _pumpHostTeamSection(tester, repository: repository, organizer: organizer);

    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchSection && widget.title == 'Host team',
      ),
      findsOneWidget,
    );
    expect(find.text('No host team members yet.'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchField && widget.title == 'Add host',
      ),
      findsOneWidget,
    );
  });
}

Organizer _hostTeamOrganizer() {
  return buildOrganizer(
    id: 'owned-club',
    ownerUserId: 'host-1',
    hostProfiles: const [
      OrganizerHostProfile(
        uid: 'host-1',
        displayName: 'Owner Host',
        role: OrganizerHostRole.owner,
      ),
      OrganizerHostProfile(uid: 'host-2', displayName: 'Rishi Mehta'),
    ],
  );
}

Future<void> _pumpHostTeamSection(
  WidgetTester tester, {
  required FakeOrganizersRepository repository,
  required Organizer organizer,
  String currentUid = 'host-1',
  bool canManage = true,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        organizersRepositoryProvider.overrideWith((ref) => repository),
        uidProvider.overrideWithValue(AsyncData<String?>(currentUid)),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        builder: catchNoticeOverlayBuilder,
        home: Scaffold(
          body: HostTeamManagementSection(
            organizer: organizer,
            currentUid: currentUid,
            canManage: canManage,
          ),
        ),
      ),
    ),
  );
  await tester.pump();
}
