import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_viewer_state_provider.dart';
import 'package:catch_dating_app/contexts/bookings/data/guest_booking_facts_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/guest_event_cards_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_viewer_composition.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_viewer_state.dart';
import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_benefit_use.dart';
import 'package:catch_dating_app/contexts/payments/payments.dart';
import 'package:catch_dating_app/contexts/profiles/profiles.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_test_support/events_test_helpers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../host_memberships/host_membership_fixtures.dart';

const _catchOrigin = EventOrigin(
  mode: EventOriginMode.catchNative,
  bookingAuthority: EventBookingAuthority.catchPlatform,
  rosterAuthority: EventRosterAuthority.catchProjection,
  provider: ExternalBookingProvider.catchPlatform,
);

void main() {
  final now = testNow;
  Event event({
    int price = 0,
    EventPolicyBundle? policy,
    DateTime? start,
    int? booked,
    EventLifecycleStatus status = EventLifecycleStatus.active,
    EventOrigin? origin = _catchOrigin,
  }) => buildEvent(
    organizerId: 'organizer-1',
    startTime: start ?? now.add(const Duration(days: 2)),
    priceInPaise: price,
    bookedCount: booked,
    status: status,
    eventPolicy:
        policy ??
        EventPolicyBundle.openEvent(capacityLimit: 20, basePriceInPaise: price),
  ).copyWith(eventOrigin: origin);

  EventViewerState compose(
    Event target, {
    EventParticipation? participation,
    GuestCommunityMembershipState? community,
    bool member = false,
    EventMembershipRules? rules,
    List<Event> scheduled = const [],
    bool profileReady = true,
  }) => composeEventViewerState(
    EventViewerSources(
      event: target,
      profile: profileReady ? buildUser() : null,
      participation: participation,
      now: now,
      communityMembership: community,
      membershipRules: rules,
      hostMembership: member ? testMembership() : null,
      publishedPlans: [testPlan()],
      scheduledEvents: [
        for (final other in scheduled) GuestEventCard.fromEvent(other),
      ],
    ),
  );

  test('a free open event books free; a paid one goes to checkout', () {
    final free = compose(event());
    expect(free.route, EventViewerRoute.catchFreeBooking);
    expect(free.quotedPriceInPaise, 0);

    final paid = compose(event(price: 50000));
    expect(paid.route, EventViewerRoute.catchCheckout);
    expect(paid.quotedPriceInPaise, 50000);
    expect(paid.hostMembership?.offer?.makesEventFree, isTrue);
  });

  test('event status and origin close booking before any policy', () {
    expect(
      compose(event(status: EventLifecycleStatus.cancelled)).restriction,
      EventViewerRestriction.cancelled,
    );
    expect(
      compose(event(start: now.subtract(const Duration(hours: 1)))).restriction,
      EventViewerRestriction.past,
    );
    expect(
      compose(event(origin: null)).restriction,
      EventViewerRestriction.unsupportedRoute,
    );
  });

  test('a full event shows its quote and the full restriction', () {
    final full = compose(event(price: 30000, booked: 20));
    expect(full.restriction, EventViewerRestriction.full);
    expect(full.quotedPriceInPaise, 30000);
    expect(full.route, isNull);
  });

  test('community membership comes from the server projection', () {
    final membersOnly = EventPolicyBundle.fromJson({
      ...EventPolicyBundle.openEvent(
        capacityLimit: 20,
        basePriceInPaise: 0,
      ).toJson(),
      'admission': {
        ...EventPolicyBundle.openEvent(
          capacityLimit: 20,
          basePriceInPaise: 0,
        ).admissionPolicy.toJson(),
        'format': 'membersOnly',
        'membershipRequired': true,
      },
    });
    final none = compose(event(policy: membersOnly));
    expect(none.restriction, EventViewerRestriction.membershipRequired);
    expect(none.membership, EventViewerMembership.none);

    final revoked = compose(
      event(policy: membersOnly),
      community: GuestCommunityMembershipState.revoked,
    );
    expect(revoked.membership, EventViewerMembership.revoked);
    expect(revoked.allowed, isFalse);

    final active = compose(
      event(policy: membersOnly),
      community: GuestCommunityMembershipState.active,
    );
    expect(active.membership, EventViewerMembership.active);
    expect(active.route, EventViewerRoute.catchFreeBooking);
  });

  test('an entitled member pays the member price', () {
    final viewer = compose(event(price: 50000), member: true);
    expect(viewer.quotedPriceInPaise, 0);
    expect(viewer.route, EventViewerRoute.catchFreeBooking);
    expect(viewer.hostMembership?.memberPriceApplied, isTrue);
    expect(viewer.hostMembership?.memberPlanName, 'Sunday Runners');
  });

  test('members-only rules block non-members with an unlocking offer', () {
    final rules = EventMembershipRules.fromMap({
      'memberPriceOverrides': <Object?>[],
      'earlyAccess': null,
      'membersOnly': true,
    });
    final viewer = compose(event(price: 50000), rules: rules);
    expect(viewer.restriction, EventViewerRestriction.paidMembershipRequired);
    expect(viewer.hostMembership?.membersOnly, isTrue);
  });

  test('an active waitlist offer accepts at list price', () {
    final target = event(price: 50000, booked: 19);
    final viewer = compose(
      target,
      member: true,
      participation: buildEventParticipation(
        event: target,
        uid: 'runner-1',
        status: EventParticipationStatus.waitlisted,
        waitlistOfferStatus: EventWaitlistOfferStatus.active,
        waitlistOfferExpiresAt: now.add(const Duration(minutes: 10)),
      ),
    );
    expect(viewer.route, EventViewerRoute.catchWaitlistOffer);
    expect(viewer.canAcceptOffer, isTrue);
    expect(viewer.quotedPriceInPaise, 50000);
    expect(viewer.hostMembership?.memberPriceApplied, isFalse);
  });

  test('a confirmed booking is admission even when booking is closed', () {
    final target = event(booked: 20);
    final viewer = compose(
      target,
      participation: buildEventParticipation(event: target, uid: 'runner-1'),
    );
    expect(viewer.hasAdmission, isTrue);
  });

  test('an overlapping booking is a schedule conflict', () {
    final target = event();
    final other = buildEvent(
      id: 'event-2',
      startTime: target.startTime.add(const Duration(minutes: 30)),
    );
    expect(
      compose(target, scheduled: [other]).restriction,
      EventViewerRestriction.scheduleConflict,
    );
    final later = buildEvent(id: 'event-3', startTime: target.endTime);
    expect(compose(target, scheduled: [later]).allowed, isTrue);
  });

  test('missing booking details stop booking first', () {
    expect(
      compose(event(), profileReady: false).restriction,
      EventViewerRestriction.bookingDetailsRequired,
    );
  });

  Future<EventViewerState> viewerFromProvider(
    Event target, {
    List<HostMembershipBenefitUse> uses = const [],
    List<Event> signedUp = const [],
    void Function(
      ({String uid, String organizerId, int startingAfterMillis, int limit}),
    )?
    onUsesRead,
  }) async {
    final container = ProviderContainer(
      overrides: [
        appClockProvider.overrideWithValue(AppClock.custom(() => now)),
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        watchEventProvider(
          target.id,
        ).overrideWith((ref) => Stream.value(target)),
        watchUserProfileProvider.overrideWith(
          (ref) => Stream.value(buildUser()),
        ),
        watchEventParticipationProvider(
          target.id,
          'runner-1',
        ).overrideWith((ref) => Stream.value(null)),
        watchScheduledEventCardsProvider(
          'runner-1',
        ).overrideWith((ref) => Stream.value(const [])),
        watchMyHostMembershipsProvider(
          'runner-1',
        ).overrideWith((ref) => Stream.value([testMembership()])),
        watchEventMembershipRulesProvider(
          target.id,
        ).overrideWith((ref) => Stream.value(null)),
        watchGuestCommunityMembershipsProvider(
          'runner-1',
        ).overrideWith((ref) => Stream.value(const {})),
        watchPublishedHostMembershipPlansProvider(
          'organizer-1',
        ).overrideWith((ref) => Stream.value([testPlan()])),
        watchUpcomingHostMembershipBenefitUsesProvider.overrideWith((
          ref,
          args,
        ) {
          onUsesRead?.call(args);
          return Stream.value(uses);
        }),
        watchSignedUpEventCardsProvider(
          'runner-1',
        ).overrideWith((ref) => Stream.value(guestEventCardsOf(signedUp))),
      ],
      retry: (count, error) => null,
    );
    addTearDown(container.dispose);
    final provider = eventViewerStateProvider(target.id, 'runner-1');
    final subscription = container.listen(provider, (_, _) {});
    addTearDown(subscription.close);
    return container.read(provider.future);
  }

  test('the provider composes the guest\'s listeners', () async {
    final target = event(price: 50000);
    final viewer = await viewerFromProvider(target);
    expect(viewer.route, EventViewerRoute.catchFreeBooking);
    expect(viewer.quotedPriceInPaise, 0);
    expect(viewer.hostMembership?.memberPriceApplied, isTrue);
  });

  test('the cap reads only a cap-bounded window of booked uses', () async {
    final target = event(price: 50000);
    final reads =
        <
          ({String uid, String organizerId, int startingAfterMillis, int limit})
        >[];
    final signedUp = [
      buildEvent(id: 'event-a', startTime: now.add(const Duration(days: 3))),
      buildEvent(id: 'event-b', startTime: now.add(const Duration(days: 4))),
    ];
    final viewer = await viewerFromProvider(
      target,
      signedUp: signedUp,
      uses: [
        testBenefitUse(id: 'event-a_runner-1'),
        testBenefitUse(id: 'event-b_runner-1'),
        // This event and a booking the guest cancelled never count.
        testBenefitUse(id: '${target.id}_runner-1'),
        testBenefitUse(id: 'event-c_runner-1'),
      ],
      onUsesRead: reads.add,
    );
    final nowMillis = now.millisecondsSinceEpoch;
    expect(reads.single, (
      uid: 'runner-1',
      organizerId: 'organizer-1',
      startingAfterMillis: nowMillis - nowMillis % Duration.millisecondsPerHour,
      // The plan caps upcoming member-priced bookings at 2.
      limit: 6,
    ));
    expect(viewer.hostMembership?.memberPriceApplied, isFalse);
    expect(viewer.quotedPriceInPaise, 50000);
  });
}
