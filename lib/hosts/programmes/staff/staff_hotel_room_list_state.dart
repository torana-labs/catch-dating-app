import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_hotel_board.dart';
import 'package:flutter/foundation.dart';

/// Where the room list is: reading, showing, or unable to read.
enum StaffHotelRoomListStatus { loading, content, error }

/// The hotel desk's read-only room list as plain values: every allocated
/// room in room order, and the rooms a guest-name search leaves.
@immutable
class StaffHotelRoomListState {
  const StaffHotelRoomListState({
    required this.status,
    this.hotelName,
    this.rooms = const <ProgramLodgingHotelRoom>[],
    this.query = '',
  });

  const StaffHotelRoomListState.loading()
    : this(status: StaffHotelRoomListStatus.loading);

  const StaffHotelRoomListState.error()
    : this(status: StaffHotelRoomListStatus.error);

  /// The board's rooms sorted by room label, numbers in number order, with
  /// rooms whose exact number is still to come last.
  factory StaffHotelRoomListState.fromBoard(
    ProgramLodgingHotelBoard board, {
    String query = '',
  }) => StaffHotelRoomListState(
    status: StaffHotelRoomListStatus.content,
    hotelName: board.hotelLabel,
    rooms: List.unmodifiable([...board.rooms]..sort(_compareRooms)),
    query: query,
  );

  final StaffHotelRoomListStatus status;
  final String? hotelName;

  /// Every allocated room, in room order.
  final List<ProgramLodgingHotelRoom> rooms;

  /// The guest-name search over the loaded rooms; never sent anywhere.
  final String query;

  /// The rooms with a guest whose name holds every word of [query].
  List<ProgramLodgingHotelRoom> get shown {
    final words = query
        .toLowerCase()
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .toList(growable: false);
    if (words.isEmpty) return rooms;
    return [
      for (final room in rooms)
        if (room.guests.any((guest) {
          final name = guest.displayName.toLowerCase();
          return words.every(name.contains);
        }))
          room,
    ];
  }
}

/// The party's first arrival and last departure, for the row's dates.
({DateTime arrival, DateTime departure}) staffHotelRoomStay(
  ProgramLodgingHotelRoom room,
) {
  var arrival = room.guests.first.arrival;
  var departure = room.guests.first.departure;
  for (final guest in room.guests.skip(1)) {
    if (guest.arrival.isBefore(arrival)) arrival = guest.arrival;
    if (guest.departure.isAfter(departure)) departure = guest.departure;
  }
  return (arrival: arrival, departure: departure);
}

int _compareRooms(ProgramLodgingHotelRoom a, ProgramLodgingHotelRoom b) {
  final aLabel = a.roomLabel;
  final bLabel = b.roomLabel;
  if (aLabel != null && bLabel != null) {
    final byLabel = _naturalCompare(aLabel, bLabel);
    if (byLabel != 0) return byLabel;
  } else if (aLabel != null) {
    return -1;
  } else if (bLabel != null) {
    return 1;
  } else {
    final byType = a.roomType.compareTo(b.roomType);
    if (byType != 0) return byType;
  }
  final byGuest = a.guests.first.displayName.compareTo(
    b.guests.first.displayName,
  );
  return byGuest != 0 ? byGuest : a.inventoryId.compareTo(b.inventoryId);
}

final _chunk = RegExp(r'\d+|\D+');

/// Compares labels with their digit runs as numbers, so 9 sorts before 10.
int _naturalCompare(String a, String b) {
  final aParts = _chunk.allMatches(a.toLowerCase()).map((m) => m[0]!).toList();
  final bParts = _chunk.allMatches(b.toLowerCase()).map((m) => m[0]!).toList();
  for (var i = 0; i < aParts.length && i < bParts.length; i++) {
    final x = aParts[i];
    final y = bParts[i];
    final xNumber = int.tryParse(x);
    final yNumber = int.tryParse(y);
    final order = xNumber != null && yNumber != null
        ? xNumber.compareTo(yNumber)
        : x.compareTo(y);
    if (order != 0) return order;
  }
  final byLength = aParts.length.compareTo(bParts.length);
  return byLength != 0 ? byLength : a.compareTo(b);
}
