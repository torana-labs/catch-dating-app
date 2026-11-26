import 'package:catch_dating_app/contexts/programmes/data/program_lodging_providers.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_hotel_board.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_hotel_room_list_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_hotel_room_list_screen.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_hotel_room_list_state.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

// The hotel desk's read-only room list for a fictional wedding: three
// numbered rooms, one shared, and a twin whose exact room is still to come.

const _path = '[P1 product surfaces]/Host/Programmes/Staff';
const _programId = 'program-sample';
const _hotelId = 'hotel-sample';

ProgramLodgingHotelGuest _guest(String id, String name) =>
    ProgramLodgingHotelGuest(
      guestId: id,
      displayName: name,
      arrival: DateTime(2026, 12, 11),
      departure: DateTime(2026, 12, 14),
    );

ProgramLodgingHotelRoom _room(
  String id,
  String? label,
  List<ProgramLodgingHotelGuest> guests,
) => ProgramLodgingHotelRoom(
  partyId: 'party-$id',
  inventoryId: id,
  roomType: 'Deluxe twin',
  roomLabel: label,
  guests: guests,
);

final _board = ProgramLodgingHotelBoard(
  hotelLabel: 'Lakeview Haveli',
  rooms: [
    _room('u214', '214', [
      _guest('mehra-a', 'Anil Mehra'),
      _guest('mehra-s', 'Sunita Mehra'),
    ]),
    _room('u118', '118', [_guest('kapoor', 'Ritu Kapoor')]),
    _room('u302', '302', [_guest('sethi', 'Vikram Sethi')]),
    _room('ux', null, [_guest('pillai', 'Meera Pillai')]),
  ],
);

@widgetbook.UseCase(
  name: 'Four allocated rooms',
  type: StaffHotelRoomListScreen,
  path: _path,
)
Widget hostStaffHotelRoomListScreenUseCase(BuildContext context) =>
    ProviderScope(
      overrides: [
        programLodgingHotelBoardProvider(
          _programId,
          _hotelId,
        ).overrideWithValue(AsyncData(_board)),
      ],
      child: const StaffHotelRoomListScreen(
        programId: _programId,
        hotelId: _hotelId,
      ),
    );

@widgetbook.UseCase(
  name: 'Searching for a family',
  type: StaffHotelRoomListBody,
  path: _path,
)
Widget hostStaffHotelRoomListBodyUseCase(BuildContext context) => CatchRoot(
  theme: CatchThemeMode.night,
  format: CatchFormat.nightsOut,
  child: CatchScreen(
    bodyScrolls: false,
    body: StaffHotelRoomListBody(
      state: StaffHotelRoomListState.fromBoard(_board, query: 'mehra'),
      onSearch: (_) {},
      onRetry: () {},
    ),
  ),
);
