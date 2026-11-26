import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/parts/programme_guest_groups_section.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_group_sheet.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_guest_sheet.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../utility/fixtures.dart';

const _organizerId = 'org_kapoor';
const _programId = 'program_kapoor_shah';
const _functionId = 'fn_sangeet';

final _now = DateTime(2026, 2, 14, 14, 30);

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
    venueName: 'The Lakeshore Ballroom',
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
    hotelId: 'hotel_harbourview',
    name: 'Harbourview Palace',
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
  name: 'Add a guest',
  type: HostProgrammeGuestSheet,
  path: '[P1 product surfaces]/Program guests',
)
Widget hostProgrammeGuestSheetStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostProgrammeGuestSheet',
    contractId: 'component.host.programme.guests',
    children: [
      WidgetbookPageStateCard(
        label: 'households and groups',
        child: _DialogFrame(
          child: HostProgrammeGuestSheet(
            households: _guestPage.households,
            groups: _guestPage.groups,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'New and existing group',
  type: HostProgrammeGroupSheet,
  path: '[P1 product surfaces]/Program guests',
)
Widget hostProgrammeGroupSheetStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostProgrammeGroupSheet',
    contractId: 'component.host.programme.guests',
    children: [
      WidgetbookPageStateCard(
        label: 'new group',
        child: _DialogFrame(child: HostProgrammeGroupSheet(hotels: _hotels)),
      ),
      if (_guestPage.groups.isNotEmpty)
        WidgetbookPageStateCard(
          label: 'existing group',
          child: _DialogFrame(
            child: HostProgrammeGroupSheet(
              hotels: _hotels,
              group: _guestPage.groups.first,
            ),
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Groups with hotels',
  type: ProgrammeGuestGroupsSection,
  path: '[P1 product surfaces]/Program guests',
)
Widget programmeGuestGroupsSectionStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgrammeGuestGroupsSection',
    contractId: 'component.host.programme.guests',
    children: [
      WidgetbookPageStateCard(
        label: 'editable',
        child: ProgrammeGuestGroupsSection(
          groups: _guestPage.groups,
          hotels: _hotels,
          onEditGroup: (_) {},
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'none yet, read-only',
        child: ProgrammeGuestGroupsSection(groups: [], hotels: []),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Guests with no household',
  type: ProgrammeNoHouseholdSection,
  path: '[P1 product surfaces]/Program guests',
)
Widget programmeNoHouseholdSectionStates(BuildContext context) {
  final state = HostProgrammeState(
    status: HostProgrammeStatus.ready,
    detail: _detail,
    guests: _guestPage,
  );
  return WidgetbookPageCatalogFrame(
    title: 'ProgrammeNoHouseholdSection',
    contractId: 'component.host.programme.guests',
    children: [
      WidgetbookPageStateCard(
        label: 'guests on their own',
        child: ProgrammeNoHouseholdSection(
          state: state,
          guests: _guestPage.guests.take(2).toList(),
          onEditGuest: (_) {},
        ),
      ),
    ],
  );
}
