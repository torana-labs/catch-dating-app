import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/programmes/data/host_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/host_work_assignment.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_review_screen.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_route_controller.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_route_state.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_screen.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_provider.dart';
import 'package:catch_dating_app/platform/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/programs/presentation/program_guests_screen.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../test_pump_helpers.dart';

const _programId = 'wedding';
const _organizerId = 'planner';

Map<String, Object?> _access({
  String role = 'manager',
  String organizer = _organizerId,
  String program = _programId,
  bool restricted = false,
  bool expired = false,
}) {
  final deadline = DateTime.now()
      .add(Duration(days: expired ? -1 : 1))
      .millisecondsSinceEpoch;
  return {
    'programId': program,
    'organizerId': organizer,
    'title': 'Synthetic wedding',
    'kind': 'wedding',
    'status': 'active',
    'timezone': 'Etc/UTC',
    'actorRole': role,
    'grantExpiresAtMillis': role == 'manager' ? null : deadline,
    'duties': [
      if (role == 'staff')
        {
          'duty': 'guestRelations',
          'pickupPointIds': <String>[],
          'hotelIds': <String>[],
          'functionIds': restricted ? ['function-1'] : <String>[],
          'expiresAtMillis': deadline,
        },
    ],
    'capabilities': <String>[],
    'pickupPoints': <Object?>[],
    'functions': <Object?>[],
    'hotels': <Object?>[],
    'vehicleClasses': <Object?>[],
  };
}

Club _organizer({
  String id = _organizerId,
  String name = 'Canonical planner',
}) => Club(
  id: id,
  name: name,
  description: '',
  location: '',
  area: '',
  createdAt: DateTime.utc(2030),
);

class _User extends Fake implements User {
  _User(this.uid);
  @override
  final String uid;
}

class _Auth extends Fake implements FirebaseAuth {
  String? account = 'manager-account';
  @override
  User? get currentUser => account == null ? null : _User(account!);
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

class _Organizers extends Fake implements ClubsRepository {
  final requestedIds = <String>[];
  Future<Club?> Function(String) read = (_) async => _organizer();
  @override
  Future<Club?> fetchClub(String id) {
    requestedIds.add(id);
    return read(id);
  }
}

class _Assignments implements HostWorkRepository {
  int calls = 0;
  List<HostWorkAssignment> rows = [];
  Future<void> Function()? beforeReturn;
  @override
  Future<HostWorkAssignments> listAssignments({
    bool includeExpired = false,
  }) async {
    calls++;
    await beforeReturn?.call();
    return HostWorkAssignments(
      assignments: rows,
      shellEntry: HostWorkShellEntry.managerShell,
    );
  }
}

HostWorkAssignment _assignment({
  String organizer = _organizerId,
  String program = _programId,
}) => HostWorkAssignment(
  kind: HostWorkScopeKind.program,
  scopeId: program,
  organizerId: organizer,
  title: 'Synthetic wedding',
  subtitle: null,
  organizerName: 'Staff planner',
  duties: const [],
  destinations: const [],
  overflowDestinations: const [],
  shellMode: HostWorkShellMode.task,
  grantExpiresAt: DateTime.now().add(const Duration(days: 1)),
);

class _Fixture {
  _Fixture() {
    functions.respond = (name, payload) async {
      if (name != 'getProgramWorkAccess') {
        throw StateError('Unexpected callable $name');
      }
      return access;
    };
  }
  Map<String, Object?> access = _access();
  final auth = _Auth();
  final functions = _Functions();
  final organizers = _Organizers();
  final assignments = _Assignments();
  final db = MemoryCommandJournalStorage();
  late final work = ProgramWorkRepository(
    functions,
    SharedPreferencesProgramReadSnapshotStore(),
    () => auth.account,
  );
  late final container = ProviderContainer(
    retry: (_, _) => null,
    overrides: [
      uidProvider.overrideWithValue(const AsyncData('manager-account')),
      authRepositoryProvider.overrideWithValue(AuthRepository(auth)),
      programWorkRepositoryProvider.overrideWithValue(work),
      programSetupRepositoryProvider.overrideWithValue(
        ProgramSetupRepository(functions),
      ),
      clubsRepositoryProvider.overrideWithValue(organizers),
      hostWorkRepositoryProvider.overrideWithValue(assignments),
      commandJournalStorageProvider.overrideWithValue(() async => db),
      organizerProgramDetailProvider(_programId).overrideWith(
        (ref) async => OrganizerProgramDetail.fromCallableData({
          'program': {
            'programId': _programId,
            'organizerId': _organizerId,
            'kind': 'wedding',
            'title': 'Synthetic wedding',
            'timezone': 'Etc/UTC',
            'status': 'active',
            'startsAtMillis': DateTime.utc(2030, 2, 10).millisecondsSinceEpoch,
            'endsAtMillis': DateTime.utc(2030, 2, 13).millisecondsSinceEpoch,
            'capabilities': <String>[],
            'revision': 1,
          },
          'functions': <Object?>[],
          'pickupPoints': <Object?>[],
          'hotels': <Object?>[],
          'counts': {
            'guests': 0,
            'households': 0,
            'inboundLegs': 0,
            'activeStaff': 0,
          },
        }),
      ),
      programGuestListProvider(_programId).overrideWith(
        (ref) async => ProgramGuestListPage.fromCallableData({
          'programId': _programId,
          'guests': <Object?>[],
          'households': <Object?>[],
          'functionGuests': <Object?>[],
          'groups': <Object?>[],
          'nextCursor': null,
        }),
      ),
    ],
  );
  late final lease = container.listen(
    phoneImportRouteControllerProvider,
    (_, _) {},
  );
  PhoneImportRouteController get controller {
    lease;
    return container.read(phoneImportRouteControllerProvider.notifier);
  }

  Future<PhoneImportRouteSession> open({bool Function()? isCurrent}) =>
      controller.open(
        programId: _programId,
        isCurrent: isCurrent ?? () => true,
      );
  GoRouter? router;
  Future<void> mount(WidgetTester tester) async {
    router = GoRouter(
      initialLocation: '/host/programs/$_programId/guests',
      routes: [
        GoRoute(
          path: Routes.hostProgramGuestsScreen.path,
          name: Routes.hostProgramGuestsScreen.name,
          builder: (_, _) => const ProgramGuestsScreen(programId: _programId),
        ),
        GoRoute(
          path: Routes.hostWorkPhoneImportScreen.path,
          name: Routes.hostWorkPhoneImportScreen.name,
          builder: (_, _) => const PhoneImportScreen(programId: _programId),
        ),
      ],
    );
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp.router(
          theme: AppTheme.light,
          routerConfig: router,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
        ),
      ),
    );
    await pumpFeatureUi(tester);
  }

  Future<void> close([WidgetTester? tester]) async {
    if (tester != null) await tester.pumpWidget(const SizedBox.shrink());
    router?.dispose();
    container.dispose();
    await db.close();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  int nativeCalls = 0;
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    nativeCalls = 0;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(const MethodChannel('catch/phone_contacts'), (
          _,
        ) async {
          nativeCalls++;
          return {'status': 'cancelled'};
        });
  });
  tearDown(() {
    expect(nativeCalls, 0, reason: 'Opening a review never reads contacts.');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
          const MethodChannel('catch/phone_contacts'),
          null,
        );
  });

  testWidgets('creator opens real review using canonical program authority', (
    tester,
  ) async {
    final f = _Fixture();
    addTearDown(() => f.close(tester));
    await f.mount(tester);
    await tester.tap(find.byKey(const ValueKey('program-guests-phone-import')));
    await pumpFeatureUi(tester);
    expect(f.router!.state.uri.path, '/host/work/wedding/phone-import');
    expect(find.byType(PhoneImportReviewScreen), findsOneWidget);
    expect(
      find.text('Visible to authorized program collaborators'),
      findsOneWidget,
    );
    expect(find.text('Action unavailable'), findsNothing);
    expect(f.assignments.calls, 0);
    expect(f.organizers.requestedIds, isEmpty);
    expect(f.functions.calls.length, 3);
    expect(
      f.functions.calls.every(
        (c) =>
            c.name == 'getProgramWorkAccess' &&
            c.payload['programId'] == _programId,
      ),
      isTrue,
    );
    expect(
      tester
          .widget<PhoneImportReviewScreen>(find.byType(PhoneImportReviewScreen))
          .controller
          .entries,
      isEmpty,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('entry does not bypass a fresh destination denial', (
    tester,
  ) async {
    final f = _Fixture();
    addTearDown(() => f.close(tester));
    await f.mount(tester);
    f.functions.respond = (_, _) async => throw FirebaseFunctionsException(
      code: 'permission-denied',
      message: 'Current manager access revoked',
    );
    await tester.tap(find.byKey(const ValueKey('program-guests-phone-import')));
    await pumpFeatureUi(tester);
    expect(find.byType(PhoneImportScreen), findsOneWidget);
    expect(find.byType(PhoneImportReviewScreen), findsNothing);
    expect(find.text('Action unavailable'), findsOneWidget);
    expect(f.organizers.requestedIds, isEmpty);
    expect(f.assignments.calls, 0);
    expect(tester.takeException(), isNull);
  });

  for (final kind in ['missing', 'wrong id', 'blank name']) {
    test(
      'creator access has no organizer metadata dependency: $kind',
      () async {
        final f = _Fixture();
        addTearDown(f.close);
        f.organizers.read = (_) async => switch (kind) {
          'missing' => null,
          'wrong id' => _organizer(id: 'another-planner'),
          _ => _organizer(name: '  '),
        };
        final session = await f.open();
        addTearDown(session.dispose);
        expect(f.organizers.requestedIds, isEmpty);
        expect(f.assignments.calls, 0);
      },
    );
  }

  test(
    'changed role during canonical refresh requires a new route review',
    () async {
      final f = _Fixture();
      addTearDown(f.close);
      var reads = 0;
      f.functions.respond = (_, _) async {
        final response = f.access;
        if (++reads == 1) f.access = _access(role: 'staff');
        return response;
      };
      await expectLater(f.open(), throwsA(isA<PermissionException>()));
      expect(f.functions.calls.length, 2);
      expect(f.assignments.calls, 0);
    },
  );

  for (final kind in ['account', 'route', 'organizer']) {
    test('canonical refresh cannot cross a changed $kind', () async {
      final f = _Fixture();
      addTearDown(f.close);
      bool current = true;
      var reads = 0;
      f.functions.respond = (_, _) async {
        final response = f.access;
        if (++reads > 1) return response;
        switch (kind) {
          case 'account':
            f.auth.account = 'other-account';
          case 'route':
            current = false;
          case 'organizer':
            f.access = _access(organizer: 'other-planner');
        }
        return response;
      };
      await expectLater(
        f.open(isCurrent: () => current),
        throwsA(
          kind == 'account'
              ? isA<SignInRequiredException>()
              : isA<PermissionException>(),
        ),
      );
      expect(f.assignments.calls, 0);
    });
  }

  test(
    'approved staff use fresh program access without assignment discovery',
    () async {
      final f = _Fixture()..access = _access(role: 'staff');
      addTearDown(f.close);
      f.assignments.rows = [_assignment()];
      final session = await f.open();
      addTearDown(session.dispose);
      expect(session.access.title, 'Synthetic wedding');
      expect(session.access.isManager, isFalse);
      expect(f.organizers.requestedIds, isEmpty);
      expect(f.assignments.calls, 0);
      expect(f.functions.calls.length, 2);
    },
  );

  for (final kind in [
    'revoked',
    'restricted',
    'expired',
    'organizer',
    'role',
  ]) {
    test('staff refresh cannot retain changed $kind authority', () async {
      final f = _Fixture()..access = _access(role: 'staff');
      addTearDown(f.close);
      f.assignments.rows = [_assignment()];
      var reads = 0;
      f.functions.respond = (_, _) async {
        final response = f.access;
        if (++reads > 1) return response;
        if (kind == 'revoked') {
          f.functions.respond = (_, _) async =>
              throw FirebaseFunctionsException(
                code: 'permission-denied',
                message: 'Synthetic revoked staff access',
              );
        } else {
          f.access = _access(
            role: kind == 'role' ? 'manager' : 'staff',
            restricted: kind == 'restricted',
            expired: kind == 'expired',
            organizer: kind == 'organizer' ? 'other-planner' : _organizerId,
          );
        }
        return response;
      };
      await expectLater(f.open(), throwsA(isA<PermissionException>()));
      expect(f.functions.calls.length, 2);
      expect(f.organizers.requestedIds, isEmpty);
    });
  }

  for (final kind in ['missing', 'wrong program', 'wrong organizer']) {
    test(
      'approved access does not depend on assignment metadata: $kind',
      () async {
        final f = _Fixture()..access = _access(role: 'staff');
        addTearDown(f.close);
        f.assignments.rows = switch (kind) {
          'missing' => [],
          'wrong program' => [_assignment(program: 'other-wedding')],
          _ => [_assignment(organizer: 'other-planner')],
        };
        final session = await f.open();
        addTearDown(session.dispose);
        expect(f.assignments.calls, 0);
        expect(f.organizers.requestedIds, isEmpty);
      },
    );
  }

  for (final kind in ['restricted', 'expired']) {
    test('staff $kind authority cannot reach metadata or a review', () async {
      final f = _Fixture()
        ..access = _access(
          role: 'staff',
          restricted: kind == 'restricted',
          expired: kind == 'expired',
        );
      addTearDown(f.close);
      f.assignments.rows = [_assignment()];
      await expectLater(f.open(), throwsA(isA<PermissionException>()));
      expect(f.assignments.calls, 0);
      expect(f.organizers.requestedIds, isEmpty);
    });
  }
}
