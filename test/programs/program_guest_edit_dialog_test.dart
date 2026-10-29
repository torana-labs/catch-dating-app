import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/programs/presentation/program_guest_edit_dialog.dart';
import 'package:catch_dating_app/programs/presentation/program_guests_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

const _households = [
  ProgramHouseholdRow(
    householdId: 'household',
    label: 'Family',
    memberGuestIds: [],
    revision: 1,
  ),
];
const _groups = [
  ProgramGuestGroupRow(
    groupId: 'z-group',
    label: 'Zed',
    dimension: 'side',
    memberCount: 0,
    revision: 1,
  ),
  ProgramGuestGroupRow(
    groupId: 'a-group',
    label: 'Alpha',
    dimension: 'side',
    memberCount: 0,
    revision: 1,
  ),
];

Widget _dialogApp(ValueChanged<ProgramGuestEditResult?> onResult) =>
    MaterialApp(
      theme: AppTheme.light,
      home: Builder(
        builder: (context) => TextButton(
          onPressed: () async {
            final result = await showDialog<ProgramGuestEditResult>(
              context: context,
              builder: (_) => const ProgramGuestEditDialog(
                households: _households,
                groups: _groups,
              ),
            );
            onResult(result);
          },
          child: const Text('Open editor'),
        ),
      ),
    );

Finder _field(String title) => find.descendant(
  of: find.byWidgetPredicate(
    (widget) => widget is CatchField && widget.title == title,
  ),
  matching: find.byType(TextField),
);

Future<void> _open(
  WidgetTester tester,
  ValueChanged<ProgramGuestEditResult?> onResult,
) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(1200, 1400);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
  await tester.pumpWidget(_dialogApp(onResult));
  await tester.tap(find.text('Open editor'));
  await pumpFeatureUi(tester);
}

class _Repository extends Fake implements ProgramSetupRepository {
  ProgramGuestEditResult? saved;
  String? savedProgramId;

  @override
  Future<ProgramMutationResult> upsertGuest({
    required String programId,
    required String displayName,
    String? guestId,
    int? expectedRevision,
    String? householdId,
    List<String>? groupIds,
    String? phoneE164,
    String? email,
    String? externalReference,
    String rsvpStatus = 'pending',
  }) async {
    savedProgramId = programId;
    saved = (
      displayName: displayName,
      householdId: householdId,
      groupIds: groupIds,
      phoneE164: phoneE164,
      email: email,
    );
    return const ProgramMutationResult(
      entityId: 'guest',
      revision: 1,
      alreadyApplied: false,
    );
  }
}

void main() {
  testWidgets('empty guest name keeps editor open without a result', (
    tester,
  ) async {
    var returned = false;
    await _open(tester, (_) => returned = true);
    await tester.enterText(_field('Guest name'), '   ');
    await tester.tap(find.text('Save'));
    await pumpFeatureUi(tester);
    expect(returned, isFalse);
    expect(find.byType(ProgramGuestEditDialog), findsOneWidget);
  });

  testWidgets(
    'guest editor returns trimmed fields with stable selected group order',
    (tester) async {
      ProgramGuestEditResult? result;
      await _open(tester, (value) => result = value);
      await tester.enterText(_field('Guest name'), '  Guest Name  ');
      await tester.enterText(_field('Phone (E.164)'), '+919876543210');
      await tester.enterText(_field('Email'), 'guest@example.com');
      await tester.tap(find.text('Family'));
      await tester.tap(find.text('Zed · side'));
      await tester.tap(find.text('Alpha · side'));
      await tester.tap(find.text('Save'));
      await pumpFeatureUi(tester);
      expect(result, isNotNull);
      expect(result!.displayName, 'Guest Name');
      expect(result!.householdId, 'household');
      expect(result!.groupIds, ['a-group', 'z-group']);
      expect(result!.phoneE164, '+919876543210');
      expect(result!.email, 'guest@example.com');
      expect(find.byType(ProgramGuestEditDialog), findsNothing);
    },
  );

  testWidgets('deselected household and blank optional fields remain null', (
    tester,
  ) async {
    ProgramGuestEditResult? result;
    await _open(tester, (value) => result = value);
    await tester.enterText(_field('Guest name'), 'Guest');
    await tester.tap(find.text('Family'));
    await tester.pump();
    await tester.tap(find.text('Family'));
    await tester.tap(find.text('Save'));
    await pumpFeatureUi(tester);
    expect(result, (
      displayName: 'Guest',
      householdId: null,
      groupIds: null,
      phoneE164: null,
      email: null,
    ));
  });

  testWidgets(
    'guest page maps the extracted editor result to the same upsert fields',
    (tester) async {
      final repository = _Repository();
      await tester.pumpWidget(
        ProviderScope(
          // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
          overrides: [
            programSetupRepositoryProvider.overrideWithValue(repository),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const ProgramGuestsPageBody(
              programId: 'program',
              programTitle: 'Program',
              functions: [],
              hotels: [],
              guestPage: ProgramGuestListPage(
                programId: 'program',
                guests: [],
                households: [],
                functionGuests: [],
                groups: [],
              ),
              canManageGuests: true,
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Add guest'));
      await pumpFeatureUi(tester);
      await tester.enterText(_field('Guest name'), '  New Guest  ');
      await tester.tap(find.text('Save'));
      await pumpFeatureUi(tester);
      expect(repository.savedProgramId, 'program');
      expect(repository.saved, (
        displayName: 'New Guest',
        householdId: null,
        groupIds: null,
        phoneE164: null,
        email: null,
      ));
    },
  );
}
