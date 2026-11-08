import 'package:catch_dating_app/hosts/programmes/planner/programme_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_function_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_guests_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_guests_desktop_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_household_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_rooms_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_travel_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_trips_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_views.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../support/catch_test_fonts.dart';
import 'planner_fixtures.dart';
import 'planner_test_pump.dart';

void main() {
  setUpAll(loadCatchTestFonts);

  testWidgets('the workspace lists each day and opens a function', (
    tester,
  ) async {
    String? opened;
    HostProgrammeView? view;
    var waiting = 0;
    await pumpPlannerBody(
      tester,
      HostProgrammeBody(
        state: plannerState,
        onView: (value) => view = value,
        onOpenFunction: (function) => opened = function.functionId,
        onAddFunction: () {},
        onWaiting: () => waiting++,
        onRetry: () {},
      ),
    );
    expect(find.text('Aditi and Kabir’s wedding'), findsOneWidget);
    expect(find.text('Sat 12 Dec'), findsOneWidget);
    expect(find.text('9 of 14 coming · 3 not replied'), findsOneWidget);
    await tester.tap(find.text('Sangeet'));
    expect(opened, 'sangeet');
    await tester.tap(find.text('3 households haven’t replied'));
    expect(waiting, 1);
    await tester.tap(find.text('Travel'));
    expect(view, HostProgrammeView.travel);
  });

  testWidgets('the workspace shows the error with Try again', (tester) async {
    var retried = 0;
    await pumpPlannerBody(
      tester,
      HostProgrammeBody(
        state: const HostProgrammeState(status: HostProgrammeStatus.error),
        onView: (_) {},
        onOpenFunction: (_) {},
        onAddFunction: null,
        onWaiting: () {},
        onRetry: () => retried++,
      ),
    );
    await tester.tap(find.text('Try again'));
    expect(retried, 1);
  });

  testWidgets('the function picks who is invited and cancels', (tester) async {
    HostProgrammeInvitation? invitation;
    var cancelled = 0;
    await pumpPlannerBody(
      tester,
      HostProgrammeFunctionBody(
        state: plannerState,
        functionId: 'sangeet',
        onInvitation: (value) => invitation = value,
        onOpenDoor: () {},
        onCancel: () => cancelled++,
        onRetry: () {},
      ),
    );
    expect(find.text('Durbar hall, Taj Fateh Prakash'), findsWidgets);
    await tester.tap(
      find.byKey(const ValueKey('host-programme-invitation-everyone')),
    );
    expect(invitation, isNull);
    await tester.tap(
      find.byKey(const ValueKey('host-programme-invitation-handPicked')),
    );
    expect(invitation, HostProgrammeInvitation.handPicked);
    await tester.ensureVisible(
      find.byKey(const ValueKey('host-programme-function-cancel')),
    );
    await tester.tap(
      find.byKey(const ValueKey('host-programme-function-cancel')),
    );
    expect(cancelled, 1);
  });

  testWidgets('the guest list filters to no reply', (tester) async {
    HostProgrammeGuestFilter? filter;
    String? household;
    await pumpPlannerBody(
      tester,
      HostProgrammeGuestsBody(
        state: plannerState,
        filter: HostProgrammeGuestFilter.noReply,
        onView: (_) {},
        onFilter: (value) => filter = value,
        onImport: () {},
        onOpenHousehold: (value) => household = value.id,
        onRetry: () {},
      ),
    );
    expect(find.text('6 households'), findsOneWidget);
    expect(find.text('The Kapoor family'), findsOneWidget);
    expect(find.text('The Mehra family'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('host-programme-filter-all')));
    expect(filter, HostProgrammeGuestFilter.all);
    await tester.tap(find.text('The Kapoor family'));
    expect(household, 'kapoor');
  });

  testWidgets('the desktop guest list is a table', (tester) async {
    await pumpPlannerBody(
      tester,
      HostProgrammeGuestsDesktopBody(
        state: plannerState,
        filter: HostProgrammeGuestFilter.all,
        onView: (_) {},
        onFilter: (_) {},
        onOpenHousehold: (_) {},
        onRetry: () {},
      ),
      size: plannerDesktop,
    );
    expect(find.text('Showing 6 of 6 households'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('host-programme-row-mehra')),
      findsOneWidget,
    );
  });

  testWidgets('a household sends its link again', (tester) async {
    var sent = 0;
    await pumpPlannerBody(
      tester,
      HostProgrammeHouseholdBody(
        state: plannerState,
        householdId: 'mehra',
        onCall: (_) {},
        onSendLink: () => sent++,
        onRetry: () {},
      ),
    );
    expect(find.text('Kamla Mehra'), findsOneWidget);
    expect(find.text('Replied for everyone'), findsOneWidget);
    await tester.tap(
      find.byKey(const ValueKey('host-programme-household-link')),
    );
    expect(sent, 1);
  });

  testWidgets('travel shows what needs the planner', (tester) async {
    HostProgrammeTravelLink? link;
    await pumpPlannerBody(
      tester,
      HostProgrammeTravelBody(
        state: plannerTravel,
        onView: (_) {},
        onLink: (value) => link = value,
        onOpenPickup: (_) {},
        onOpenHotel: (_) {},
        onOpenDesk: () {},
        onRetry: () {},
      ),
    );
    expect(find.text('The Sharma family'), findsOneWidget);
    expect(find.text('AI 473 diverted'), findsOneWidget);
    await tester.ensureVisible(
      find.byKey(const ValueKey('host-programme-rooms')),
    );
    await tester.tap(find.byKey(const ValueKey('host-programme-rooms')));
    expect(link, HostProgrammeTravelLink.rooms);
  });

  testWidgets('rooms place the selected guest in a free room', (tester) async {
    String? placed;
    var suggested = 0;
    await pumpPlannerBody(
      tester,
      HostProgrammeRoomsBody(
        state: plannerRooms,
        selectedGuestId: 'priya',
        onBack: () {},
        onHotel: (_) {},
        onSelectGuest: (_) {},
        onPlace: (block) => placed = block.roomBlockId,
        onSuggestAll: () => suggested++,
        onHotelDetails: () {},
        onOpenGuest: (_) {},
        onRetry: () {},
      ),
      size: plannerDesktop,
    );
    await tester.tap(
      find.byKey(const ValueKey('host-programme-free-ground-0')),
    );
    expect(placed, 'ground');
    await tester.tap(
      find.byKey(const ValueKey('host-programme-rooms-suggest')),
    );
    expect(suggested, 1);
  });

  testWidgets('trips filter to the ones that need a look', (tester) async {
    HostProgrammeTripFilter? filter;
    await pumpPlannerBody(
      tester,
      HostProgrammeTripsBody(
        state: plannerTripsReport,
        now: plannerNow,
        filter: const HostProgrammeTripFilter.needsLook(),
        onFilter: (value) => filter = value,
        onExport: () {},
        onOpenTrip: (_) {},
        onRetry: () {},
      ),
      size: plannerDesktop,
    );
    expect(
      find.byKey(const ValueKey('host-programme-trip-T-043')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('host-programme-trip-T-041')),
      findsNothing,
    );
    await tester.tap(find.widgetWithText(CatchChip, 'Royal Cabs'));
    expect(filter, const HostProgrammeTripFilter.vendor('Royal Cabs'));
  });
}
