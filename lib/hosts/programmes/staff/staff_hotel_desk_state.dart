import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:flutter/foundation.dart';

/// Where the hotel desk is: reading, showing, or unable to read.
enum StaffHotelDeskStatus { loading, content, error }

/// The hotel desk as plain values: cars on the way, guests at the desk
/// waiting for keys, parties still at the airport, and the counts above.
@immutable
class StaffHotelDeskState {
  const StaffHotelDeskState({
    required this.status,
    this.hotelName,
    this.onTheWay = const <ProgramTripSummary>[],
    this.atDesk = const <ProgramStay>[],
    this.stillToLeave = const <HotelExpectedLeg>[],
    this.rooms = const <String, String>{},
    this.checkedIn,
    this.roomsFree,
    this.generatedAt,
    this.moreCars = false,
    this.moreExpected = false,
    this.paged = false,
  });

  const StaffHotelDeskState.loading()
    : this(status: StaffHotelDeskStatus.loading);

  const StaffHotelDeskState.error() : this(status: StaffHotelDeskStatus.error);

  /// The inbound board, with the room board when it has loaded for the
  /// keys, the room numbers and the check-in and free-room counts.
  factory StaffHotelDeskState.fromInbound(
    ProgramHotelInbound inbound, {
    ProgramHotelRooms? rooms,
    bool paged = false,
  }) {
    final stays = rooms?.stays ?? const <ProgramStay>[];
    return StaffHotelDeskState(
      status: StaffHotelDeskStatus.content,
      hotelName: inbound.hotelName,
      onTheWay: [
        for (final trip in inbound.trips)
          if (trip.status == TransportTripStatus.enRoute) trip,
      ],
      atDesk: [
        for (final stay in stays)
          if (stay.hotelArrivedAt != null &&
              (stay.status == ProgramStayStatus.held ||
                  stay.status == ProgramStayStatus.confirmed))
            stay,
      ],
      stillToLeave: inbound.expectedLegs,
      rooms: {for (final stay in stays) stay.guestDisplayName: ?stay.roomLabel},
      checkedIn: rooms == null
          ? null
          : stays
                .where((stay) => stay.status == ProgramStayStatus.checkedIn)
                .length,
      roomsFree: rooms?.roomBlocks.fold<int>(
        0,
        (sum, block) => sum + block.remainingRooms,
      ),
      generatedAt: inbound.generatedAt,
      moreCars: inbound.nextTripCursor != null,
      moreExpected: inbound.nextExpectedCursor != null,
      paged: paged,
    );
  }

  final StaffHotelDeskStatus status;
  final String? hotelName;
  final List<ProgramTripSummary> onTheWay;
  final List<ProgramStay> atDesk;
  final List<HotelExpectedLeg> stillToLeave;

  /// Room labels by guest name.
  final Map<String, String> rooms;

  /// Guests checked in, once the room board has loaded.
  final int? checkedIn;

  /// Rooms still free across the hotel's blocks, once the room board has
  /// loaded.
  final int? roomsFree;
  final DateTime? generatedAt;

  /// The server holds more cars or expected parties than this page shows.
  final bool moreCars;
  final bool moreExpected;

  /// The desk shows a later page; Back to the first returns.
  final bool paged;

  /// People in cars on the way and still at the airport.
  int get stillToCome =>
      onTheWay.fold(0, (sum, trip) => sum + trip.passengerCount) +
      stillToLeave.fold(0, (sum, leg) => sum + leg.passengers);
}
