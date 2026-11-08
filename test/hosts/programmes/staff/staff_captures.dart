import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/host_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
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
  programTransportVendorsProvider(
    'meher-shah',
    staffProgramId,
  ).overrideWithValue(const AsyncData(staffVendors)),
  programHotelInboundProvider(
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
