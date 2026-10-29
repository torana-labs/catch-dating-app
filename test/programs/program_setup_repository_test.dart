import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('staff list requires explicit continuation metadata', () {
    expect(
      () => ProgramStaffList.fromCallableData({
        'programId': 'program',
        'members': [],
      }),
      throwsFormatException,
    );
  });

  test('staff listing serializes its cursor and reads the next one', () async {
    final functions = _Functions()
      ..response = {
        'programId': 'program',
        'members': [],
        'nextCursor': 'next-staff',
      };
    final repository = ProgramSetupRepository(functions);
    final page = await repository.listStaff('program', cursor: 'prior-staff');
    expect(functions.calls, ['listProgramStaff']);
    expect(functions.payload, {
      'programId': 'program',
      'cursor': 'prior-staff',
    });
    expect(page.nextCursor, 'next-staff');
  });

  for (final grant in [true, false]) {
    test(
      '${grant ? "grant" : "revoke"} accepts the committed mutation receipt',
      () async {
        final functions = _Functions()
          ..response = {
            'entityId': 'staff',
            'revision': 8,
            'alreadyApplied': false,
          };
        final repository = ProgramSetupRepository(functions);
        final expiry = DateTime(2030);
        final receipt = grant
            ? await repository.grantStaff(
                programId: 'program',
                phoneNumber: '+919900001111',
                duties: const [
                  ProgramDutyAssignment(
                    duty: ProgramStaffDuty.hotelDesk,
                    pickupPointIds: {},
                    hotelIds: {'hotel'},
                    functionIds: {},
                  ),
                ],
                expiresAt: expiry,
              )
            : await repository.revokeStaff(
                programId: 'program',
                member: ProgramStaffMember(
                  uid: 'staff',
                  displayName: 'Staff',
                  phoneLastFour: '1111',
                  duties: const [],
                  status: ProgramStaffStatus.active,
                  expiresAt: expiry,
                  revision: 7,
                ),
              );
        expect(receipt.entityId, 'staff');
        expect(receipt.revision, 8);
        expect(receipt.alreadyApplied, isFalse);
        expect(functions.calls, [
          grant ? 'grantProgramStaff' : 'revokeProgramStaff',
        ]);
        if (!grant) {
          expect(functions.payload, {
            'programId': 'program',
            'uid': 'staff',
            'expectedRevision': 7,
          });
        }
      },
    );
  }

  group('program lifecycle', () {
    test(
      'listPrograms parses lifecycle fields for the archive affordance',
      () async {
        final functions = _Functions()
          ..response = {
            'programs': [
              {
                'programId': 'program-active',
                'kind': 'wedding',
                'title': 'Mehta–Shah wedding',
                'status': 'active',
                'timezone': 'Asia/Kolkata',
                'startsAtMillis': 1735689600000,
                'endsAtMillis': 1736035200000,
                'capabilities': ['functions'],
                'archivedAtMillis': null,
                'anonymizeAtMillis': null,
                'anonymizedAtMillis': null,
                'revision': 3,
              },
              {
                'programId': 'program-archived',
                'kind': 'corporate',
                'title': 'Aisle Summit',
                'status': 'archived',
                'timezone': 'Asia/Kolkata',
                'startsAtMillis': 1735689600000,
                'endsAtMillis': 1736035200000,
                'capabilities': ['functions'],
                'archivedAtMillis': 1737000000000,
                'anonymizeAtMillis': 1738209600000,
                'anonymizedAtMillis': null,
                'revision': 9,
              },
            ],
          };
        final rows = await ProgramSetupRepository(
          functions,
        ).listPrograms('org-1');
        expect(functions.calls, ['listOrganizerPrograms']);
        expect(rows, hasLength(2));
        expect(rows[0].revision, 3);
        expect(rows[0].archivedAt, isNull);
        expect(rows[1].status, 'archived');
        expect(
          rows[1].anonymizeAt,
          DateTime.fromMillisecondsSinceEpoch(1738209600000),
        );
      },
    );

    test('archiveProgram and unarchiveProgram fence on revision', () async {
      final functions = _Functions()
        ..response = {
          'entityId': 'program',
          'revision': 8,
          'alreadyApplied': false,
          'anonymizeAtMillis': 1738209600000,
        };
      final repository = ProgramSetupRepository(functions);
      final archived = await repository.archiveProgram(
        programId: 'program',
        expectedRevision: 7,
      );
      expect(archived.revision, 8);
      expect(functions.calls, ['archiveProgram']);
      expect(functions.payload, {
        'programId': 'program',
        'expectedRevision': 7,
      });

      functions.response = {
        'entityId': 'program',
        'revision': 10,
        'alreadyApplied': false,
        'restoredStatus': 'completed',
      };
      final restored = await repository.unarchiveProgram(
        programId: 'program',
        expectedRevision: 8,
      );
      expect(restored.revision, 10);
      expect(functions.calls.last, 'unarchiveProgram');
      expect(functions.payload, {
        'programId': 'program',
        'expectedRevision': 8,
      });
    });

    test('issueHouseholdRsvpLink returns the token and expiry', () async {
      final functions = _Functions()
        ..response = {
          'entityId': 'household-1',
          'token': 'rsvp-token-abc',
          'expiresAtMillis': 1736035200000,
          'alreadyApplied': false,
        };
      final link = await ProgramSetupRepository(functions)
          .issueHouseholdRsvpLink(
            programId: 'program',
            householdId: 'household-1',
          );
      expect(link.token, 'rsvp-token-abc');
      expect(
        link.expiresAt,
        DateTime.fromMillisecondsSinceEpoch(1736035200000),
      );
      expect(functions.calls, ['issueProgramHouseholdRsvpLink']);
      expect(functions.payload, {
        'programId': 'program',
        'householdId': 'household-1',
      });
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
