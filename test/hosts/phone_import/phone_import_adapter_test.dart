import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/phone_import_adapter.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_contact.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_access.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_batch.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_draft.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

final _now = DateTime.utc(2026, 10, 2);
final _expiry = _now.add(const Duration(days: 1));
const _labels = {
  PhoneImportFamilySide.partnerOne: 'Partner one family',
  PhoneImportFamilySide.partnerTwo: 'Partner two family',
  PhoneImportFamilySide.both: 'Both families',
};

PhoneImportEntry _guest({
  String id = 'guest_reference_01',
  String name = 'Synthetic guest',
  String phone = '+1 (202) 555-0100',
  String household = '',
  PhoneImportFamilySide side = PhoneImportFamilySide.unassigned,
}) => PhoneImportEntry(
  id: id,
  displayName: name,
  originalName: 'Synthetic original',
  numbers: [
    PhoneContactNumber(value: phone, label: 'chosen'),
    const PhoneContactNumber(value: '+12025550101', label: 'unselected'),
  ],
  selectedPhone: phone,
  household: household,
  familySide: side,
);

PhoneImportBatch _batch({
  String operation = 'operation_reference_01',
  List<PhoneImportEntry>? entries,
  String program = 'wedding',
  String account = 'client',
  String organizer = 'planner',
}) => PhoneImportBatch.fromReview(
  review: PhoneImportReview(
    reviewId: operation,
    entries: entries ?? [_guest()],
  ),
  accountId: account,
  programId: program,
  organizerId: organizer,
  familySideLabels: _labels,
);

Map<String, Object?> _duty({
  String duty = 'guestRelations',
  List<String> pickups = const [],
  List<String> hotels = const [],
  List<String> functions = const [],
  DateTime? expiry,
  bool omitDeadline = false,
}) => {
  'duty': duty,
  'pickupPointIds': pickups,
  'hotelIds': hotels,
  'functionIds': functions,
  'expiresAtMillis': omitDeadline
      ? null
      : (expiry ?? _expiry).millisecondsSinceEpoch,
};

Map<String, Object?> _access({
  String role = 'staff',
  String status = 'active',
  String kind = 'wedding',
  String program = 'wedding',
  String organizer = 'planner',
  List<Map<String, Object?>>? duties,
  DateTime? grantExpiry,
  bool omitGrant = false,
}) => {
  'programId': program,
  'organizerId': organizer,
  'title': 'Synthetic wedding',
  'kind': kind,
  'status': status,
  'timezone': 'Etc/UTC',
  'actorRole': role,
  'grantExpiresAtMillis': omitGrant
      ? null
      : (grantExpiry ?? _expiry).millisecondsSinceEpoch,
  'duties': duties ?? [_duty()],
  'capabilities': <String>[],
  'pickupPoints': <Object?>[],
  'functions': <Object?>[],
  'hotels': <Object?>[],
  'vehicleClasses': <Object?>[],
};

Map<String, Object?> _result(
  Map<String, Object?> payload, {
  bool replay = false,
  List<Map<String, Object?>> errors = const [],
}) => {
  'mode': payload['mode'],
  'totalRows': (payload['rows']! as List).length,
  'guestsCreated': 1,
  'guestsUpdated': 0,
  'legsCreated': 0,
  'legsUpdated': 0,
  'householdsCreated': 0,
  'partiesCreated': 0,
  'groupsCreated': 0,
  'rowErrors': errors,
  'alreadyApplied': replay,
};

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  group('frozen canonical rows', () {
    test('only chosen phone and explicit cohort/household cross the seam', () {
      final batch = _batch(
        entries: [
          _guest(
            name: '  Reviewed name  ',
            household: '  Synthetic household  ',
            side: PhoneImportFamilySide.partnerOne,
          ),
        ],
      );
      expect(batch.rows, [
        {
          'displayName': 'Reviewed name',
          'externalReference': 'phone-picker:guest_reference_01',
          'phoneE164': '+12025550100',
          'householdLabel': 'Synthetic household',
          'groupLabels': 'side:Partner one family',
        },
      ]);
      expect(() => batch.rows.add({}), throwsUnsupportedError);
      expect(
        () => batch.rows.single['displayName'] = 'Changed',
        throwsUnsupportedError,
      );
    });
    test('shared number and matching name retain two upstream references', () {
      final batch = _batch(
        entries: [
          _guest(),
          _guest(id: 'guest_reference_02'),
        ],
      );
      expect(batch.rows.length, 2);
      expect(batch.rows.map((r) => r['phoneE164']).toSet(), {'+12025550100'});
      expect(batch.rows.map((r) => r['externalReference']).toSet().length, 2);
    });
    test(
      'manual household member imports without phone or identity assertions',
      () {
        final batch = _batch(
          entries: [
            PhoneImportEntry(
              id: 'manual_reference_01',
              displayName: 'Synthetic child',
              numbers: const [],
              source: PhoneImportEntrySource.manualHouseholdMember,
              household: 'Synthetic household',
            ),
          ],
        );
        expect(batch.rows.single, {
          'displayName': 'Synthetic child',
          'externalReference': 'phone-household:manual_reference_01',
          'householdLabel': 'Synthetic household',
        });
      },
    );
    test('local number is rejected without guessing a country', () {
      expect(
        () => _batch(entries: [_guest(phone: '202-555-0100')]),
        throwsA(
          isA<ValidationException>().having(
            (e) => e.code,
            'code',
            'phone-import-country-code-required',
          ),
        ),
      );
    });
    test(
      'empty, nameless, no-number and duplicate-row reviews fail closed',
      () {
        for (final entries in <List<PhoneImportEntry>>[
          [],
          [_guest(name: ' ')],
          [_guest(), _guest()],
          [
            PhoneImportEntry(
              id: 'reference_no_phone',
              displayName: 'Synthetic',
              numbers: const [],
            ),
          ],
          List.generate(101, (i) => _guest(id: 'reference_guest_$i')),
        ]) {
          expect(
            () => _batch(entries: entries),
            throwsA(isA<ValidationException>()),
          );
        }
      },
    );
    test(
      'editing a guest preserves its reference but changes command content',
      () {
        final first = _batch();
        final edited = _batch(
          operation: 'operation_reference_02',
          entries: [_guest(name: 'Edited')],
        );
        expect(
          first.rows.single['externalReference'],
          edited.rows.single['externalReference'],
        );
        expect(first.contentKey, isNot(edited.contentKey));
      },
    );
  });

  group('current canonical authority', () {
    bool allowed(Map<String, Object?> data) => canImportWeddingPhoneContacts(
      ProgramWorkAccess.fromCallableData(data),
      _now,
    );
    test(
      'explicit client/parent guest grant and coordinator qualify without promotion',
      () {
        expect(allowed(_access()), isTrue);
        expect(
          allowed(_access(duties: [_duty(duty: 'programCoordinator')])),
          isTrue,
        );
        expect(
          ProgramWorkAccess.fromCallableData(_access()).isManager,
          isFalse,
        );
        expect(
          allowed(_access(role: 'manager', duties: [], omitGrant: true)),
          isTrue,
        );
      },
    );
    test('restrictions cannot combine across separate assignments', () {
      expect(
        allowed(
          _access(
            duties: [
              _duty(pickups: ['pickup']),
              _duty(hotels: ['hotel']),
            ],
          ),
        ),
        isFalse,
      );
      expect(
        allowed(
          _access(
            duties: [
              _duty(functions: ['function']),
            ],
          ),
        ),
        isFalse,
      );
      expect(
        allowed(_access(duties: [_duty(duty: 'communications')])),
        isFalse,
      );
    });
    test('missing, expired and beyond-grant deadlines fail closed', () {
      for (final access in [
        _access(omitGrant: true),
        _access(grantExpiry: _now),
        _access(duties: [_duty(omitDeadline: true)]),
        _access(duties: [_duty(expiry: _now)]),
        _access(
          duties: [_duty(expiry: _expiry.add(const Duration(seconds: 1)))],
        ),
      ]) {
        expect(allowed(access), isFalse);
      }
    });
    test(
      'archived and non-wedding workspaces cannot use this wedding adapter',
      () {
        expect(allowed(_access(status: 'archived', role: 'manager')), isFalse);
        expect(allowed(_access(kind: 'corporate', role: 'manager')), isFalse);
        expect(allowed(_access(status: 'completed')), isTrue);
      },
    );
  });

  group('existing repositories and transport', () {
    late _Functions functions;
    late SharedPreferencesProgramReadSnapshotStore store;
    late PhoneImportAdapter adapter;
    String? account;
    String? program;
    setUp(() {
      SharedPreferences.setMockInitialValues({});
      account = 'client';
      program = 'wedding';
      functions = _Functions();
      store = SharedPreferencesProgramReadSnapshotStore();
      functions.respond = (name, payload) async =>
          name == 'getProgramWorkAccess' ? _access() : _result(payload);
      adapter = PhoneImportAdapter(
        workRepository: ProgramWorkRepository(functions, store, () => account),
        setupRepository: ProgramSetupRepository(functions),
        currentAccountId: () => account,
        currentProgramId: () => program,
        now: () => _now,
      );
    });

    test(
      'preview and commit each use fresh access and the exact canonical payload',
      () async {
        final batch = _batch();
        await adapter.preview(batch);
        await adapter.commit(batch);
        expect(functions.calls.map((c) => c.name).toList(), [
          'getProgramWorkAccess',
          'importWeddingPhoneContacts',
          'getProgramWorkAccess',
          'importWeddingPhoneContacts',
        ]);
        for (final mode in ['preview', 'commit']) {
          final call = functions.calls.firstWhere(
            (c) => c.payload['mode'] == mode,
          );
          expect(call.payload, {
            'programId': 'wedding',
            'mode': mode,
            'clientOperationId': batch.operationId,
            'rows': batch.rows,
          });
        }
      },
    );
    test('commit requires successful preview of identical content', () async {
      await expectLater(
        adapter.commit(_batch()),
        throwsA(isA<ValidationException>()),
      );
      expect(functions.calls, isEmpty);
      functions.respond = (name, payload) async =>
          name == 'getProgramWorkAccess'
          ? _access()
          : _result(
              payload,
              errors: [
                {'index': 0, 'message': 'Review row'},
              ],
            );
      final batch = _batch();
      expect((await adapter.preview(batch)).rowErrors.single.index, 0);
      await expectLater(
        adapter.commit(batch),
        throwsA(isA<ValidationException>()),
      );
      expect(
        functions.calls.where((c) => c.payload['mode'] == 'commit'),
        isEmpty,
      );
    });
    test(
      'one operation cannot acquire changed rows, order, actor or destination',
      () async {
        final batch = _batch(
          entries: [
            _guest(),
            _guest(id: 'guest_reference_02'),
          ],
        );
        await adapter.preview(batch);
        final variants = [
          _batch(entries: [_guest(name: 'Changed')]),
          _batch(
            entries: [
              _guest(id: 'guest_reference_02'),
              _guest(),
            ],
          ),
          _batch(account: 'other'),
          _batch(program: 'other'),
          _batch(organizer: 'other'),
        ];
        for (final variant in variants) {
          account = variant.accountId;
          program = variant.programId;
          await expectLater(
            adapter.preview(variant),
            throwsA(isA<ValidationException>()),
          );
        }
        expect(functions.calls.length, 2);
      },
    );
    test(
      'lost commit response retries same ordered rows and operation with live grant',
      () async {
        final batch = _batch(
          entries: [
            _guest(),
            _guest(id: 'guest_reference_02'),
          ],
        );
        await adapter.preview(batch);
        var commits = 0;
        functions.respond = (name, payload) async {
          if (name == 'getProgramWorkAccess') return _access();
          if (++commits == 1) {
            throw FirebaseFunctionsException(
              code: 'unavailable',
              message: 'Synthetic lost response',
            );
          }
          return _result(payload, replay: true);
        };
        await expectLater(adapter.commit(batch), throwsA(isA<AppException>()));
        final retry = await adapter.commit(batch);
        expect(retry.alreadyApplied, isTrue);
        final calls = functions.calls
            .where((c) => c.payload['mode'] == 'commit')
            .toList();
        expect(calls.length, 2);
        expect(calls.first.payload, calls.last.payload);
        expect(
          functions.calls.where((c) => c.name == 'getProgramWorkAccess').length,
          3,
        );
      },
    );
    test('duplicate taps share the pending canonical import', () async {
      final batch = _batch();
      await adapter.preview(batch);
      final response = Completer<Object?>();
      final started = Completer<Map<String, Object?>>();
      functions.respond = (name, payload) async {
        if (name == 'getProgramWorkAccess') return _access();
        started.complete(payload);
        return response.future;
      };
      final first = adapter.commit(batch);
      final duplicate = adapter.commit(batch);
      expect(identical(first, duplicate), isTrue);
      final commitPayload = await started.future;
      response.complete(_result(commitPayload));
      await Future.wait([first, duplicate]);
      expect(
        functions.calls.where((c) => c.payload['mode'] == 'commit').length,
        1,
      );
    });
    test(
      'revoked grant between preview and commit never reaches writer',
      () async {
        final batch = _batch();
        await adapter.preview(batch);
        functions.respond = (name, payload) async =>
            throw FirebaseFunctionsException(
              code: 'permission-denied',
              message: 'Synthetic revoked grant',
            );
        await expectLater(adapter.commit(batch), throwsA(isA<AppException>()));
        expect(
          functions.calls.where((c) => c.payload['mode'] == 'commit'),
          isEmpty,
        );
        expect(await store.load('client', 'work:wedding'), isNull);
      },
    );
    test('offline snapshot never enables an import', () async {
      await store.save('client', 'work:wedding', _access());
      functions.respond = (name, payload) async =>
          throw FirebaseFunctionsException(
            code: 'unavailable',
            message: 'Synthetic offline access',
          );
      await expectLater(
        adapter.preview(_batch()),
        throwsA(isA<AppException>()),
      );
      expect(functions.calls.map((c) => c.name), ['getProgramWorkAccess']);
    });
    test(
      'mismatched organizer and restricted fresh grant cannot reach writer',
      () async {
        for (final data in [
          _access(organizer: 'other'),
          _access(
            duties: [
              _duty(hotels: ['hotel']),
            ],
          ),
        ]) {
          functions.respond = (name, payload) async => data;
          await expectLater(
            adapter.preview(_batch()),
            throwsA(isA<PermissionException>()),
          );
        }
        expect(
          functions.calls.every((c) => c.name == 'getProgramWorkAccess'),
          isTrue,
        );
      },
    );
    test(
      'account change while access loads blocks transport and private result',
      () async {
        final response = Completer<Object?>();
        functions.respond = (name, payload) => response.future;
        final pending = adapter.preview(_batch());
        final rejected = expectLater(pending, throwsA(isA<AppException>()));
        account = 'other';
        response.complete(_access());
        await rejected;
        expect(functions.calls.map((c) => c.name), ['getProgramWorkAccess']);
        expect(await store.load('client', 'work:wedding'), isNull);
      },
    );
    test('wedding change while access loads blocks transport', () async {
      final response = Completer<Object?>();
      functions.respond = (name, payload) => response.future;
      final pending = adapter.preview(_batch());
      final rejected = expectLater(
        pending,
        throwsA(isA<PermissionException>()),
      );
      program = 'other';
      response.complete(_access());
      await rejected;
      expect(functions.calls.map((c) => c.name), ['getProgramWorkAccess']);
    });
    test(
      'late commit cannot report success in another account or wedding',
      () async {
        final batch = _batch();
        await adapter.preview(batch);
        final response = Completer<Object?>();
        final started = Completer<Map<String, Object?>>();
        functions.respond = (name, payload) async {
          if (name == 'getProgramWorkAccess') return _access();
          started.complete(payload);
          return response.future;
        };
        final pending = adapter.commit(batch);
        final rejected = expectLater(
          pending,
          throwsA(isA<PermissionException>()),
        );
        final payload = await started.future;
        account = 'other';
        program = 'other';
        response.complete(_result(payload));
        await rejected;
        // An already-issued server call stays bound to its original program.
        expect(payload['programId'], 'wedding');
      },
    );
    test(
      'partial commit retains row errors and original retry identity',
      () async {
        final batch = _batch();
        await adapter.preview(batch);
        functions.respond = (name, payload) async =>
            name == 'getProgramWorkAccess'
            ? _access()
            : _result(
                payload,
                errors: [
                  {'index': 0, 'message': 'Concurrent conflict'},
                ],
              );
        final result = await adapter.commit(batch);
        expect(result.rowErrors.single.message, 'Concurrent conflict');
        expect(
          functions.calls.last.payload['clientOperationId'],
          batch.operationId,
        );
      },
    );
    test(
      'disposed route cannot regain authority after a switch away and back',
      () async {
        final response = Completer<Object?>();
        functions.respond = (name, payload) => response.future;
        final pending = adapter.preview(_batch());
        final rejected = expectLater(
          pending,
          throwsA(isA<PermissionException>()),
        );
        program = 'other';
        adapter.dispose();
        program = 'wedding';
        response.complete(_access());
        await rejected;
        await expectLater(
          adapter.preview(_batch()),
          throwsA(isA<PermissionException>()),
        );
        expect(functions.calls.length, 1);
      },
    );
    test('unexpected response cannot unlock commit', () async {
      functions.respond = (name, payload) async =>
          name == 'getProgramWorkAccess'
          ? _access()
          : {..._result(payload), 'totalRows': 99};
      final batch = _batch();
      await expectLater(
        adapter.preview(batch),
        throwsA(isA<ValidationException>()),
      );
      await expectLater(
        adapter.commit(batch),
        throwsA(isA<ValidationException>()),
      );
    });
  });
}

class _Functions extends Fake implements FirebaseFunctions {
  late Future<Object?> Function(String, Map<String, Object?>) respond;
  final calls = <({String name, Map<String, Object?> payload})>[];
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _Callable((parameters) {
        final payload = Map<String, Object?>.from(parameters! as Map);
        calls.add((name: name, payload: payload));
        return respond(name, payload);
      });
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
