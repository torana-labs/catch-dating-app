import 'dart:async';
import 'dart:io';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_review_screen.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_route_controller.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_route_state.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_screen.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/programs/presentation/program_guests_screen.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import '../ui_captures/support/capture_device.dart';
import '../ui_captures/support/capture_pump.dart';

const _entryKey = ValueKey('program-guests-phone-import');

OrganizerProgramDetail _detail({
  String kind = 'wedding',
  String status = 'active',
}) => OrganizerProgramDetail.fromCallableData({
  'program': {
    'programId': 'p-1',
    'organizerId': 'o-1',
    'kind': kind,
    'title': 'Synthetic wedding',
    'timezone': 'Asia/Kolkata',
    'status': status,
    'startsAtMillis': DateTime(2030, 2, 10).millisecondsSinceEpoch,
    'endsAtMillis': DateTime(2030, 2, 13).millisecondsSinceEpoch,
    'capabilities': <String>[],
    'revision': 1,
  },
  'functions': <Map<String, Object?>>[],
  'pickupPoints': <Map<String, Object?>>[],
  'hotels': <Map<String, Object?>>[],
  'counts': {'guests': 0, 'households': 0, 'inboundLegs': 0, 'activeStaff': 0},
});

ProgramReadView<ProgramWorkAccess> _view({
  String kind = 'wedding',
  String status = 'active',
  String role = 'manager',
  String program = 'p-1',
  String organizer = 'o-1',
  bool cached = false,
  bool expired = false,
  bool restricted = false,
}) {
  final now = DateTime.now();
  final expires = expired
      ? now.subtract(const Duration(hours: 1))
      : now.add(const Duration(days: 1));
  return (
    value: ProgramWorkAccess.fromCallableData({
      'programId': program,
      'organizerId': organizer,
      'title': 'Synthetic wedding',
      'kind': kind,
      'status': status,
      'timezone': 'Asia/Kolkata',
      'actorRole': role,
      'duties': [
        if (role == 'staff')
          {
            'duty': 'guestRelations',
            'pickupPointIds': <String>[],
            'hotelIds': <String>[],
            'functionIds': restricted ? ['fn-1'] : <String>[],
            'expiresAtMillis': expires.millisecondsSinceEpoch,
          },
      ],
      'grantExpiresAtMillis': role == 'staff'
          ? expires.millisecondsSinceEpoch
          : null,
      'capabilities': <String>[],
      'pickupPoints': <Map<String, Object?>>[],
      'hotels': <Map<String, Object?>>[],
      'functions': <Map<String, Object?>>[],
      'vehicleClasses': <Map<String, Object?>>[],
    }),
    snapshotAt: cached ? now : null,
    snapshotExpiresAt: cached ? now.add(const Duration(minutes: 1)) : null,
  );
}

/// The real destination still opens its route controller. A synthetic fresh
/// denial verifies that navigation cannot bypass it or invoke a native picker.
class _ImportRoute extends PhoneImportRouteController {
  final openedPrograms = <String>[];

  @override
  String? readAccountId() => 'synthetic-account';

  @override
  Future<PhoneImportRouteSession> open({
    required String programId,
    required bool Function() isCurrent,
  }) async {
    openedPrograms.add(programId);
    throw const PermissionException('Synthetic fresh access denial');
  }
}

class _Fixture {
  _Fixture({OrganizerProgramDetail? detail}) : detail = detail ?? _detail();

  final OrganizerProgramDetail detail;
  int accessReads = 0;
  Future<ProgramReadView<ProgramWorkAccess>> Function() readAccess = () async =>
      _view();
  final importRoute = _ImportRoute();
  late final container = ProviderContainer(
    retry: (_, _) => null,
    overrides: [
      uidProvider.overrideWithValue(const AsyncData('synthetic-account')),
      organizerProgramDetailProvider('p-1').overrideWith((ref) async => detail),
      programGuestListProvider('p-1').overrideWith(
        (ref) async => ProgramGuestListPage.fromCallableData({
          'programId': 'p-1',
          'guests': <Map<String, Object?>>[],
          'households': <Map<String, Object?>>[],
          'functionGuests': <Map<String, Object?>>[],
          'groups': <Map<String, Object?>>[],
          'nextCursor': null,
        }),
      ),
      programWorkEntryProvider('p-1', null).overrideWith((ref) {
        accessReads++;
        return readAccess();
      }),
      phoneImportRouteControllerProvider.overrideWith(() => importRoute),
    ],
  );
  late final router = GoRouter(
    initialLocation: '/host/programs/p-1/guests',
    routes: [
      GoRoute(
        path: Routes.hostProgramGuestsScreen.path,
        name: Routes.hostProgramGuestsScreen.name,
        builder: (_, state) =>
            ProgramGuestsScreen(programId: state.pathParameters['programId']!),
      ),
      GoRoute(
        path: Routes.hostWorkPhoneImportScreen.path,
        name: Routes.hostWorkPhoneImportScreen.name,
        builder: (_, state) =>
            PhoneImportScreen(programId: state.pathParameters['programId']!),
      ),
    ],
  );

  Widget get captureBody => UncontrolledProviderScope(
    container: container,
    child: Router.withConfig(config: router),
  );

  Future<void> mount(WidgetTester tester) async {
    addTearDown(router.dispose);
    addTearDown(container.dispose);
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
}

void main() {
  testWidgets('manager Guests opens the existing guarded phone-import route', (
    tester,
  ) async {
    final f = _Fixture();
    await f.mount(tester);
    expect(find.text('Import phone contacts'), findsOneWidget);
    expect(find.byKey(_entryKey).hitTestable(), findsOneWidget);
    expect(find.text('Add guest'), findsOneWidget);
    expect(
      tester.getTopLeft(find.byKey(_entryKey)).dy,
      lessThan(tester.getTopLeft(find.text('Add guest')).dy),
    );
    await tester.tap(find.byKey(_entryKey));
    await pumpFeatureUi(tester);
    expect(f.router.state.uri.path, '/host/work/p-1/phone-import');
    expect(f.importRoute.openedPrograms, ['p-1']);
    expect(find.byType(PhoneImportScreen), findsOneWidget);
    expect(find.byType(PhoneImportReviewScreen), findsNothing);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  final hiddenViews = <String, ProgramReadView<ProgramWorkAccess>>{
    'cached manager': _view(cached: true),
    'archived work access': _view(status: 'archived'),
    'corporate work access': _view(kind: 'corporate'),
    'different program': _view(program: 'p-2'),
    'different organizer': _view(organizer: 'o-2'),
    'eligible staff still use their existing Work route': _view(role: 'staff'),
    'restricted staff': _view(role: 'staff', restricted: true),
    'expired staff': _view(role: 'staff', expired: true),
  };
  for (final entry in hiddenViews.entries) {
    testWidgets('manager entry is hidden for ${entry.key}', (tester) async {
      final f = _Fixture()..readAccess = () async => entry.value;
      await f.mount(tester);
      expect(find.byKey(_entryKey), findsNothing);
      expect(find.text('Import phone contacts'), findsNothing);
      expect(find.text('Add guest'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
  for (final detail in [
    _detail(kind: 'corporate'),
    _detail(status: 'archived'),
  ]) {
    testWidgets(
      'detail ${detail.program.kind.name}/${detail.program.status.name} hides entry',
      (tester) async {
        final f = _Fixture(detail: detail);
        await f.mount(tester);
        expect(find.byKey(_entryKey), findsNothing);
        expect(f.accessReads, 0);
        await tester.pumpWidget(const SizedBox.shrink());
      },
    );
  }

  testWidgets('refresh never retains the entry and a fresh denial hides it', (
    tester,
  ) async {
    final f = _Fixture();
    await f.mount(tester);
    expect(find.byKey(_entryKey), findsOneWidget);
    final refresh = Completer<ProgramReadView<ProgramWorkAccess>>();
    f.readAccess = () => refresh.future;
    f.container.invalidate(programWorkEntryProvider('p-1', null));
    await pumpUntilFound(tester, find.byType(CatchLoadingIndicator));
    expect(find.byKey(_entryKey), findsNothing);
    refresh.completeError(const PermissionException('Synthetic revocation'));
    await pumpFeatureUi(tester);
    expect(find.byKey(_entryKey), findsNothing);
    expect(find.text('Add guest'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets(
    'transient access failure has scoped retry and preserves Guests',
    (tester) async {
      final f = _Fixture()
        ..readAccess = () async => throw const NetworkException(
          'connection-failed',
          'Synthetic connection unavailable',
        );
      await f.mount(tester);
      expect(find.byKey(_entryKey), findsNothing);
      expect(find.text('Add guest'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
      f.readAccess = () async => _view();
      await tester.tap(find.text('Try again'));
      await pumpFeatureUi(tester);
      expect(find.byKey(_entryKey), findsOneWidget);
      expect(f.accessReads, 2);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  const captureDirectory = String.fromEnvironment(
    'PROGRAM_GUESTS_CONTACTS_CAPTURE_DIRECTORY',
  );
  if (captureDirectory.isNotEmpty) {
    setUpAll(loadCatchTestFonts);
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'manager Contacts entry renders in both themes at scale $scale',
        (tester) async {
          final f = _Fixture();
          addTearDown(f.router.dispose);
          addTearDown(f.container.dispose);
          await captureCatchWidget(
            tester,
            id: 'program-guests-contacts-${scale.toInt()}x',
            outputDirectory: Directory(captureDirectory),
            device: CaptureDevice.iphone17Pro,
            textScale: scale,
            builder: (_) => f.captureBody,
            drive: (tester) async {
              expect(find.byKey(_entryKey).hitTestable(), findsOneWidget);
              expect(find.text('Import phone contacts'), findsOneWidget);
              expect(tester.takeException(), isNull);
            },
          );
          await tester.pumpWidget(const SizedBox.shrink());
        },
      );
    }
  }
}
