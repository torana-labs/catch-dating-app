import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_restore_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:flutter_test/flutter_test.dart';

import 'sales_demo_synthetic_fixtures.dart';

void main() {
  final story = hostMarketingIndiaScenario;
  final fixtures = salesDemoSyntheticFixtures;
  const roles = [
    'hostEventSetup',
    'hostToday',
    'hostLiveConsole',
    'hostPostEventReport',
  ];

  test('the Mumbai story is a capture world, not a seed world', () {
    expect(story.scenario.id, 'host-marketing-india');
    final india =
        jsonDecode(
              File(
                'tool/demo/demo_seed/scenarios/host-marketing-india.json',
              ).readAsStringSync(),
            )
            as Map<String, Object?>;
    expect(india.containsKey('seedWorld'), isFalse);
    expect(story.club(fixtures).name, 'Evening Club');
    expect(story.club(fixtures).location, 'mumbai');
    expect(currencyCodeForCityName(story.club(fixtures).location), 'INR');
  });

  test(
    'all four phases share the same named event, venue, schedule and free/open policy',
    () {
      for (final role in roles) {
        final source = story.scenario.eventByRole(role);
        final event = story.event(fixtures, role);
        expect(event.id, 'event-host-trivia-store-demo');
        expect(event.name, 'Saturday Trivia Social');
        expect(event.synthetic, isTrue);
        expect(event.meetingPoint, 'Harbour Room');
        expect(event.startTime, DateTime(2026, 10, 17, 18, 30));
        expect(event.endTime, DateTime(2026, 10, 17, 20, 30));
        expect(source.startTime, event.startTime);
        expect(source.endTime, event.endTime);
        expect(
          event.eventFormat.interactionModel,
          EventInteractionModel.hostLedProgram,
        );
        expect(event.eventFormat.activityKind, ActivityKind.openActivity);
        expect(event.eventFormat.customActivityLabel, 'Trivia social');
        expect(event.capacityLimit, 30);
        expect(event.priceInPaise, 0);
        expect(event.currency, 'INR');
        expect(event.waitlistedCount, 0);
        final policy = event.eventPolicy!;
        expect(policy.admissionPolicy.format, EventAdmissionFormat.open);
        expect(policy.admissionPolicy.cohortCapacityLimits, isEmpty);
        expect(policy.admissionPolicy.balancedRatioPolicy, isNull);
        expect(policy.pricingPolicy.basePrice.inPaise, 0);
        expect(policy.pricingPolicy.demandPricingRules, isEmpty);
        expect(policy.pricingPolicy.cohortAdjustments, isEmpty);
        expect(event.constraints.maxMen, isNull);
        expect(event.constraints.maxWomen, isNull);
      }
    },
  );

  test(
    'phase clocks and attendance advance without checked-in guests before the event',
    () {
      expect(story.clock('planning'), DateTime(2026, 10, 16, 12));
      expect(story.clock('today'), DateTime(2026, 10, 17, 16));
      expect(story.clock('live'), DateTime(2026, 10, 17, 19));
      expect(story.clock('followUp'), DateTime(2026, 10, 18, 10));
      expect(story.event(fixtures, 'hostEventSetup').signedUpCount, 0);
      expect(story.event(fixtures, 'hostEventSetup').attendedCount, 0);
      expect(story.event(fixtures, 'hostToday').signedUpCount, 24);
      expect(story.event(fixtures, 'hostToday').attendedCount, 0);
      for (final role in ['hostLiveConsole', 'hostPostEventReport']) {
        expect(story.event(fixtures, role).signedUpCount, 24);
        expect(story.event(fixtures, role).attendedCount, 18);
      }
      final event = story.event(fixtures, 'hostLiveConsole');
      expect(story.clock('today').isBefore(event.startTime), isTrue);
      expect(story.clock('live').isAfter(event.startTime), isTrue);
      expect(story.clock('live').isBefore(event.endTime), isTrue);
      expect(story.clock('followUp').isAfter(event.endTime), isTrue);
    },
  );

  test(
    'production draft restore preserves explicit civil date/time in the process timezone',
    () {
      final draft = story.setupDraft(fixtures);
      final restored = CreateEventDraftRestoreState.fromDraft(
        draft,
        now: story.clock('planning'),
      );
      expect(story.timeZone, 'Asia/Kolkata');
      expect(draft.eventLocalDate, '2026-10-17');
      expect(draft.eventLocalStartTime, '18:30');
      expect(draft.eventTimezone, 'Asia/Kolkata');
      expect(restored.selectedDate, DateTime(2026, 10, 17, 18, 30));
      expect(restored.selectedStartTime!.hour, 18);
      expect(restored.selectedStartTime!.minute, 30);
      expect(restored.durationMinutes, 120);
      expect(restored.scheduleErrorText, isNull);
      expect(restored.priceText, '0');
      expect(restored.capacityText, '30');
      expect(restored.minAgeText, isNull);
      expect(restored.maxAgeText, isNull);
      expect(restored.maxMenText, isNull);
      expect(restored.maxWomenText, isNull);
      expect(
        restored.policyState.admissionPreset,
        EventAdmissionPreset.openCapacity,
      );
      expect(restored.policyState.cohortCapsEnabled, isFalse);
      expect(restored.policyState.dynamicPricingEnabled, isFalse);
      expect(restored.policyState.crossPathsPairInventoryEnabled, isFalse);
      expect(draft.inviteCode, isNull);
    },
  );

  test(
    'host-led Guide opts out of compatibility, reveal and assignment modules',
    () {
      final defaults = story.guideDefaults;
      final draft = defaults.toDraft(targetAttendeeCount: 30);
      expect(draft.playbook.id, 'host_led_social');
      final restored = CreateEventDraftRestoreState.fromDraft(
        story.setupDraft(fixtures),
        now: story.clock('planning'),
      );
      final restoredFormat = EventFormatSnapshot.custom(
        label: restored.customActivityLabelText,
        interactionModel: restored.interactionModel,
      );
      expect(
        defaults
            .normalizedForFormat(restoredFormat, targetAttendeeCount: 30)
            .playbookId,
        'host_led_social',
      );
      expect(
        draft.selectedModuleIds,
        containsAll(['qr_check_in', 'host_script', 'safety_controls']),
      );
      for (final id in [
        'compatibility_questionnaire',
        'live_reveal',
        'micro_pods',
        'guided_rotations',
      ]) {
        expect(draft.selectedModuleIds, isNot(contains(id)));
      }
      expect(defaults.compatibilityAffectsRanking, isFalse);
      expect(defaults.wingmanRequestsEnabled, isTrue);
      expect(defaults.contextualOpenersEnabled, isTrue);
      final event = story.event(fixtures, 'hostLiveConsole');
      final plan = EventSuccessPlan.fromDraft(
        id: event.id,
        eventId: event.id,
        clubId: event.clubId,
        draft: draft,
        createdAt: story.clock('planning'),
        updatedAt: story.clock('live'),
      );
      expect(plan.playbookId, 'host_led_social');
      expect(plan.selectedModuleIds, unorderedEquals(draft.selectedModuleIds));
    },
  );
}
