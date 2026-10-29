import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const defaults = ClubHostDefaults(
    primaryActivityKind: ActivityKind.singlesMixer,
  );

  test('sample starts from organizer format and its configured guide', () {
    final configured = defaults.copyWithEventSuccessForActivity(
      activityKind: ActivityKind.pubQuiz,
      defaults: EventSuccessDefaults.recommendedForActivity(
        ActivityKind.pubQuiz,
      ).copyWith(hostGoal: 'Make every team feel welcome'),
    );
    final draft = EventRehearsalConfiguration.defaults(
      organizerDefaults: configured,
    );
    expect(draft.format.activityKind, ActivityKind.pubQuiz);
    expect(draft.successDefaults.hostGoal, 'Make every team feel welcome');
    expect(draft.useSimulatedGuests, isTrue);
    expect(draft.isCustom, isFalse);
  });

  test(
    'event defaults preserve exact format, attendee count and saved guide',
    () {
      final event = rehearsalSourceEvent();
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            hostGoal: 'A goal saved on this event',
            attendeePrompt: 'Introduce your team',
          );
      final draft = EventRehearsalConfiguration.defaults(
        organizerDefaults: defaults,
        event: event,
        plan: plan,
      );
      expect(draft.format, event.eventFormat);
      expect(draft.actorCount, 24);
      expect(draft.useSimulatedGuests, isFalse);
      expect(draft.successDefaults.hostGoal, plan.hostGoal);
      expect(draft.successDefaults.attendeePrompt, plan.attendeePrompt);
      final changed = draft.copyWith(
        title: 'Only practice',
        hostGoal: 'Practice goal',
      );
      expect(event.title, 'Saturday singles mixer');
      expect(plan.hostGoal, 'A goal saved on this event');
      expect(changed.reset().title, isNull);
      expect(changed.reset().successDefaults.hostGoal, plan.hostGoal);
      expect(changed.reset().useSimulatedGuests, isFalse);
    },
  );

  test(
    'scenario and format changes preserve intentional guest count and text',
    () {
      final draft =
          EventRehearsalConfiguration.defaults(
            organizerDefaults: defaults,
          ).copyWith(
            actorCount: 31,
            customActorCount: true,
            title: 'Host practice',
          );
      final changed = draft
          .changeScenario(EventRehearsalScenario.accountabilitySweep)
          .changeActivity(ActivityKind.dinner);
      expect(changed.actorCount, 31);
      expect(changed.title, 'Host practice');
      expect(changed.format.activityKind, ActivityKind.dinner);
      expect(changed.reset().actorCount, 20);
      expect(changed.reset().format.activityKind, ActivityKind.singlesMixer);
    },
  );

  test('reset restores selected sample type, even when it is not primary', () {
    final sample = EventRehearsalConfiguration.defaults(
      organizerDefaults: defaults,
      activityKind: ActivityKind.dinner,
    );
    expect(sample.isCustom, isFalse);
    expect(
      sample.changeActivity(ActivityKind.yoga).reset().format.activityKind,
      ActivityKind.dinner,
    );
  });

  test(
    'switching guest source preserves a manually entered simulated count',
    () {
      final draft =
          EventRehearsalConfiguration.defaults(
                organizerDefaults: defaults,
                event: rehearsalSourceEvent(),
              )
              .changeGuestSource(true)
              .copyWith(actorCount: 31, customActorCount: true);
      expect(draft.changeGuestSource(false).actorCount, 24);
      expect(
        draft.changeGuestSource(false).changeGuestSource(true).actorCount,
        31,
      );
    },
  );

  test(
    'copied roster count is never replaced by a scenario recommendation',
    () {
      final draft = EventRehearsalConfiguration.defaults(
        organizerDefaults: defaults,
        event: rehearsalSourceEvent().copyWith(bookedCount: 51),
      );
      expect(draft.actorCount, 51);
      expect(
        draft.changeScenario(EventRehearsalScenario.lateAndNoShow).actorCount,
        51,
      );
      expect(draft.changeGuestSource(true).actorCount, 50);
      expect(
        draft.changeGuestSource(true).changeGuestSource(false).actorCount,
        51,
      );
    },
  );
}

Event rehearsalSourceEvent() => Event(
  id: 'event-1',
  clubId: 'club-1',
  name: 'Saturday singles mixer',
  startTime: DateTime(2026, 9, 5, 19),
  endTime: DateTime(2026, 9, 5, 20, 30),
  meetingPoint: 'The Courtyard',
  eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.singlesMixer),
  distanceKm: 0,
  pace: PaceLevel.easy,
  capacityLimit: 30,
  bookedCount: 24,
  description: '',
  priceInPaise: 0,
);
