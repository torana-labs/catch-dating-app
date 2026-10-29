import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/programmes/data/phone_contact_picker.dart';
import 'package:catch_dating_app/contexts/programmes/data/phone_import_adapter.dart';
import 'package:catch_dating_app/contexts/programmes/data/phone_import_retry_store.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_contact.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_batch.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_draft.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_controller.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_submission_controller.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/persistence/memory_command_journal_storage.dart';
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

class _Picker implements PhoneContactPicker {
  @override
  Future<PhoneContactPickerResult> pickContacts() async =>
      PhoneContactPickerResult(PhoneContactPickerStatus.selected, [
        PhoneContact(
          localId: 'synthetic-local-id',
          displayName: 'Synthetic guest',
          numbers: const [
            PhoneContactNumber(value: '+12025550100', label: 'chosen'),
          ],
        ),
      ]);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late _Functions functions;
  late MemoryCommandJournalStorage db;
  late PhoneImportRetryStore store;
  late PhoneImportController review;
  late PhoneImportSubmissionController submission;
  String? account;
  String? program;
  PhoneImportSubmissionController create() {
    review = PhoneImportController(picker: _Picker());
    return PhoneImportSubmissionController(
      review: review,
      adapter: PhoneImportAdapter(
        workRepository: ProgramWorkRepository(
          functions,
          SharedPreferencesProgramReadSnapshotStore(),
          () => account,
        ),
        setupRepository: ProgramSetupRepository(functions),
        currentAccountId: () => account,
        currentProgramId: () => program,
        now: () => _now,
      ),
      retryStore: store,
      accountId: 'client',
      programId: 'wedding',
      organizerId: 'planner',
      familySideLabels: _labels,
    );
  }

  Future<void> ready() async {
    await submission.initialize();
    await review.pickContacts();
    review.confirmSharing(true);
    await submission.preview();
    expect(submission.canShare, isTrue);
  }

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    account = 'client';
    program = 'wedding';
    functions = _Functions();
    functions.respond = (name, payload) async =>
        name == 'getProgramWorkAccess' ? _access() : _result(payload);
    db = MemoryCommandJournalStorage();
    store = PhoneImportRetryStore(
      storage: () async => db,
      currentAccountId: () => account,
    );
    submission = create();
  });
  tearDown(() {
    submission.dispose();
    review.dispose();
  });

  test(
    'preview never commits or persists and edits revoke preview and consent',
    () async {
      await ready();
      expect(await store.load('client', 'wedding'), isNull);
      expect(
        functions.calls.where((c) => c.payload['mode'] == 'commit'),
        isEmpty,
      );
      review.rename(review.entries.single.id, 'Reviewed synthetic name');
      expect(submission.canShare, isFalse);
      expect(review.sharingConfirmed, isFalse);
      await submission.share();
      expect(
        functions.calls.where((c) => c.payload['mode'] == 'commit'),
        isEmpty,
      );
    },
  );
  test(
    'confirmed batch is durable before commit and cleared only after receipt',
    () async {
      await ready();
      functions.respond = (name, payload) async {
        if (name == 'getProgramWorkAccess') return _access();
        final saved = await store.load('client', 'wedding');
        expect(saved, isNotNull);
        expect(jsonEncode(saved!.rows), jsonEncode(payload['rows']));
        expect(saved.operationId, payload['clientOperationId']);
        return _result(payload);
      };
      await submission.share();
      expect(submission.phase, PhoneImportSubmissionPhase.completed);
      expect(await store.load('client', 'wedding'), isNull);
      expect(review.interactionLocked, isTrue);
    },
  );
  test(
    'lost response survives controller recreation without automatic replay',
    () async {
      await ready();
      final confirmed = submission.batch!;
      functions.respond = (name, payload) async {
        if (name == 'getProgramWorkAccess') return _access();
        throw FirebaseFunctionsException(
          code: 'unavailable',
          message: 'Synthetic response lost',
        );
      };
      await submission.share();
      expect(submission.phase, PhoneImportSubmissionPhase.retry);
      expect(await store.load('client', 'wedding'), isNotNull);
      submission.dispose();
      review.dispose();
      final calls = functions.calls.length;
      submission = create();
      await submission.initialize();
      expect(functions.calls.length, calls);
      expect(submission.batch!.contentKey, confirmed.contentKey);
      functions.respond = (name, payload) async =>
          name == 'getProgramWorkAccess'
          ? _access()
          : _result(payload, replay: true);
      await submission.retry();
      expect(submission.phase, PhoneImportSubmissionPhase.completed);
      final commits = functions.calls
          .where((c) => c.payload['mode'] == 'commit')
          .toList();
      expect(commits.length, 2);
      expect(jsonEncode(commits[0].payload), jsonEncode(commits[1].payload));
      expect(submission.result!.alreadyApplied, isTrue);
    },
  );
  test(
    'storage failure prevents every commit and retains the frozen review',
    () async {
      await ready();
      await store.save(_batch(operation: 'other_pending_operation'));
      await submission.share();
      expect(submission.canRetry, isTrue);
      expect(
        functions.calls.where((c) => c.payload['mode'] == 'commit'),
        isEmpty,
      );
      expect(
        (await store.load('client', 'wedding'))!.operationId,
        'other_pending_operation',
      );
      await submission.dismissPending();
      expect(submission.canRetry, isTrue);
      expect(
        (await store.load('client', 'wedding'))!.operationId,
        'other_pending_operation',
      );
    },
  );
  test(
    'sharing freezes edits and duplicate taps while response is pending',
    () async {
      await ready();
      final started = Completer<void>();
      final response = Completer<Object?>();
      Map<String, Object?>? sent;
      functions.respond = (name, payload) async {
        if (name == 'getProgramWorkAccess') return _access();
        sent = payload;
        started.complete();
        return response.future;
      };
      final pending = submission.share();
      await started.future;
      final name = review.entries.single.displayName;
      review.rename(review.entries.single.id, 'Ignored edit');
      review.discard();
      review.addHouseholdMember(name: 'Ignored guest');
      await submission.share();
      await submission.retry();
      expect(review.entries.single.displayName, name);
      expect(
        functions.calls.where((c) => c.payload['mode'] == 'commit').length,
        1,
      );
      response.complete(_result(sent!));
      await pending;
    },
  );
  test(
    'revoked grant on explicit retry preserves pending command and sends no write',
    () async {
      await store.save(_batch());
      await submission.initialize();
      functions.respond = (name, payload) async => _access(duties: []);
      await submission.retry();
      expect(submission.canRetry, isTrue);
      expect(submission.error, isA<PermissionException>());
      expect(
        functions.calls.where((c) => c.payload['mode'] == 'commit'),
        isEmpty,
      );
      expect(await store.load('client', 'wedding'), isNotNull);
    },
  );
  test(
    'partial response remains visible and never clears retry state',
    () async {
      await ready();
      functions.respond = (name, payload) async =>
          name == 'getProgramWorkAccess'
          ? _access()
          : _result(
              payload,
              errors: [
                {'index': 0, 'message': 'Synthetic conflict'},
              ],
            );
      await submission.share();
      expect(submission.canRetry, isTrue);
      expect(submission.result!.rowErrors.single.message, 'Synthetic conflict');
      expect(await store.load('client', 'wedding'), isNotNull);
    },
  );
  test(
    'disposed route cannot turn late receipt into visible success or delete retry',
    () async {
      await ready();
      final started = Completer<void>();
      final response = Completer<Object?>();
      Map<String, Object?>? sent;
      functions.respond = (name, payload) async {
        if (name == 'getProgramWorkAccess') return _access();
        sent = payload;
        started.complete();
        return response.future;
      };
      final pending = submission.share();
      await started.future;
      submission.dispose();
      account = 'other';
      account = 'client';
      response.complete(_result(sent!));
      await pending;
      expect(await store.load('client', 'wedding'), isNotNull);
      // Replace the already-disposed instance for normal teardown.
      review.dispose();
      submission = create();
    },
  );
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
