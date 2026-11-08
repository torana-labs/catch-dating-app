import 'package:catch_dating_app/contexts/programmes/domain/program_bill_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_id_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_id_tracker_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_reconcile_body.dart';
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

  test('pasted bill lines parse the reference and the rupee amount', () {
    final lines = ProgramBillLineInput.parse(
      'T-041 · Airport, 2,000\nno amount here\nT-042\t₹1800.50\n'
      'T-043, Airport, 1200\n',
    );
    expect(lines.map((line) => line.reference), [
      'T-041 · Airport',
      'T-042',
      'T-043, Airport',
    ]);
    expect(lines.first.billedMinor, 200000);
    expect(lines[1].billedMinor, 180050);
    expect(plannerVendorBill.bill!.toQuestion, hasLength(3));
  });

  testWidgets('the bill lists the lines to question and approves', (
    tester,
  ) async {
    final invoice = TextEditingController();
    final pasted = TextEditingController();
    final note = TextEditingController();
    addTearDown(invoice.dispose);
    addTearDown(pasted.dispose);
    addTearDown(note.dispose);
    var approved = false;
    var newBill = false;
    Widget body({required bool editing}) => HostProgrammeReconcileBody(
      status: HostProgrammeStatus.ready,
      view: plannerVendorBill,
      editing: editing,
      invoiceController: invoice,
      linesController: pasted,
      noteController: note,
      onCheck: () {},
      onNewBill: () => newBill = true,
      onQuestion: () {},
      onApprove: () => approved = true,
      onRetry: () {},
    );
    await pumpPlannerBody(tester, body(editing: false), size: plannerDesktop);
    expect(find.text('Shree Travels · invoice 2026-118'), findsOneWidget);
    expect(find.text('The 3 trips to question'), findsOneWidget);
    expect(find.text('Send the 3 questions'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('host-bill-approve')));
    expect(approved, isTrue);
    await tester.tap(find.byKey(const ValueKey('host-bill-new')));
    expect(newBill, isTrue);

    await pumpPlannerBody(tester, body(editing: true), size: plannerDesktop);
    expect(find.text('Check the bill'), findsOneWidget);
  });
}
