import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_organizer_switcher_sheet.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../clubs/clubs_test_helpers.dart';
import '../test_pump_helpers.dart';

void main() {
  test('selection is isolated per signed-in Host user', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    expect(container.read(hostOrganizerSelectionProvider('host-1')), isNull);
    container
        .read(hostOrganizerSelectionProvider('host-1').notifier)
        .select('club-2');

    expect(container.read(hostOrganizerSelectionProvider('host-1')), 'club-2');
    expect(container.read(hostOrganizerSelectionProvider('host-2')), isNull);
  });

  test(
    'selection resolution prefers a valid route, then state, then first',
    () {
      final first = buildClub();
      final second = buildClub(id: 'club-2');
      final clubs = [first, second];

      expect(resolveSelectedHostOrganizer(clubs), first);
      expect(
        resolveSelectedHostOrganizer(clubs, selectedOrganizerId: second.id),
        second,
      );
      expect(
        resolveSelectedHostOrganizer(
          clubs,
          selectedOrganizerId: first.id,
          preferredOrganizerId: second.id,
        ),
        second,
      );
      expect(
        resolveSelectedHostOrganizer(clubs, selectedOrganizerId: 'missing'),
        first,
      );
      expect(resolveSelectedHostOrganizer(const []), isNull);
    },
  );

  testWidgets('organizer avatar prefers the real logo with activity fallback', (
    tester,
  ) async {
    const logoPath = 'assets/fixtures/club_hero_portrait.jpg';
    final clubWithLogo = buildClub(
      name: 'Sea Face Social',
      profileImageUrl: logoPath,
    );

    await _pumpAvatar(tester, clubWithLogo);

    var art = tester.widget<CatchAvatar>(find.byType(CatchAvatar));
    expect(art.imageUrl, logoPath);
    expect(art.initials, 'SF');
    expect(
      art.colors?.accent,
      ActivityPalette.light.getActivity(ActivityKind.socialRun).accent,
    );

    await _pumpAvatar(tester, buildClub(name: 'Long Table Club'));

    art = tester.widget<CatchAvatar>(find.byType(CatchAvatar));
    expect(art.imageUrl, isNull);
    expect(art.initials, 'LT');
    expect(
      art.colors?.accent,
      ActivityPalette.light.getActivity(ActivityKind.socialRun).accent,
    );
  });

  testWidgets(
    'switcher sheet marks the current organizer and returns a choice',
    (tester) async {
      final ownerClub = buildClub(id: 'owner-club', name: 'Sea Face Social');
      final teamClub = buildClub(id: 'team-club', name: 'Long Table Club');
      String? selectedOrganizerId;

      await _pumpSheetLauncher(
        tester,
        clubs: [ownerClub, teamClub],
        selectedOrganizerId: ownerClub.id,
        onSelected: (value) => selectedOrganizerId = value,
      );
      await tester.tap(find.text('Open switcher'));
      await pumpFeatureUi(tester);

      final ownerOption = find.byKey(const ValueKey<Object?>('owner-club'));
      final teamOption = find.byKey(const ValueKey<Object?>('team-club'));
      expect(
        find.byKey(const ValueKey<String>('host-organizer-switcher-sheet')),
        findsOneWidget,
      );
      expect(
        tester.widget<CatchMenuRow<String>>(ownerOption).item.selected,
        isTrue,
      );
      expect(
        tester.widget<CatchMenuRow<String>>(teamOption).item.selected,
        isFalse,
      );
      expect(
        find.descendant(
          of: ownerOption,
          matching: find.byIcon(CatchIcons.check),
        ),
        findsOneWidget,
      );

      await tester.tap(teamOption);
      await pumpFeatureUi(tester);

      expect(selectedOrganizerId, teamClub.id);
      expect(
        find.byKey(const ValueKey<String>('host-organizer-switcher-sheet')),
        findsNothing,
      );
    },
  );

  testWidgets('switcher sheet remains stable at 2x text', (tester) async {
    final first = buildClub(
      name: 'Sea Face Social With An Intentionally Long Name',
    );
    final second = buildClub(
      id: 'club-2',
      name: 'Long Table Club With An Intentionally Long Name',
    );

    await _pumpSheetLauncher(
      tester,
      clubs: [first, second],
      selectedOrganizerId: first.id,
      textScale: 2,
      onSelected: (_) {},
    );
    await tester.tap(find.text('Open switcher'));
    await pumpFeatureUi(tester);

    expect(tester.takeException(), isNull);
    expect(find.byKey(const ValueKey<Object?>('club-1')), findsOneWidget);
    expect(find.byKey(const ValueKey<Object?>('club-2')), findsOneWidget);
  });
}

Future<void> _pumpAvatar(WidgetTester tester, Club club) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(body: HostOrganizerAvatar(club: club, size: 40)),
    ),
  );
  await pumpFeatureUi(tester);
}

Future<void> _pumpSheetLauncher(
  WidgetTester tester, {
  required List<Club> clubs,
  required String selectedOrganizerId,
  required ValueChanged<String?> onSelected,
  double textScale = 1,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: MediaQuery(
        data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
        child: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                onSelected(
                  await showHostOrganizerSwitcherSheet(
                    context: context,
                    clubs: clubs,
                    selectedOrganizerId: selectedOrganizerId,
                  ),
                );
              },
              child: const Text('Open switcher'),
            ),
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}
