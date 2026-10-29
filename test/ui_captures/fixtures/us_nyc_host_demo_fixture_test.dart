import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks/modules.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:flutter_test/flutter_test.dart';

import 'demo_world.dart';
import 'sales_demo_synthetic_fixtures.dart';

void main() {
  final scenario = salesDemoHostScenario;
  final world = DemoWorld.load(salesDemoHostWorldPath);

  test(
    'each Host role shows its event at the live moment, counted from records',
    () {
      final counts = {
        for (final MapEntry(key: role, value: event)
            in scenario.eventsByRole.entries)
          role: [
            event.bookedCount,
            event.checkedInCount,
            event.waitlistedCount,
          ],
      };
      expect(counts, {
        'hostEventSetup': [0, 0, 0],
        'hostLiveConsole': [17, 7, 3],
        'hostPostEventReport': [17, 13, 2],
      });
      expect(scenario.defaultCheckedInCount, 7);
      expect(scenario.defaultWaitlistedCount, 3);
    },
  );

  test('New York civil times become the UTC instants the captures use', () {
    expect(scenario.referenceNow, DateTime.utc(2026, 5, 31, 9));
    final live = scenario.eventByRole('hostLiveConsole');
    expect(live.startTime, DateTime.utc(2026, 5, 31, 8, 30));
    expect(live.endTime, DateTime.utc(2026, 5, 31, 10, 30));
    expect(
      scenario.eventByRole('hostEventSetup').startTime,
      DateTime.utc(2026, 6, 7, 20),
    );
  });

  test('the host is not a guest, and the roster is the world cast', () {
    expect(scenario.host.personaId, 'nyc_victor_alvarez_024');
    expect(scenario.host.displayName, 'Victor Alvarez');
    expect(scenario.rosterPersonaIds, world.personaIds);
    expect(scenario.rosterPersonaIds, isNot(contains(scenario.host.personaId)));
    expect(scenario.viewerPersonaId, 'nyc_maya_shah_001');
    expect(scenario.wingmanTargetPersonaId, 'nyc_sofia_martinez_003');
  });

  test('each event format is the production default the captures build', () {
    for (final (:eventId, moment: _) in salesDemoHostRoles.values) {
      final event = world.event(eventId);
      final format = event['format']! as Map<String, Object?>;
      final kind = ActivityKind.values.byName(event['activityKind']! as String);
      final snapshot = EventFormatSnapshot.fromActivityKind(kind);
      final defaults = EventSuccessDefaults.recommendedForFormat(
        snapshot,
        enabled: true,
        targetAttendeeCount: event['capacity']! as int,
      );
      final configurable = [
        for (final id in defaults.selectedModuleIds)
          if (EventSuccessModuleCatalog.all
              .firstWhere((module) => module.id == id)
              .hostConfigurable)
            id,
      ];
      expect(
        format['interactionModel'],
        snapshot.interactionModel.name,
        reason: eventId,
      );
      expect(format['playbookId'], snapshot.defaultPlaybookId, reason: eventId);
      expect(format['selectedModuleIds'], configurable, reason: eventId);
      expect(format['hostGoal'], defaults.hostGoal, reason: eventId);
      expect(format['admissionPreset'], 'balancedSingles', reason: eventId);
    }
  });
}
