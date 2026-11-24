// Capture fixtures shared by more than one catalog entry. Only the entries
// that import this file depend on it.
//
// The live console on the landscape tablet, mid-event, for each kind of host
// the website's vertical pages speak to. Each night is its own event with its
// own format, so the console's plan, colour and room come from that format.

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/contexts/live/parts/live_plan_step_row.dart';
import 'package:catch_dating_app/hosts/live/live_controller.dart';
import 'package:catch_dating_app/hosts/live/live_screen.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_test_support/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/widgets.dart';

import '../../../event_success/event_assistance_cases_fixtures.dart';
import '../../../events/events_test_helpers.dart';

/// One step of a host's own run of show.
typedef MarketingPlanStep = ({
  String title,
  String instruction,
  int minutes,
  EventSuccessStage stage,
});

const _arrival = EventSuccessStage.arrival;
const _opening = EventSuccessStage.opening;
const _activity = EventSuccessStage.activity;
const _mixing = EventSuccessStage.mixing;
const _closing = EventSuccessStage.closing;

/// One vertical's night on the console.
class MarketingVerticalNight {
  const MarketingVerticalNight({
    required this.id,
    required this.name,
    required this.kind,
    required this.format,
    required this.doors,
    required this.places,
    required this.booked,
    required this.checkedIn,
    this.units = const <HostLiveUnit>[],
    this.formatView,
    this.helpName,
    this.lateName,
    this.plan = const <MarketingPlanStep>[],
    this.activeStep = 0,
  });

  final String id;
  final String name;
  final ActivityKind kind;
  final CatchFormat format;
  final DateTime doors;
  final int places;
  final int booked;
  final int checkedIn;

  /// Groups, tables or courts in the room view; empty when the night has none.
  final List<HostLiveUnit> units;
  final HostLiveFormatView? formatView;

  /// A guest who asked for help a couple of minutes ago.
  final String? helpName;

  /// A guest who checked in after the start.
  final String? lateName;

  /// The host's own run of show; empty keeps the format's default plan.
  final List<MarketingPlanStep> plan;

  /// The step of [plan] the night is on.
  final int activeStep;

  Event get event => buildEvent(
    id: id,
    organizerId: HostOperationsFixtures.primaryOrganizer.id,
    name: name,
    startTime: doors,
    endTime: doors.add(const Duration(hours: 3)),
    capacityLimit: places,
    bookedCount: booked,
    checkedInCount: checkedIn,
    eventFormat: EventFormatSnapshot.fromActivityKind(kind),
  );

  List<EventRunOfShowStep> get _runOfShow {
    if (plan.isNotEmpty) {
      return [
        for (final (index, step) in plan.indexed)
          EventRunOfShowStep(
            id: '$id-step-$index',
            stage: step.stage,
            title: step.title,
            hostInstruction: step.instruction,
            attendeeExperience: step.instruction,
            durationMinutes: step.minutes,
          ),
      ];
    }
    final event = this.event;
    final defaultPlan = EventSuccessPlan.defaultForEvent(
      event,
      now: doors,
    ).copyWith(activeStepIndex: 1, status: EventSuccessPlanStatus.live);
    return EventSuccessRuntime(
      plan: defaultPlan,
      event: event,
      now: doors,
    ).runOfShowSteps;
  }

  /// The night's main step: the longest one between check-in and the last
  /// call, or the first step of a plan too short to have one.
  int get _activeIndex {
    if (plan.isNotEmpty) return activeStep;
    final steps = _runOfShow;
    if (steps.length < 3) return 0;
    var active = 1;
    for (var index = 2; index < steps.length - 1; index++) {
      if (steps[index].durationMinutes > steps[active].durationMinutes) {
        active = index;
      }
    }
    return active;
  }

  List<HostLivePlanStep> get _steps {
    final active = _activeIndex;
    final steps = <HostLivePlanStep>[];
    var startsAt = doors;
    for (final (index, step) in _runOfShow.indexed) {
      steps.add(
        HostLivePlanStep(
          step: step,
          startsAt: startsAt,
          status: index < active
              ? LivePlanStepStatus.done
              : index == active
              ? LivePlanStepStatus.now
              : LivePlanStepStatus.next,
        ),
      );
      startsAt = startsAt.add(Duration(minutes: step.durationMinutes));
    }
    return steps;
  }

  /// Two fifths of the way through the main step.
  DateTime get now {
    final step = _steps[_activeIndex];
    return step.startsAt.add(
      Duration(seconds: step.step.durationMinutes * 60 * 2 ~/ 5),
    );
  }

  HostLiveState get state {
    final asked = now.subtract(const Duration(minutes: 2));
    final late = now.subtract(const Duration(minutes: 3));
    return HostLiveState(
      status: HostLiveStatus.running,
      format: format,
      steps: _steps,
      activeIndex: _activeIndex,
      liveControlRevision: 3,
      checkedIn: checkedIn,
      booked: booked,
      places: places,
      teams: units.length,
      needs: [
        if (helpName case final name?)
          HostLiveHelpNeed(_helpRequest(name, asked)),
        if (lateName case final name?)
          HostLiveArrivalNeed(
            EventSuccessLateArrivalCandidate(
              uid: 'guest-${name.toLowerCase()}',
              displayName: name,
              checkedInAtMillis: late.millisecondsSinceEpoch,
            ),
          ),
      ],
      units: units,
      formatView: formatView,
    );
  }

  /// The console's controller answered with this night.
  List<Object> get overrides => [
    hostLiveControllerProvider(event).overrideWithValue(state),
  ];

  Widget capture() => HostLiveScreen(
    organizer: HostOperationsFixtures.primaryOrganizer,
    event: event,
    onBack: () {},
    onOpenGuests: () {},
    now: now,
  );
}

AssistanceOpenHostCase _helpRequest(String name, DateTime at) =>
    casesPage(
          rows: [
            caseRow(caseId: 'case:${name.toLowerCase()}')
              ..['displayName'] = name
              ..['receivedAt'] = at.millisecondsSinceEpoch,
          ],
          evaluatedAt: at.millisecondsSinceEpoch,
        ).cases.single
        as AssistanceOpenHostCase;

List<HostLiveUnit> _units(String prefix, List<int> seated, int size) => [
  for (final (index, count) in seated.indexed)
    HostLiveUnit(label: '$prefix ${index + 1}', seated: count, size: size),
];

/// Every vertical night, by the capture it renders.
final marketingVerticalNights = <String, MarketingVerticalNight>{
  'colleges': MarketingVerticalNight(
    id: 'marketing-live-colleges',
    name: "Freshers' Film Screening",
    kind: ActivityKind.openActivity,
    format: CatchFormat.games,
    doors: DateTime(2026, 10, 23, 19),
    places: 300,
    booked: 296,
    checkedIn: 271,
    helpName: 'Kabir',
    lateName: 'Zoya',
    plan: [
      (
        title: 'Doors and seating',
        instruction:
            'Scan tickets at both doors and fill the front rows first.',
        minutes: 30,
        stage: _arrival,
      ),
      (
        title: 'Welcome from the society',
        instruction:
            'Two minutes on the society and the next screening, then lights down.',
        minutes: 5,
        stage: _opening,
      ),
      (
        title: 'The film',
        instruction:
            'Keep the lobby doors shut and seat latecomers at the back.',
        minutes: 105,
        stage: _activity,
      ),
      (
        title: 'Chai and Q&A in the lobby',
        instruction: 'Point people to the chai counter and the sign-up QR.',
        minutes: 20,
        stage: _closing,
      ),
    ],
    activeStep: 2,
  ),
  'communities': MarketingVerticalNight(
    id: 'marketing-live-communities',
    name: 'Monthly Book Club',
    kind: ActivityKind.openActivity,
    format: CatchFormat.dinner,
    doors: DateTime(2026, 10, 25, 17),
    places: 24,
    booked: 22,
    checkedIn: 19,
    units: _units('Table', const [5, 5, 5, 4], 6),
    lateName: 'Naina',
    plan: [
      (
        title: 'Arrivals and chai',
        instruction:
            'Greet people by name and seat them at a table with space.',
        minutes: 15,
        stage: _arrival,
      ),
      (
        title: 'One question per table',
        instruction: 'Each table starts with the question on their card.',
        minutes: 10,
        stage: _opening,
      ),
      (
        title: 'Table talk',
        instruction: 'Walk the tables and pull quieter people into the chat.',
        minutes: 45,
        stage: _activity,
      ),
      (
        title: 'Swap tables',
        instruction: 'Move one person from each table to the next one.',
        minutes: 20,
        stage: _mixing,
      ),
      (
        title: "Next month's pick",
        instruction: 'Announce the book and the date before people leave.',
        minutes: 10,
        stage: _closing,
      ),
    ],
    activeStep: 2,
  ),
  'creators': MarketingVerticalNight(
    id: 'marketing-live-creators',
    name: 'Sketch and Coffee Meetup',
    kind: ActivityKind.openActivity,
    format: CatchFormat.games,
    doors: DateTime(2026, 10, 25, 11),
    places: 40,
    booked: 40,
    checkedIn: 36,
    helpName: 'Ira',
    plan: [
      (
        title: 'Check in and pick a seat',
        instruction: 'Hand out paper and pens as people sit down.',
        minutes: 15,
        stage: _arrival,
      ),
      (
        title: "Today's prompt",
        instruction: 'Read the prompt out and start the timer.',
        minutes: 5,
        stage: _opening,
      ),
      (
        title: 'Sketch session',
        instruction: 'Walk the room and keep the music low.',
        minutes: 60,
        stage: _activity,
      ),
      (
        title: 'Pass and share',
        instruction: 'Everyone passes their sketch one seat to the left.',
        minutes: 20,
        stage: _mixing,
      ),
      (
        title: 'Group photo',
        instruction: 'Gather by the window with the sketches.',
        minutes: 10,
        stage: _closing,
      ),
    ],
    activeStep: 2,
  ),
  'facilities': MarketingVerticalNight(
    id: 'marketing-live-facilities',
    name: 'Thursday Pickleball Social',
    kind: ActivityKind.pickleball,
    format: CatchFormat.courts,
    doors: DateTime(2026, 10, 22, 19),
    places: 32,
    booked: 32,
    checkedIn: 29,
    units: _units('Court', const [4, 4, 4, 4, 4, 4, 4, 1], 4),
    formatView: HostLiveFormatView.courts,
    lateName: 'Arjun',
  ),
  'outdoors': MarketingVerticalNight(
    id: 'marketing-live-outdoors',
    name: 'Sunday Sunrise Trek',
    kind: ActivityKind.walking,
    format: CatchFormat.run,
    doors: DateTime(2026, 10, 25, 5, 30),
    places: 30,
    booked: 28,
    checkedIn: 26,
    units: const [
      HostLiveUnit(label: 'Easy', seated: 9, size: 10),
      HostLiveUnit(label: 'Steady', seated: 10, size: 10),
      HostLiveUnit(label: 'Quick', seated: 7, size: 10),
    ],
    formatView: HostLiveFormatView.pods,
    helpName: 'Meera',
    plan: [
      (
        title: 'Check in at the trailhead',
        instruction: 'Count heads and check shoes and water.',
        minutes: 20,
        stage: _arrival,
      ),
      (
        title: 'Safety talk and pace groups',
        instruction: 'Name the sweep for each group and the turnaround time.',
        minutes: 10,
        stage: _opening,
      ),
      (
        title: 'Climb to the ridge',
        instruction:
            'Keep the groups within sight of each other at every junction.',
        minutes: 90,
        stage: _activity,
      ),
      (
        title: 'Breakfast at the top',
        instruction: 'Mix the groups for breakfast before the walk down.',
        minutes: 30,
        stage: _mixing,
      ),
      (
        title: 'Walk down together',
        instruction: 'Sweep counts everyone back at the trailhead.',
        minutes: 60,
        stage: _closing,
      ),
    ],
    activeStep: 2,
  ),
  'racket-sports': MarketingVerticalNight(
    id: 'marketing-live-racket',
    name: 'Friday Padel Mixer',
    kind: ActivityKind.padel,
    format: CatchFormat.courts,
    doors: DateTime(2026, 10, 23, 19, 30),
    places: 16,
    booked: 16,
    checkedIn: 16,
    units: _units('Court', const [4, 4, 4, 4], 4),
    formatView: HostLiveFormatView.courts,
    helpName: 'Kunal',
  ),
  'run-clubs': MarketingVerticalNight(
    id: 'marketing-live-run',
    name: 'Sunday 6 AM Social Run',
    kind: ActivityKind.socialRun,
    format: CatchFormat.run,
    doors: DateTime(2026, 10, 25, 6),
    places: 60,
    booked: 54,
    checkedIn: 48,
    units: const [
      HostLiveUnit(label: 'Chatty', seated: 18, size: 20),
      HostLiveUnit(label: 'Steady', seated: 19, size: 20),
      HostLiveUnit(label: 'Quick', seated: 11, size: 20),
    ],
    formatView: HostLiveFormatView.pods,
    lateName: 'Sameer',
  ),
  'studios': MarketingVerticalNight(
    id: 'marketing-live-studios',
    name: 'Saturday Sunrise Yoga',
    kind: ActivityKind.yoga,
    format: CatchFormat.run,
    doors: DateTime(2026, 10, 24, 7),
    places: 20,
    booked: 20,
    checkedIn: 18,
    lateName: 'Tara',
    plan: [
      (
        title: 'Mats and welcome',
        instruction: 'Set newcomers near the front where they can see.',
        minutes: 10,
        stage: _arrival,
      ),
      (
        title: 'Breath and warm-up',
        instruction: 'Slow breathing, then a gentle warm-up.',
        minutes: 10,
        stage: _opening,
      ),
      (
        title: 'Slow flow',
        instruction: 'Offer the easier version of each pose first.',
        minutes: 40,
        stage: _activity,
      ),
      (
        title: 'Rest',
        instruction: 'Lights low for five minutes of rest.',
        minutes: 10,
        stage: _closing,
      ),
      (
        title: 'Coffee in the lobby',
        instruction: 'Introduce the newcomers to two regulars.',
        minutes: 20,
        stage: _mixing,
      ),
    ],
    activeStep: 2,
  ),
  'supper-clubs': MarketingVerticalNight(
    id: 'marketing-live-supper',
    name: 'Supper for Twelve',
    kind: ActivityKind.dinner,
    format: CatchFormat.dinner,
    doors: DateTime(2026, 10, 24, 20),
    places: 12,
    booked: 12,
    checkedIn: 12,
    units: _units('Table', const [6, 6], 6),
    helpName: 'Anika',
    plan: [
      (
        title: 'Welcome drink',
        instruction: 'Hand everyone a drink and their place card.',
        minutes: 30,
        stage: _arrival,
      ),
      (
        title: 'Starters',
        instruction: 'Seat people by the cards and start the table question.',
        minutes: 30,
        stage: _opening,
      ),
      (
        title: 'Mains',
        instruction: 'Serve one table at a time and keep the glasses full.',
        minutes: 45,
        stage: _activity,
      ),
      (
        title: 'Swap seats for dessert',
        instruction: 'Half of each table moves one seat along.',
        minutes: 30,
        stage: _mixing,
      ),
      (
        title: 'Coffee and goodbyes',
        instruction: 'Mention the next supper before people leave.',
        minutes: 20,
        stage: _closing,
      ),
    ],
    activeStep: 2,
  ),
  'teams': MarketingVerticalNight(
    id: 'marketing-live-teams',
    name: 'Friday Team Social',
    kind: ActivityKind.openActivity,
    format: CatchFormat.nightsOut,
    doors: DateTime(2026, 10, 23, 18),
    places: 80,
    booked: 72,
    checkedIn: 64,
    units: _units('Group', const [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 4], 6),
    formatView: HostLiveFormatView.mix,
    lateName: 'Dev',
    plan: [
      (
        title: 'Check in and get a group',
        instruction: 'Everyone gets a group with no one from their own team.',
        minutes: 15,
        stage: _arrival,
      ),
      (
        title: 'Icebreaker in groups',
        instruction: 'Each group finds three things they have in common.',
        minutes: 15,
        stage: _opening,
      ),
      (
        title: 'Team games',
        instruction: 'Run the games and keep score on the board.',
        minutes: 40,
        stage: _activity,
      ),
      (
        title: 'New groups for round two',
        instruction: 'Shuffle the groups so people meet someone new.',
        minutes: 30,
        stage: _mixing,
      ),
      (
        title: 'Thank-yous',
        instruction: 'Thank the organisers and share the photos link.',
        minutes: 10,
        stage: _closing,
      ),
    ],
    activeStep: 2,
  ),
  'venues': MarketingVerticalNight(
    id: 'marketing-live-venues',
    name: 'Thursday Open Mic',
    kind: ActivityKind.openActivity,
    format: CatchFormat.nightsOut,
    doors: DateTime(2026, 10, 22, 20),
    places: 60,
    booked: 60,
    checkedIn: 51,
    helpName: 'Rohan',
    plan: [
      (
        title: 'Doors and sign-up sheet',
        instruction: 'Take names for the eight slots as people arrive.',
        minutes: 30,
        stage: _arrival,
      ),
      (
        title: 'Host warm-up',
        instruction: 'Explain the five-minute slots and the house rules.',
        minutes: 10,
        stage: _opening,
      ),
      (
        title: 'First half',
        instruction: "Call each act two names ahead so they're ready.",
        minutes: 50,
        stage: _activity,
      ),
      (
        title: 'Interval',
        instruction: "Bar's open; tell the second-half acts their order.",
        minutes: 15,
        stage: _mixing,
      ),
      (
        title: 'Second half',
        instruction: 'Keep slots to five minutes so everyone gets on.',
        minutes: 50,
        stage: _closing,
      ),
    ],
    activeStep: 2,
  ),
  'workshops': MarketingVerticalNight(
    id: 'marketing-live-workshops',
    name: 'Pottery Basics Workshop',
    kind: ActivityKind.openActivity,
    format: CatchFormat.dinner,
    doors: DateTime(2026, 10, 24, 11),
    places: 12,
    booked: 12,
    checkedIn: 11,
    units: _units('Wheel', const [2, 2, 2, 2, 2, 1], 2),
    helpName: 'Ishita',
    plan: [
      (
        title: 'Aprons on, wheels assigned',
        instruction: 'Two people to a wheel, aprons by the door.',
        minutes: 15,
        stage: _arrival,
      ),
      (
        title: 'Demo at the wheel',
        instruction: 'Centre, open and pull, slowly, at the front wheel.',
        minutes: 15,
        stage: _opening,
      ),
      (
        title: 'Throw your first pot',
        instruction: 'Visit each wheel and help with centring first.',
        minutes: 60,
        stage: _activity,
      ),
      (
        title: 'Trim and glaze',
        instruction: 'Pick a glaze colour for each pot.',
        minutes: 30,
        stage: _mixing,
      ),
      (
        title: 'Pick-up times',
        instruction: 'Pots are ready to collect next Saturday.',
        minutes: 10,
        stage: _closing,
      ),
    ],
    activeStep: 2,
  ),
};
