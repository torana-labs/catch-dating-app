import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/parts/formats_rule_row.dart';
import 'package:catch_dating_app/contexts/live/parts/live_plan_step_row.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_setup_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_mix_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_rules_controller.dart';
import 'package:catch_dating_app/hosts/live/live_controller.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:flutter_test/flutter_test.dart';

import 'formats_fixtures.dart';

void main() {
  group('court board', () {
    test('reads the round on court, who sits out and how fair it is', () {
      final state = hostFormatsCourtsState(
        plan: courtsPlan(),
        assignments: courtsAssignments(),
        drafts: const [],
        attendees: formatsAttendees(courtsEvent),
      );
      expect(state.status, HostFormatsCourtsStatus.running);
      expect(state.roundIndex, 3);
      expect(state.rounds, 8);
      expect(state.intervalMinutes, 12);
      expect(state.courts, hasLength(4));
      expect(state.courts.first.index, 0);
      expect(state.courts.first.players, hasLength(2));
      expect(state.sitters, hasLength(2));
      expect(state.players, 10);
      expect(state.nextReady, isTrue);
      expect(state.liveControlRevision, 7);
      // Round 4 (index 3) sits out players 6 and 7 by name.
      expect(
        state.sitters.map((s) => s.name),
        containsAll(['Tara Menon', 'Neel Shah']),
      );
      expect(state.mostSatOut, 1);
      expect(state.endsAt, formatsMorning.add(const Duration(minutes: 48)));
    });

    test('before the first round, Rotate now sends round one', () {
      final state = hostFormatsCourtsState(
        plan: courtsPlan(round: -1),
        assignments: courtsAssignments(),
        drafts: const [],
        attendees: formatsAttendees(courtsEvent),
      );
      expect(state.roundIndex, -1);
      expect(state.nextRoundIndex, 0);
      expect(state.nextReady, isTrue);
      expect(state.courts, hasLength(4));
    });

    test('on the last round nothing is left to rotate', () {
      final state = hostFormatsCourtsState(
        plan: courtsPlan(round: 7),
        assignments: courtsAssignments(),
        drafts: const [],
        attendees: formatsAttendees(courtsEvent),
      );
      expect(state.lastRound, isTrue);
      expect(state.nextReady, isFalse);
    });

    test('with no rotations it asks for the setup', () {
      final state = hostFormatsCourtsState(
        plan: courtsPlan(),
        assignments: const <EventSuccessAssignment>[],
        drafts: const [],
        attendees: const [],
      );
      expect(state.status, HostFormatsCourtsStatus.noRotations);
    });
  });

  group('court setup', () {
    test('reads the saved courts, minutes and aim, and saves them back', () {
      final plan = courtsPlan();
      final state = hostFormatsCourtsSetupState(
        plan: plan,
        eventMinutes: 120,
        players: 22,
        assignments: courtsAssignments(),
      );
      expect(
        state.saved,
        const HostFormatsCourtsDraft(
          courts: 4,
          minutes: 12,
          aim: HostFormatsCourtsAim.meetMany,
        ),
      );
      expect(state.roundsFor(12), 10);
      expect(state.playingFor(4), 8);
      expect(state.previewed, isTrue);

      final saved = hostFormatsCourtsStructure(
        plan.structureConfig,
        state.saved.copyWith(
          courts: 6,
          minutes: 15,
          aim: HostFormatsCourtsAim.closeGames,
        ),
      );
      expect(saved.resourceCapacity?.concurrentUnits, 6);
      expect(saved.rotationIntervalMinutes, 15);
      expect(
        saved.clusterActivityAttributes,
        contains(EventSuccessActivityAssignmentAttribute.skillBand),
      );
      expect(
        hostFormatsCourtsDraftFor(saved).aim,
        HostFormatsCourtsAim.closeGames,
      );
      expect(
        hostFormatsCourtsDraftFor(
          hostFormatsCourtsStructure(
            saved,
            hostFormatsCourtsDraftFor(
              saved,
            ).copyWith(aim: HostFormatsCourtsAim.meetMany),
          ),
        ).aim,
        HostFormatsCourtsAim.meetMany,
      );
    });
  });

  test('team mixing groups guests by their new table', () {
    final state = hostFormatsMixState(
      event: mixEvent,
      plan: mixPlan(),
      assignments: mixAssignments(),
      attendees: formatsAttendees(mixEvent, names: mixNames),
    );
    expect(state.tables.map((t) => t.label), mixTables);
    expect(state.tables.first.people, hasLength(4));
    expect(state.seated, 16);
    expect(state.stepIndex, 2);
    expect(state.revealRoundIndex, 0);
    expect(state.countingDown, isFalse);
    expect(state.revealed, isFalse);
  });

  group('crawl board', () {
    test('reads the stops, who is with the crawl and the groups', () {
      final state = hostFormatsCrawlState(
        event: crawlEvent,
        host: 'Night Shift Socials',
        attendees: crawlAttendees(),
      );
      expect(state.status, HostFormatsCrawlStatus.running);
      expect(state.stops, hasLength(4));
      expect(state.here, 10);
      expect(state.booked, 12);
      expect(state.groups.map((g) => g.label), [
        'Group A · Meher',
        'Group B · Kabir',
      ]);
      expect(state.groups.first.here, 5);
      expect(state.missing.map((m) => m.name), ['Ritu Kapoor', 'Sam Thomas']);
      expect(state.currentIndex(crawlNow), 1);
      expect(state.nextStop(crawlNow)?.stop.title, 'Bonobo');
      expect(state.stopStatus(0, crawlNow), LivePlanStepStatus.done);
      expect(state.stopStatus(1, crawlNow), LivePlanStepStatus.now);
      expect(state.stopStatus(2, crawlNow), LivePlanStepStatus.next);
    });

    test('a night with no route has no board', () {
      final state = hostFormatsCrawlState(
        event: mixEvent,
        host: 'Host',
        attendees: const [],
      );
      expect(state.status, HostFormatsCrawlStatus.noRoute);
    });
  });

  test('grouping reads each rule with its question and who agreed', () {
    final state = hostFormatsRulesState(rulesPreview());
    expect(state.rules.map((r) => r.question), [
      'Your level',
      'Is this your first time with us?',
    ]);
    expect(state.rules.first.formTitle, 'Booking form');
    expect(state.rules.first.coverage?.grantedCount, 41);
    expect(state.rosterCount, 48);
    expect(state.revision, 4);
    expect(state.canAdd, isTrue);
  });

  test('a rule weight reads as three strengths and saves back', () {
    for (final strength in FormatsRuleStrength.values) {
      expect(formatsRuleStrength(formatsRuleWeight(strength)), strength);
    }
    expect(formatsRuleStrength(50), FormatsRuleStrength.strong);
  });

  test('the console offers the court board or team mixing by format', () {
    expect(hostLiveFormatView(courtsEvent), HostLiveFormatView.courts);
    expect(hostLiveFormatView(mixEvent), HostLiveFormatView.mix);
    expect(hostLiveFormatView(crawlEvent), isNull);
  });
}
