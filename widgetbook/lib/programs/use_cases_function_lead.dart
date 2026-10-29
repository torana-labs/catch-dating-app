import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/programs/presentation/program_attention_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_now_next_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import '../utility/preview.dart';

const _programId = 'program_kapoor_shah';

final _now = DateTime(2026, 2, 14, 14, 30);

final _access = ProgramWorkAccess(
  programId: _programId,
  organizerId: 'org_1',
  title: 'Kapoor–Shah Wedding',
  kind: ProgramKind.wedding,
  timezone: 'Asia/Kolkata',
  status: ProgramStatus.active,
  actorRole: ProgramActorRole.staff,
  duties: [
    ProgramDutyAssignment(
      duty: ProgramStaffDuty.functionLead,
      pickupPointIds: const {},
      hotelIds: const {},
      functionIds: const {},
      expiresAt: _now.add(const Duration(hours: 8)),
    ),
  ],
  grantExpiresAt: _now.add(const Duration(hours: 8)),
  capabilities: const {},
  pickupPoints: const [],
  hotels: const [ProgramHotel(hotelId: 'hotel_taj', name: 'Taj Palace')],
  functions: [
    ProgramFunction(
      functionId: 'fn_haldi',
      name: 'Haldi',
      venueName: 'Courtyard Lawn',
      startsAt: _now.subtract(const Duration(hours: 1)),
      endsAt: _now.add(const Duration(hours: 1)),
      checkInEnabled: true,
      status: ProgramFunctionStatus.scheduled,
      expectedCount: 40,
      checkedInCount: 34,
    ),
    ProgramFunction(
      functionId: 'fn_sangeet',
      name: 'Sangeet',
      venueName: 'The Leela Ballroom',
      startsAt: _now.add(const Duration(hours: 3)),
      endsAt: _now.add(const Duration(hours: 6)),
      checkInEnabled: true,
      status: ProgramFunctionStatus.scheduled,
      expectedCount: 80,
      checkedInCount: 61,
    ),
    ProgramFunction(
      functionId: 'fn_mehndi',
      name: 'Mehendi',
      venueName: 'Terrace Pavilion',
      startsAt: _now.subtract(const Duration(hours: 5)),
      endsAt: _now.subtract(const Duration(hours: 2)),
      checkInEnabled: true,
      status: ProgramFunctionStatus.completed,
      expectedCount: 60,
      checkedInCount: 55,
    ),
  ],
  vehicleClasses: const [],
);

final _attention = ProgramStaffAttention(
  programId: _programId,
  truncated: false,
  items: [
    ProgramStaffAttentionItem(
      itemId: 'run_late_functionLead',
      runId: 'run_late',
      momentId: 'moment_late_arrival_gate',
      duty: 'functionLead',
      severity: 'warning',
      title: 'Late arrival at hotel — escort to Sangeet',
      createdAt: _now.subtract(const Duration(minutes: 12)),
    ),
    ProgramStaffAttentionItem(
      itemId: 'run_mehndi_functionLead',
      runId: 'run_mehndi',
      momentId: 'moment_late_arrival_gate',
      duty: 'functionLead',
      severity: 'urgent',
      title: 'Guest of honour delayed — hold Mehendi entry',
      createdAt: _now.subtract(const Duration(hours: 2)),
    ),
  ],
);

List<Override> _overrides() => [
  programProjectionClockProvider.overrideWithValue(() => _now),
  uidProvider.overrideWithValue(const AsyncData<String?>('uid_greeter')),
  isObviouslyOfflineProvider.overrideWithValue(false),
  programWorkEntryProvider(_programId, null).overrideWithValue(
    AsyncData((value: _access, snapshotAt: null, snapshotExpiresAt: null)),
  ),
  programStaffAttentionProvider(
    _programId,
  ).overrideWithValue(AsyncData(_attention)),
];

@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramNowNextScreen,
  path: '[P1 product surfaces]/Program now next',
)
Widget programNowNextScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramNowNextScreen',
    contractId: 'screen.programs.nowNext',
    children: [
      WidgetbookPageStateCard(
        label: 'function buckets',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _overrides(),
            child: ProgramNowNextScreen(programId: _programId, now: () => _now),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramAttentionScreen,
  path: '[P1 product surfaces]/Program attention',
)
Widget programAttentionScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramAttentionScreen',
    contractId: 'screen.programs.attention',
    children: [
      WidgetbookPageStateCard(
        label: 'duty alerts',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _overrides(),
            child: ProgramAttentionScreen(
              programId: _programId,
              now: () => _now,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Row states',
  type: ProgramFunctionNowNextRow,
  path: '[P1 product surfaces]/Program now next',
)
Widget programFunctionNowNextRowStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramFunctionNowNextRow',
    catalogId: 'screen.programs.now_next',
    children: [
      ProgramFunctionNowNextRow(
        fn: _access.functions[0],
        live: true,
        programId: _programId,
      ),
      ProgramFunctionNowNextRow(
        fn: _access.functions[1],
        live: false,
        programId: _programId,
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Row states',
  type: ProgramAttentionRow,
  path: '[P1 product surfaces]/Program attention',
)
Widget programAttentionRowStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramAttentionRow',
    catalogId: 'screen.programs.attention',
    children: [
      for (final item in _attention.items)
        ProgramAttentionRow(item: item, now: _now),
    ],
  );
}
