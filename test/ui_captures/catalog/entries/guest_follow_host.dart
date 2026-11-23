// Marketing capture `guest_follow_host`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_follow_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_follow.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/pages/organizer/organizer_detail_screen.dart';
import 'package:catch_platform/cache/app_clock.dart';
import '../../fixtures/sales_demo_synthetic_fixtures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/marketing_guest_story.dart';

// Evening Club's page on the guest's phone the morning after Saturday Trivia
// Social: the next trivia night first, and Follow in the dock.
final guestFollowHostCapture = ScreenCaptureEntry(
  id: 'guest_follow_host',
  routeIds: const <String>['organizerDetailScreen'],
  device: CaptureDevice.genericPhone,
  marketingFixtureKeys: const <String>['hostMarketingIndia.guest.followHost'],
  disableAnimations: true,
  providerOverrides: _guestFollowHostOverrides(),
  builder: (context) => OrganizerDetailScreen(
    organizerId: _organizer.id,
    initialOrganizer: _organizer,
  ),
);

final _organizer = marketingGuestOrganizer.copyWith(
  nextEventAt: marketingNextTriviaEvent.startTime,
);

List<Object> _guestFollowHostOverrides() {
  final uid = marketingGuestViewer.uid;
  return <Object>[
    uidProvider.overrideWith((ref) => Stream.value(uid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream<UserProfile?>.value(marketingGuestViewer),
    ),
    watchOrganizerFollowProvider(
      _organizer.id,
      uid,
    ).overrideWith((ref) => Stream<OrganizerFollow?>.value(null)),
    watchOrganizerProvider(
      _organizer.id,
    ).overrideWith((ref) => Stream.value(_organizer)),
    watchEventsForOrganizerProvider(
      _organizer.id,
    ).overrideWith((ref) => Stream.value(<Event>[marketingNextTriviaEvent])),
    watchReviewsForOrganizerProvider(
      _organizer.id,
    ).overrideWith((ref) => Stream.value(const <Review>[])),
    // The story's clock, so the next trivia night counts as upcoming.
    appClockProvider.overrideWithValue(
      AppClock.custom(() => hostMarketingIndiaScenario.clock('followUp')),
    ),
  ];
}
