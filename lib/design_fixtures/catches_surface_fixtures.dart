// copy:allow-file(Widgetbook and capture-only deterministic fixture data)
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/design_fixtures/utility_surface_fixtures.dart';

/// Shared deterministic fixtures for Catches design review surfaces.
final class CatchesSurfaceFixtures {
  const CatchesSurfaceFixtures._();

  static const viewerUid = 'design-catches-viewer';
  static const candidateUid = 'design-catches-meera';
  static const secondCandidateUid = 'design-catches-isha';

  static final now = DateTime(2030, 6, 12, 16);

  static final viewer = UtilitySurfaceFixtures.viewer.copyWith(
    uid: viewerUid,
    name: 'Rohan Mehta',
    firstName: 'Rohan',
    lastName: 'Mehta',
    displayName: 'Rohan',
    city: 'Mumbai',
    gender: Gender.man,
    interestedInGenders: const [Gender.woman],
    relationshipGoal: RelationshipGoal.relationship,
    activityPreferences: const ActivityPreferences(
      running: RunningPreferences(
        paceMinSecsPerKm: 315,
        paceMaxSecsPerKm: 390,
        preferredDistances: [PreferredDistance.fiveK, PreferredDistance.tenK],
        runningReasons: [RunReason.community, RunReason.social],
        preferredRunTimes: [PreferredRunTime.earlyMorning],
        version: currentRunPreferencesVersion,
      ),
    ),
  );

  static Event openWindowEvent({String id = 'design-catches-open-event'}) {
    final end = now.subtract(const Duration(hours: 8));
    return UtilitySurfaceFixtures.eventFixture(
      id: id,
      meetingPoint: 'Carter Road Amphitheatre',
      notes: 'Meet at the sea-facing steps before the post-run table opens.',
      latitude: 19.0706,
      longitude: 72.8223,
    ).copyWith(
      organizerId: 'design-catches-club',
      startTime: end.subtract(const Duration(hours: 1, minutes: 10)),
      endTime: end,
      distanceKm: 5,
      pace: PaceLevel.easy,
      bookedCount: 22,
      checkedInCount: 19,
      capacityLimit: 24,
      description: 'A post-run social loop with structured conversation cues.',
    );
  }

  static Event closingSoonEvent() {
    final end = now.subtract(const Duration(hours: 23, minutes: 10));
    final event = openWindowEvent(id: 'design-catches-closing-soon');
    return event.copyWith(
      startTime: end.subtract(const Duration(hours: 1)),
      endTime: end,
      meetingPoint: 'Joggers Park gate',
      meetingLocation: event.meetingLocation!.copyWith(
        name: 'Joggers Park gate',
      ),
      checkedInCount: 11,
      description:
          'A smaller easy loop where the catch window is closing soon.',
    );
  }

  static Event upcomingEvent() {
    final start = now.add(const Duration(minutes: 45));
    return openWindowEvent(id: 'design-catches-upcoming').copyWith(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
      checkedInCount: 0,
      description: 'Upcoming event used to prove locked Catches copy.',
    );
  }

  static Event closedWindowEvent() {
    final end = now.subtract(const Duration(days: 2));
    return openWindowEvent(id: 'design-catches-closed').copyWith(
      startTime: end.subtract(const Duration(hours: 1)),
      endTime: end,
      checkedInCount: 16,
      description: 'Past event used to prove closed-window Catches copy.',
    );
  }

  static EventParticipation attendedParticipation({Event? event}) {
    final resolvedEvent = event ?? openWindowEvent();
    final attendedAt = resolvedEvent.endTime.subtract(
      const Duration(minutes: 10),
    );
    return EventParticipation(
      id: eventParticipationId(eventId: resolvedEvent.id, uid: viewerUid),
      eventId: resolvedEvent.id,
      organizerId: resolvedEvent.organizerId,
      uid: viewerUid,
      status: EventParticipationStatus.attended,
      createdAt: resolvedEvent.startTime.subtract(const Duration(days: 2)),
      updatedAt: attendedAt,
      signedUpAt: resolvedEvent.startTime.subtract(const Duration(days: 2)),
      attendedAt: attendedAt,
      genderAtSignup: viewer.gender,
    );
  }

  static EventParticipation signedUpParticipation({Event? event}) {
    final resolvedEvent = event ?? openWindowEvent();
    return EventParticipation(
      id: eventParticipationId(eventId: resolvedEvent.id, uid: viewerUid),
      eventId: resolvedEvent.id,
      organizerId: resolvedEvent.organizerId,
      uid: viewerUid,
      status: EventParticipationStatus.signedUp,
      createdAt: resolvedEvent.startTime.subtract(const Duration(days: 2)),
      updatedAt: resolvedEvent.startTime.subtract(const Duration(days: 1)),
      signedUpAt: resolvedEvent.startTime.subtract(const Duration(days: 2)),
      genderAtSignup: viewer.gender,
    );
  }

  static final candidates = <PublicProfile>[
    profile(
      uid: candidateUid,
      name: 'Meera',
      age: 28,
      city: 'Bandra',
      occupation: 'Brand strategist',
      company: 'Studio Coast',
      relationshipGoal: RelationshipGoal.relationship,
      prompt:
          'Ask me about the bookshop detour I take after long runs and the breakfast order I defend every Sunday.',
    ),
    profile(
      uid: secondCandidateUid,
      name: 'Isha',
      age: 27,
      city: 'Juhu',
      occupation: 'Architect',
      company: 'Northlight',
      relationshipGoal: RelationshipGoal.casual,
      prompt: 'Easy miles, strong coffee, and one excellent playlist per week.',
      paceMinSecsPerKm: 330,
      paceMaxSecsPerKm: 420,
    ),
  ];

  static PublicProfile profile({
    required String uid,
    required String name,
    required int age,
    required String city,
    required String occupation,
    required String company,
    required RelationshipGoal relationshipGoal,
    required String prompt,
    int paceMinSecsPerKm = 320,
    int paceMaxSecsPerKm = 400,
  }) {
    final promptDefinition = profilePromptDefinition(
      profilePromptPerfectEventId,
    );
    return PublicProfile(
      uid: uid,
      name: name,
      age: age,
      gender: Gender.woman,
      city: city,
      height: 168,
      occupation: occupation,
      company: company,
      education: EducationLevel.masters,
      languages: const [Language.english, Language.hindi],
      relationshipGoal: relationshipGoal,
      drinking: DrinkingHabit.socially,
      workout: WorkoutFrequency.often,
      profilePrompts: [
        profilePromptAnswerFor(definition: promptDefinition, answer: prompt),
      ],
      activityPreferences: ActivityPreferences(
        running: RunningPreferences(
          paceMinSecsPerKm: paceMinSecsPerKm,
          paceMaxSecsPerKm: paceMaxSecsPerKm,
          preferredDistances: const [
            PreferredDistance.fiveK,
            PreferredDistance.tenK,
          ],
          runningReasons: const [RunReason.mindfulness, RunReason.social],
          preferredRunTimes: const [PreferredRunTime.earlyMorning],
          version: currentRunPreferencesVersion,
        ),
      ),
    );
  }

  static Stream<T> loadingStream<T>() => Stream<T>.empty();

  static Stream<T> errorStream<T>(String message) =>
      Stream<T>.error(StateError(message), StackTrace.empty);
}
