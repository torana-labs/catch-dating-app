import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/programs/presentation/program_guests_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

class _Repository extends Fake implements ProgramSetupRepository {
  final saved =
      <({String? groupId, int? revision, String? hotelId, bool clear})>[];

  @override
  Future<ProgramMutationResult> upsertGuestGroup({
    required String programId,
    required String label,
    required String dimension,
    String? groupId,
    int? expectedRevision,
    int? sortOrder,
    String? hotelId,
    bool clearHotel = false,
  }) async {
    saved.add((
      groupId: groupId,
      revision: expectedRevision,
      hotelId: hotelId,
      clear: clearHotel,
    ));
    return ProgramMutationResult(
      entityId: groupId ?? 'new-group',
      revision: (expectedRevision ?? 0) + 1,
      alreadyApplied: false,
    );
  }
}

ProgramGuestListPage _page({List<ProgramGuestGroupRow> groups = const []}) =>
    ProgramGuestListPage(
      programId: 'program',
      guests: const [],
      households: const [],
      functionGuests: const [],
      groups: groups,
    );

Widget _app(
  _Repository repository, {
  List<ProgramGuestGroupRow> groups = const [],
}) => ProviderScope(
  // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
  overrides: [programSetupRepositoryProvider.overrideWithValue(repository)],
  child: MaterialApp(
    theme: AppTheme.light,
    home: ProgramGuestsPageBody(
      programId: 'program',
      programTitle: 'Program',
      functions: const [],
      hotels: const [ProgramHotel(hotelId: 'hotel-1', name: 'Lakeview')],
      guestPage: _page(groups: groups),
      canManageGuests: true,
    ),
  ),
);

void main() {
  testWidgets('new group selects a hotel from the program catalog', (
    tester,
  ) async {
    final repository = _Repository();
    await tester.pumpWidget(_app(repository));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('New group'));
    await pumpFeatureUi(tester);
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('program-guest-group-label')),
        matching: find.byType(TextField),
      ),
      'Bride side',
    );
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('program-guest-group-dimension')),
        matching: find.byType(TextField),
      ),
      'side',
    );
    await tester.tap(find.text('Hotel for this group'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Lakeview'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Save'));
    await pumpFeatureUi(tester);
    expect(repository.saved.single.hotelId, 'hotel-1');
    expect(repository.saved.single.clear, isFalse);
    expect(repository.saved.single.groupId, isNull);
  });

  testWidgets('editing a group clears its hotel with revision fence', (
    tester,
  ) async {
    final repository = _Repository();
    await tester.pumpWidget(
      _app(
        repository,
        groups: const [
          ProgramGuestGroupRow(
            groupId: 'group-1',
            label: 'Bride side',
            dimension: 'side',
            memberCount: 4,
            revision: 7,
            hotelId: 'hotel-1',
          ),
        ],
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Staying at Lakeview'), findsOneWidget);
    await tester.tap(find.byTooltip('Edit group'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Hotel for this group'));
    await pumpFeatureUi(tester);
    await tester.tap(find.widgetWithText(CatchChip, 'Lakeview'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Save'));
    await pumpFeatureUi(tester);
    expect(repository.saved.single.groupId, 'group-1');
    expect(repository.saved.single.revision, 7);
    expect(repository.saved.single.hotelId, isNull);
    expect(repository.saved.single.clear, isTrue);
  });
}
