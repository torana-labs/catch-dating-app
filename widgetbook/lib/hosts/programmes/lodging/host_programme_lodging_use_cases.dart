import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_lodging_providers.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_lodging_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_board.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_review.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_setup.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_grid.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_membership_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_setup_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_state.dart';
import 'package:catch_test_support/programmes/program_operations_fixture.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

// The stay planner for a fictional wedding: two hotels, three rooms on the
// first hotel's floor, and three room-sharing parties.

const _path = '[P1 product surfaces]/Host/Programmes/Stay planner';
const _programId = 'program-sample';
const _organizerId = 'organizer-sample';
final _proposalId = List.filled(64, 'a').join();
const _scope = {'programId': _programId, 'organizerId': _organizerId};
const _revisions = {'source': 1, 'inventory': 1, 'layout': 1, 'published': 0};

Map<String, Object?> _room(String id, String hotelId, double x) => {
  'id': id,
  'hotelId': hotelId,
  'zoneId': 'east',
  'building': 'Main',
  'floor': '1',
  'wing': null,
  'roomType': 'twin',
  'beds': 2,
  'maxOccupants': 2,
  'verifiedFeatures': <Object?>[],
  'resourceIds': [id],
  'position': {'x': x, 'y': 0.2},
};

Map<String, Object?> _unit(String id, String roomId, String contractId) => {
  'id': id,
  'physicalRoomId': roomId,
  'provisional': null,
  'contractId': contractId,
  'availability': <Object?>[],
};

final ProgramLodgingReview _review = ProgramLodgingReview.fromCallableData({
  'kind': 'proposal',
  'proposal': {
    'id': _proposalId,
    'scope': _scope,
    'revisions': _revisions,
    'placements': [
      {'partyId': 'mehra', 'inventoryId': 'u101'},
      {'partyId': 'shah', 'inventoryId': 'u201'},
    ],
    'unplacedPartyIds': ['iyer'],
    'explanations': ['Meera Iyer needs a step-free room; none is free.'],
    'score': [0, 0],
    'search': {'complete': true, 'explored': 12},
  },
  'context': {
    'snapshot': {
      'scope': _scope,
      'revisions': _revisions,
      'parties': [
        {
          'id': 'mehra',
          'guestIds': ['kamla', 'neha'],
        },
        {
          'id': 'shah',
          'guestIds': ['priya', 'rohan'],
        },
        {
          'id': 'iyer',
          'guestIds': ['meera'],
        },
      ],
      'published': [
        {
          'partyId': 'shah',
          'inventoryId': 'u201',
          'locked': false,
          'checkedIn': true,
        },
      ],
      'rooms': [
        _room('r101', 'haveli', 0.1),
        _room('r103', 'haveli', 0.5),
        _room('r105', 'haveli', 0.9),
        _room('r201', 'palace', 0.1),
      ],
      'inventory': [
        _unit('u101', 'r101', 'haveli-block'),
        _unit('u103', 'r103', 'haveli-block'),
        _unit('u105', 'r105', 'haveli-block'),
        _unit('u201', 'r201', 'palace-block'),
      ],
    },
    'configuration': {
      ..._scope,
      'labels': [
        {'inventoryId': 'u101', 'roomLabel': '101'},
        {'inventoryId': 'u103', 'roomLabel': '103'},
        {'inventoryId': 'u105', 'roomLabel': '105'},
        {'inventoryId': 'u201', 'roomLabel': '201'},
      ],
    },
    'workflow': {
      'revision': 1,
      'approvedProposalId': _proposalId,
      'confirmedHotelIds': ['haveli'],
      'guestPublishedProposalId': null,
    },
    'labels': {
      'guests': {
        'kamla': 'Kamla Mehra',
        'neha': 'Neha Mehra',
        'priya': 'Priya Shah',
        'rohan': 'Rohan Shah',
        'meera': 'Meera Iyer',
      },
      'hotels': {'haveli': 'Lakeview Haveli', 'palace': 'Lakeshore Palace'},
      'groups': <String, Object?>{},
    },
    'accessExpiresAtMillis': null,
  },
});

final ProgramLodgingCatalog _catalog = ProgramLodgingCatalog.fromMap({
  'programId': _programId,
  'organizerId': _organizerId,
  'timezone': 'Asia/Kolkata',
  'calendarDates': {
    '1796083200000': '2026-12-01',
    '1796342400000': '2026-12-04',
  },
  'guests': [
    {'id': 'kamla', 'label': 'Kamla Mehra'},
    {'id': 'neha', 'label': 'Neha Mehra'},
    {'id': 'meera', 'label': 'Meera Iyer'},
  ],
  'groups': [
    {'id': 'family', 'label': 'Bride family'},
    {'id': 'friends', 'label': 'College friends'},
  ],
  'hotels': [
    {'id': 'haveli', 'label': 'Lakeview Haveli', 'active': true},
  ],
  'contracts': [
    {
      'id': 'haveli-block',
      'hotelId': 'haveli',
      'label': 'Haveli twin block',
      'roomType': 'twin',
      'totalRooms': 3,
      'maxOccupantsPerRoom': 2,
      'startsAtMillis': 1796083200000,
      'endsAtMillis': 1796342400000,
    },
  ],
  'activeStays': <Object?>[],
}, programId: _programId);

final ProgramLodgingMembership _membership = ProgramLodgingMembership.fromMap(
  {
    'programId': _programId,
    'guestId': 'meera',
    'label': 'Meera Iyer',
    'revision': 3,
    'groupIds': ['friends'],
    'groups': [
      {'id': 'family', 'label': 'Bride family'},
      {'id': 'friends', 'label': 'College friends'},
    ],
    'evidence': [
      {
        'assertionId': 'wma_${List.filled(64, 'b').join()}',
        'groupId': 'family',
        'selected': false,
        'included': true,
        'sourceKind': 'contributorList',
        'sourceLabel': 'Sample contributor list',
        'sourceVersion': 1,
        'observedAtMillis': 1796000000000,
      },
    ],
    'accessExpiresAtMillis': null,
  },
  programId: _programId,
  guestId: 'meera',
);

HostProgrammeLodgingState get _state => HostProgrammeLodgingState(
  setup: ProgramLodgingSetup(
    configuration: _review.configuration,
    accessExpiresAt: null,
  ),
  review: _review,
);

Widget _frame(Widget child) => CatchRoot(
  format: CatchFormat.nightsOut,
  child: CatchScreen(bodyScrolls: false, body: child),
);

/// Answers the planner's reads with the sample proposal; writes do nothing.
class _PreviewLodgingRepository implements ProgramLodgingRepository {
  @override
  Future<ProgramLodgingSetup> readSetup(String programId) async =>
      ProgramLodgingSetup(
        catalog: _catalog,
        configuration: _review.configuration,
        accessExpiresAt: null,
      );

  @override
  Future<ProgramLodgingReview> preview(
    String programId, {
    bool regenerate = false,
  }) async => _review;

  @override
  Object? noSuchMethod(Invocation invocation) =>
      Future<Never>.error(UnsupportedError('Preview only'));
}

@widgetbook.UseCase(
  name: 'A proposal with one party waiting',
  type: HostProgrammeLodgingScreen,
  path: _path,
)
Widget hostProgrammeLodgingScreenUseCase(BuildContext context) => ProviderScope(
  overrides: [
    uidProvider.overrideWithValue(const AsyncData('host-sample')),
    programReadSnapshotStoreProvider.overrideWithValue(emptyProgramSnapshots()),
    programLodgingRepositoryProvider.overrideWithValue(
      _PreviewLodgingRepository(),
    ),
  ],
  child: const HostProgrammeLodgingScreen(programId: _programId),
);

@widgetbook.UseCase(
  name: 'Proposal and room board',
  type: HostProgrammeLodgingBody,
  path: _path,
)
Widget hostProgrammeLodgingBodyUseCase(BuildContext context) => _frame(
  HostProgrammeLodgingBody(
    state: _state,
    review: _review,
    onBack: () {},
    onPreview: (_, _) async => const [
      ProgramLodgingDestination(
        inventoryId: 'u103',
        allowed: true,
        explanation: 'Free twin room on the same floor.',
      ),
      ProgramLodgingDestination(
        inventoryId: 'u105',
        allowed: false,
        explanation: 'Not step-free.',
      ),
    ],
    onMove: (_, _, _) async {},
    onDecide: (_, {hotelId}) {},
    onMembership: () {},
    onEditSetup: () {},
    onRegenerate: () {},
    onRefresh: () {},
  ),
);

@widgetbook.UseCase(
  name: 'One floor with a room the party can take',
  type: HostProgrammeLodgingGrid,
  path: _path,
)
Widget hostProgrammeLodgingGridUseCase(BuildContext context) {
  ProgramLodgingBoardUnit unit(
    String id,
    String label,
    int x,
    List<String> p,
  ) => ProgramLodgingBoardUnit(
    inventoryId: id,
    layerId: 'floor-1',
    layerLabel: 'Lakeview Haveli · Main · 1',
    partyIds: p,
    layoutUnit: EventSuccessLayoutUnit(
      id: id,
      label: label,
      shape: EventSuccessLayoutShape.rect,
      capacity: 2,
      gridX: x,
      gridY: 0,
      order: x,
    ),
  );
  return CatchRoot(
    format: CatchFormat.nightsOut,
    child: CatchPageBody.screen(
      child: HostProgrammeLodgingGrid(
        units: [
          unit('u101', '101', 0, ['mehra']),
          unit('u103', '103', 1, []),
          unit('u105', '105', 2, []),
        ],
        parties: const [
          ProgramLodgingBoardParty(id: 'mehra', label: 'Kamla and Neha Mehra'),
        ],
        layout: HostProgrammeLodgingGridLayout.list,
        destinations: const [
          ProgramLodgingDestination(
            inventoryId: 'u103',
            allowed: true,
            explanation: 'Free twin room.',
          ),
        ],
        selectedId: 'u103',
        onPick: (_) {},
      ),
    ),
  );
}

@widgetbook.UseCase(
  name: 'A guest with a suggested group',
  type: HostProgrammeLodgingMembershipBody,
  path: _path,
)
Widget hostProgrammeLodgingMembershipBodyUseCase(BuildContext context) =>
    _frame(
      HostProgrammeLodgingMembershipBody(
        catalog: _catalog,
        membership: _membership,
        selectedGroups: const {'friends'},
        busy: false,
        error: null,
        onChooseGuest: (_) {},
        onGroupsChanged: (_) {},
        onSave: () {},
      ),
    );

@widgetbook.UseCase(
  name: 'A new lodging setup',
  type: HostProgrammeLodgingSetupBody,
  path: _path,
)
Widget hostProgrammeLodgingSetupBodyUseCase(BuildContext context) => _frame(
  HostProgrammeLodgingSetupBody(
    initial: ProgramLodgingDraft(catalog: _catalog),
    resolveDates: (_, _) async =>
        (startsAtMillis: 1796083200000, endsAtMillis: 1796342400000),
    onSave: (_, _) async {},
  ),
);
