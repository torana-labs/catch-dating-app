import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_kernel/city_catalog.dart';
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
    expect(story.organizer(fixtures).name, 'Evening Club');
    expect(story.organizer(fixtures).location, 'mumbai');
    expect(currencyCodeForCityName(story.organizer(fixtures).location), 'INR');
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
}
