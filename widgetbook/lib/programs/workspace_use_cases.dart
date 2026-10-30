import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/programs/presentation/program_guest_desk_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_guest_edit_dialog.dart';
import 'package:catch_dating_app/programs/presentation/program_guest_group_edit_dialog.dart';
import 'package:catch_dating_app/programs/presentation/program_guests_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_import_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_team_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_workspace_screen.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import '../utility/fixtures.dart';
import '../utility/preview.dart';

const _organizerId = 'org_kapoor';
const _programId = 'program_kapoor_shah';
const _functionId = 'fn_sangeet';

final _now = DateTime(2026, 2, 14, 14, 30);

final _organizer = Organizer(
  id: _organizerId,
  name: 'Kapoor Family',
  description: 'Wedding family organizer.',
  location: 'in-mh-mumbai',
  area: 'Mumbai',
  hostUserId: 'uid_org',
  createdAt: _now,
);

final _program = OrganizerProgramSettings(
  organizerId: _organizerId,
  programId: _programId,
  kind: ProgramKind.wedding,
  title: 'Kapoor–Shah Wedding',
  timezone: 'Asia/Kolkata',
  status: ProgramStatus.active,
  startsAt: _now,
  endsAt: _now.add(const Duration(days: 3)),
  capabilities: const ['arrivalsTransport'],
  revision: 3,
);

final _functions = [
  OrganizerFunctionDetail(
    functionId: _functionId,
    name: 'Sangeet',
    startsAt: _now.add(const Duration(hours: 3)),
    endsAt: _now.add(const Duration(hours: 6)),
    venueName: 'The Leela Ballroom',
    status: ProgramFunctionStatus.scheduled,
    invitationMode: 'selectedGuests',
    checkInEnabled: true,
    expectedCount: 12,
    checkedInCount: 4,
    dressCode: 'Festive',
    revision: 2,
  ),
  OrganizerFunctionDetail(
    functionId: 'fn_ceremony',
    name: 'Ceremony',
    startsAt: _now.add(const Duration(days: 1, hours: 2)),
    endsAt: _now.add(const Duration(days: 1, hours: 5)),
    venueName: 'Lakeside Pavilion',
    status: ProgramFunctionStatus.scheduled,
    invitationMode: 'allGuests',
    checkInEnabled: false,
    revision: 1,
  ),
];

final _guestFunctions = [
  for (final fn in _functions)
    ProgramGuestsFunction(functionId: fn.functionId, name: fn.name),
];

final _stations = [
  const ProgramStation(
    pickupPointId: 'pp_del_t3',
    label: 'Delhi IGI Terminal 3',
    kind: 'airport',
    iataCode: 'DEL',
    terminal: 'T3',
    meetingZone: 'Pillar 12 arrivals forecourt',
    instructions: 'Greeter holds a "Kapoor–Shah" placard.',
    active: true,
    revision: 4,
  ),
  const ProgramStation(
    pickupPointId: 'pp_ndls',
    label: 'New Delhi Railway Exit 4',
    kind: 'railway',
    active: false,
    revision: 1,
  ),
];

final _hotels = [
  const ProgramHotel(
    hotelId: 'hotel_taj',
    name: 'Taj Palace',
    address: '2 Sardar Patel Marg, Chanakyapuri',
    receptionContact: '+91 11 2611 0202',
    active: true,
    revision: 6,
  ),
];

final _detail = OrganizerProgramDetail(
  program: _program,
  functions: _functions,
  pickupPoints: _stations,
  hotels: _hotels,
  counts: const {
    'guests': 4,
    'households': 2,
    'inboundLegs': 3,
    'activeStaff': 2,
  },
);

final _deskAccess = ProgramWorkAccess(
  programId: _programId,
  organizerId: 'org_1',
  title: 'Kapoor–Shah Wedding',
  kind: ProgramKind.wedding,
  timezone: 'Asia/Kolkata',
  status: ProgramStatus.active,
  actorRole: ProgramActorRole.staff,
  duties: [
    ProgramDutyAssignment(
      duty: ProgramStaffDuty.guestRelations,
      pickupPointIds: const {},
      hotelIds: const {},
      functionIds: const {},
      expiresAt: _now.add(const Duration(hours: 8)),
    ),
  ],
  grantExpiresAt: _now.add(const Duration(hours: 8)),
  capabilities: const {},
  pickupPoints: const [],
  hotels: const [ProgramHotel(hotelId: 'hotel_taj', name: 'Taj Palace')],
  functions: [
    ProgramFunction(
      functionId: _functionId,
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
      functionId: 'fn_ceremony',
      name: 'Ceremony',
      venueName: 'Lakeside Pavilion',
      startsAt: _now.add(const Duration(days: 1, hours: 2)),
      endsAt: _now.add(const Duration(days: 1, hours: 5)),
      checkInEnabled: false,
      status: ProgramFunctionStatus.scheduled,
      expectedCount: 60,
      checkedInCount: 0,
    ),
  ],
  vehicleClasses: const [],
);

final _summaries = [
  OrganizerProgramSummary(
    programId: _programId,
    title: 'Kapoor–Shah Wedding',
    kind: ProgramKind.wedding,
    status: ProgramStatus.active,
    revision: 1,
  ),
  OrganizerProgramSummary(
    programId: 'program_aisle_summit',
    title: 'Aisle Summit 2026',
    kind: ProgramKind.corporate,
    status: ProgramStatus.draft,
    revision: 1,
  ),
];

ProgramGuestRow _guest(
  String id,
  String name, {
  String? householdId,
  List<String> groupIds = const [],
}) => ProgramGuestRow(
  guestId: id,
  displayName: name,
  householdId: householdId,
  groupIds: groupIds,
  invitationStatus: 'invited',
  rsvpStatus: 'attending',
  revision: 1,
);

final _guestPage = ProgramGuestListPage(
  programId: _programId,
  guests: [
    _guest(
      'g_rohan',
      'Rohan Sharma',
      householdId: 'hh_sharma',
      groupIds: const ['grp_groom'],
    ),
    _guest('g_nisha', 'Nisha Rao', householdId: 'hh_rao'),
    _guest('g_priya', 'Priya Kapoor'),
  ],
  households: const [
    ProgramHouseholdRow(
      householdId: 'hh_sharma',
      label: 'Sharma household',
      memberGuestIds: ['g_rohan'],
      revision: 1,
    ),
    ProgramHouseholdRow(
      householdId: 'hh_rao',
      label: 'Rao household',
      memberGuestIds: ['g_nisha'],
      revision: 1,
    ),
  ],
  functionGuests: const [
    ProgramFunctionGuestRow(
      guestId: 'g_rohan',
      functionId: _functionId,
      invited: true,
      rsvpStatus: 'attending',
      attendanceStatus: 'expected',
      partySize: 3,
    ),
    ProgramFunctionGuestRow(
      guestId: 'g_nisha',
      functionId: _functionId,
      invited: true,
      rsvpStatus: 'maybe',
      attendanceStatus: 'expected',
    ),
    ProgramFunctionGuestRow(
      guestId: 'g_priya',
      functionId: 'fn_ceremony',
      invited: true,
      rsvpStatus: 'pending',
      attendanceStatus: 'expected',
    ),
  ],
  groups: const [
    ProgramGuestGroupRow(
      groupId: 'grp_groom',
      label: "Groom's side",
      dimension: 'side',
      memberCount: 1,
      revision: 1,
    ),
    ProgramGuestGroupRow(
      groupId: 'grp_college',
      label: 'College friends',
      dimension: 'relation',
      memberCount: 0,
      revision: 1,
    ),
  ],
);

final _staff = ProgramStaffList(
  programId: _programId,
  nextCursor: null,
  members: [
    ProgramStaffMember(
      uid: 'uid_arjun',
      displayName: 'Arjun Mehta',
      phoneLastFour: '2841',
      duties: [
        ProgramDutyAssignment(
          duty: ProgramStaffDuty.functionCheckIn,
          pickupPointIds: const {},
          hotelIds: const {},
          functionIds: const {_functionId},
          expiresAt: _now.add(const Duration(hours: 8)),
        ),
      ],
      status: ProgramStaffStatus.active,
      expiresAt: _now.add(const Duration(days: 4)),
      revision: 1,
    ),
    ProgramStaffMember(
      uid: 'uid_dev',
      displayName: '',
      phoneLastFour: '9930',
      duties: [
        ProgramDutyAssignment(
          duty: ProgramStaffDuty.hotelDesk,
          pickupPointIds: const {},
          hotelIds: const {},
          functionIds: const {},
          expiresAt: _now.add(const Duration(days: 4)),
        ),
      ],
      status: ProgramStaffStatus.active,
      expiresAt: _now.add(const Duration(days: 4)),
      revision: 2,
    ),
  ],
);

const _importResult = ProgramManifestImportResult(
  mode: 'commit',
  totalRows: 12,
  guestsCreated: 9,
  guestsUpdated: 3,
  legsCreated: 4,
  legsUpdated: 1,
  householdsCreated: 2,
  partiesCreated: 1,
  groupsCreated: 2,
  rowErrors: [
    (index: 7, message: 'missing displayName'),
    (index: 10, message: 'unparseable arrival time'),
  ],
  alreadyApplied: false,
);

List<Override> _workspaceOverrides() => [
  uidProvider.overrideWithValue(const AsyncData<String?>('uid_org')),
  hostOperableOrganizersProvider('uid_org').overrideWithValue(AsyncData([_organizer])),
  organizerProgramListProvider(
    _organizerId,
  ).overrideWithValue(AsyncData(_summaries)),
  organizerProgramDetailProvider(
    _programId,
  ).overrideWithValue(AsyncData(_detail)),
  programGuestListProvider(_programId).overrideWithValue(AsyncData(_guestPage)),
  programStaffListProvider(_programId).overrideWithValue(AsyncData(_staff)),
];

class _DialogFrame extends StatelessWidget {
  const _DialogFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return ColoredBox(
      color: t.ink.withValues(alpha: CatchOpacity.confirmDialogScrim),
      child: SizedBox(
        height: widgetbookUtilityDialogFrameHeight,
        child: Center(child: child),
      ),
    );
  }
}

@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramWorkspaceScreen,
  path: '[P1 product surfaces]/Program workspace',
)
Widget programWorkspaceScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramWorkspaceScreen',
    contractId: 'screen.programs.workspace',
    children: [
      WidgetbookPageStateCard(
        label: 'multi-day program',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _workspaceOverrides(),
            child: const ProgramWorkspaceScreen(programId: _programId),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Body states',
  type: ProgramWorkspacePageBody,
  path: '[P1 product surfaces]/Program workspace',
)
Widget programWorkspacePageBodyStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramWorkspacePageBody',
    contractId: 'screen.programs.workspace',
    children: [
      WidgetbookPageStateCard(
        label: 'day rail + functions',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _workspaceOverrides(),
            child: ProgramWorkspacePageBody(programDetail: _detail),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Function tile',
  type: ProgramWorkspaceFunctionTile,
  path: '[P1 product surfaces]/Program workspace',
)
Widget programWorkspaceFunctionTileStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramWorkspaceFunctionTile',
    catalogId: 'screen.programs.workspace',
    children: [
      ProgramWorkspaceFunctionTile(
        function: _functions[0],
        onEdit: () {},
        onInvitations: () {},
      ),
      ProgramWorkspaceFunctionTile(
        function: _functions[1],
        onEdit: () {},
        onInvitations: () {},
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Function edit dialog',
  type: ProgramFunctionEditDialog,
  path: '[P1 product surfaces]/Program workspace',
)
Widget programFunctionEditDialogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramFunctionEditDialog',
    contractId: 'screen.programs.workspace',
    children: [
      WidgetbookPageStateCard(
        label: 'edit existing',
        child: _DialogFrame(
          child: ProgramFunctionEditDialog(existing: _functions[0]),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramGuestsScreen,
  path: '[P1 product surfaces]/Program guests',
)
Widget programGuestsScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramGuestsScreen',
    contractId: 'screen.programs.guests',
    children: [
      WidgetbookPageStateCard(
        label: 'household grid',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _workspaceOverrides(),
            child: const ProgramGuestsScreen(programId: _programId),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramGuestDeskScreen,
  path: '[P1 product surfaces]/Program guests',
)
Widget programGuestDeskScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramGuestDeskScreen',
    contractId: 'screen.programs.guests',
    children: [
      for (final scenario in [
        (label: 'Expired guest relations duty', access: _deskAccess),
        (
          label: 'Manager access',
          access: ProgramWorkAccess(
            programId: _deskAccess.programId,
            organizerId: _deskAccess.organizerId,
            title: _deskAccess.title,
            kind: _deskAccess.kind,
            timezone: _deskAccess.timezone,
            status: _deskAccess.status,
            actorRole: ProgramActorRole.manager,
            duties: const [],
            grantExpiresAt: null,
            capabilities: _deskAccess.capabilities,
            pickupPoints: _deskAccess.pickupPoints,
            hotels: _deskAccess.hotels,
            functions: _deskAccess.functions,
            vehicleClasses: _deskAccess.vehicleClasses,
          ),
        ),
      ])
        WidgetbookPageStateCard(
          label: scenario.label,
          child: WidgetbookUtilityDeviceFrame(
            child: ProviderScope(
              overrides: [
                ..._workspaceOverrides(),
                programWorkEntryProvider(_programId, null).overrideWithValue(
                  AsyncData((
                    value: scenario.access,
                    snapshotAt: null,
                    snapshotExpiresAt: null,
                  )),
                ),
              ],
              child: const ProgramGuestDeskScreen(programId: _programId),
            ),
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Body states',
  type: ProgramGuestsPageBody,
  path: '[P1 product surfaces]/Program guests',
)
Widget programGuestsPageBodyStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramGuestsPageBody',
    contractId: 'screen.programs.guests',
    children: [
      WidgetbookPageStateCard(
        label: 'grid populated',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _workspaceOverrides(),
            child: ProgramGuestsPageBody(
              programId: _programId,
              programTitle: _detail.program.title,
              functions: _guestFunctions,
              hotels: _detail.hotels,
              guestPage: _guestPage,
              canManageGuests: true,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Function row',
  type: ProgramGuestsFunctionRow,
  path: '[P1 product surfaces]/Program guests',
)
Widget programGuestsFunctionRowStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramGuestsFunctionRow',
    catalogId: 'screen.programs.guests',
    children: [
      for (final status in [
        'attending',
        'declined',
        'maybe',
        'pending',
        'notInvited',
      ])
        ProgramGuestsFunctionRow(
          guest: _guestPage.guests[0],
          functions: _guestFunctions,
          selectedFunction: _guestFunctions[0],
          joinIndex: {
            'g_rohan:fn_sangeet': ProgramFunctionGuestRow(
              guestId: 'g_rohan',
              functionId: 'fn_sangeet',
              invited: status != 'notInvited',
              rsvpStatus: status == 'notInvited' ? 'attending' : status,
              attendanceStatus: 'expected',
            ),
          },
          pending: false,
          onRsvp: (_, _) {},
        ),
      ProgramGuestsFunctionRow(
        guest: _guestPage.guests[1],
        functions: _guestFunctions,
        selectedFunction: _guestFunctions[0],
        joinIndex: const {},
        pending: true,
        onRsvp: (_, _) {},
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Guest edit dialog',
  type: ProgramGuestEditDialog,
  path: '[P1 product surfaces]/Program guests',
)
Widget programGuestEditDialogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramGuestEditDialog',
    contractId: 'screen.programs.guests',
    children: [
      WidgetbookPageStateCard(
        label: 'with households + groups',
        child: _DialogFrame(
          child: ProgramGuestEditDialog(
            households: _guestPage.households,
            groups: _guestPage.groups,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Group edit dialog',
  type: ProgramGuestGroupEditDialog,
  path: '[P1 product surfaces]/Program guests',
)
Widget programGuestGroupEditDialogStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'ProgramGuestGroupEditDialog',
    contractId: 'screen.programs.guests',
    children: [
      WidgetbookPageStateCard(
        label: 'new group',
        child: _DialogFrame(
          child: ProgramGuestGroupEditDialog(
            hotels: [ProgramHotel(hotelId: 'hotel_taj', name: 'Taj Palace')],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramTeamScreen,
  path: '[P1 product surfaces]/Program team',
)
Widget programTeamScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramTeamScreen',
    contractId: 'screen.programs.team',
    children: [
      WidgetbookPageStateCard(
        label: 'staff roster',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _workspaceOverrides(),
            child: const ProgramTeamScreen(programId: _programId),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Body states',
  type: ProgramTeamPageBody,
  path: '[P1 product surfaces]/Program team',
)
Widget programTeamPageBodyStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramTeamPageBody',
    contractId: 'screen.programs.team',
    children: [
      WidgetbookPageStateCard(
        label: 'two members',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _workspaceOverrides(),
            child: ProgramTeamPageBody(programId: _programId, staff: _staff),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Access dialog',
  type: ProgramStaffAccessDialog,
  path: '[P1 product surfaces]/Program team',
)
Widget programStaffAccessDialogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramStaffAccessDialog',
    contractId: 'screen.programs.team',
    children: const [
      WidgetbookPageStateCard(
        label: 'grant access',
        child: _DialogFrame(child: ProgramStaffAccessDialog(invite: false)),
      ),
      WidgetbookPageStateCard(
        label: 'invite',
        child: _DialogFrame(child: ProgramStaffAccessDialog(invite: true)),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramImportScreen,
  path: '[P1 product surfaces]/Program import',
)
Widget programImportScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramImportScreen',
    contractId: 'screen.programs.import',
    children: const [
      WidgetbookPageStateCard(
        label: 'empty picker',
        child: WidgetbookUtilityDeviceFrame(
          child: ProgramImportScreen(programId: _programId),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Result section',
  type: ProgramImportResultSection,
  path: '[P1 product surfaces]/Program import',
)
Widget programImportResultSectionStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramImportResultSection',
    catalogId: 'screen.programs.import',
    children: const [ProgramImportResultSection(result: _importResult)],
  );
}
