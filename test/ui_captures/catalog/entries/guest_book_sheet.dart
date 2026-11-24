// Marketing capture `guest_book_sheet`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/guest_booking_facts_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/guest_event_cards_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_viewer_composition.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/discovery/domain/saved_event.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/guest_event_card.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_follow_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_follow.dart';
import 'package:catch_dating_app/contexts/payments/data/host_membership_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_entitlement.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/pages/event/event_detail_screen.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_test_support/events_test_helpers.dart';
import '../../fixtures/sales_demo_synthetic_fixtures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/marketing_guest_story.dart';

// Saturday Trivia Social on the phone of the story's last guest to book,
// five minutes before she does: the plan, where it is, and Book in the dock.
final guestBookSheetCapture = ScreenCaptureEntry(
  id: 'guest_book_sheet',
  routeIds: const <String>['eventDetailScreen'],
  device: CaptureDevice.genericPhone,
  marketingFixtureKeys: const <String>['hostMarketingIndia.guest.bookSheet'],
  disableAnimations: true,
  providerOverrides: _guestBookSheetOverrides(),
  builder: (context) => EventDetailScreen(
    organizerId: _event.organizerId,
    eventId: _event.id,
    enableMapNetworkTiles: false,
  ),
);

final _booker = hostMarketingIndiaScenario.guestsAt('today').last;
final _now = _booker.bookedAt.subtract(const Duration(minutes: 5));
final _viewer = marketingGuestUser(_booker.personaId, uid: 'marketing-booker');
final _event = marketingGuestEventAt(_now);

List<Object> _guestBookSheetOverrides() {
  final uid = _viewer.uid;
  return <Object>[
    appClockProvider.overrideWithValue(AppClock.custom(() => _now)),
    uidProvider.overrideWith((ref) => Stream.value(uid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream<UserProfile?>.value(_viewer),
    ),
    watchEventProvider(_event.id).overrideWith((ref) => Stream.value(_event)),
    fetchOrganizerProvider(
      _event.organizerId,
    ).overrideWith((ref) async => marketingGuestOrganizer),
    watchSavedEventProvider(
      uid,
      _event.id,
    ).overrideWith((ref) => Stream<SavedEvent?>.value(null)),
    watchEventParticipationProvider(
      _event.id,
      uid,
    ).overrideWith((ref) => Stream<EventParticipation?>.value(null)),
    watchOrganizerFollowProvider(
      _event.organizerId,
      uid,
    ).overrideWith((ref) => Stream<OrganizerFollow?>.value(null)),
    watchReviewsForEventProvider(
      _event.id,
    ).overrideWith((ref) => Stream.value(const <Review>[])),
    watchEventSuccessPlanProvider(
      _event.id,
    ).overrideWith((ref) => Stream<EventSuccessPlan?>.value(null)),
    paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
    // The listeners behind the guest's booking state: nothing else booked,
    // no memberships, and the event has no membership rules.
    watchScheduledEventCardsProvider(
      uid,
    ).overrideWith((ref) => Stream.value(const <GuestEventCard>[])),
    watchMyHostMembershipsProvider(
      uid,
    ).overrideWith((ref) => Stream.value(const <HostMembership>[])),
    watchEventMembershipRulesProvider(
      _event.id,
    ).overrideWith((ref) => Stream<EventMembershipRules?>.value(null)),
    watchGuestCommunityMembershipsProvider(uid).overrideWith(
      (ref) => Stream.value(const <String, GuestCommunityMembershipState>{}),
    ),
    watchPublishedHostMembershipPlansProvider(
      _event.organizerId,
    ).overrideWith((ref) => Stream.value(const <HostMembershipPlan>[])),
    // A guest who hasn't booked can't open the event chat yet.
    eventChatAccessProvider(_event.id).overrideWith(
      (ref) async =>
          throw const PermissionException('Book to join the event chat.'),
    ),
  ];
}
