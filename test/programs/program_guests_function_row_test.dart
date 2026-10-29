import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/programs/presentation/program_guests_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

const _guest = ProgramGuestRow(
  guestId: 'guest-a',
  displayName: 'Rohan Sharma',
  groupIds: [],
  invitationStatus: 'invited',
  rsvpStatus: 'attending',
  revision: 1,
);
const _function = ProgramGuestsFunction(functionId: 'sangeet', name: 'Sangeet');

ProgramFunctionGuestRow _join(String status, {bool invited = true}) =>
    ProgramFunctionGuestRow(
      guestId: _guest.guestId,
      functionId: _function.functionId,
      invited: invited,
      rsvpStatus: status,
      attendanceStatus: 'expected',
    );

Future<void> _pumpRow(
  WidgetTester tester, {
  ProgramFunctionGuestRow? join,
  bool selected = false,
  bool pending = false,
  void Function(ProgramGuestRow, String)? onRsvp,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        body: ProgramGuestsFunctionRow(
          guest: _guest,
          functions: const [_function],
          selectedFunction: selected ? _function : null,
          joinIndex: {'guest-a:sangeet': ?join},
          pending: pending,
          onRsvp: onRsvp ?? (_, _) {},
        ),
      ),
    ),
  );
  if (pending) {
    await pumpUntilFound(tester, find.byType(CatchLoadingIndicator));
  } else {
    await pumpFeatureUi(tester);
  }
}

void main() {
  for (final scenario in [
    (
      name: 'missing join',
      join: null,
      label: 'No RSVP',
      tone: CatchBadgeTone.neutral,
    ),
    (
      name: 'invited pending',
      join: _join('pending'),
      label: 'No RSVP',
      tone: CatchBadgeTone.neutral,
    ),
    (
      name: 'attending',
      join: _join('attending'),
      label: 'Attending',
      tone: CatchBadgeTone.success,
    ),
    (
      name: 'declined',
      join: _join('declined'),
      label: 'Declined',
      tone: CatchBadgeTone.danger,
    ),
    (
      name: 'maybe',
      join: _join('maybe'),
      label: 'Maybe',
      tone: CatchBadgeTone.warning,
    ),
    (
      name: 'not invited despite attending RSVP',
      join: _join('attending', invited: false),
      label: 'Not invited',
      tone: CatchBadgeTone.neutral,
    ),
  ]) {
    testWidgets('${scenario.name} has accurate localized function copy', (
      tester,
    ) async {
      await _pumpRow(tester, join: scenario.join);
      expect(find.text('Sangeet: ${scenario.label}'), findsOneWidget);
      expect(find.textContaining('notInvited'), findsNothing);
      final badge = tester.widget<CatchBadge>(find.byType(CatchBadge));
      expect(badge.tone, scenario.tone);
      expect(find.byType(CatchChoiceInput<String>), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('selected pending badge retains brand tone', (tester) async {
    await _pumpRow(tester, join: _join('pending'), selected: true);
    expect(
      tester.widget<CatchBadge>(find.byType(CatchBadge)).tone,
      CatchBadgeTone.brand,
    );
    expect(find.text('Sangeet: No RSVP'), findsOneWidget);
  });

  testWidgets('attending choice preserves its wire value', (tester) async {
    final changes = <(ProgramGuestRow, String)>[];
    await _pumpRow(
      tester,
      selected: true,
      onRsvp: (guest, status) => changes.add((guest, status)),
    );
    await tester.tap(find.text('Attending'));
    await pumpFeatureUi(tester);
    expect(changes, [(_guest, 'attending')]);
  });

  testWidgets(
    'not-invited badge does not rewrite RSVP selection or callback values',
    (tester) async {
      final changes = <(ProgramGuestRow, String)>[];
      await _pumpRow(
        tester,
        join: _join('attending', invited: false),
        selected: true,
        onRsvp: (guest, status) => changes.add((guest, status)),
      );
      expect(find.text('Sangeet: Not invited'), findsOneWidget);
      final editor = tester.widget<CatchChoiceInput<String>>(
        find.byType(CatchChoiceInput<String>),
      );
      expect(editor.selected, {'attending'});
      for (final choice in [
        ('Maybe', 'maybe'),
        ('Declined', 'declined'),
        ('No RSVP', 'pending'),
      ]) {
        await tester.tap(find.text(choice.$1));
        await pumpFeatureUi(tester);
        expect(changes.last.$1, same(_guest));
        expect(changes.last.$2, choice.$2);
      }
      expect(changes.map((change) => change.$2), [
        'maybe',
        'declined',
        'pending',
      ]);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('pending mutation keeps localized status and hides RSVP editor', (
    tester,
  ) async {
    await _pumpRow(
      tester,
      join: _join('attending'),
      selected: true,
      pending: true,
    );
    expect(find.text('Sangeet: Attending'), findsOneWidget);
    expect(find.byType(CatchChoiceInput<String>), findsNothing);
    expect(find.byType(CatchLoadingIndicator), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
