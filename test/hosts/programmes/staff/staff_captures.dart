import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/host_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_lodging_providers.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_room_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_transport_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_hotel_board.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_controller.dart';
import 'package:catch_platform/device/connectivity_service.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod/misc.dart' show Override;

import 'staff_fixtures.dart';
import 'staff_live_fixtures.dart';

/// The staff capture fixtures: every read the staff screens make answered
/// with the boards' wedding weekend, an empty outbox and the phone online.

({T value, DateTime? snapshotAt, DateTime? snapshotExpiresAt}) _live<T>(
  T value,
) => (value: value, snapshotAt: null, snapshotExpiresAt: null);

/// Every staff read answered with the fixture data; [outbox] seeds the
/// operations outbox and [offline] the connection.
List<Override> hostStaffCaptureOverrides({
  ProgramOperationOutboxSummary outbox = const ProgramOperationOutboxSummary(
    [],
  ),
  bool offline = false,
}) => [
  uidProvider.overrideWith((ref) => Stream.value('pooja')),
  isObviouslyOfflineProvider.overrideWithValue(offline),
  programOperationsStateProvider(
    staffProgramId,
  ).overrideWithValue(AsyncData(ProgramOperationsState(outbox: outbox))),
  hostWorkAssignmentsProvider.overrideWithValue(AsyncData(staffAssignments())),
  programWorkEntryProvider(
    staffProgramId,
    null,
  ).overrideWithValue(AsyncData(_live(staffAccess()))),
  programArrivalsRosterViewProvider(
    staffProgramId,
    staffStationId,
  ).overrideWithValue(AsyncData(_live(staffRoster()))),
  programTransportPlanViewProvider(
    staffProgramId,
    staffStationId,
  ).overrideWithValue(AsyncData(_live(staffPlan()))),
  programVendorsStreamProvider(
    staffProgramId,
  ).overrideWithValue(const AsyncData(staffVendors)),
  programHotelInboundStreamProvider(
    staffProgramId,
    staffHotelId,
  ).overrideWithValue(AsyncData(staffInbound())),
  programHotelRoomsProvider(
    staffProgramId,
    staffHotelId,
  ).overrideWithValue(AsyncData(staffRooms())),
  programFunctionDoorViewWithSnapshotProvider(
    staffProgramId,
    staffSangeetId,
  ).overrideWithValue(AsyncData(_live(staffDoorView()))),
  programLiveBoardViewProvider(
    staffProgramId,
  ).overrideWithValue(AsyncData(_live(staffLiveBoard()))),
  programDeparturesRosterViewProvider(
    staffProgramId,
    staffHotelId,
  ).overrideWithValue(AsyncData(_live(staffDepartures()))),
  programLodgingHotelBoardProvider(
    staffProgramId,
    staffHotelId,
  ).overrideWithValue(AsyncData(staffHotelBoard())),
];

Widget hostStaffWorkCapture() => const StaffAssignmentsScreen();

Widget hostStaffJobsCapture() =>
    StaffJobsScreen(programId: staffProgramId, now: () => staffDayNow);

Widget hostStaffArrivalsCapture() => const StaffArrivalsScreen(
  programId: staffProgramId,
  pickupPointId: staffStationId,
  stationLabel: 'Udaipur airport',
);

Widget hostStaffDispatchCapture({bool sheet = false}) => StaffDispatchScreen(
  programId: staffProgramId,
  pickupPointId: staffStationId,
  stationLabel: 'Udaipur airport',
  openCar: sheet ? 0 : null,
);

Widget hostStaffHotelDeskCapture() => StaffHotelDeskScreen(
  programId: staffProgramId,
  hotelId: staffHotelId,
  now: () => staffDayNow,
);

Widget hostStaffDoorCapture() => const StaffDoorScreen(
  programId: staffProgramId,
  functionId: staffSangeetId,
  functionName: 'Sangeet',
);

Widget hostStaffLeadCapture() =>
    StaffLeadScreen(programId: staffProgramId, now: () => staffNightNow);

Widget hostStaffAlertsCapture() =>
    StaffAlertsScreen(programId: staffProgramId, now: () => staffNightNow);

/// No work saved on the phone.
const hostStaffCaptureOverridesEmptyOutbox = ProgramOperationOutboxSummary([]);

/// Three door changes saved while offline, for the dock badge.
ProgramOperationOutboxSummary staffOfflineOutbox() =>
    ProgramOperationOutboxSummary([
      for (final guest in ['shah', 'rao', 'bhatia'])
        ProgramOperationOutboxEntry.doorAction(
          programId: staffProgramId,
          functionId: staffSangeetId,
          guestId: guest,
          action: 'checkIn',
          clientOperationId: 'door_$guest',
          createdAt: staffNightNow,
        ),
    ]);

/// The access a test needs when it overrides only the jobs read.
ProgramWorkAccess hostStaffAccess() => staffAccess();

Widget hostStaffDeparturesCapture() => StaffDeparturesScreen(
  programId: staffProgramId,
  hotelId: staffHotelId,
  now: () => DateTime(2026, 12, 15, 9, 40),
);

Widget hostStaffHotelRoomsCapture() => const StaffHotelRoomListScreen(
  programId: staffProgramId,
  hotelId: staffHotelId,
);

/// The approved allocation at the hotel: three numbered rooms, one shared,
/// and a twin whose exact room is still to come.
ProgramLodgingHotelBoard staffHotelBoard() {
  ProgramLodgingHotelGuest guest(String id, String name) =>
      ProgramLodgingHotelGuest(
        guestId: id,
        displayName: name,
        arrival: DateTime(2026, 12, 11),
        departure: DateTime(2026, 12, 14),
      );
  ProgramLodgingHotelRoom room(
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
  return ProgramLodgingHotelBoard(
    hotelLabel: 'Lakeview Haveli',
    rooms: [
      room('u214', '214', [
        guest('mehra-a', 'Anil Mehra'),
        guest('mehra-s', 'Sunita Mehra'),
      ]),
      room('u118', '118', [guest('kapoor', 'Ritu Kapoor')]),
      room('u302', '302', [guest('sethi', 'Vikram Sethi')]),
      room('ux', null, [guest('pillai', 'Meera Pillai')]),
    ],
  );
}
