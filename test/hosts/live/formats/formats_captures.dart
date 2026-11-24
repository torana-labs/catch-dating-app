import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/domain/event_close_out.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
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
import 'package:catch_dating_app/hosts/live/formats/formats_run_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_test_support/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_test_support/events_test_helpers.dart';
import 'package:flutter/widgets.dart';
import 'package:riverpod/misc.dart' show Override;

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
  name: 'Salt Air Social Run',
  startTime: DateTime(2026, 11, 8, 6, 30),
  endTime: DateTime(2026, 11, 8, 7, 45),
);

/// The Sunday run on the night, as a social run.
final Event runEvent = buildEvent(
  id: 'run-live-1',
  organizerId: 'organizer-1',
  name: 'Carter Road Social Run',
  startTime: DateTime(2026, 11, 8, 6, 30),
  endTime: DateTime(2026, 11, 8, 7, 45),
  capacityLimit: 40,
  bookedCount: 32,
  eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.socialRun),
);

/// The run's way back: 29 of 32 back, Ira, Sid and Tara still out.
DateTime get runNow => DateTime(2026, 11, 8, 7, 28);

List<EventAttendee> _accountedAttendees(
  Event event,
  List<String> names, {
  required Set<String> out,
  Map<int, String> groups = const {},
}) => [
  for (final attendee in formatsAttendees(event, names: names, groups: groups))
    attendee.copyWith(
      checkedInAt: event.startTime,
      phoneE164: '+9198000000${names.indexOf(attendee.displayName) % 10}',
      accountabilityResolution: out.contains(attendee.displayName)
          ? null
          : EventSuccessAccountabilityResolution.returned,
      accountabilityResolvedForCheckInAt: out.contains(attendee.displayName)
          ? null
          : event.startTime,
    ),
];

const _runOut = {'Ira Kapoor', 'Sid Rao', 'Tara Menon'};

final List<String> _runNames = [
  'Ira Kapoor',
  'Sid Rao',
  'Tara Menon',
  for (var i = 0; i < 29; i++) 'Runner ${i + 1}',
];

const _closeOutReady = HostEventCloseOutState(
  status: HostEventCloseOutStatus.ready,
  organizerId: 'organizer-1',
  closeOut: EventCloseOut(
    revision: 1,
    thankYouAtLocal: '10:00',
    openStayInTouchPicks: true,
    noShowNote: false,
  ),
);

HostFormatsSweepState get runSweep => hostFormatsSweepState(
  event: runEvent,
  attendees: _accountedAttendees(runEvent, _runNames, out: _runOut),
  closeOut: _closeOutReady,
);

HostFormatsRunState get runState => HostFormatsRunState(
  status: HostFormatsRunStatus.running,
  stepTitle: 'Back to the jetty',
  stepIndex: 1,
  stepCount: 2,
  pods: const [
    HostFormatsRunPod(
      id: 'chatty',
      label: 'Chatty',
      back: 10,
      total: 11,
      paceSecondsPerKm: 450,
    ),
    HostFormatsRunPod(
      id: 'steady',
      label: 'Steady',
      back: 13,
      total: 14,
      paceSecondsPerKm: 390,
    ),
    HostFormatsRunPod(
      id: 'brisk',
      label: 'Brisk',
      back: 6,
      total: 7,
      paceSecondsPerKm: 330,
    ),
  ],
  sweep: runSweep,
);

/// The crawl's return sweep: 8 of 10 home, Neel and Ishaan still out.
HostFormatsSweepState get crawlSweep => hostFormatsSweepState(
  event: crawlEvent,
  attendees:
      _accountedAttendees(
            crawlEvent,
            crawlNames,
            out: const {'Neel Shah', 'Zoya Ali'},
            groups: {
              for (var i = 0; i < crawlNames.length; i++)
                i: i < 6 ? 'Group A · Meher' : 'Group B · Kabir',
            },
          )
          .where(
            (a) =>
                a.displayName != 'Ritu Kapoor' && a.displayName != 'Sam Thomas',
          )
          .toList(),
  closeOut: _closeOutReady,
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
  hostFormatsRunControllerProvider(runEvent).overrideWithValue(runState),
  hostFormatsSweepControllerProvider(runEvent).overrideWithValue(runSweep),
  hostFormatsSweepControllerProvider(crawlEvent).overrideWithValue(crawlSweep),
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

Widget hostFormatsRunCapture() => HostFormatsRunScreen(
  organizer: HostOperationsFixtures.primaryOrganizer,
  event: runEvent,
  now: runNow,
);

Widget hostFormatsCrawlSweepCapture() => HostFormatsSweepScreen(
  organizer: HostOperationsFixtures.primaryOrganizer,
  event: crawlEvent,
);
