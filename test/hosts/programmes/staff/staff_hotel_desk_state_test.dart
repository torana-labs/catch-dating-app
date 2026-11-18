import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_hotel_desk_state.dart';
import 'package:flutter_test/flutter_test.dart';

import 'staff_fixtures.dart';

void main() {
  ProgramHotelInbound inbound(int expected) {
    final base = staffInbound();
    return ProgramHotelInbound(
      programId: base.programId,
      accessExpiresAt: base.accessExpiresAt,
      hotelId: base.hotelId,
      hotelName: base.hotelName,
      generatedAt: base.generatedAt,
      trips: base.trips,
      expectedLegs: [
        for (var i = 0; i < expected; i++)
          HotelExpectedLeg(
            legId: 'leg$i',
            guestDisplayName: 'Guest $i',
            partyLabel: null,
            passengers: 2,
            curbAt: null,
            readiness: TravelLegReadiness.expected,
          ),
      ],
      nextTripCursor: null,
      nextExpectedCursor: null,
    );
  }

  test('a long live list shows its first rows and offers the rest', () {
    final board = inbound(60);
    final first = StaffHotelDeskState.fromInbound(board, expectedShown: 25);
    expect(first.stillToLeave, hasLength(25));
    expect(first.moreExpected, isTrue);
    expect(first.moreCars, isFalse);
    final more = StaffHotelDeskState.fromInbound(
      board,
      expectedShown: 50,
      paged: true,
    );
    expect(more.stillToLeave, hasLength(50));
    expect(more.paged, isTrue);
    final all = StaffHotelDeskState.fromInbound(board, expectedShown: 75);
    expect(all.stillToLeave, hasLength(60));
    expect(all.moreExpected, isFalse);
  });

  test('the people still to come count every row, shown or not', () {
    final board = inbound(60);
    final cars = StaffHotelDeskState.fromInbound(
      board,
    ).onTheWay.fold(0, (sum, trip) => sum + trip.passengerCount);
    expect(
      StaffHotelDeskState.fromInbound(board, expectedShown: 5).stillToCome,
      cars + 120,
    );
  });
}
