import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo_policy.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/events/presentation/event_detail_display_state.dart';
import 'package:catch_dating_app/events/presentation/event_detail_screen_state.dart';
import 'package:catch_dating_app/kernel/organizer_supply_capabilities.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:flutter_test/flutter_test.dart';

import '../clubs/clubs_test_helpers.dart' as clubs;
import 'events_test_helpers.dart' as events;

final _l10n = AppLocalizationsEn();

void main() {
  test('booking profile gate rejects a non-null incomplete profile', () {
    final now = DateTime(2026, 7, 21);
    final bookingReady = events.buildUser();
    final incomplete = bookingReady.copyWith(
      phoneNumber: '',
      interestedInGenders: const [],
      profileComplete: false,
    );

    expect(eventDetailHasBookingReadyProfile(incomplete, now: now), isFalse);
    expect(eventDetailHasBookingReadyProfile(bookingReady, now: now), isTrue);
    expect(eventDetailHasBookingReadyProfile(null, now: now), isFalse);
  });

  group('EventDetail booking dock state', () {
    test('hides Catch booking for an unclaimed organizer', () {
      final event = events.buildEvent();

      final state = eventDetailBookingDockStateFrom(
        l10n: _l10n,
        event: event,
        userProfile: events.buildUser(),
        participation: null,
        now: event.startTime.subtract(const Duration(hours: 1)),
        hasInviteCode: false,
        supportsPaidBookings: true,
        organizerCapabilities:
            const OrganizerSupplyCapabilities.unclaimedReadOnly(),
      );

      expect(state.visible, isFalse);
      expect(state.primaryAction, EventDetailBookingDockAction.none);
    });

    test('derives eligible paid and paid-unsupported booking states', () {
      final event = events.buildEvent(bookedCount: 17, priceInPaise: 15000);
      final user = events.buildUser();

      final state = eventDetailBookingDockStateFrom(
        l10n: _l10n,
        event: event,
        userProfile: user,
        participation: null,
        now: event.startTime.subtract(const Duration(hours: 1)),
        hasInviteCode: false,
        supportsPaidBookings: true,
      );

      expect(state.visible, true);
      expect(state.label, 'Book event');
      expect(state.primaryAction, EventDetailBookingDockAction.book);
      expect(state.buttonKey, EventDetailBookingDockButtonKey.book);
      expect(state.leadingKind, EventDetailBookingDockLeadingKind.price);
      expect(state.price, isNotEmpty);
      expect(state.priceNote, '3 spots left');
      expect(state.priceWarn, true);
      expect(state.useAccent, true);
      expect(state.catchLine, 'Matching opens for everyone who goes');
      expect(state.isPrimaryActionEnabled, true);

      final unsupported = eventDetailBookingDockStateFrom(
        l10n: _l10n,
        event: event,
        userProfile: user,
        participation: null,
        now: event.startTime.subtract(const Duration(hours: 1)),
        hasInviteCode: false,
        supportsPaidBookings: false,
      );

      expect(unsupported.label, 'Paid booking unavailable');
      expect(unsupported.primaryAction, EventDetailBookingDockAction.none);
      expect(unsupported.leadingKind, EventDetailBookingDockLeadingKind.price);
      expect(unsupported.isPrimaryActionEnabled, false);
    });

    test('maps pending state to disabled loading actions', () {
      final event = events.buildEvent();

      final state = eventDetailBookingDockStateFrom(
        l10n: _l10n,
        event: event,
        userProfile: _socialReadyUser(),
        participation: null,
        now: event.startTime.subtract(const Duration(hours: 1)),
        hasInviteCode: false,
        supportsPaidBookings: true,
        mutationState: EventDetailBookingDockMutationState(
          bookPending: true,
          error: StateError('Booking failed'),
        ),
      );

      expect(state.label, 'Join event — 20 spots left');
      expect(state.primaryAction, EventDetailBookingDockAction.book);
      expect(state.isLoading, true);
      expect(state.isPrimaryActionEnabled, false);
      expect(state.error, isA<StateError>());
    });

    test('cancelled events never fall through to the ended state', () {
      final event = events.buildEvent().copyWith(
        status: EventLifecycleStatus.cancelled,
        cancellationReason: 'Unsafe weather',
      );

      final state = eventDetailBookingDockStateFrom(
        l10n: _l10n,
        event: event,
        userProfile: _socialReadyUser(),
        participation: null,
        now: event.startTime.subtract(const Duration(hours: 1)),
        hasInviteCode: false,
        supportsPaidBookings: true,
      );

      expect(state.label, 'This event was cancelled');
      expect(state.primaryAction, EventDetailBookingDockAction.none);
      expect(state.isPrimaryActionEnabled, isFalse);
    });

    test('derives request-to-join and run preference gate actions', () {
      final event = events.buildEvent(
        eventPolicy: EventPolicyBundle.requestToJoinEvent(
          capacityLimit: 12,
          basePriceInPaise: 0,
        ),
      );

      final request = eventDetailBookingDockStateFrom(
        l10n: _l10n,
        event: event,
        userProfile: events.buildUser(),
        participation: null,
        now: event.startTime.subtract(const Duration(hours: 1)),
        hasInviteCode: false,
        supportsPaidBookings: true,
      );

      expect(request.label, 'Request to join');
      expect(request.primaryAction, EventDetailBookingDockAction.joinWaitlist);
      expect(request.buttonKey, EventDetailBookingDockButtonKey.joinWaitlist);
      expect(request.useAccent, true);

      final gated = eventDetailBookingDockStateFrom(
        l10n: _l10n,
        event: event,
        userProfile: events.buildUser(runPreferencesVersion: 0),
        participation: null,
        now: event.startTime.subtract(const Duration(hours: 1)),
        hasInviteCode: false,
        supportsPaidBookings: true,
      );

      expect(gated.label, 'Set run preferences');
      expect(
        gated.primaryAction,
        EventDetailBookingDockAction.openRunPreferences,
      );
    });

    test('derives waitlist offer accept and decline state', () {
      final now = DateTime(2026, 1, 1, 12);
      final event = events.buildEvent(
        startTime: now.add(const Duration(days: 1)),
      );
      final expiresAt = now.add(const Duration(hours: 1));

      final state = eventDetailBookingDockStateFrom(
        l10n: _l10n,
        event: event,
        userProfile: events.buildUser(),
        participation: events.buildEventParticipation(
          event: event,
          uid: 'runner-1',
          status: EventParticipationStatus.waitlisted,
          waitlistOfferStatus: EventWaitlistOfferStatus.active,
          waitlistOfferExpiresAt: expiresAt,
        ),
        now: now,
        hasInviteCode: false,
        supportsPaidBookings: true,
        mutationState: const EventDetailBookingDockMutationState(
          declineWaitlistOfferPending: true,
        ),
      );

      expect(state.label, 'Accept spot');
      expect(
        state.primaryAction,
        EventDetailBookingDockAction.acceptWaitlistOffer,
      );
      expect(
        state.leadingKind,
        EventDetailBookingDockLeadingKind.waitlistOffer,
      );
      expect(state.waitlistOfferExpiresAt, expiresAt);
      expect(
        state.secondaryAction,
        EventDetailBookingDockAction.declineWaitlistOffer,
      );
      expect(state.isSecondaryActionEnabled, false);
    });

    test('does not treat expired accepted waitlist offers as approved', () {
      final now = DateTime(2099, 1, 1, 12);
      final event = events.buildEvent(
        startTime: now.add(const Duration(days: 1)),
      );

      final state = eventDetailBookingDockStateFrom(
        l10n: _l10n,
        event: event,
        userProfile: events.buildUser(),
        participation: events.buildEventParticipation(
          event: event,
          uid: 'runner-1',
          status: EventParticipationStatus.waitlisted,
          waitlistOfferStatus: EventWaitlistOfferStatus.accepted,
          waitlistOfferAcceptedAt: now.subtract(const Duration(days: 3)),
          waitlistOfferExpiresAt: now.subtract(const Duration(days: 1)),
        ),
        now: now,
        hasInviteCode: false,
        supportsPaidBookings: true,
      );

      expect(state.label, 'Leave waitlist');
      expect(state.primaryAction, EventDetailBookingDockAction.leaveWaitlist);
    });

    test('hides signed-up dock during the self check-in window', () {
      final startTime = DateTime(2026, 1, 1, 9);
      final event = events.buildEvent(startTime: startTime, bookedCount: 1);

      final state = eventDetailBookingDockStateFrom(
        l10n: _l10n,
        event: event,
        userProfile: events.buildUser(),
        participation: events.buildEventParticipation(
          event: event,
          uid: 'runner-1',
        ),
        now: startTime.subtract(const Duration(minutes: 5)),
        hasInviteCode: false,
        supportsPaidBookings: true,
      );

      expect(state.visible, false);
      expect(state.primaryAction, EventDetailBookingDockAction.none);
    });
  });

  group('EventDetail companion state', () {
    test(
      'hides companion when consumer actions or participation are missing',
      () {
        final event = events.buildEvent(id: 'companion-event');
        final signedUp = events.buildEventParticipation(
          event: event,
          uid: 'runner-1',
        );

        final hostContext = eventDetailCompanionStateFrom(
          participation: signedUp,
          showConsumerActions: false,
          planState: const CatchAsyncState<Object?>.data('plan'),
        );
        expect(hostContext.status, EventDetailCompanionStatus.hidden);

        final missingParticipation = eventDetailCompanionStateFrom<Object>(
          participation: null,
          showConsumerActions: true,
          planState: const CatchAsyncState<Object?>.data('plan'),
        );
        expect(missingParticipation.status, EventDetailCompanionStatus.hidden);

        final waitlisted = eventDetailCompanionStateFrom(
          participation: events.buildEventParticipation(
            event: event,
            uid: 'runner-1',
            status: EventParticipationStatus.waitlisted,
          ),
          showConsumerActions: true,
          planState: const CatchAsyncState<Object?>.data('plan'),
        );
        expect(waitlisted.status, EventDetailCompanionStatus.hidden);
      },
    );

    test('maps companion plan async state to display state', () {
      final event = events.buildEvent(id: 'companion-plan-event');
      final participation = events.buildEventParticipation(
        event: event,
        uid: 'runner-1',
      );

      EventDetailCompanionState state(CatchAsyncState<Object?>? planState) {
        return eventDetailCompanionStateFrom(
          participation: participation,
          showConsumerActions: true,
          planState: planState,
        );
      }

      expect(state(null).status, EventDetailCompanionStatus.loading);
      expect(
        state(const CatchAsyncState<Object?>.loading()).status,
        EventDetailCompanionStatus.loading,
      );
      expect(
        state(const CatchAsyncState<Object?>.data(null)).status,
        EventDetailCompanionStatus.hidden,
      );
      expect(
        state(const CatchAsyncState<Object?>.data('plan')).status,
        EventDetailCompanionStatus.available,
      );

      final error = StateError('plan failed');
      final errored = state(CatchAsyncState<Object?>.error(error));
      expect(errored.status, EventDetailCompanionStatus.error);
      expect(errored.error, error);
    });
  });

  group('EventDetail section visibility state', () {
    test('shows consumer invite loop for signed-up future events', () {
      final now = DateTime(2026, 1, 1, 12);
      final event = events.buildEvent(
        id: 'invite-event',
        startTime: now.add(const Duration(days: 1)),
      );

      final state = eventDetailSectionVisibilityStateFrom(
        event: event,
        participation: events.buildEventParticipation(
          event: event,
          uid: 'runner-1',
        ),
        isHostApp: false,
        isHost: false,
        now: now,
      );

      expect(state.showConsumerActions, true);
      expect(state.renderSocialAsHost, false);
      expect(state.showInviteLoop, true);
      expect(state.showBottomNavigation, true);
    });

    test('hides consumer-only sections for host route contexts', () {
      final now = DateTime(2026, 1, 1, 12);
      final event = events.buildEvent(
        startTime: now.add(const Duration(days: 1)),
      );

      final hostRoute = eventDetailSectionVisibilityStateFrom(
        event: event,
        participation: events.buildEventParticipation(
          event: event,
          uid: 'runner-1',
        ),
        isHostApp: false,
        isHost: true,
        now: now,
      );
      expect(hostRoute.showConsumerActions, false);
      expect(hostRoute.renderSocialAsHost, true);
      expect(hostRoute.showInviteLoop, false);
      expect(hostRoute.showBottomNavigation, true);

      final hostApp = eventDetailSectionVisibilityStateFrom(
        event: event,
        participation: events.buildEventParticipation(
          event: event,
          uid: 'runner-1',
        ),
        isHostApp: true,
        isHost: true,
        now: now,
      );
      expect(hostApp.showConsumerActions, false);
      expect(hostApp.renderSocialAsHost, true);
      expect(hostApp.showInviteLoop, false);
      expect(hostApp.showBottomNavigation, false);
    });

    test('hides invite loop for cancelled, past, or unsigned-up events', () {
      final now = DateTime(2026, 1, 1, 12);
      final futureEvent = events.buildEvent(
        startTime: now.add(const Duration(days: 1)),
      );
      final signedUp = events.buildEventParticipation(
        event: futureEvent,
        uid: 'runner-1',
      );

      expect(
        eventDetailCanShowInviteLoop(
          event: futureEvent.copyWith(status: EventLifecycleStatus.cancelled),
          participation: signedUp,
          showConsumerActions: true,
          now: now,
        ),
        false,
      );
      expect(
        eventDetailCanShowInviteLoop(
          event: futureEvent.copyWith(
            startTime: now.subtract(const Duration(minutes: 1)),
          ),
          participation: signedUp,
          showConsumerActions: true,
          now: now,
        ),
        false,
      );
      expect(
        eventDetailCanShowInviteLoop(
          event: futureEvent,
          participation: null,
          showConsumerActions: true,
          now: now,
        ),
        false,
      );
    });
  });

  group('EventDetail social state', () {
    test('locks member context for guests', () {
      final event = events.buildEvent();

      final state = eventDetailSocialStateFrom(
        event: event,
        hasReviews: false,
        userProfile: null,
        isAuthenticated: false,
        renderAsHost: false,
        participation: null,
        now: event.startTime.subtract(const Duration(hours: 1)),
      );

      expect(state.showMemberContext, false);
      expect(state.renderAsHost, false);
      expect(state.reviews.mode, EventDetailReviewsMode.hidden);
    });

    test('unlocks reviews only for attended users after the event ends', () {
      final start = DateTime(2026, 1, 1, 9);
      final event = events.buildEvent(startTime: start);
      final attended = events.buildEventParticipation(
        event: event,
        uid: 'runner-1',
        status: EventParticipationStatus.attended,
      );

      final beforeEnd = eventDetailSocialStateFrom(
        event: event,
        hasReviews: false,
        userProfile: _socialReadyUser(),
        isAuthenticated: true,
        renderAsHost: false,
        participation: attended,
        now: start.add(const Duration(minutes: 30)),
      );
      expect(beforeEnd.showMemberContext, true);
      expect(beforeEnd.reviews.mode, EventDetailReviewsMode.hidden);

      final afterEnd = eventDetailSocialStateFrom(
        event: event,
        hasReviews: false,
        userProfile: _socialReadyUser(),
        isAuthenticated: true,
        renderAsHost: false,
        participation: attended,
        now: event.endTime.add(const Duration(minutes: 1)),
      );
      expect(afterEnd.renderAsHost, false);
      expect(afterEnd.reviews.mode, EventDetailReviewsMode.emptyWritePrompt);
      expect(afterEnd.reviews.canWrite, true);

      final hostWithReviews = eventDetailSocialStateFrom(
        event: event,
        hasReviews: true,
        userProfile: _socialReadyUser(),
        isAuthenticated: true,
        renderAsHost: true,
        participation: null,
        now: event.endTime.add(const Duration(minutes: 1)),
      );
      expect(hostWithReviews.reviews.mode, EventDetailReviewsMode.content);
      expect(hostWithReviews.reviews.canRespond, true);
    });
  });

  group('EventDetail host state', () {
    test('maps missing, loading, and error host branches', () {
      expect(
        eventDetailHostStateFrom(
          l10n: _l10n,
          clubState: const CatchAsyncState<Club?>.data(null),
          currentUid: 'runner-1',
          canMessageHost: true,
        ).status,
        EventDetailHostStatus.hidden,
      );
      expect(
        eventDetailHostStateFrom(
          l10n: _l10n,
          clubState: const CatchAsyncState<Club?>.loading(),
          currentUid: 'runner-1',
          canMessageHost: true,
        ).status,
        EventDetailHostStatus.loading,
      );

      final error = StateError('club failed');
      final errored = eventDetailHostStateFrom(
        l10n: _l10n,
        clubState: CatchAsyncState<Club?>.error(error),
        currentUid: 'runner-1',
        canMessageHost: true,
      );
      expect(errored.status, EventDetailHostStatus.error);
      expect(errored.error, error);
    });

    test('derives content display data and message availability', () {
      final club = clubs.buildClub(
        id: 'host-club',
        name: 'Tempo House',
        hostName: 'Mira',
        hostAvatarUrl: 'https://example.com/mira.jpg',
        createdAt: DateTime(2025, 4),
        memberCount: 42,
        rating: 4.8,
        reviewCount: 12,
      );

      final state = eventDetailHostStateFrom(
        l10n: _l10n,
        clubState: CatchAsyncState<Club?>.data(club),
        currentUid: 'runner-1',
        canMessageHost: true,
      );

      expect(state.status, EventDetailHostStatus.content);
      expect(state.clubId, 'host-club');
      expect(state.hostUid, 'host-1');
      expect(state.hostName, 'Mira');
      expect(state.photoUrl, 'https://example.com/mira.jpg');
      expect(state.meta, 'Claimed · BANDRA · 4.8 FROM 12 ORGANIZER REVIEWS');
      expect(state.verified, false);
      expect(state.canMessage, true);

      final self = eventDetailHostStateFrom(
        l10n: _l10n,
        clubState: CatchAsyncState<Club?>.data(club),
        currentUid: 'host-1',
        canMessageHost: true,
      );
      expect(self.canMessage, false);
    });

    test('shows the verified seal only for owner-verified authority', () {
      final club = clubs.buildClub().copyWith(
        claim: OrganizerClaim.fromJson({'state': 'verified'}),
        provenance: OrganizerProvenance.fromJson({
          'origin': 'scraper',
          'sourceConfidence': 'ownerVerified',
          'verificationStatus': 'ownerVerified',
        }),
      );

      final state = eventDetailHostStateFrom(
        l10n: _l10n,
        clubState: CatchAsyncState<Club?>.data(club),
        currentUid: 'runner-1',
        canMessageHost: true,
      );

      expect(state.verified, isTrue);
      expect(state.meta, startsWith('Owner verified'));
    });
  });
}

UserProfile _socialReadyUser() {
  return events.buildUser(
    photoUrls: List.generate(
      minimumProfilePhotoCount,
      (index) => 'https://example.com/social-$index.jpg',
    ),
    profilePrompts: [
      for (final promptId in defaultProfilePromptIds)
        ProfilePromptAnswer(
          promptId: promptId,
          prompt: promptId,
          answer: 'Ready for social actions.',
        ),
    ],
  );
}
