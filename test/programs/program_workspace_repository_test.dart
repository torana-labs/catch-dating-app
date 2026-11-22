import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_manifest_mapper.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';

void main() {
  group('organizerProgramDetail', () {
    test('parses program, functions, resources and counts', () async {
      final functions = _Functions()
        ..response = {
          'program': {
            'programId': 'program',
            'organizerId': 'org-1',
            'kind': 'wedding',
            'title': 'Mehta–Shah wedding',
            'timezone': 'Asia/Kolkata',
            'status': 'active',
            'startsAtMillis': 1735689600000,
            'endsAtMillis': 1736035200000,
            'capabilities': ['functions', 'transport'],
            'transportSettings': {'fleet': 'mixed'},
            'revision': 12,
          },
          'functions': [
            {
              'functionId': 'fn-1',
              'name': 'Sangeet',
              'startsAtMillis': 1735750800000,
              'endsAtMillis': 1735761600000,
              'venueName': 'Mirror Lake Pavilion',
              'status': 'scheduled',
              'invitationMode': 'allGuests',
              'checkInEnabled': true,
              'dressCode': 'Festive',
              'instructions': 'Doors open 6pm',
              'expectedCount': 240,
              'checkedInCount': 18,
              'revision': 4,
            },
          ],
          'pickupPoints': [
            {
              'pickupPointId': 'pp-1',
              'label': 'UDR Terminal 2',
              'kind': 'airport',
              'iataCode': 'UDR',
              'terminal': 'T2',
            },
          ],
          'hotels': [
            {'hotelId': 'hotel-1', 'name': 'Lakeview'},
          ],
          'counts': {'guests': 180, 'households': 42, 'legs': 61, 'staff': 9},
        };
      final detail = await ProgramSetupRepository(
        functions,
      ).getProgram('program');
      expect(functions.calls, ['getOrganizerProgram']);
      expect(functions.payload, {'programId': 'program'});
      expect(detail.program.organizerId, 'org-1');
      expect(detail.program.kind, ProgramKind.wedding);
      expect(detail.program.status, ProgramStatus.active);
      expect(detail.program.timezone, 'Asia/Kolkata');
      expect(detail.program.revision, 12);
      expect(detail.functions, hasLength(1));
      final fn = detail.functions.single;
      expect(fn.name, 'Sangeet');
      expect(fn.invitationMode, 'allGuests');
      expect(fn.isSelectedGuests, isFalse);
      expect(fn.checkInEnabled, isTrue);
      expect(fn.checkedInCount, 18);
      expect(detail.pickupPoints.single.iataCode, 'UDR');
      expect(detail.hotels.single.name, 'Lakeview');
      expect(detail.counts['guests'], 180);
    });

    test('rejects a payload missing required function fields', () {
      expect(
        () => OrganizerProgramDetail.fromCallableData({
          'program': {
            'programId': 'p',
            'organizerId': 'org-1',
            'kind': 'wedding',
            'title': 't',
            'timezone': 'UTC',
            'status': 'active',
            'startsAtMillis': 1,
            'endsAtMillis': 2,
            'capabilities': <String>[],
            'transportSettings': null,
            'revision': 1,
          },
          'functions': [
            {'functionId': 'fn'},
          ],
          'pickupPoints': <Object?>[],
          'hotels': <Object?>[],
          'counts': <String, int>{},
        }),
        throwsFormatException,
      );
    });
  });

  group('mutations', () {
    test('upsertFunction serializes epoch millis and revision fence', () async {
      final functions = _Functions()
        ..response = {
          'entityId': 'fn-9',
          'revision': 6,
          'alreadyApplied': false,
        };
      final receipt = await ProgramSetupRepository(functions).upsertFunction(
        programId: 'program',
        functionId: 'fn-9',
        expectedRevision: 5,
        name: 'Reception',
        startsAt: DateTime.fromMillisecondsSinceEpoch(1735750800000),
        endsAt: DateTime.fromMillisecondsSinceEpoch(1735761600000),
        venueName: 'City Palace',
        status: 'scheduled',
      );
      expect(functions.calls, ['upsertProgramFunction']);
      expect(functions.payload, {
        'programId': 'program',
        'functionId': 'fn-9',
        'expectedRevision': 5,
        'name': 'Reception',
        'startsAtMillis': 1735750800000,
        'endsAtMillis': 1735761600000,
        'venueName': 'City Palace',
        'status': 'scheduled',
      });
      expect(receipt.entityId, 'fn-9');
      expect(receipt.revision, 6);
    });

    test('applyFunctionInvitations sends mode plus selection', () async {
      final functions = _Functions()
        ..response = {
          'entityId': 'fn-1',
          'revision': 7,
          'alreadyApplied': false,
        };
      await ProgramSetupRepository(functions).applyFunctionInvitations(
        programId: 'program',
        functionId: 'fn-1',
        invitationMode: 'selectedGuests',
        selectedGuestIds: const ['g-1', 'g-2'],
        expectedRevision: 6,
      );
      expect(functions.payload, {
        'programId': 'program',
        'functionId': 'fn-1',
        'invitationMode': 'selectedGuests',
        'selectedGuestIds': ['g-1', 'g-2'],
        'expectedRevision': 6,
      });
    });

    test('recordFunctionRsvp carries party size and uninvited flag', () async {
      final functions = _Functions()
        ..response = {
          'entityId': 'g-1',
          'revision': 2,
          'alreadyApplied': false,
        };
      await ProgramSetupRepository(functions).recordFunctionRsvp(
        programId: 'program',
        functionId: 'fn-1',
        guestId: 'g-1',
        rsvpStatus: 'attending',
        partySize: 4,
        allowUninvited: true,
      );
      expect(functions.payload, {
        'programId': 'program',
        'functionId': 'fn-1',
        'guestId': 'g-1',
        'rsvpStatus': 'attending',
        'partySize': 4,
        'allowUninvited': true,
      });
    });

    test(
      'upsertGuestGroup and deleteGuestGroup carry revision fences',
      () async {
        final functions = _Functions()
          ..response = {
            'entityId': 'grp-1',
            'revision': 8,
            'alreadyApplied': false,
          };
        final repository = ProgramSetupRepository(functions);
        await repository.upsertGuestGroup(
          programId: 'program',
          groupId: 'grp-1',
          expectedRevision: 7,
          label: 'Bride side',
          dimension: 'side',
          sortOrder: 2,
        );
        expect(functions.calls, ['upsertProgramGuestGroup']);
        expect(functions.payload, {
          'programId': 'program',
          'groupId': 'grp-1',
          'expectedRevision': 7,
          'label': 'Bride side',
          'dimension': 'side',
          'sortOrder': 2,
        });
        await repository.deleteGuestGroup(
          programId: 'program',
          groupId: 'grp-1',
          expectedRevision: 8,
        );
        expect(functions.calls.last, 'deleteProgramGuestGroup');
        expect(functions.payload, {
          'programId': 'program',
          'groupId': 'grp-1',
          'expectedRevision': 8,
        });
      },
    );

    test(
      'upsertGuestGroup distinguishes hotel set, clear and preserve',
      () async {
        final functions = _Functions()
          ..response = {
            'entityId': 'grp-1',
            'revision': 2,
            'alreadyApplied': false,
          };
        final repository = ProgramSetupRepository(functions);

        await repository.upsertGuestGroup(
          programId: 'program',
          label: 'Bride side',
          dimension: 'side',
          hotelId: 'hotel-1',
        );
        expect((functions.payload! as Map)['hotelId'], 'hotel-1');

        await repository.upsertGuestGroup(
          programId: 'program',
          groupId: 'grp-1',
          label: 'Bride side',
          dimension: 'side',
          clearHotel: true,
        );
        final cleared = functions.payload! as Map;
        expect(cleared.containsKey('hotelId'), isTrue);
        expect(cleared['hotelId'], isNull);

        await repository.upsertGuestGroup(
          programId: 'program',
          groupId: 'grp-1',
          label: 'Bride side',
          dimension: 'side',
        );
        expect((functions.payload! as Map).containsKey('hotelId'), isFalse);
      },
    );
  });

  group('importManifest', () {
    test(
      'preview sends rows under the operation id and parses errors',
      () async {
        final functions = _Functions()
          ..response = {
            'mode': 'preview',
            'totalRows': 3,
            'guestsCreated': 2,
            'guestsUpdated': 0,
            'legsCreated': 2,
            'legsUpdated': 0,
            'householdsCreated': 1,
            'partiesCreated': 1,
            'groupsCreated': 2,
            'rowErrors': [
              {
                'index': 1,
                'message': 'Remove this journey from its party first.',
                'partyJourney': {'legId': 'leg-1', 'revision': 4},
              },
              {'index': 2, 'message': 'missing display name'},
            ],
            'alreadyApplied': false,
          };
        final result = await ProgramSetupRepository(functions).importManifest(
          programId: 'program',
          mode: 'preview',
          clientOperationId: 'import_123',
          rows: const [
            {'displayName': 'Asha'},
          ],
        );
        expect(functions.calls, ['importProgramManifest']);
        expect(functions.payload, {
          'programId': 'program',
          'mode': 'preview',
          'clientOperationId': 'import_123',
          'rows': [
            {'displayName': 'Asha'},
          ],
        });
        expect(result.mode, 'preview');
        expect(result.groupsCreated, 2);
        expect(result.rowErrors, hasLength(2));
        final blocked = result.rowErrors.first;
        expect(blocked.index, 1);
        expect(blocked.partyJourney?.legId, 'leg-1');
        expect(blocked.partyJourney?.revision, 4);
        expect(result.rowErrors.last, (
          index: 2,
          message: 'missing display name',
          partyJourney: null,
        ));
        expect(result.alreadyApplied, isFalse);
      },
    );

    test('commit payload distinguishes mode for retry safety', () async {
      final functions = _Functions()
        ..response = {
          'mode': 'commit',
          'totalRows': 1,
          'guestsCreated': 1,
          'guestsUpdated': 0,
          'legsCreated': 0,
          'legsUpdated': 0,
          'householdsCreated': 0,
          'partiesCreated': 0,
          'groupsCreated': 0,
          'rowErrors': <Object?>[],
          'alreadyApplied': true,
        };
      final result = await ProgramSetupRepository(functions).importManifest(
        programId: 'program',
        mode: 'commit',
        clientOperationId: 'import_124',
        rows: const [],
      );
      expect((functions.payload! as Map)['mode'], 'commit');
      expect(result.alreadyApplied, isTrue);
    });
  });

  group('manifest mapper', () {
    test('suggests column indices from common header spellings', () {
      final mapping = suggestProgramManifestMapping([
        'Guest Name',
        'Phone (E.164)',
        'Arrival Time',
        'Delegation',
        'Hotel',
      ]);
      expect(mapping[ProgramManifestField.displayName], 0);
      expect(mapping[ProgramManifestField.phoneE164], 1);
      expect(mapping[ProgramManifestField.scheduledArrivalAt], 2);
      expect(mapping[ProgramManifestField.groupLabels], 3);
      expect(mapping[ProgramManifestField.destinationHotelName], 4);
    });

    test('maps rows, splits group labels and reports missing names', () {
      final mapped = mapProgramManifestRows(
        headers: const ['name', 'groups', 'pax'],
        rows: const [
          ['Asha Mehta', 'Bride side; Family', '3'],
          ['', 'Crew', '1'],
          ['Ravi Shah', '', '2'],
        ],
        mapping: const {
          ProgramManifestField.displayName: 0,
          ProgramManifestField.groupLabels: 1,
          ProgramManifestField.passengers: 2,
        },
      );
      expect(mapped.rows, hasLength(2));
      expect(mapped.rows.first['displayName'], 'Asha Mehta');
      expect(mapped.rows.first['groupLabels'], 'Bride side; Family');
      expect(mapped.rows.first['passengers'], 3);
      expect(mapped.rows[1].containsKey('groupLabels'), isFalse);
      expect(mapped.rowIssues.single.index, 1);
    });

    test('mapped groups satisfy the backend string contract', () {
      final mapped = mapProgramManifestRows(
        headers: const ['name', 'groups'],
        rows: const [
          ['Asha', 'side:Bride; Friends, College| Family'],
        ],
        mapping: const {
          ProgramManifestField.displayName: 0,
          ProgramManifestField.groupLabels: 1,
        },
      );
      expect(
        mapped.rows.single['groupLabels'],
        'side:Bride; Friends; College; Family',
      );
      final schema = JsonSchema.create(
        contractSchema('ImportProgramManifestCallablePayload'),
      );
      final payload = {
        'programId': 'program',
        'mode': 'preview',
        'clientOperationId': 'review-groups',
        'rows': mapped.rows,
      };
      final validation = schema.validate(payload);
      expect(validation.isValid, isTrue, reason: '${validation.errors}');
      final legacyPayload = {
        ...payload,
        'rows': [
          {
            ...mapped.rows.single,
            'groupLabels': ['Bride', 'Friends'],
          },
        ],
      };
      expect(schema.validate(legacyPayload).isValid, isFalse);
    });

    test('accepts epoch millis or ISO strings for arrival times', () {
      final mapped = mapProgramManifestRows(
        headers: const ['name', 'arrival'],
        rows: const [
          ['A', '1735750800000'],
          ['B', '2026-01-01T09:00:00Z'],
        ],
        mapping: const {
          ProgramManifestField.displayName: 0,
          ProgramManifestField.scheduledArrivalAt: 1,
        },
      );
      expect(mapped.rows.first['scheduledArrivalAtMillis'], 1735750800000);
      expect(
        mapped.rows.last['scheduledArrivalAtMillis'],
        DateTime.utc(2026, 1, 1, 9).millisecondsSinceEpoch,
      );
    });
  });
}

class _Functions extends Fake implements FirebaseFunctions {
  Object? response;
  Object? payload;
  final calls = <String>[];
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    calls.add(name);
    return _Callable((value) {
      payload = value;
      return response;
    });
  }
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.respond);
  final Object? Function(Object?) respond;
  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async =>
      _Result(respond(parameters) as T);
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);
  @override
  final T data;
}
