import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:meta/meta.dart';

/// One hotel's read-only room list from `manageProgramLodging`
/// (`hotelBoard`): the hotel's name and every room the approved allocation
/// places there, with each guest's display name and stay dates. The server
/// sends no contact details and no private planning fields.
@immutable
class ProgramLodgingHotelBoard {
  const ProgramLodgingHotelBoard({
    required this.hotelLabel,
    required this.rooms,
  });

  /// Parses the callable's `hotelBoard` result. Throws [FormatException]
  /// on any shape the response contract does not allow.
  factory ProgramLodgingHotelBoard.fromMap(Map<Object?, Object?> map) {
    final rooms = [
      for (final row in mapList(map['rows'], 'rows'))
        ProgramLodgingHotelRoom.fromMap(row),
    ];
    final ids = rooms.map((room) => room.inventoryId).toSet();
    if (ids.length != rooms.length) {
      throw const FormatException('Duplicate hotel board rooms.');
    }
    return ProgramLodgingHotelBoard(
      hotelLabel: requiredString(map, 'hotelLabel'),
      rooms: List.unmodifiable(rooms),
    );
  }

  final String hotelLabel;

  /// In the server's allocation order; the desk view sorts them.
  final List<ProgramLodgingHotelRoom> rooms;
}

/// One allocated room and the sharing party placed in it.
@immutable
class ProgramLodgingHotelRoom {
  const ProgramLodgingHotelRoom({
    required this.partyId,
    required this.inventoryId,
    required this.roomType,
    required this.guests,
    this.roomLabel,
  });

  factory ProgramLodgingHotelRoom.fromMap(Map<Object?, Object?> map) {
    final guests = [
      for (final guest in mapList(map['guests'], 'guests'))
        ProgramLodgingHotelGuest.fromMap(guest),
    ];
    if (guests.isEmpty) {
      throw const FormatException('A hotel board room needs a guest.');
    }
    return ProgramLodgingHotelRoom(
      partyId: requiredString(map, 'partyId'),
      inventoryId: requiredString(map, 'inventoryId'),
      roomType: requiredString(map, 'roomType'),
      roomLabel: requiredNullableString(map, 'roomLabel'),
      guests: List.unmodifiable(guests),
    );
  }

  final String partyId;
  final String inventoryId;
  final String roomType;

  /// The room's label, or null while only the room type is contracted and
  /// the exact room is still to be released.
  final String? roomLabel;
  final List<ProgramLodgingHotelGuest> guests;
}

/// A guest in an allocated room: name and civil stay dates only.
@immutable
class ProgramLodgingHotelGuest {
  const ProgramLodgingHotelGuest({
    required this.guestId,
    required this.displayName,
    required this.arrival,
    required this.departure,
  });

  factory ProgramLodgingHotelGuest.fromMap(Map<Object?, Object?> map) =>
      ProgramLodgingHotelGuest(
        guestId: requiredString(map, 'guestId'),
        displayName: requiredString(map, 'displayName'),
        arrival: _civilDate(map, 'arrival'),
        departure: _civilDate(map, 'departure'),
      );

  final String guestId;
  final String displayName;

  /// Property-local calendar dates, not instants.
  final DateTime arrival;
  final DateTime departure;
}

final _civilDatePattern = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$');

DateTime _civilDate(Map<Object?, Object?> map, String field) {
  final match = _civilDatePattern.firstMatch(requiredString(map, field));
  if (match == null) throw FormatException('Invalid $field.');
  final year = int.parse(match.group(1)!);
  final month = int.parse(match.group(2)!);
  final day = int.parse(match.group(3)!);
  final date = DateTime(year, month, day);
  if (date.year != year || date.month != month || date.day != day) {
    throw FormatException('Invalid $field.');
  }
  return date;
}
