import 'package:catch_dating_app/contexts/programmes/domain/program_id_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_id_tracker_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../support/catch_test_fonts.dart';
import 'planner_storage_fixtures.dart';
import 'planner_test_pump.dart';

void main() {
  setUpAll(loadCatchTestFonts);

  test('the ID tracker parses rows, counts and hotels', () {
    expect(plannerIdTracker.staying, 286);
    expect(plannerIdTracker.hotels.map((h) => h.name), [
      'Taj Fateh Prakash',
      'Leela Palace',
    ]);
    final james = plannerIdTracker.rows.firstWhere(
      (row) => row.guestId == 'james',
    );
    expect(james.isPassport, isTrue);
    expect(james.status, ProgramGuestIdStatus.submitted);
    expect(
      plannerIdTracker.rows.where(HostProgrammeIdFilter.missing.matches),
      hasLength(1),
    );
    expect(
      () => ProgramIdTracker.fromCallableData({'programId': 'p'}),
      throwsFormatException,
    );
  });

  testWidgets('the tracker filters, selects and decides', (tester) async {
    HostProgrammeIdFilter? filtered;
    ProgramGuestIdDecision? decided;
    var sent = false;
    Widget body(String? selected) => HostProgrammeIdTrackerBody(
      status: HostProgrammeStatus.ready,
      tracker: plannerIdTracker,
      filter: HostProgrammeIdFilter.all,
      selectedGuestId: selected,
      onBack: () {},
      onHotel: (_) {},
      onFilter: (value) => filtered = value,
      onSelect: (_) {},
      onDecide: (_, decision) => decided = decision,
      onSendToHotels: () => sent = true,
      onRemind: () {},
      onRetry: () {},
    );
    await pumpPlannerBody(tester, body('kamla'), size: plannerDesktop);
    expect(find.text('IDs for the hotels'), findsOneWidget);
    expect(find.text('Remind the 38 missing'), findsOneWidget);
    expect(find.text('XXXX XXXX 4821'), findsOneWidget);
    expect(find.text('Passport and visa'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('host-programme-ids-missing')));
    expect(filtered, HostProgrammeIdFilter.missing);
    await tester.tap(find.byKey(const ValueKey('host-programme-id-accept')));
    expect(decided, ProgramGuestIdDecision.accept);
    await tester.tap(find.byKey(const ValueKey('host-programme-ids-send')));
    expect(sent, isTrue);

    // An accepted ID cannot be decided again; the hotel's look is listed.
    await pumpPlannerBody(tester, body('rajiv'), size: plannerDesktop);
    decided = null;
    await tester.tap(find.byKey(const ValueKey('host-programme-id-ask')));
    expect(decided, isNull);
    expect(find.text('Front desk'), findsOneWidget);
  });
}
