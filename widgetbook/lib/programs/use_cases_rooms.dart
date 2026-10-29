import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/programs/presentation/program_hotel_rooms_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import '../utility/preview.dart';

const _programId = 'program_kapoor_shah';
const _hotelId = 'hotel_taj';

final _now = DateTime(2026, 2, 14, 14, 30);

final _roomBlocks = <ProgramRoomBlock>[
  ProgramRoomBlock(
    roomBlockId: 'blk_bride',
    label: 'Bride family',
    roomType: 'Suite',
    totalRooms: 8,
    assignedCount: 5,
    remainingRooms: 3,
    heldForGroupIds: const ['grp_bride'],
    startsAt: _now.add(const Duration(days: 1)),
    endsAt: _now.add(const Duration(days: 3)),
  ),
  ProgramRoomBlock(
    roomBlockId: 'blk_general',
    label: 'General inventory',
    roomType: null,
    totalRooms: 20,
    assignedCount: 20,
    remainingRooms: 0,
    heldForGroupIds: const [],
    startsAt: _now.add(const Duration(days: 1)),
    endsAt: _now.add(const Duration(days: 3)),
  ),
];

final _stay = ProgramStay(
  stayId: 'stay_rao',
  guestId: 'guest_nisha',
  guestDisplayName: 'Nisha Rao',
  roomBlockId: 'blk_bride',
  roomLabel: '512',
  status: ProgramStayStatus.confirmed,
  startsAt: _now.add(const Duration(days: 1)),
  endsAt: _now.add(const Duration(days: 3)),
  roomReadyAt: _now.subtract(const Duration(minutes: 20)),
  hotelArrivedAt: null,
  revision: 2,
);

final _rooms = ProgramHotelRooms(
  programId: _programId,
  hotelId: _hotelId,
  hotelName: 'Taj Palace',
  accessExpiresAt: _now.add(const Duration(hours: 8)),
  generatedAt: _now,
  roomBlocks: _roomBlocks,
  stays: [
    _stay,
    ProgramStay(
      stayId: 'stay_sharma',
      guestId: 'guest_rohan',
      guestDisplayName: 'Rohan Sharma',
      roomBlockId: null,
      roomLabel: 'Lobby 12',
      status: ProgramStayStatus.checkedIn,
      startsAt: _now.subtract(const Duration(hours: 3)),
      endsAt: _now.add(const Duration(days: 2)),
      roomReadyAt: _now.subtract(const Duration(hours: 4)),
      hotelArrivedAt: _now.subtract(const Duration(hours: 3)),
      revision: 4,
    ),
  ],
  unplacedGuests: const [
    ProgramUnplacedGuest(
      guestId: 'guest_vikram',
      displayName: 'Vikram Rao',
      suggestedRoomBlockId: 'blk_bride',
    ),
  ],
);

List<Override> _overrides() => [
  programProjectionClockProvider.overrideWithValue(() => _now),
  uidProvider.overrideWithValue(const AsyncData<String?>('uid_desk')),
  isObviouslyOfflineProvider.overrideWithValue(false),
  programHotelRoomsProvider(
    _programId,
    _hotelId,
  ).overrideWithValue(AsyncData(_rooms)),
];

@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramHotelRoomsScreen,
  path: '[P1 product surfaces]/Program hotel rooms',
)
Widget programHotelRoomsScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramHotelRoomsScreen',
    contractId: 'screen.programs.hotel_rooms',
    children: [
      WidgetbookPageStateCard(
        label: 'room board',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _overrides(),
            child: const ProgramHotelRoomsScreen(
              programId: _programId,
              hotelId: _hotelId,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Row states',
  type: ProgramUnplacedGuestRow,
  path: '[P1 product surfaces]/Program hotel rooms',
)
Widget programUnplacedGuestRowStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramUnplacedGuestRow',
    catalogId: 'screen.programs.hotel_rooms',
    children: [
      ProviderScope(
        overrides: _overrides(),
        child: ProgramUnplacedGuestRow(
          guest: _rooms.unplacedGuests.first,
          rooms: _rooms,
          onChanged: () {},
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Row states',
  type: ProgramStayRow,
  path: '[P1 product surfaces]/Program hotel rooms',
)
Widget programStayRowStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramStayRow',
    catalogId: 'screen.programs.hotel_rooms',
    children: [
      ProviderScope(
        overrides: _overrides(),
        child: Column(
          children: [
            for (final stay in _rooms.stays)
              ProgramStayRow(stay: stay, rooms: _rooms, onChanged: () {}),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Row states',
  type: ProgramRoomBlockRow,
  path: '[P1 product surfaces]/Program hotel rooms',
)
Widget programRoomBlockRowStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramRoomBlockRow',
    catalogId: 'screen.programs.hotel_rooms',
    children: [
      ProviderScope(
        overrides: _overrides(),
        child: Column(
          children: [
            for (final block in _roomBlocks) ProgramRoomBlockRow(block: block),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Sheet states',
  type: ProgramStaySheet,
  path: '[P1 product surfaces]/Program hotel rooms',
)
Widget programStaySheetStates(BuildContext context) {
  return ProviderScope(
    overrides: _overrides(),
    child: WidgetbookUtilitySheetFrame(
      child: ProgramStaySheet(
        programId: _programId,
        hotelId: _hotelId,
        blocks: _roomBlocks,
        guestId: 'guest_vikram',
        guestDisplayName: 'Vikram Rao',
        suggestedRoomBlockId: 'blk_bride',
        onChanged: () {},
      ),
    ),
  );
}
