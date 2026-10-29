import 'dart:convert';

import 'package:catch_dating_app/contexts/programmes/data/program_lodging_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_review.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_setup.dart';
import 'package:flutter_test/flutter_test.dart';

final lodgingFixtureId = List.filled(64, 'a').join();
Map<String, Object?> lodgingReviewJson() {
  final revisions = {'source': 1, 'inventory': 1, 'layout': 1, 'published': 0};
  final scope = {'programId': 'program', 'organizerId': 'organizer'};
  return {
    'kind': 'proposal',
    'proposal': {
      'id': lodgingFixtureId,
      'scope': scope,
      'revisions': revisions,
      'placements': [
        {'partyId': 'party', 'inventoryId': 'unit'},
      ],
      'unplacedPartyIds': <Object?>[],
      'explanations': <Object?>[],
      'score': [0, 0],
      'search': {'complete': true, 'explored': 1},
    },
    'context': {
      'snapshot': {
        'scope': Map.of(scope),
        'revisions': Map.of(revisions),
        'parties': [
          {
            'id': 'party',
            'guestIds': ['guest'],
          },
        ],
        'published': [
          {
            'partyId': 'party',
            'inventoryId': 'unit',
            'locked': false,
            'checkedIn': false,
          },
        ],
        'rooms': [
          {
            'id': 'room',
            'hotelId': 'hotel',
            'zoneId': 'zone',
            'building': 'Building',
            'floor': '1',
            'wing': 'A',
            'roomType': 'standard',
            'beds': 1,
            'maxOccupants': 1,
            'verifiedFeatures': <Object?>[],
            'resourceIds': ['room'],
            'position': {'x': 0.5, 'y': 0.5},
          },
        ],
        'inventory': [
          {
            'id': 'unit',
            'physicalRoomId': 'room',
            'provisional': null,
            'contractId': 'block',
            'availability': [],
          },
        ],
      },
      'configuration': {
        ...scope,
        'labels': [
          {'inventoryId': 'unit', 'roomLabel': '101'},
        ],
      },
      'workflow': {
        'revision': 1,
        'approvedProposalId': lodgingFixtureId,
        'confirmedHotelIds': [],
        'guestPublishedProposalId': null,
      },
      'labels': {
        'guests': {'guest': 'Guest'},
        'hotels': {'hotel': 'Hotel'},
        'groups': {},
      },
      'accessExpiresAtMillis': null,
    },
  };
}

Map<String, Object?> lodgingSetupCatalogJson() {
  final start = DateTime.utc(2026, 10, 1, 12).millisecondsSinceEpoch;
  final end = DateTime.utc(2026, 10, 3, 12).millisecondsSinceEpoch;
  return {
    'programId': 'program',
    'organizerId': 'organizer',
    'timezone': 'Asia/Kolkata',
    'calendarDates': {
      start.toString(): '2026-10-01',
      end.toString(): '2026-10-03',
    },
    'guests': [
      {
        'id': 'guest',
        'label': 'Guest',
        'householdId': 'household',
        'groupIds': ['friends'],
      },
      {
        'id': 'local',
        'label': 'Local guest',
        'householdId': 'household',
        'groupIds': ['friends'],
      },
    ],
    'groups': [
      {'id': 'friends', 'label': 'Friends'},
    ],
    'hotels': [
      {'id': 'hotel', 'label': 'Hotel', 'active': true},
    ],
    'contracts': [
      {
        'id': 'block',
        'hotelId': 'hotel',
        'label': 'Room block',
        'roomType': 'standard',
        'totalRooms': 2,
        'maxOccupantsPerRoom': 2,
        'startsAtMillis': start,
        'endsAtMillis': end,
      },
    ],
    'activeStays': <Object?>[],
  };
}

Map<String, Object?> lodgingSetupConfigurationJson() {
  final review = lodgingReviewJson();
  final snapshot = (review['context']! as Map)['snapshot']! as Map;
  final contract =
      (lodgingSetupCatalogJson()['contracts']! as List).single as Map;
  return {
    'programId': 'program',
    'organizerId': 'organizer',
    'revision': 1,
    'demand': [
      {
        'guestId': 'guest',
        'startsAtMillis': contract['startsAtMillis'],
        'endsAtMillis': contract['endsAtMillis'],
        'beds': 1,
        'requiredFeatures': <String>[],
      },
    ],
    'parties': [
      {
        'id': 'party',
        'guestIds': ['guest'],
        'confirmed': true,
        'priority': 0,
        'requiredRoomType': null,
        'pin': null,
      },
    ],
    'groupParents': <Object?>[],
    'rooms': snapshot['rooms'],
    'inventory': [
      {
        'id': 'unit',
        'physicalRoomId': 'room',
        'provisional': null,
        'contractId': 'block',
        'availability': [
          {'arrival': '2026-10-01', 'departure': '2026-10-03'},
        ],
      },
    ],
    'labels': [
      {'inventoryId': 'unit', 'roomLabel': '101'},
    ],
  };
}

class FakeLodgingRepository extends Fake implements ProgramLodgingRepository {
  ProgramLodgingReview current = ProgramLodgingReview.fromCallableData(
    lodgingReviewJson(),
  );
  bool hasSetup = true;
  Future<ProgramLodgingReview>? pendingPreview;
  Object? previewFailure;
  Object? transitionFailure;
  Object? setupFailure;
  Future<ProgramLodgingProposal>? pendingSave;
  Future<Map<String, Object?>>? pendingTransition;
  DateTime? setupAccessExpiresAt;
  DateTime? membershipAccessExpiresAt;
  int membershipSaves = 0;
  Object? membershipFailure;
  Future<int>? pendingMembershipSave;
  Future<ProgramLodgingMembership>? pendingMembershipRead;
  int? savedMembershipRevision;
  List<String>? savedMembershipGroups;
  @override
  Future<ProgramLodgingMembership> readMembership(
    String programId,
    String guestId,
  ) async =>
      pendingMembershipRead ??
      ProgramLodgingMembership.fromMap(
        {
          ...lodgingMembershipJson(guestId),
          'accessExpiresAtMillis':
              membershipAccessExpiresAt?.millisecondsSinceEpoch,
        },
        programId: programId,
        guestId: guestId,
      );
  @override
  Future<int> decideMembership(
    ProgramLodgingMembership membership,
    List<String> groupIds,
  ) async {
    membershipSaves++;
    savedMembershipRevision = membership.revision;
    savedMembershipGroups = List.of(groupIds);
    if (membershipFailure != null) throw membershipFailure!;
    return pendingMembershipSave ?? membership.revision + 1;
  }

  var previews = 0;
  var saves = 0;
  var setupSaves = 0;
  Future<int>? pendingSetupSave;
  Map<String, Object?>? savedSetup;
  int? savedConfigurationRevision;
  List<Map<String, Object?>>? savedAdoptions;
  final commands = <Map<String, Object?>>[];

  @override
  Future<ProgramLodgingSetup> readSetup(String programId) async =>
      ProgramLodgingSetup(
        configuration: hasSetup ? lodgingSetupConfigurationJson() : null,
        catalog: ProgramLodgingCatalog.fromMap(
          lodgingSetupCatalogJson(),
          programId: programId,
        ),
        accessExpiresAt: setupAccessExpiresAt,
      );
  @override
  Future<int> saveSetup(
    String programId,
    Map<String, Object?> setup,
    int expectedRevision, {
    List<Map<String, Object?>> adoptions = const [],
  }) async {
    setupSaves++;
    if (setupFailure != null) throw setupFailure!;
    savedSetup = setup;
    savedConfigurationRevision = expectedRevision;
    savedAdoptions = adoptions;
    return pendingSetupSave ?? expectedRevision + 1;
  }

  @override
  Future<ProgramLodgingReview> preview(
    String programId, {
    bool regenerate = false,
  }) async {
    previews++;
    if (previewFailure != null) throw previewFailure!;
    return pendingPreview ?? current;
  }

  @override
  Future<ProgramLodgingProposal> save(
    String programId,
    ProgramLodgingProposal proposal,
  ) async {
    saves++;
    return pendingSave ?? proposal;
  }

  @override
  Future<Map<String, Object?>> transition(
    String programId, {
    required ProgramLodgingProposal proposal,
    required String operationId,
    required int expectedWorkflowRevision,
    required ProgramLodgingAction action,
    String? hotelId,
  }) async {
    commands.add({
      'programId': programId,
      'proposalId': proposal.id,
      'operationId': operationId,
      'expectedWorkflowRevision': expectedWorkflowRevision,
      'action': action.name,
      'hotelId': hotelId,
    });
    if (pendingTransition != null) return pendingTransition!;
    if (transitionFailure != null) throw transitionFailure!;
    return {
      'kind': 'transition',
      'workflow': {'revision': expectedWorkflowRevision + 1},
      'receipt': {},
      'replayed': false,
    };
  }
}

Map<String, Object?> lodgingTwoHotelReviewJson() {
  // JSON round-trip creates mutable broad lists, matching callable SDK data.
  final json =
      jsonDecode(jsonEncode(lodgingReviewJson())) as Map<String, Object?>;
  final proposal = json['proposal']! as Map<String, Object?>;
  (proposal['placements']! as List<Object?>).add({
    'partyId': 'party2',
    'inventoryId': 'unit2',
  });
  final context = json['context']! as Map<String, Object?>;
  final snapshot = context['snapshot']! as Map<String, Object?>;
  (snapshot['parties']! as List<Object?>).add({
    'id': 'party2',
    'guestIds': ['guest2'],
  });
  final rooms = snapshot['rooms']! as List<Object?>;
  rooms.add({
    ...rooms.first! as Map<String, Object?>,
    'id': 'room2',
    'hotelId': 'hotel2',
    'resourceIds': ['room2'],
  });
  (snapshot['inventory']! as List<Object?>).add({
    'id': 'unit2',
    'physicalRoomId': 'room2',
    'provisional': null,
    'contractId': 'block2',
    'availability': <Object?>[],
  });
  final configuration = context['configuration']! as Map<String, Object?>;
  (configuration['labels']! as List<Object?>).add({
    'inventoryId': 'unit2',
    'roomLabel': '202',
  });
  final labels = context['labels']! as Map<String, Object?>;
  (labels['guests']! as Map<String, Object?>)['guest2'] = 'Guest Two';
  (labels['hotels']! as Map<String, Object?>)['hotel2'] = 'Hotel Two';
  return json;
}

Map<String, Object?> lodgingMembershipJson([String guestId = 'guest']) => {
  'kind': 'membership',
  'programId': 'program',
  'guestId': guestId,
  'label': guestId == 'local' ? 'Local guest' : 'Guest',
  'revision': 7,
  'groupIds': <String>[],
  'groups': [
    {'id': 'friends', 'label': 'Friends'},
  ],
  'evidence': [
    {
      'assertionId': 'wma_${List.filled(64, 'a').join()}',
      'groupId': 'friends',
      'selected': false,
      'included': true,
      'sourceKind': 'contributorList',
      'sourceLabel': 'Family contributor list',
      'sourceVersion': 1,
      'observedAtMillis': 1800000000000,
    },
  ],
  'accessExpiresAtMillis': null,
};
