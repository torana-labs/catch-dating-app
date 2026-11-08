import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:flutter_test/flutter_test.dart';

import 'planner_fixtures.dart';

void main() {
  group('HostProgrammeState', () {
    test('groups the schedule by day in time order', () {
      final days = plannerState.days;
      expect(days.map((d) => d.$1.day), [12, 13, 14]);
      expect(days.first.$2.map((f) => f.name), ['Mehendi', 'Sangeet']);
    });

    test('an everyone function invites a guest with no row', () {
      final sangeet = plannerState.function('sangeet')!;
      final replies = plannerState.replies(sangeet);
      expect(replies.invited, 14);
      expect(replies.coming, 9);
      expect(replies.maybe, 2);
      expect(replies.noReply, 3);
    });

    test('a hand-picked function counts only the invited', () {
      final haldi = plannerState.function('haldi')!;
      expect(plannerState.replies(haldi).invited, 5);
    });

    test('a household cell reads everyone, some, maybe, no reply and none', () {
      final mehra = plannerState.household('mehra')!;
      expect(mehra.groups, ['Aditi’s side', 'College friends']);
      expect(mehra.cells.map((c) => c.kind), [
        HostProgrammeCellKind.everyone,
        HostProgrammeCellKind.everyone,
        HostProgrammeCellKind.notInvited,
        HostProgrammeCellKind.everyone,
        HostProgrammeCellKind.some,
      ]);
      expect(
        plannerState.household('shah')!.cells.first.kind,
        HostProgrammeCellKind.maybe,
      );
      expect(
        plannerState.household('iyer')!.cells.first.kind,
        HostProgrammeCellKind.noReply,
      );
      expect(
        plannerState.household('singh')!.cells.last.kind,
        HostProgrammeCellKind.none,
      );
    });

    test('households still to reply are the ones with a pending member', () {
      expect(plannerState.waitingHouseholds, 3);
      expect(plannerState.repliedHouseholds, 3);
      expect(
        plannerState
            .filtered(HostProgrammeGuestFilter.noReply)
            .map((h) => h.id),
        ['iyer', 'kapoor', 'khan'],
      );
    });

    test('days to go count from the first day', () {
      expect(plannerState.daysToGo(plannerNow), 45);
    });
  });

  group('HostProgrammeTravelState', () {
    test('counts people, flights and the missing', () {
      expect(plannerTravel.flyingIn, 19);
      expect(plannerTravel.withFlight, 18);
      expect(plannerTravel.missing, 1);
      expect(plannerTravel.needsYou.map((r) => r.legId), ['l3', 'l5']);
    });

    test('finds the busiest day and its two-hour windows', () {
      final busiest = plannerTravel.busiest!;
      expect(busiest.day, DateTime(2026, 12, 11));
      expect(busiest.people, 9);
      expect(plannerTravel.windows(busiest.day), [
        (8, 4),
        (10, 3),
        (12, 2),
        (14, 0),
        (16, 0),
        (18, 0),
      ]);
    });
  });

  group('HostProgrammeRoomsState', () {
    test('adds up the blocks and finds the suggestions', () {
      expect(plannerRooms.held, 10);
      expect(plannerRooms.placed, 7);
      expect(plannerRooms.waiting, hasLength(3));
      expect(plannerRooms.suggested.map((g) => g.guestId), ['priya', 'rohan']);
      expect(plannerRooms.staysIn(plannerRooms.blocks.first), hasLength(4));
    });
  });
}
