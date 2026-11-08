import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_setup_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_mix_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_mix_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_pods_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_pods_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_rules_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_rules_screen.dart';
import 'package:flutter/widgets.dart';
import 'package:riverpod/misc.dart' show Override;

import '../../../events/events_test_helpers.dart';
import 'formats_fixtures.dart';

/// The formats capture fixtures: a pickleball ladder in round four, quiz
/// teams at half-time, a pub crawl at its second stop, pace pods for a
/// Sunday run and the grouping rules.

/// The landscape tablet at the desk.
const hostFormatsTabletSize = Size(1194, 834);

/// Two minutes twenty into round four: 9:40 left.
DateTime get hostFormatsCourtsNow =>
    formatsMorning.add(const Duration(minutes: 38, seconds: 20));

final Event podsEvent = buildEvent(
  id: 'run-1',
  organizerId: 'organizer-1',
  name: 'Carter Road Social Run',
  startTime: DateTime(2026, 11, 8, 6, 30),
  endTime: DateTime(2026, 11, 8, 7, 45),
);

/// Every formats controller answered with the fixture nights.
List<Override> hostFormatsCaptureOverrides() => [
  hostFormatsCourtsControllerProvider(courtsEvent).overrideWithValue(
    hostFormatsCourtsState(
      plan: courtsPlan(),
      assignments: courtsAssignments(),
      drafts: const [],
      attendees: formatsAttendees(courtsEvent),
    ),
  ),
  hostFormatsCourtsSetupControllerProvider(courtsEvent).overrideWithValue(
    hostFormatsCourtsSetupState(
      plan: courtsPlan(round: -1),
      eventMinutes: 120,
      players: 22,
      assignments: courtsAssignments(),
    ),
  ),
  hostFormatsMixControllerProvider(mixEvent).overrideWithValue(
    hostFormatsMixState(
      event: mixEvent,
      plan: mixPlan(),
      assignments: mixAssignments(),
      attendees: formatsAttendees(mixEvent, names: mixNames),
    ),
  ),
  hostFormatsCrawlControllerProvider(
    HostOperationsFixtures.primaryOrganizer,
    crawlEvent,
  ).overrideWithValue(
    hostFormatsCrawlState(
      event: crawlEvent,
      host: HostOperationsFixtures.primaryOrganizer.name,
      attendees: crawlAttendees(),
    ),
  ),
  hostFormatsPodsControllerProvider(podsEvent).overrideWithValue(podsState),
  hostFormatsRulesControllerProvider(
    courtsEvent,
  ).overrideWithValue(hostFormatsRulesState(rulesPreview())),
];

Widget hostFormatsCourtsCapture() =>
    HostFormatsCourtsScreen(event: courtsEvent, now: hostFormatsCourtsNow);

Widget hostFormatsCourtsSetupCapture() =>
    HostFormatsCourtsSetupScreen(event: courtsEvent);

Widget hostFormatsMixCapture() =>
    HostFormatsMixScreen(event: mixEvent, now: formatsQuizNight);

Widget hostFormatsCrawlCapture({bool moving = false}) => HostFormatsCrawlScreen(
  organizer: HostOperationsFixtures.primaryOrganizer,
  event: crawlEvent,
  now: crawlNow,
  moving: moving,
);

Widget hostFormatsPodsCapture() => HostFormatsPodsScreen(event: podsEvent);

Widget hostFormatsRulesCapture({bool adding = false}) =>
    HostFormatsRulesScreen(event: courtsEvent, adding: adding);
