import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment_features.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_pods_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';

import '../../../events/events_test_helpers.dart';

/// Pickleball at 7:00 AM on a Saturday at Rally Club.
final formatsMorning = DateTime(2026, 11, 7, 7);

const formatsPlayers = [
  'Aanya Sharma',
  'Dev Patel',
  'Ira Kapoor',
  'Sam Thomas',
  'Rhea Kapoor',
  'Kabir Rao',
  'Tara Menon',
  'Neel Shah',
  'Nikhil Rao',
  'Kiran Joshi',
];

String formatsUid(int index) => 'uid-$index';

final courtsEvent = buildEvent(
  id: 'courts-1',
  organizerId: 'organizer-1',
  name: 'Pickleball Ladder',
  startTime: formatsMorning,
  endTime: formatsMorning.add(const Duration(hours: 2)),
  capacityLimit: 10,
  bookedCount: 10,
  checkedInCount: 10,
  eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.pickleball),
);

EventSuccessPlan courtsPlan({int round = 3, int revision = 7}) =>
    EventSuccessPlan.defaultForEvent(courtsEvent, now: formatsMorning).copyWith(
      status: EventSuccessPlanStatus.live,
      publishedRotationRoundIndex: round,
      liveControlRevision: revision,
      structureConfig: const EventSuccessStructureConfig(
        unitKind: EventSuccessUnitKind.pairs,
        unitSize: 2,
        rotationIntervalMinutes: 12,
        topology: EventSuccessTopology.sequence,
        resourceCapacity: EventSuccessResourceCapacity(
          concurrentUnits: 4,
          resourceLabelId: EventSuccessResourceLabelId.court,
          seatsPerUnit: null,
        ),
      ),
    );

List<EventAttendee> formatsAttendees(
  Event event, {
  List<String> names = formatsPlayers,
  Set<int> notCheckedIn = const {},
  Map<int, String> groups = const {},
}) => [
  for (final (index, name) in names.indexed)
    EventAttendee(
      id: 'attendee-$index',
      eventId: event.id,
      organizerId: event.organizerId,
      displayName: name,
      searchName: name.toLowerCase(),
      source: EventAttendeeSource.hostImport,
      status: notCheckedIn.contains(index)
          ? EventAttendeeStatus.registered
          : EventAttendeeStatus.checkedIn,
      linkedUid: formatsUid(index),
      arrivalGroup: groups[index],
      createdAt: event.startTime,
      updatedAt: event.startTime,
    ),
];

/// Eight rounds of twelve minutes on four courts: two people sit out each
/// round, in turn, and the rest pair up court by court.
List<EventSuccessAssignment> courtsAssignments({int rounds = 8}) {
  final slots = <int, List<EventSuccessRotationSlot>>{};
  final sitOuts = <int, List<EventSuccessSitOutSlot>>{};
  for (var round = 0; round < rounds; round++) {
    final start = formatsMorning.add(Duration(minutes: 12 * round));
    final end = start.add(const Duration(minutes: 12));
    final out = {(2 * round) % 10, (2 * round + 1) % 10};
    final playing = [
      for (var i = 0; i < 10; i++)
        if (!out.contains((i + round) % 10)) (i + round) % 10,
    ];
    for (final index in out) {
      sitOuts
          .putIfAbsent(index, () => [])
          .add(
            EventSuccessSitOutSlot(
              roundIndex: round,
              label: 'Round ${round + 1}',
              startsAt: start,
              endsAt: end,
              whySummary: 'Planned break',
              whyCodes: const [],
            ),
          );
    }
    for (var court = 0; court < playing.length ~/ 2; court++) {
      final a = playing[court * 2];
      final b = playing[court * 2 + 1];
      for (final (self, peer) in [(a, b), (b, a)]) {
        slots
            .putIfAbsent(self, () => [])
            .add(
              EventSuccessRotationSlot(
                roundIndex: round,
                label: 'Round ${round + 1}',
                startsAt: start,
                endsAt: end,
                peerUid: formatsUid(peer),
                compatibility: 'social',
                unitKind: 'pairs',
                unitIndex: court,
              ),
            );
      }
    }
  }
  return [
    for (var i = 0; i < 10; i++)
      _assignment(
        uid: formatsUid(i),
        moduleId: 'guided_rotations',
        event: courtsEvent,
        rotationSlots: slots[i] ?? const [],
        sitOutSlots: sitOuts[i] ?? const [],
      ),
  ];
}

EventSuccessAssignment _assignment({
  required String uid,
  required String moduleId,
  required Event event,
  List<EventSuccessRotationSlot> rotationSlots = const [],
  List<EventSuccessSitOutSlot> sitOutSlots = const [],
  String? unitLabel,
}) => EventSuccessAssignment(
  id: '${event.id}_${moduleId}_$uid',
  eventId: event.id,
  organizerId: event.organizerId,
  uid: uid,
  moduleId: moduleId,
  label: unitLabel ?? 'Rotation',
  displayTitle: unitLabel ?? 'Rotation',
  unitLabel: unitLabel,
  peerUids: const [],
  source: 'server',
  createdAt: event.startTime,
  updatedAt: event.startTime,
  rotationSlots: rotationSlots,
  sitOutSlots: sitOutSlots,
  rotationFairness: EventSuccessRotationFairness(
    assignedRoundCount: rotationSlots.length,
    sitOutRoundCount: sitOutSlots.length,
    uniquePeerCount: rotationSlots.map((s) => s.peerUid).toSet().length,
    repeatPeerCount:
        rotationSlots.length -
        rotationSlots.map((s) => s.peerUid).toSet().length,
  ),
);

/// Tuesday Trivia Night at the Harbour Room.
final formatsQuizNight = DateTime(2026, 11, 3, 19, 30);

final mixEvent = buildEvent(
  id: 'quiz-1',
  organizerId: 'organizer-1',
  name: 'Tuesday Trivia Night',
  startTime: formatsQuizNight,
  endTime: formatsQuizNight.add(const Duration(hours: 3)),
  capacityLimit: 16,
  bookedCount: 16,
  checkedInCount: 16,
  eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.pubQuiz),
);

EventSuccessPlan mixPlan() =>
    EventSuccessPlan.defaultForEvent(mixEvent, now: formatsQuizNight).copyWith(
      status: EventSuccessPlanStatus.live,
      activeStepIndex: 2,
      liveControlRevision: 5,
    );

const mixNames = [
  'Aanya Sharma',
  'Dev Patel',
  'Ira Kapoor',
  'Sam Thomas',
  'Rhea Kapoor',
  'Tara Menon',
  'Kabir Rao',
  'Neel Shah',
  'Ishaan Bose',
  'Meera Nair',
  'Zoya Ali',
  'Arjun Iyer',
  'Sana Khan',
  'Priya Das',
  'Vikram Sethi',
  'Rohan Mehra',
];

const mixTables = [
  'Table 1 · Quizzy Rascals',
  'Table 2 · Harbour Lights',
  'Table 3 · Vada Pav Theory',
  'Table 4 · The Late Ones',
];

List<EventSuccessAssignment> mixAssignments() => [
  for (var i = 0; i < mixNames.length; i++)
    _assignment(
      uid: formatsUid(i),
      moduleId: 'micro_pods',
      event: mixEvent,
      unitLabel: mixTables[i ~/ 4],
    ),
];

/// Friday Bandra Pub Crawl from 8:00 PM.
final formatsCrawlNight = DateTime(2026, 11, 6, 20);

EventItineraryItem _stop(
  String id,
  String title,
  int offset,
  double lat,
  double lng, {
  String? address,
}) => EventItineraryItem(
  id: id,
  kind: EventItineraryKind.stop,
  offsetMinutes: offset,
  title: title,
  location: EventMeetingLocation(
    name: title,
    address: address,
    latitude: lat,
    longitude: lng,
  ),
);

final crawlEvent = buildEvent(
  id: 'crawl-1',
  organizerId: 'organizer-1',
  name: 'Friday Bandra Pub Crawl',
  startTime: formatsCrawlNight,
  endTime: formatsCrawlNight.add(const Duration(hours: 4)),
  capacityLimit: 12,
  bookedCount: 12,
  eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.barCrawl),
  itinerary: [
    _stop('canteen', 'The Canteen', 0, 19.0590, 72.8295),
    _stop('totos', 'Toto’s Garage', 52, 19.0640, 72.8330),
    _stop(
      'bonobo',
      'Bonobo',
      125,
      19.0670,
      72.8360,
      address: 'Kenilworth Mall, upstairs',
    ),
    _stop('antisocial', 'Antisocial', 210, 19.0700, 72.8400),
  ],
);

const crawlNames = [
  'Meher Shah',
  'Kabir Rao',
  'Ritu Kapoor',
  'Dev Patel',
  'Aanya Sharma',
  'Tara Menon',
  'Neel Shah',
  'Zoya Ali',
  'Ira Kapoor',
  'Sam Thomas',
  'Rhea Kapoor',
  'Arjun Iyer',
];

List<EventAttendee> crawlAttendees() => formatsAttendees(
  crawlEvent,
  names: crawlNames,
  notCheckedIn: const {2, 9},
  groups: {
    for (var i = 0; i < crawlNames.length; i++)
      i: i < 6 ? 'Group A · Meher' : 'Group B · Kabir',
  },
);

/// Twenty past nine: at the second stop, before the move to the third.
DateTime get crawlNow => formatsCrawlNight.add(const Duration(minutes: 81));

/// Sunday 6:30 AM social run with three pace pods.
const podsState = HostFormatsPodsState(
  status: HostFormatsPodsStatus.ready,
  runners: 12,
  pods: [
    HostFormatsPod(
      id: 'chatty',
      label: 'Chatty',
      runners: ['Dev Patel', 'Ira Kapoor', 'Sam Thomas', 'Neel Shah'],
      paceSecondsPerKm: 450,
    ),
    HostFormatsPod(
      id: 'steady',
      label: 'Steady',
      runners: ['Meher Shah', 'Tara Menon', 'Kabir Rao'],
      paceSecondsPerKm: 390,
    ),
    HostFormatsPod(
      id: 'quick',
      label: 'Quick',
      runners: ['Rhea Kapoor', 'Arjun Iyer', 'Zoya Ali'],
      paceSecondsPerKm: 330,
    ),
  ],
  unplaced: [
    HostFormatsUnplaced(
      attendeeId: 'attendee-sameer',
      name: 'Sameer Shah',
      movable: true,
    ),
    HostFormatsUnplaced(
      attendeeId: 'attendee-anika',
      name: 'Anika Rao',
      movable: true,
    ),
  ],
);

final rulesSource = EventSuccessAssignmentFeatureSource.fromJson({
  'formId': 'booking',
  'formTitle': 'Booking form',
  'versionId': 'v1',
  'isActiveVersion': true,
  'questions': [
    {
      'questionId': 'level',
      'label': 'Your level',
      'kind': 'singleChoice',
      'options': [
        {'optionId': 'beginner', 'label': 'Beginner'},
        {'optionId': 'improving', 'label': 'Improving'},
        {'optionId': 'intermediate', 'label': 'Intermediate'},
        {'optionId': 'advanced', 'label': 'Advanced'},
      ],
    },
    {
      'questionId': 'first',
      'label': 'Is this your first time with us?',
      'kind': 'singleChoice',
      'options': [
        {'optionId': 'yes', 'label': 'Yes'},
        {'optionId': 'no', 'label': 'No'},
      ],
    },
  ],
});

EventSuccessAssignmentFeatureRule rulesLevel() =>
    EventSuccessAssignmentFeatureRule.fromPublishedQuestion(
      source: rulesSource,
      question: rulesSource.questions.first,
      kind: 'category',
      mode: 'preferSimilar',
      weight: 3,
    );

EventSuccessAssignmentFeatureRule rulesFirstTime() =>
    EventSuccessAssignmentFeatureRule.fromPublishedQuestion(
      source: rulesSource,
      question: rulesSource.questions.last,
      kind: 'category',
      mode: 'balanceAcrossGroups',
      weight: 2,
    );

EventSuccessAssignmentFeaturePreview rulesPreview() =>
    EventSuccessAssignmentFeaturePreview(
      eventId: courtsEvent.id,
      revision: 4,
      rosterCount: 48,
      sources: [rulesSource],
      savedRules: [rulesLevel(), rulesFirstTime()],
      coverage: [
        EventSuccessAssignmentFeatureCoverage(
          featureId: rulesLevel().featureId,
          grantedCount: 41,
          usableCount: 41,
          missingCount: 7,
        ),
        EventSuccessAssignmentFeatureCoverage(
          featureId: rulesFirstTime().featureId,
          grantedCount: 44,
          usableCount: 44,
          missingCount: 4,
        ),
      ],
    );
