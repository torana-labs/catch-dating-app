import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_compatibility_response.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_arrival_mission.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen_state.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart'
    show buildEvent, buildEventParticipation, buildUser;

final _l10n = AppLocalizationsEn();

void main() {
  test('companion route state maps moment loading and retry intent', () {
    final event = buildEvent(id: 'event-companion-moment-state');
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);
    final profile = buildUser();
    final participation = buildEventParticipation(
      event: event,
      uid: 'runner-1',
    );
    final ready =
        EventSuccessCompanionRouteState.resolveCore(
              l10n: _l10n,
              eventState: CatchAsyncState<Event?>.data(event),
              initialEvent: null,
              uidState: const CatchAsyncState<String?>.data('runner-1'),
              profileState: CatchAsyncState<UserProfile?>.data(profile),
              participationState: CatchAsyncState<EventParticipation?>.data(
                participation,
              ),
              planState: CatchAsyncState<EventSuccessPlan?>.data(plan),
              referenceNow: event.startTime,
            )
            .withArrivalMission(
              const CatchAsyncState<EventSuccessArrivalMission?>.data(null),
            )
            .withCompatibilityResponse(
              const CatchAsyncState<EventSuccessCompatibilityResponse?>.data(
                null,
              ),
            );

    final loading = ready.withMomentData(
      feedbackState: const CatchAsyncState<EventSuccessFeedback?>.loading(),
      preferenceState: const CatchAsyncState<EventSuccessPreference?>.data(
        null,
      ),
      wingmanCandidatesState: const CatchAsyncState<List<PublicProfile>>.data(
        [],
      ),
      wingmanRequestState:
          const CatchAsyncState<EventSuccessWingmanRequest?>.data(null),
      assignmentState: const CatchAsyncState<EventSuccessAssignment?>.data(
        null,
      ),
      rotationState: const CatchAsyncState<EventSuccessAssignment?>.data(null),
      standingsState: const CatchAsyncState<EventSuccessStandings?>.data(null),
    );
    expect(loading.status, EventSuccessCompanionRouteStatus.loading);

    final preferenceError = StateError('preference failed');
    final preferenceFailed = ready.withMomentData(
      feedbackState: const CatchAsyncState<EventSuccessFeedback?>.data(null),
      preferenceState: CatchAsyncState<EventSuccessPreference?>.error(
        preferenceError,
      ),
      wingmanCandidatesState: const CatchAsyncState<List<PublicProfile>>.data(
        [],
      ),
      wingmanRequestState:
          const CatchAsyncState<EventSuccessWingmanRequest?>.data(null),
      assignmentState: const CatchAsyncState<EventSuccessAssignment?>.data(
        null,
      ),
      rotationState: const CatchAsyncState<EventSuccessAssignment?>.data(null),
      standingsState: const CatchAsyncState<EventSuccessStandings?>.data(null),
    );
    expect(preferenceFailed.status, EventSuccessCompanionRouteStatus.error);
    expect(preferenceFailed.error, preferenceError);
    expect(
      preferenceFailed.retryIntent,
      EventSuccessCompanionRetryIntent.preference,
    );

    final standingsError = StateError('standings failed');
    final standingsFailed = ready.withMomentData(
      feedbackState: const CatchAsyncState<EventSuccessFeedback?>.data(null),
      preferenceState: const CatchAsyncState<EventSuccessPreference?>.data(
        null,
      ),
      wingmanCandidatesState: const CatchAsyncState<List<PublicProfile>>.data(
        [],
      ),
      wingmanRequestState:
          const CatchAsyncState<EventSuccessWingmanRequest?>.data(null),
      assignmentState: const CatchAsyncState<EventSuccessAssignment?>.data(
        null,
      ),
      rotationState: const CatchAsyncState<EventSuccessAssignment?>.data(null),
      standingsState: CatchAsyncState<EventSuccessStandings?>.error(
        standingsError,
      ),
    );
    expect(standingsFailed.error, standingsError);
    expect(
      standingsFailed.retryIntent,
      EventSuccessCompanionRetryIntent.standings,
    );
  });
}
