import 'dart:async';
import 'dart:io';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/host_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/phone_contact_picker.dart';
import 'package:catch_dating_app/contexts/programmes/data/phone_import_adapter.dart';
import 'package:catch_dating_app/contexts/programmes/data/phone_import_retry_store.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/host_work_assignment.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_contact.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_batch.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_draft.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_controller.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_review_screen.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_screen.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_submission_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_provider.dart';
import 'package:catch_dating_app/platform/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/programs/presentation/program_work_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../support/catch_test_fonts.dart';
import '../../test_pump_helpers.dart';
import '../../ui_captures/support/capture_device.dart';
import '../../ui_captures/support/capture_pump.dart';

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

// These responses are consumed by the live adapter's wall clock. The fixed
// sample date above belongs only to page fixtures with an injected clock.
Map<String, Object?> _liveAccess({
  DateTime? now,
  List<String> functionIds = const [],
}) {
  final clock = now ?? DateTime.now();
  return _access(
    grantExpiry: clock.add(const Duration(days: 1)),
    duties: [
      _duty(
        functions: functionIds,
        expiry: clock.add(const Duration(hours: 1)),
      ),
    ],
  );
}

Future<void> _waitForCommit(Completer<void> started, Future<void> pending) =>
    Future.any<void>([
      started.future,
      pending.then<void>((_) {
        fail('Retry ended before the fixture received a commit.');
      }),
    ]);

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

class _User extends Fake implements User {
  _User(this.uid);
  @override
  final String uid;
}

class _Auth extends Fake implements FirebaseAuth {
  String? account = 'client';
  final events = StreamController<User?>.broadcast();
  @override
  User? get currentUser => account == null ? null : _User(account!);
  @override
  Stream<User?> authStateChanges() async* {
    yield currentUser;
    yield* events.stream;
  }

  void switchAccount(String? value) {
    account = value;
    events.add(currentUser);
  }
}

class _Assignments implements HostWorkRepository {
  String planner = 'planner';
  int calls = 0;
  @override
  Future<HostWorkAssignments> listAssignments({
    bool includeExpired = false,
  }) async {
    calls++;
    return HostWorkAssignments(
      shellEntry: HostWorkShellEntry.workShell,
      assignments: [
        HostWorkAssignment(
          kind: HostWorkScopeKind.program,
          scopeId: 'wedding',
          organizerId: planner,
          title: 'Synthetic wedding',
          subtitle: 'Wedding',
          organizerName: 'Synthetic planner',
          duties: const [],
          destinations: const [],
          overflowDestinations: const [],
          shellMode: HostWorkShellMode.task,
          grantExpiresAt: DateTime.now().add(const Duration(days: 1)),
        ),
      ],
    );
  }
}

class _Fixture {
  final functions = _Functions();
  final auth = _Auth();
  final assignments = _Assignments();
  final db = MemoryCommandJournalStorage();
  late final snapshots = SharedPreferencesProgramReadSnapshotStore();
  late final work = ProgramWorkRepository(
    functions,
    snapshots,
    () => auth.account,
  );
  late final setup = ProgramSetupRepository(functions);
  late final retryStore = PhoneImportRetryStore(
    storage: () async => db,
    currentAccountId: () => auth.account,
  );
  _Fixture() {
    functions.respond = (name, payload) async =>
        name == 'getProgramWorkAccess' ? _liveAccess() : _result(payload);
  }
  Future<void> mount(WidgetTester tester, {String program = 'wedding'}) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(AuthRepository(auth)),
          programWorkRepositoryProvider.overrideWithValue(work),
          programSetupRepositoryProvider.overrideWithValue(setup),
          hostWorkRepositoryProvider.overrideWithValue(assignments),
          commandJournalStorageProvider.overrideWithValue(() async => db),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: PhoneImportScreen(programId: program),
        ),
      ),
    );
    await pumpFeatureUi(tester);
  }

  Future<void> close(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox.shrink());
    await auth.events.close();
    await db.close();
  }
}

Future<void> _tap(WidgetTester tester, String key) async {
  final f = find.byKey(ValueKey(key));
  await tester.ensureVisible(f);
  await tester.pump();
  await tester.tap(f);
  await pumpFeatureUi(tester);
}

Future<void> _edit(WidgetTester tester, String key, String value) async {
  final f = find.descendant(
    of: find.byKey(ValueKey(key)),
    matching: find.byType(TextField),
  );
  await tester.ensureVisible(f);
  await tester.enterText(f, value);
  await pumpFeatureUi(tester);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });
  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
          const MethodChannel('catch/phone_contacts'),
          null,
        );
  });
  test(
    'live fixture deadlines follow the caller clock beyond the sample date',
    () {
      final clock = DateTime.utc(2030, 6, 17);
      final access = ProgramWorkAccess.fromCallableData(
        _liveAccess(now: clock),
      );
      expect(
        access.grantExpiresAt!.toUtc(),
        clock.add(const Duration(days: 1)),
      );
      expect(
        access.duties.single.expiresAt!.toUtc(),
        clock.add(const Duration(hours: 1)),
      );
    },
  );
  test(
    'commit wait fails when retry ends before reaching the fixture',
    () async {
      await expectLater(
        _waitForCommit(Completer<void>(), Future<void>.value()),
        throwsA(isA<TestFailure>()),
      );
    },
  );
  testWidgets(
    'client uses current program access; explicit preview then share',
    (tester) async {
      final f = _Fixture();
      addTearDown(() => f.close(tester));
      await f.mount(tester);
      expect(
        find.text('Phone import demo · sharing unavailable'),
        findsNothing,
      );
      expect(
        find.text('Visible to authorized program collaborators'),
        findsOneWidget,
      );
      expect(
        tester
            .widget<CatchButton>(
              find.byKey(const ValueKey('phone-import-share')),
            )
            .onPressed,
        isNull,
      );
      await _tap(tester, 'phone-import-add-member');
      final screen = tester.widget<PhoneImportReviewScreen>(
        find.byType(PhoneImportReviewScreen),
      );
      final id = screen.controller.entries.single.id;
      await _edit(tester, 'phone-import-name-$id', 'Synthetic child');
      await _tap(tester, 'phone-import-sharing');
      await _tap(tester, 'phone-import-preview');
      expect(
        f.functions.calls.where((c) => c.payload['mode'] == 'commit'),
        isEmpty,
      );
      await _tap(tester, 'phone-import-share');
      expect(find.text('Reviewed guests shared'), findsOneWidget);
      final write = f.functions.calls.singleWhere(
        (c) => c.payload['mode'] == 'commit',
      );
      expect((write.payload['rows']! as List).single, {
        'displayName': 'Synthetic child',
        'externalReference': 'phone-household:$id',
      });
      expect(await f.retryStore.load('client', 'wedding'), isNull);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'production exposes phone entry and reviewed route to wedding managers',
    (tester) async {
      AppConfig.configureEntrypointEnvironment(AppEnvironment.prod);
      addTearDown(AppConfig.resetEntrypointEnvironmentOverrideForTesting);
      final access = ProgramWorkAccess.fromCallableData(
        _access(role: 'manager'),
      );
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            home: ProgramWorkPageBody(access: access, now: _now),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(
        find.byKey(const ValueKey('program-work-phone-import')),
        findsOneWidget,
      );

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();

      final f = _Fixture();
      addTearDown(() => f.close(tester));
      await f.mount(tester);
      expect(find.byType(PhoneImportReviewScreen), findsOneWidget);
      expect(find.byKey(const ValueKey('phone-import-pick')), findsOneWidget);
      expect(f.assignments.calls, 0);
      expect(f.functions.calls.map((call) => call.name), [
        'getProgramWorkAccess',
        'getProgramWorkAccess',
      ]);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'native selection needs explicit international review and shares only chosen phone',
    (tester) async {
      final f = _Fixture();
      addTearDown(() => f.close(tester));
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
            const MethodChannel('catch/phone_contacts'),
            (_) async => {
              'status': 'selected',
              'contacts': [
                {
                  'id': 'synthetic-local',
                  'name': 'Synthetic guest',
                  'phones': [
                    {'value': '202-555-0100', 'label': 'Mobile'},
                    {'value': '+12025550101', 'label': 'Unused'},
                  ],
                },
              ],
            },
          );
      await f.mount(tester);
      await _tap(tester, 'phone-import-pick');
      final screen = tester.widget<PhoneImportReviewScreen>(
        find.byType(PhoneImportReviewScreen),
      );
      final id = screen.controller.entries.single.id;
      // Two numbers are not selected implicitly.
      expect(screen.controller.entries.single.selectedPhone, isNull);
      screen.controller.choosePhone(id, '202-555-0100');
      await pumpFeatureUi(tester);
      await _tap(tester, 'phone-import-sharing');
      expect(
        tester
            .widget<CatchButton>(
              find.byKey(const ValueKey('phone-import-preview')),
            )
            .onPressed,
        isNull,
      );
      await _edit(tester, 'phone-import-international-$id', '+1 202 555 0100');
      expect(screen.controller.sharingConfirmed, isFalse);
      await _tap(tester, 'phone-import-sharing');
      await _tap(tester, 'phone-import-preview');
      await _tap(tester, 'phone-import-share');
      final write = f.functions.calls.singleWhere(
        (c) => c.payload['mode'] == 'commit',
      );
      expect((write.payload['rows']! as List).single, {
        'displayName': 'Synthetic guest',
        'externalReference': 'phone-picker:$id',
        'phoneE164': '+12025550100',
      });
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'reselecting the same contact in a new review retains the scoped upstream reference',
    (tester) async {
      final f = _Fixture();
      addTearDown(() => f.close(tester));
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
            const MethodChannel('catch/phone_contacts'),
            (_) async => {
              'status': 'selected',
              'contacts': [
                {
                  'id': 'synthetic-stable-native',
                  'name': 'Synthetic guest',
                  'phones': [
                    {'value': '+12025550100', 'label': 'Mobile'},
                  ],
                },
              ],
            },
          );
      await f.mount(tester);
      await _tap(tester, 'phone-import-pick');
      var screen = tester.widget<PhoneImportReviewScreen>(
        find.byType(PhoneImportReviewScreen),
      );
      final id = screen.controller.entries.single.id;
      await _tap(tester, 'phone-import-sharing');
      await _tap(tester, 'phone-import-preview');
      await _tap(tester, 'phone-import-share');
      final firstOperation = screen.submission!.batch!.operationId;
      await tester.pumpWidget(const SizedBox.shrink());
      await pumpFeatureUi(tester);
      await f.mount(tester);
      await _tap(tester, 'phone-import-pick');
      screen = tester.widget<PhoneImportReviewScreen>(
        find.byType(PhoneImportReviewScreen),
      );
      expect(screen.controller.entries.single.id, id);
      await _tap(tester, 'phone-import-sharing');
      await _tap(tester, 'phone-import-preview');
      expect(screen.submission!.batch!.operationId, isNot(firstOperation));
      expect(
        screen.submission!.batch!.rows.single['externalReference'],
        'phone-picker:$id',
      );
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'cached access cannot open import when live read is unavailable',
    (tester) async {
      final f = _Fixture();
      addTearDown(() => f.close(tester));
      await f.snapshots.save('client', 'work:wedding', _liveAccess());
      f.functions.respond = (name, payload) async =>
          throw FirebaseFunctionsException(
            code: 'unavailable',
            message: 'Synthetic offline',
          );
      await f.mount(tester);
      expect(find.byType(PhoneImportReviewScreen), findsNothing);
      expect(f.assignments.calls, 0);
      expect(f.functions.calls.single.name, 'getProgramWorkAccess');
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('changed organizer or restricted guest scope fails closed', (
    tester,
  ) async {
    for (final mismatch in [true, false]) {
      final f = _Fixture();
      if (mismatch) {
        var reads = 0;
        f.functions.respond = (_, _) async => {
          ..._liveAccess(),
          if (++reads > 1) 'organizerId': 'other-planner',
        };
      } else {
        f.functions.respond = (name, payload) async =>
            _liveAccess(functionIds: ['one-function']);
      }
      await f.mount(tester);
      expect(find.byType(PhoneImportReviewScreen), findsNothing);
      expect(find.byKey(const ValueKey('phone-import-pick')), findsNothing);
      expect(tester.takeException(), isNull);
      await f.close(tester);
    }
  });
  testWidgets(
    'wedding route change disposes pending write even after returning',
    (tester) async {
      final f = _Fixture();
      addTearDown(() => f.close(tester));
      await f.retryStore.save(_batch());
      await f.mount(tester);
      final old = tester
          .widget<PhoneImportReviewScreen>(find.byType(PhoneImportReviewScreen))
          .submission!;
      final started = Completer<void>();
      final response = Completer<Object?>();
      Map<String, Object?>? sent;
      f.functions.respond = (name, payload) async {
        if (name == 'getProgramWorkAccess') return _liveAccess();
        if (payload['mode'] == 'preview') return _result(payload);
        sent = payload;
        started.complete();
        return response.future;
      };
      final pending = old.retry();
      await _waitForCommit(started, pending);
      await f.mount(tester, program: 'other-wedding');
      expect(find.byType(PhoneImportReviewScreen), findsNothing);
      await f.mount(tester);
      response.complete(_result(sent!));
      await pending;
      await pumpFeatureUi(tester);
      expect(find.text('Saved review needs confirmation'), findsOneWidget);
      expect(find.text('Reviewed guests shared'), findsNothing);
      expect(await f.retryStore.load('client', 'wedding'), isNotNull);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'auth switch disposes an in-flight review; late receipt stays private',
    (tester) async {
      final f = _Fixture();
      addTearDown(() => f.close(tester));
      await f.retryStore.save(_batch());
      await f.mount(tester);
      final old = tester
          .widget<PhoneImportReviewScreen>(find.byType(PhoneImportReviewScreen))
          .submission!;
      final started = Completer<void>();
      final response = Completer<Object?>();
      Map<String, Object?>? sent;
      f.functions.respond = (name, payload) async {
        if (name == 'getProgramWorkAccess') return _liveAccess();
        if (payload['mode'] == 'preview') return _result(payload);
        sent = payload;
        started.complete();
        return response.future;
      };
      final pending = old.retry();
      await _waitForCommit(started, pending);
      f.auth.switchAccount(null);
      await pumpFeatureUi(tester);
      expect(find.byType(PhoneImportReviewScreen), findsNothing);
      response.complete(_result(sent!));
      await pending;
      f.auth.switchAccount('client');
      await pumpFeatureUi(tester);
      expect(find.text('Saved review needs confirmation'), findsOneWidget);
      expect(find.text('Reviewed guests shared'), findsNothing);
      expect(await f.retryStore.load('client', 'wedding'), isNotNull);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('work entry is hidden for cached or restricted grants', (
    tester,
  ) async {
    for (final state in ['current', 'cached', 'restricted']) {
      final access = ProgramWorkAccess.fromCallableData(
        _access(
          duties: state == 'restricted'
              ? [
                  _duty(functions: ['one']),
                ]
              : null,
        ),
      );
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            home: ProgramWorkPageBody(
              access: access,
              now: _now,
              snapshotAt: state == 'cached' ? _now : null,
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(
        find.byKey(const ValueKey('program-work-phone-import')),
        state == 'current' ? findsOneWidget : findsNothing,
      );
      expect(tester.takeException(), isNull);
    }
  });
  const captureDirectory = String.fromEnvironment(
    'PHONE_IMPORT_LIVE_CAPTURE_DIRECTORY',
  );
  if (captureDirectory.isNotEmpty) {
    setUpAll(loadCatchTestFonts);
    for (final scale in [1.0, 2.0]) {
      for (final phase in ['ready', 'retry', 'completed']) {
        testWidgets('capture live $phase at $scale', (tester) async {
          final f = _Fixture();
          addTearDown(() => f.close(tester));
          final review = PhoneImportController(picker: _SyntheticPicker());
          final submission = PhoneImportSubmissionController(
            review: review,
            adapter: PhoneImportAdapter(
              workRepository: f.work,
              setupRepository: f.setup,
              currentAccountId: () => f.auth.account,
              currentProgramId: () => 'wedding',
            ),
            retryStore: f.retryStore,
            accountId: 'client',
            programId: 'wedding',
            organizerId: 'planner',
            familySideLabels: _labels,
          );
          addTearDown(() {
            submission.dispose();
            review.dispose();
          });
          await submission.initialize();
          await review.pickContacts();
          review.assignHousehold(review.entries.single.id, 'Shah household');
          review.assignFamilySide(
            review.entries.single.id,
            PhoneImportFamilySide.partnerOne,
          );
          review.confirmSharing(true);
          await submission.preview();
          if (phase == 'retry') {
            f.functions.respond = (name, payload) async {
              if (name == 'getProgramWorkAccess') return _liveAccess();
              throw FirebaseFunctionsException(
                code: 'unavailable',
                message: 'Synthetic lost response',
              );
            };
          }
          if (phase != 'ready') await submission.share();
          await captureCatchWidget(
            tester,
            id: 'phone-import-live-$phase-$scale',
            device: CaptureDevice.iphone17Pro,
            textScale: scale,
            disableAnimations: true,
            outputDirectory: Directory(captureDirectory),
            builder: (_) => PhoneImportReviewScreen(
              controller: review,
              submission: submission,
              weddingName: 'Asha & Ravi · sample wedding',
            ),
            drive: phase == 'ready'
                ? (tester) async {
                    await tester.ensureVisible(
                      find.byKey(const ValueKey('phone-import-share')),
                    );
                    await pumpFeatureUi(tester);
                  }
                : null,
          );
          expect(tester.takeException(), isNull);
        });
      }
    }
  }
}

class _SyntheticPicker implements PhoneContactPicker {
  @override
  Future<PhoneContactPickerResult> pickContacts() async =>
      PhoneContactPickerResult(PhoneContactPickerStatus.selected, [
        PhoneContact(
          localId: 'synthetic-asha',
          displayName: 'Asha Shah',
          numbers: const [
            PhoneContactNumber(value: '+12025550100', label: 'Mobile'),
          ],
        ),
      ]);
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
