import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/programs/presentation/program_attendance_report_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import '../utility/preview.dart';

const _programId = 'program_kapoor_shah';

final _now = DateTime(2026, 2, 14, 14, 30);

final _access = ProgramWorkAccess(
  programId: _programId,
  organizerId: 'org_1',
  title: 'Kapoor–Shah Wedding',
  kind: ProgramKind.wedding,
  timezone: 'Asia/Kolkata',
  status: ProgramStatus.active,
  actorRole: ProgramActorRole.staff,
  duties: const [],
  grantExpiresAt: _now.add(const Duration(hours: 8)),
  capabilities: const {},
  pickupPoints: const [],
  hotels: const [ProgramHotel(hotelId: 'hotel_taj', name: 'Taj Palace')],
  functions: [
    ProgramFunction(
      functionId: 'fn_sangeet',
      name: 'Sangeet',
      venueName: 'The Leela Ballroom',
      startsAt: _now.add(const Duration(hours: 3)),
      endsAt: _now.add(const Duration(hours: 6)),
      checkInEnabled: true,
      status: ProgramFunctionStatus.scheduled,
      expectedCount: 80,
      checkedInCount: 61,
    ),
    ProgramFunction(
      functionId: 'fn_reception',
      name: 'Reception',
      venueName: 'The Leela Gardens',
      startsAt: _now.add(const Duration(hours: 8)),
      endsAt: _now.add(const Duration(hours: 12)),
      checkInEnabled: true,
      status: ProgramFunctionStatus.scheduled,
      expectedCount: 58,
      checkedInCount: 35,
    ),
  ],
  vehicleClasses: const [],
);

List<Override> _overrides() => [
  programProjectionClockProvider.overrideWithValue(() => _now),
  uidProvider.overrideWithValue(const AsyncData<String?>('uid_greeter')),
  isObviouslyOfflineProvider.overrideWithValue(false),
  programWorkEntryProvider(_programId, null).overrideWithValue(
    AsyncData((value: _access, snapshotAt: null, snapshotExpiresAt: null)),
  ),
  programAttendanceReportProvider(
    _programId,
  ).overrideWithValue(AsyncData(_report)),
];

final _report = ProgramAttendanceReport(
  programId: _programId,
  serverTime: _now,
  accessExpiresAt: _now.add(const Duration(hours: 8)),
  programGuests: 142,
  programInvitedGuests: 138,
  programAttendingGuests: 117,
  programCheckedInGuests: 96,
  programNoShowGuests: 4,
  functions: [
    ProgramFunctionAttendance(
      functionId: 'fn_sangeet',
      invitedGuests: 80,
      respondedGuests: 74,
      attendingGuests: 66,
      attendingHeads: 92,
      maybeGuests: 5,
      declinedGuests: 3,
      noResponseGuests: 6,
      checkedInGuests: 61,
      checkedInHeads: 84,
      noShowGuests: 2,
      expectedGuests: 63,
      walkInGuests: 1,
      walkInHeads: 1,
      exceptions: const ProgramAttendanceExceptions(
        invitedNoResponseGuestIds: ['g_21', 'g_34', 'g_40'],
        declinedCheckedInGuestIds: ['g_55'],
        noShowGuestIds: ['g_61', 'g_62'],
        walkInGuestIds: ['g_90'],
      ),
    ),
    const ProgramFunctionAttendance(
      functionId: 'fn_reception',
      invitedGuests: 58,
      respondedGuests: 55,
      attendingGuests: 51,
      attendingHeads: 70,
      maybeGuests: 2,
      declinedGuests: 2,
      noResponseGuests: 3,
      checkedInGuests: 35,
      checkedInHeads: 48,
      noShowGuests: 2,
      expectedGuests: 37,
      walkInGuests: 0,
      walkInHeads: 0,
      exceptions: ProgramAttendanceExceptions(
        invitedNoResponseGuestIds: [],
        declinedCheckedInGuestIds: [],
        noShowGuestIds: [],
        walkInGuestIds: [],
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramAttendanceReportScreen,
  path: '[P1 product surfaces]/Program attendance',
)
Widget programAttendanceReportScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramAttendanceReportScreen',
    contractId: 'screen.programs.attendance_report',
    children: [
      WidgetbookPageStateCard(
        label: 'report',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _overrides(),
            child: const ProgramAttendanceReportScreen(programId: _programId),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Row states',
  type: ProgramFunctionAttendanceRow,
  path: '[P1 product surfaces]/Program attendance',
)
Widget programFunctionAttendanceRowStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramFunctionAttendanceRow',
    catalogId: 'screen.programs.attendance_report',
    children: [
      ProgramFunctionAttendanceRow(
        attendance: _report.functions[0],
        functionName: 'Sangeet',
      ),
      ProgramFunctionAttendanceRow(
        attendance: _report.functions[1],
        functionName: 'Reception',
      ),
    ],
  );
}
