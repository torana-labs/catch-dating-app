import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/programmes/data/program_lodging_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_review.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'program_lodging_test_fixtures.dart';

void main() {
  test(
    'membership read preserves source-labelled suggestions and exact scope',
    () async {
      final functions = _Functions()..response = lodgingMembershipJson();
      final repository = ProgramLodgingRepository(
        functions,
        _Snapshots(),
        () => 'actor',
      );
      final membership = await repository.readMembership('program', 'guest');
      expect(functions.payload, {
        'programId': 'program',
        'action': 'readMembership',
        'guestId': 'guest',
      });
      expect(membership.groupIds, isEmpty);
      expect(membership.evidence.single['selected'], false);
      expect(
        membership.evidence.single['sourceLabel'],
        'Family contributor list',
      );
      expect(() => membership.json['revision'] = 100, throwsUnsupportedError);
      functions.response = {
        'kind': 'membershipSaved',
        'guestId': 'guest',
        'revision': 8,
      };
      await repository.decideMembership(membership, []);
      expect(functions.payload, {
        'programId': 'program',
        'action': 'decideMembership',
        'guestId': 'guest',
        'expectedRevision': 7,
        'groupIds': <String>[],
      });
    },
  );
  test(
    'membership projections reject foreign identity and incompatible selected evidence',
    () {
      var value = lodgingMembershipJson();
      value['guestId'] = 'foreign';
      expect(
        () => ProgramLodgingMembership.fromMap(
          value,
          programId: 'program',
          guestId: 'guest',
        ),
        throwsFormatException,
      );
      value = lodgingMembershipJson();
      ((value['evidence']! as List).single as Map)['selected'] = true;
      expect(
        () => ProgramLodgingMembership.fromMap(
          value,
          programId: 'program',
          guestId: 'guest',
        ),
        throwsFormatException,
      );
    },
  );
  test('account change rejects late private membership evidence', () async {
    final functions = _Functions();
    final gate = Completer<Object?>();
    functions.pending = gate.future;
    var actor = 'actor';
    final repository = ProgramLodgingRepository(
      functions,
      _Snapshots(),
      () => actor,
    );
    final pending = repository.readMembership('program', 'guest');
    actor = 'other';
    gate.complete(lodgingMembershipJson());
    await expectLater(pending, throwsA(isA<SignInRequiredException>()));
  });

  test('review keeps exact proposal, scoped layers and checked-in locks', () {
    final input = _review();
    final review = ProgramLodgingReview.fromCallableData(input);
    expect(review.proposal.id, _id);
    expect(review.parties.single.label, 'Guest');
    expect(review.parties.single.canMove, false);
    expect(review.units.single.inventoryId, 'unit');
    expect(review.units.single.layerLabel, contains('Hotel'));
    expect(review.units.single.layoutUnit.label, '101');
    expect(review.units.single.layoutUnit.gridX, 10);
    expect(review.accessExpiresAt?.millisecondsSinceEpoch, 1800000000000);
    expect(
      () => review.proposal.json['id'] = 'changed',
      throwsUnsupportedError,
    );
    final placements = review.proposal.json['placements']! as List;
    expect(
      () => (placements.first as Map)['inventoryId'] = 'other',
      throwsUnsupportedError,
    );
    (input['proposal'] as Map)['id'] = 'mutated';
    expect(review.proposal.id, _id);
  });

  test(
    'type-only inventory uses stable contract unit and explicit provisional flag',
    () {
      final input = _review();
      final snapshot = (input['context'] as Map)['snapshot'] as Map;
      final unit = (snapshot['inventory'] as List).single as Map;
      final facts =
          Map<String, Object?>.from((snapshot['rooms'] as List).single as Map)
            ..remove('id')
            ..remove('position')
            ..remove('resourceIds');
      unit['physicalRoomId'] = null;
      unit['provisional'] = facts;
      snapshot['rooms'] = <Object?>[];
      final configuration = (input['context'] as Map)['configuration'] as Map;
      configuration['labels'] = <Object?>[
        <String, Object?>{'inventoryId': 'unit', 'roomLabel': null},
      ];
      final review = ProgramLodgingReview.fromCallableData(input);
      expect(review.units.single.provisional, true);
      expect(review.units.single.layoutUnit.label, 'unit');
      expect(review.units.single.inventoryId, 'unit');
      expect(review.units.single.layoutUnit.gridX, 0);
    },
  );

  test('mismatched scope, revisions and unknown placements fail closed', () {
    var value = _review();
    ((value['context'] as Map)['configuration'] as Map)['programId'] =
        'foreign';
    expect(
      () => ProgramLodgingReview.fromCallableData(value),
      throwsFormatException,
    );
    value = _review();
    (((value['context'] as Map)['snapshot'] as Map)['revisions']
            as Map)['source'] =
        2;
    expect(
      () => ProgramLodgingReview.fromCallableData(value),
      throwsFormatException,
    );
    value = _review();
    (((value['proposal'] as Map)['placements'] as List).first
            as Map)['inventoryId'] =
        'unknown';
    expect(
      () => ProgramLodgingReview.fromCallableData(value),
      throwsFormatException,
    );
  });

  test(
    'preview is live-only and sends no actor or private client authority',
    () async {
      final functions = _Functions()..response = _review();
      final snapshots = _Snapshots();
      final repository = ProgramLodgingRepository(
        functions,
        snapshots,
        () => 'actor',
      );
      final review = await repository.preview('program');
      expect(functions.name, 'manageProgramLodging');
      expect(functions.payload, {'programId': 'program', 'action': 'preview'});
      expect(review.proposal.id, _id);
      expect(snapshots.saves, 0);
    },
  );

  test(
    'setup catalog retains no-travel identities and rejects foreign scope',
    () async {
      final catalog = <String, Object?>{
        'programId': 'program',
        'organizerId': 'organizer',
        'timezone': 'Asia/Kolkata',
        'calendarDates': <String, Object?>{},
        'guests': [
          {
            'id': 'local',
            'label': 'Local guest',
            'householdId': null,
            'groupIds': <String>[],
          },
        ],
        'groups': <Object?>[],
        'hotels': <Object?>[],
        'contracts': <Object?>[],
        'activeStays': <Object?>[],
      };
      final functions = _Functions()
        ..response = {
          'kind': 'readSetup',
          'configuration': null,
          'catalog': catalog,
          'accessExpiresAtMillis': null,
        };
      final repository = ProgramLodgingRepository(
        functions,
        _Snapshots(),
        () => 'actor',
      );
      final setup = await repository.readSetup('program');
      expect(setup.catalog!.rows('guests').single['id'], 'local');
      catalog['programId'] = 'foreign';
      await expectLater(
        repository.readSetup('program'),
        _wrappedFormat('Lodging catalog belongs to another program.'),
      );
      expect(setup.catalog!.programId, 'program');
    },
  );

  test(
    'date resolution sends civil dates and fences changed program timezone',
    () async {
      final functions = _Functions()
        ..response = {
          'kind': 'resolvedDates',
          'timezone': 'Asia/Kolkata',
          'arrival': '2026-10-01',
          'departure': '2026-10-03',
          'startsAtMillis': 100,
          'endsAtMillis': 300,
          'accessExpiresAtMillis': null,
        };
      final repository = ProgramLodgingRepository(
        functions,
        _Snapshots(),
        () => 'actor',
      );
      expect(
        await repository.resolveDates(
          'program',
          'Asia/Kolkata',
          '2026-10-01',
          '2026-10-03',
        ),
        (startsAtMillis: 100, endsAtMillis: 300),
      );
      expect(functions.payload, {
        'programId': 'program',
        'action': 'resolveDates',
        'arrival': '2026-10-01',
        'departure': '2026-10-03',
      });
      await expectLater(
        repository.resolveDates(
          'program',
          'Pacific/Kiritimati',
          '2026-10-01',
          '2026-10-03',
        ),
        _wrappedFormat('Lodging date context changed. Refresh setup.'),
      );
    },
  );

  test(
    'published review retains immutable identity and sends current edit revisions',
    () async {
      final input = _review();
      final context = input['context']! as Map;
      final snapshot = context['snapshot']! as Map;
      final revisions = snapshot['revisions']! as Map;
      revisions['published'] = (revisions['published']! as num).toInt() + 1;
      final workflow = context['workflow']! as Map;
      workflow['approvedProposalId'] = _id;
      workflow['guestPublishedProposalId'] = _id;
      final review = ProgramLodgingReview.fromCallableData(input);
      expect(review.proposal.id, _id);
      final functions = _Functions()..response = input;
      final repository = ProgramLodgingRepository(
        functions,
        _Snapshots(),
        () => 'actor',
      );
      await repository.propose('program', review.proposal, [
        for (final p in review.proposal.placements)
          Map<String, Object?>.from(p),
      ], expectedRevisions: lodgingJsonMap(review.snapshot['revisions']));
      expect(
        (functions.payload as Map)['expectedRevisions'],
        review.snapshot['revisions'],
      );
      expect(
        (functions.payload as Map)['expectedRevisions'],
        isNot(review.proposal.revisions),
      );
      for (final alteration in [
        'source',
        'inventory',
        'layout',
        'published',
        'binding',
        'workflow',
      ]) {
        final invalid = jsonDecode(jsonEncode(input)) as Map<String, Object?>;
        final invalidContext = invalid['context']! as Map;
        final invalidSnapshot = invalidContext['snapshot']! as Map;
        if (alteration == 'binding') {
          ((invalidSnapshot['published']! as List).single
                  as Map)['inventoryId'] =
              'other';
        } else if (alteration == 'workflow') {
          (invalidContext['workflow']! as Map)['guestPublishedProposalId'] =
              null;
        } else {
          final values = invalidSnapshot['revisions']! as Map;
          values[alteration] = (values[alteration]! as num).toInt() + 1;
        }
        expect(
          () => ProgramLodgingReview.fromCallableData(invalid),
          throwsFormatException,
        );
      }
      await repository.preview('program', regenerate: true);
      expect(functions.payload, {
        'programId': 'program',
        'action': 'preview',
        'regenerate': true,
      });
    },
  );

  test('account change during callable discards private result', () async {
    final gate = Completer<Object?>();
    final functions = _Functions()..pending = gate.future;
    final snapshots = _Snapshots();
    var actor = 'actor';
    final repository = ProgramLodgingRepository(
      functions,
      snapshots,
      () => actor,
    );
    final result = repository.preview('program');
    actor = 'other';
    gate.complete(_review());
    await expectLater(result, throwsA(isA<SignInRequiredException>()));
    expect(snapshots.cleared, ['actor:program']);
  });

  test('authority change during callable discards private result', () async {
    final gate = Completer<Object?>();
    final functions = _Functions()..pending = gate.future;
    final snapshots = _Snapshots();
    final repository = ProgramLodgingRepository(
      functions,
      snapshots,
      () => 'actor',
    );
    final result = repository.preview('program');
    snapshots.currentGeneration++;
    gate.complete(_review());
    await expectLater(result, throwsA(isA<PermissionException>()));
    expect(snapshots.cleared, ['actor:program']);
  });

  test('server permission denial clears program snapshots', () async {
    final functions = _Functions()
      ..failure = FirebaseFunctionsException(
        code: 'permission-denied',
        message: 'Expired duty',
      );
    final snapshots = _Snapshots();
    final repository = ProgramLodgingRepository(
      functions,
      snapshots,
      () => 'actor',
    );
    await expectLater(
      repository.preview('program'),
      throwsA(isA<PermissionException>()),
    );
    expect(snapshots.cleared, ['actor:program']);
  });

  test(
    'manual move and exact transition retry preserve immutable request evidence',
    () async {
      final functions = _Functions()..response = _review();
      final repository = ProgramLodgingRepository(
        functions,
        _Snapshots(),
        () => 'actor',
      );
      final review = await repository.preview('program');
      final original = jsonEncode(review.proposal.json);
      await repository.propose(
        'program',
        review.proposal,
        review.proposal.moving('party', 'unit'),
      );
      expect(
        (functions.payload as Map)['expectedRevisions'],
        review.proposal.revisions,
      );
      expect(jsonEncode(review.proposal.json), original);
      functions.response = {
        'kind': 'transition',
        'workflow': {'revision': 2},
        'receipt': {},
        'replayed': true,
      };
      for (var i = 0; i < 2; i++) {
        await repository.transition(
          'program',
          proposal: review.proposal,
          operationId: 'same-operation',
          expectedWorkflowRevision: 1,
          action: ProgramLodgingAction.publishGuests,
        );
        expect((functions.payload as Map)['command'], {
          'proposalId': _id,
          'operationId': 'same-operation',
          'expectedWorkflowRevision': 1,
          'action': 'publishGuests',
          'hotelId': null,
        });
      }
      expect(
        () => repository.propose('foreign', review.proposal, []),
        throwsFormatException,
      );
    },
  );
}

final _id = List.filled(64, 'a').join();
Map<String, Object?> _review() {
  final revisions = {'source': 1, 'inventory': 1, 'layout': 1, 'published': 0};
  final scope = {'programId': 'program', 'organizerId': 'organizer'};
  return {
    'kind': 'proposal',
    'proposal': {
      'id': _id,
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
            'checkedIn': true,
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
        'approvedProposalId': _id,
        'confirmedHotelIds': [],
        'guestPublishedProposalId': null,
      },
      'labels': {
        'guests': {'guest': 'Guest'},
        'hotels': {'hotel': 'Hotel'},
        'groups': {},
      },
      'accessExpiresAtMillis': 1800000000000,
    },
  };
}

class _Functions extends Fake implements FirebaseFunctions {
  Object? response;
  Object? payload;
  Object? failure;
  Future<Object?>? pending;
  String? name;
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    this.name = name;
    return _Callable((value) async {
      payload = value;
      if (failure != null) throw failure!;
      return pending ?? response;
    });
  }
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.respond);
  final Future<Object?> Function(Object?) respond;
  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async =>
      _Result(await respond(parameters) as T);
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);
  @override
  final T data;
}

class _Snapshots extends Fake implements ProgramReadSnapshotStore {
  var currentGeneration = 0;
  var saves = 0;
  final cleared = <String>[];
  @override
  int generation(String accountId, String programId) => currentGeneration;
  @override
  Future<void> clearProgram(String accountId, String programId) async {
    cleared.add('$accountId:$programId');
    currentGeneration++;
  }

  @override
  Future<int?> save(
    String accountId,
    String scope,
    Object? data, {
    int? expectedGeneration,
  }) async {
    saves++;
    return currentGeneration;
  }
}

Matcher _wrappedFormat(String message) => throwsA(
  isA<BackendOperationException>().having(
    (error) => error.cause,
    'cause',
    isA<FormatException>().having((cause) => cause.message, 'message', message),
  ),
);
