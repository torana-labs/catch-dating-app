import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_arrival_row.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_alerts_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_arrivals_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_arrivals_state.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_dispatch_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_dispatch_state.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_door_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_door_state.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_hotel_desk_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_hotel_desk_state.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_jobs_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_jobs_state.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_lead_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_lead_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'staff_fixtures.dart';
import 'staff_live_fixtures.dart';

Future<void> _pump(
  WidgetTester tester,
  Widget body, {
  CatchThemeMode theme = CatchThemeMode.night,
}) async {
  tester.view.physicalSize = const Size(390, 2000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        theme: theme,
        child: CatchScreen(bodyScrolls: false, body: body),
      ),
    ),
  );
  await tester.pump();
}

const _empty = ProgramOperationOutboxSummary([]);

void main() {
  group('jobs', () {
    test('the greeter job leads while no door is open, the next function '
        'is the Sangeet and the rest wait under Later', () {
      final state = StaffJobsState.fromAccess(staffAccess(), now: staffDayNow);
      expect(state.onNow?.kind, StaffJobKind.greeter);
      expect(state.next?.placeId, staffSangeetId);
      expect(
        [for (final job in state.later) job.kind],
        [
          StaffJobKind.dispatch,
          StaffJobKind.hotel,
          StaffJobKind.lead,
          StaffJobKind.door,
        ],
      );
      expect(state.links, [StaffJobLink.alerts, StaffJobLink.trips]);
    });

    test('an open door takes the spotlight', () {
      final state = StaffJobsState.fromAccess(
        staffAccess(),
        now: staffNightNow,
      );
      expect(state.onNow?.kind, StaffJobKind.door);
      expect(state.onNow?.placeId, staffSangeetId);
    });

    testWidgets('the body opens the spotlight job, a later job and a link', (
      tester,
    ) async {
      final opened = <StaffJob>[];
      final links = <StaffJobLink>[];
      await _pump(
        tester,
        StaffJobsBody(
          state: StaffJobsState.fromAccess(staffAccess(), now: staffDayNow),
          onOpen: opened.add,
          onLink: links.add,
          onRetry: () {},
        ),
        theme: CatchThemeMode.day,
      );
      expect(find.text('Udaipur airport'), findsWidgets);
      expect(find.text('266 coming · you check them in'), findsOneWidget);
      await tester.tap(find.text('Open arrivals'));
      await tester.tap(find.text('Taj Fateh Prakash'));
      await tester.tap(find.text('Car trips'));
      expect(
        [for (final job in opened) job.kind],
        [StaffJobKind.greeter, StaffJobKind.hotel],
      );
      expect(links, [StaffJobLink.trips]);
    });
  });

  group('arrivals', () {
    testWidgets('sorts the curb, the parties that need someone and those '
        'landing, and sends each move', (tester) async {
      final moves = <(String, StaffArrivalMove)>[];
      await _pump(
        tester,
        StaffArrivalsBody(
          state: StaffArrivalsState.fromRoster(staffRoster(), outbox: _empty),
          onMove: (row, move) => moves.add((row.legId, move)),
          onOpen: (_) {},
          onRetry: () {},
        ),
      );
      expect(find.text('7 at the curb'), findsOneWidget);
      expect(find.text('The Sharma family, 5 people'), findsOneWidget);
      await tester.tap(find.text('Let go'));
      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey<String>('staff-arrival-kapoor')),
          matching: find.text('Claim'),
        ),
      );
      expect(moves, [
        ('mehra', StaffArrivalMove.release),
        ('kapoor', StaffArrivalMove.claim),
      ]);
    });

    test('a saved claim shows as the party state until the server answers', () {
      final state = StaffArrivalsState.fromRoster(
        staffRoster(),
        outbox: ProgramOperationOutboxSummary([
          ProgramOperationOutboxEntry.legObservation(
            programId: staffProgramId,
            legId: 'kapoor',
            action: 'claim',
            clientOperationId: 'arrival_1_claim',
            createdAt: staffDayNow,
            expectedRevision: 3,
          ),
        ]),
      );
      final kapoor = state.atCurb.singleWhere(
        (arrival) => arrival.row.legId == 'kapoor',
      );
      expect(kapoor.row.claimedByMe, isTrue);
      expect(kapoor.queued, ProgramOperationOutboxStatus.pending);
    });
  });

  group('dispatch', () {
    testWidgets('names each car from the roster and waits for parties '
        'still inside', (tester) async {
      final sent = <TransportGroupSuggestion>[];
      await _pump(
        tester,
        StaffDispatchBody(
          state: StaffDispatchState.fromPlan(
            staffPlan(),
            outbox: _empty,
            vehicleClasses: staffVehicles,
            roster: staffRoster(),
          ),
          busy: false,
          onDispatch: sent.add,
          onRetry: () {},
        ),
      );
      expect(find.text('6/6'), findsOneWidget);
      expect(find.text('The Mehra family · 4'), findsOneWidget);
      expect(find.text('Waiting for 3 more'), findsOneWidget);
      await tester.tap(find.text('Dispatch'));
      expect(sent.single.vehicleClassId, 'innova');
    });
  });

  group('hotel desk', () {
    testWidgets('counts, rooms by guest, Arrived and Give keys', (
      tester,
    ) async {
      final arrived = <String>[];
      final keys = <String>[];
      await _pump(
        tester,
        StaffHotelDeskBody(
          state: StaffHotelDeskState.fromInbound(
            staffInbound(),
            rooms: staffRooms(),
          ),
          now: staffDayNow,
          busy: const {},
          onArrived: (trip) => arrived.add(trip.tripId),
          onGiveKeys: (stay) => keys.add(stay.stayId),
          onRooms: () {},
          onMoreCars: () {},
          onMoreExpected: () {},
          onFirstPage: () {},
          onRetry: () {},
        ),
      );
      expect(find.text('2 cars on the way'), findsOneWidget);
      expect(find.text('38'), findsOneWidget);
      expect(find.text('214'), findsOneWidget);
      expect(find.text('About 25 min'), findsOneWidget);
      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey<String>('staff-hotel-trip-t1')),
          matching: find.text('Arrived'),
        ),
      );
      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey<String>('staff-hotel-stay-bansal')),
          matching: find.text('Give keys'),
        ),
      );
      expect(arrived, ['t1']);
      expect(keys, ['bansal']);
    });
  });

  group('door', () {
    StaffDoorState doorState({String? selected, StaffDoorFilter? filter}) =>
        StaffDoorState(
          status: StaffDoorStatus.content,
          view: staffDoorView(),
          filter: filter ?? StaffDoorFilter.expected,
          selectedGuestId: selected,
        );

    testWidgets('shows who is in, the filters and Check in N; a selected '
        'row checks in the party the stepper holds', (tester) async {
      final checkIns = <(String, int)>[];
      final parties = <int>[];
      await _pump(
        tester,
        StaffDoorBody(
          state: doorState(selected: 'mehra'),
          party: 3,
          onFilter: (_) {},
          onSearch: (_) {},
          onSelect: (_) {},
          onParty: parties.add,
          onCheckIn: (guest, party) => checkIns.add((guest.guestId, party)),
          onUndo: (_) {},
          onNoShow: (_) {},
          onRetry: () {},
        ),
      );
      expect(find.text('184 of 266 in'), findsOneWidget);
      expect(find.text('Check in 3'), findsOneWidget);
      await tester.tap(
        find.byKey(const ValueKey<String>('staff-door-check-in')),
      );
      await tester.tap(find.text('Check in 2'));
      expect(checkIns, [('mehra', 3), ('shah', 2)]);
    });

    test('Walk-ins counts the guests not invited and the unsent ones', () {
      final state = StaffDoorState(
        status: StaffDoorStatus.content,
        view: staffDoorView(),
        outbox: ProgramOperationOutboxSummary([
          ProgramOperationOutboxEntry.walkIn(
            programId: staffProgramId,
            functionId: staffSangeetId,
            displayName: 'Tara Sen',
            clientOperationId: 'walkin_1',
            createdAt: staffNightNow,
          ),
        ]),
      );
      expect(state.countOf(StaffDoorFilter.walkIns), 2);
      expect(state.countOf(StaffDoorFilter.checkedIn), 2);
      expect(state.countOf(StaffDoorFilter.expected), 4);
      expect(state.pendingWalkIns.single.name, 'Tara Sen');
    });
  });

  group('lead and alerts', () {
    testWidgets('the lead sees the next function and the run of show', (
      tester,
    ) async {
      final doors = <String>[];
      await _pump(
        tester,
        StaffLeadBody(
          state: StaffLeadState.fromAccess(staffAccess(), now: staffNightNow),
          onOpenDoor: (function) => doors.add(function.functionId),
          onAlerts: () {},
          onRetry: () {},
        ),
      );
      expect(find.text('in 63 min'), findsOneWidget);
      expect(find.text('184'), findsOneWidget);
      await tester.tap(find.text('Open its door'));
      expect(doors, ['dinner']);
    });

    testWidgets('alerts split into open, mine and done with actions', (
      tester,
    ) async {
      final actions = <String>[];
      var filter = StaffAlertsFilter.open;
      await _pump(
        tester,
        StatefulBuilder(
          builder: (context, setState) => StaffAlertsBody(
            status: StaffAlertsStatus.content,
            board: staffLiveBoard(),
            now: staffNightNow,
            onRetry: () {},
            filter: filter,
            onFilter: (value) => setState(() => filter = value),
            onAction: (alert, action) =>
                actions.add('${alert.alertId}:${action.name}'),
          ),
        ),
      );
      expect(find.text('AI 471 was diverted'), findsOneWidget);
      expect(find.text('Open 2'), findsOneWidget);
      await tester.tap(find.text('Take it'));
      await tester.tap(find.text('Done'));
      expect(actions, ['flight_leg-1:claim', 'r1_functionLead:done']);
      await tester.tap(find.text('Done 1'));
      await tester.pump();
      expect(
        find.text('A car has waited 20 minutes at the airport'),
        findsOneWidget,
      );
      await tester.tap(find.text('Reopen'));
      expect(actions.last, 'r2_transportDispatcher:reopen');
      expect(find.text('What raises an alert'), findsOneWidget);
    });
  });
}
