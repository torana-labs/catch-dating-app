import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/inbox/programme_inbox_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_routes.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_jobs_screen.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_jobs_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'staff_fixtures.dart';

/// The fixture wedding with only [duties] granted.
ProgramWorkAccess _accessWith(List<ProgramStaffDuty> duties) {
  final base = staffAccess();
  return ProgramWorkAccess(
    programId: base.programId,
    organizerId: base.organizerId,
    title: base.title,
    kind: base.kind,
    timezone: base.timezone,
    status: base.status,
    actorRole: base.actorRole,
    duties: [
      for (final duty in duties)
        ProgramDutyAssignment(
          duty: duty,
          pickupPointIds: const {},
          hotelIds: const {},
          functionIds: duty == ProgramStaffDuty.functionCheckIn
              ? const {staffSangeetId}
              : const {},
          expiresAt: base.grantExpiresAt,
        ),
    ],
    grantExpiresAt: base.grantExpiresAt,
    capabilities: base.capabilities,
    pickupPoints: base.pickupPoints,
    hotels: base.hotels,
    functions: base.functions,
    vehicleClasses: base.vehicleClasses,
  );
}

/// Mounts the jobs screen for [access]; [opened] collects every address the
/// programme workspace route is pushed with.
Future<void> _mount(
  WidgetTester tester,
  ProgramWorkAccess access,
  List<Uri> opened,
) async {
  tester.view.physicalSize = const Size(390, 2000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    initialLocation: '/work',
    routes: [
      GoRoute(
        path: '/work',
        builder: (_, _) =>
            StaffJobsScreen(programId: staffProgramId, now: () => staffDayNow),
      ),
      GoRoute(
        path: '/programme/:programId',
        name: Routes.hostProgramWorkspaceScreen.name,
        builder: (_, state) {
          opened.add(state.uri);
          return const SizedBox.shrink();
        },
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        programWorkEntryProvider(staffProgramId, null).overrideWithValue(
          AsyncData((value: access, snapshotAt: null, snapshotExpiresAt: null)),
        ),
      ],
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

void main() {
  test('the duties that talk to guests list the inbox; others do not', () {
    StaffJobsState jobs(List<ProgramStaffDuty> duties) =>
        StaffJobsState.fromAccess(_accessWith(duties), now: staffDayNow);
    expect(
      jobs([ProgramStaffDuty.guestRelations]).links,
      contains(StaffJobLink.inbox),
    );
    expect(
      jobs([ProgramStaffDuty.communications]).links,
      contains(StaffJobLink.inbox),
    );
    expect(
      jobs([ProgramStaffDuty.programCoordinator]).links,
      contains(StaffJobLink.inbox),
    );
    for (final duty in [
      ProgramStaffDuty.functionCheckIn,
      ProgramStaffDuty.airportGreeter,
      ProgramStaffDuty.hotelDesk,
      ProgramStaffDuty.transportDispatcher,
      ProgramStaffDuty.functionLead,
      ProgramStaffDuty.stakeholderViewer,
    ]) {
      expect(
        jobs([duty]).links,
        isNot(contains(StaffJobLink.inbox)),
        reason: duty.name,
      );
    }
  });

  testWidgets('guest relations staff open the programme guest inbox', (
    tester,
  ) async {
    final opened = <Uri>[];
    await _mount(
      tester,
      _accessWith([ProgramStaffDuty.guestRelations]),
      opened,
    );
    await tester.tap(find.text('Guest messages'));
    await pumpFeatureUi(tester);
    expect(opened, hasLength(1));
    expect(opened.single.path, '/programme/$staffProgramId');
    expect(opened.single.queryParameters, {
      'view': HostProgrammePage.inbox.name,
    });
    final screen = hostProgrammeScreenForUri(staffProgramId, opened.single);
    expect(
      screen,
      isA<HostProgrammeInboxScreen>()
          .having((s) => s.programId, 'programId', staffProgramId)
          .having((s) => s.initialThreadId, 'initialThreadId', isNull),
    );
  });

  testWidgets('door staff see no inbox link', (tester) async {
    final opened = <Uri>[];
    await _mount(
      tester,
      _accessWith([ProgramStaffDuty.functionCheckIn]),
      opened,
    );
    expect(find.textContaining('Sangeet', findRichText: true), findsWidgets);
    expect(find.text('Guest messages'), findsNothing);
    expect(opened, isEmpty);
  });
}
