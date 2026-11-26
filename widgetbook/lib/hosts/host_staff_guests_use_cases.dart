import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_guests_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_guests_screen.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_guests_state.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

// The staff guest list at a synthetic wedding: a coordinator who adds
// guests and edits groups, and a guest relations helper who changes
// answers and shares household links.

final _now = DateTime(2026, 12, 12, 10);

ProgramWorkAccess _access(ProgramStaffDuty duty) => ProgramWorkAccess(
  programId: 'program_synthetic',
  organizerId: 'org_synthetic',
  title: 'Synthetic wedding',
  kind: ProgramKind.wedding,
  timezone: 'Asia/Kolkata',
  status: ProgramStatus.active,
  actorRole: ProgramActorRole.staff,
  duties: [
    ProgramDutyAssignment(
      duty: duty,
      pickupPointIds: const {},
      hotelIds: const {},
      functionIds: const {},
      expiresAt: _now.add(const Duration(days: 3)),
    ),
  ],
  grantExpiresAt: _now.add(const Duration(days: 3)),
  capabilities: const {},
  pickupPoints: const [],
  hotels: const [ProgramHotel(hotelId: 'hotel_lake', name: 'Lakeview')],
  functions: [
    for (final (id, name, day) in [
      ('mehendi', 'Mehendi', 0),
      ('sangeet', 'Sangeet', 0),
      ('wedding', 'Wedding', 1),
    ])
      ProgramFunction(
        functionId: id,
        name: name,
        startsAt: _now.add(Duration(days: day, hours: 6)),
        endsAt: _now.add(Duration(days: day, hours: 9)),
        checkInEnabled: true,
        status: ProgramFunctionStatus.scheduled,
        expectedCount: 40,
        checkedInCount: 0,
      ),
  ],
  vehicleClasses: const [],
);

ProgramGuestRow _guest(String id, String name, String? household) =>
    ProgramGuestRow(
      guestId: id,
      displayName: name,
      householdId: household,
      groupIds: const ['bride'],
      invitationStatus: 'invited',
      rsvpStatus: 'pending',
      revision: 1,
    );

final _page = ProgramGuestListPage(
  programId: 'program_synthetic',
  guests: [
    _guest('asha', 'Asha Mehra', 'mehra'),
    _guest('vikram', 'Vikram Mehra', 'mehra'),
    _guest('nina', 'Nina Rao', null),
  ],
  households: const [
    ProgramHouseholdRow(
      householdId: 'mehra',
      label: 'The Mehra family',
      memberGuestIds: ['asha', 'vikram'],
      revision: 1,
    ),
  ],
  functionGuests: const [
    ProgramFunctionGuestRow(
      guestId: 'asha',
      functionId: 'sangeet',
      invited: true,
      rsvpStatus: 'attending',
      attendanceStatus: 'unknown',
    ),
    ProgramFunctionGuestRow(
      guestId: 'vikram',
      functionId: 'sangeet',
      invited: true,
      rsvpStatus: 'maybe',
      attendanceStatus: 'unknown',
    ),
  ],
  groups: const [
    ProgramGuestGroupRow(
      groupId: 'bride',
      label: 'Bride side',
      dimension: 'side',
      memberCount: 3,
      revision: 2,
      hotelId: 'hotel_lake',
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Coordinator',
  type: StaffGuestsBody,
  path: '[P1 product surfaces]/Host/Programmes/Staff',
)
Widget staffGuestsBodyUseCase(BuildContext context) => CatchRoot(
  format: CatchFormat.nightsOut,
  child: CatchScreen(
    body: StaffGuestsBody(
      state: StaffGuestsState.from(
        access: _access(ProgramStaffDuty.programCoordinator),
        page: _page,
        now: _now,
      ),
      onRetry: () {},
      onEditGuest: (_, _) {},
      onShareLink: (_) {},
      onAddGuest: () {},
      onEditGroup: (_) {},
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Guest relations',
  type: StaffGuestsScreen,
  path: '[P1 product surfaces]/Host/Programmes/Staff',
)
Widget staffGuestsScreenUseCase(BuildContext context) => ProviderScope(
  overrides: [
    programWorkEntryProvider('program_synthetic', null).overrideWithValue(
      AsyncData((
        value: _access(ProgramStaffDuty.guestRelations),
        snapshotAt: null,
        snapshotExpiresAt: null,
      )),
    ),
    programGuestListProvider(
      'program_synthetic',
    ).overrideWithValue(AsyncData(_page)),
  ],
  child: StaffGuestsScreen(programId: 'program_synthetic', now: () => _now),
);
