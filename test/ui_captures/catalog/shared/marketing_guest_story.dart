// Capture fixtures shared by the guest marketing captures of the Mumbai
// story: Evening Club and its trivia night as guests see them, the guest
// whose phone they show, and the next trivia night a week on. Only the
// entries that import this file depend on it.

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_kernel/activity_taxonomy.dart';

import '../../../support/profile_readiness_fixtures.dart';
import '../../fixtures/sales_demo_synthetic_fixtures.dart';
import 'capture_fixtures.dart';
import 'marketing_host_organizer.dart';
import 'marketing_host_report_event.dart';

// The scenario's organizer and event descriptions are notes for the capture
// pipeline. The guest screens show the copy a host would publish instead.
const _organizerAbout =
    'Trivia and game nights in Bandra West. Teams are made up on the night, '
    'so come on your own or bring a friend.';
const _eventAbout =
    'Six rounds of general knowledge, music and Mumbai trivia. Teams are made '
    'up on the night, so come on your own or bring a friend.';

/// Evening Club as guests see it: its published description, the people
/// who follow it, and trivia as what it runs.
final marketingGuestOrganizer = marketingHostOrganizer.copyWith(
  description: _organizerAbout,
  memberCount: 186,
  hostDefaults: marketingHostOrganizer.hostDefaults.copyWith(
    primaryActivityKind: ActivityKind.pubQuiz,
  ),
);

/// The story's event with its published description.
final marketingGuestEvent = marketingHostReportEvent.copyWith(
  description: _eventAbout,
  eventOrigin: marketingCatchNativeOrigin,
);

/// A signed-in guest of the story, named after their persona.
UserProfile marketingGuestUser(String personaId, {required String uid}) =>
    buildSocialReadyUser(
      uid: uid,
      name: captureFixtures.publicProfile(personaId).name,
    );

/// The story's guest perspective: the persona the scenario names as viewer.
final marketingGuestViewer = marketingGuestUser(
  hostMarketingIndiaScenario.scenario.viewerPersonaId,
  uid: 'marketing-guest-viewer',
);

/// Evening Club's next Saturday Trivia Social, a week after the story's.
final marketingNextTriviaEvent = marketingGuestEvent.copyWith(
  id: 'event-host-trivia-store-demo-next',
  bookedCount: 0,
  checkedInCount: 0,
  startTime: marketingHostReportEvent.startTime.add(const Duration(days: 7)),
  endTime: marketingHostReportEvent.endTime.add(const Duration(days: 7)),
);

/// The story's event is booked on Catch.
const marketingCatchNativeOrigin = EventOrigin(
  mode: EventOriginMode.catchNative,
  bookingAuthority: EventBookingAuthority.catchPlatform,
  rosterAuthority: EventRosterAuthority.catchProjection,
  provider: ExternalBookingProvider.catchPlatform,
);

/// The story's event as a guest sees it at [at]: the booked and checked-in
/// counts come from the scenario's attendance records up to that time.
Event marketingGuestEventAt(DateTime at) {
  final guests = hostMarketingIndiaScenario
      .guestsAt('followUp')
      .where((guest) => guest.bookedAt.isBefore(at));
  return marketingGuestEvent.copyWith(
    bookedCount: guests.length,
    checkedInCount: guests
        .where((guest) => guest.checkedInAt?.isBefore(at) ?? false)
        .length,
  );
}
