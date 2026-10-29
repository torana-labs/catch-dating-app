import 'package:catch_dating_app/contexts/programmes/data/host_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/host_work_assignment.dart';
import 'package:catch_dating_app/hosts/work/presentation/host_work_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../utility/preview.dart';

HostWorkAssignment _assignment({
  required HostWorkScopeKind kind,
  required String scopeId,
  required String title,
  String? subtitle,
  String organizerName = 'Catch Events Co.',
  List<HostWorkDuty> duties = const [HostWorkDuty.airportGreeter],
  List<HostWorkDestination> destinations = const [HostWorkDestination.arrivals],
  HostWorkShellMode shellMode = HostWorkShellMode.task,
  DateTime? grantExpiresAt,
}) => HostWorkAssignment(
  kind: kind,
  scopeId: scopeId,
  organizerId: 'org_1',
  title: title,
  subtitle: subtitle,
  organizerName: organizerName,
  duties: [
    for (final duty in duties)
      HostWorkGrantedDuty(
        duty: duty,
        pickupPointIds: const {},
        hotelIds: const {},
        functionIds: const {},
      ),
  ],
  destinations: destinations,
  overflowDestinations: const [],
  shellMode: shellMode,
  grantExpiresAt: grantExpiresAt,
);

final _assignments = HostWorkAssignments(
  assignments: [
    _assignment(
      kind: HostWorkScopeKind.program,
      scopeId: 'program_kapoor_shah',
      title: 'Kapoor–Shah Wedding',
      subtitle: 'Feb 13–15 · Delhi',
      duties: const [
        HostWorkDuty.airportGreeter,
        HostWorkDuty.transportDispatcher,
      ],
      destinations: const [
        HostWorkDestination.arrivals,
        HostWorkDestination.dispatch,
      ],
      shellMode: HostWorkShellMode.tabs,
      grantExpiresAt: DateTime.utc(2026, 2, 16),
    ),
    _assignment(
      kind: HostWorkScopeKind.event,
      scopeId: 'event_spring_mixer',
      title: 'Spring Mixer',
      subtitle: 'Catch Events Co.',
      organizerName: 'Catch Events Co.',
      duties: const [HostWorkDuty.eventLead],
      destinations: const [
        HostWorkDestination.nowNext,
        HostWorkDestination.door,
        HostWorkDestination.attention,
      ],
      shellMode: HostWorkShellMode.tabs,
    ),
    _assignment(
      kind: HostWorkScopeKind.program,
      scopeId: 'program_summit',
      title: 'Founders Summit',
      organizerName: 'Summit LLC',
      duties: const [HostWorkDuty.hotelDesk],
      destinations: const [
        HostWorkDestination.inbound,
        HostWorkDestination.rooms,
      ],
      shellMode: HostWorkShellMode.tabs,
    ),
  ],
  shellEntry: HostWorkShellEntry.workShell,
);

@widgetbook.UseCase(
  name: 'Screen states',
  type: HostWorkScreen,
  path: '[P1 product surfaces]/Host work shell',
)
Widget hostWorkScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostWorkScreen',
    contractId: 'screen.host.work',
    children: [
      WidgetbookPageStateCard(
        label: 'assignment picker',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: [
              hostWorkAssignmentsProvider.overrideWithValue(
                AsyncData(_assignments),
              ),
            ],
            child: const HostWorkScreen(),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Body states',
  type: HostWorkPageBody,
  path: '[P1 product surfaces]/Host work shell',
)
Widget hostWorkBodyStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostWorkPageBody',
    contractId: 'screen.host.work',
    children: [
      WidgetbookPageStateCard(
        label: 'grouped picker',
        child: WidgetbookUtilityDeviceFrame(
          child: HostWorkPageBody(assignments: _assignments),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty',
        child: WidgetbookUtilityDeviceFrame(
          child: const HostWorkPageBody(
            assignments: HostWorkAssignments(
              assignments: [],
              shellEntry: HostWorkShellEntry.none,
            ),
          ),
        ),
      ),
    ],
  );
}
