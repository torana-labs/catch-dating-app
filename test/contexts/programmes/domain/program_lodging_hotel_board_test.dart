import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_hotel_board.dart';
import 'package:flutter_test/flutter_test.dart';

Map<Object?, Object?> _row({
  String inventoryId = 'unit-101',
  Object? roomLabel = '101',
  List<Map<Object?, Object?>>? guests,
}) => {
  'partyId': 'party-$inventoryId',
  'inventoryId': inventoryId,
  'physicalRoomId': 'room-$inventoryId',
  'zoneId': 'east',
  'roomType': 'deluxe',
  'roomLabel': roomLabel,
  'guests':
      guests ??
      [
        {
          'guestId': 'asha',
          'displayName': 'Asha Verma',
          'arrival': '2026-12-11',
          'departure': '2026-12-14',
        },
      ],
};

void main() {
  test('parses the hotel name, rooms and guest names and dates', () {
    final board = ProgramLodgingHotelBoard.fromMap({
      'kind': 'hotelBoard',
      'hotelLabel': 'Lakeview Haveli',
      'rows': [_row(), _row(inventoryId: 'unit-x', roomLabel: null)],
    });
    expect(board.hotelLabel, 'Lakeview Haveli');
    expect(board.rooms.map((room) => room.roomLabel), ['101', null]);
    final guest = board.rooms.first.guests.single;
    expect(guest.displayName, 'Asha Verma');
    expect(guest.arrival, DateTime(2026, 12, 11));
    expect(guest.departure, DateTime(2026, 12, 14));
  });

  test('rejects rows without names, dates or a room label decision', () {
    Map<Object?, Object?> board(Map<Object?, Object?> row) => {
      'hotelLabel': 'Lakeview Haveli',
      'rows': [row],
    };
    final missingLabel = _row()..remove('roomLabel');
    final noName = _row(
      guests: [
        {'guestId': 'asha', 'arrival': '2026-12-11', 'departure': '2026-12-14'},
      ],
    );
    final badDate = _row(
      guests: [
        {
          'guestId': 'asha',
          'displayName': 'Asha Verma',
          'arrival': '2026-02-30',
          'departure': '2026-03-02',
        },
      ],
    );
    for (final row in [missingLabel, noName, badDate, _row(guests: [])]) {
      expect(
        () => ProgramLodgingHotelBoard.fromMap(board(row)),
        throwsFormatException,
      );
    }
    expect(
      () => ProgramLodgingHotelBoard.fromMap({
        'hotelLabel': 'Lakeview Haveli',
        'rows': [_row(), _row()],
      }),
      throwsFormatException,
    );
  });
}
