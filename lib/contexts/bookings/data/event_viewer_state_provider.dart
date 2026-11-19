import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/guest_booking_facts_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/guest_event_cards_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_viewer_composition.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_viewer_state.dart';
import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/payments/payments.dart';
import 'package:catch_dating_app/contexts/profiles/profiles.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_viewer_state_provider.g.dart';

/// One guest's booking state for one event, composed from Firestore
/// listeners on the documents they may read: the event, their booking,
/// profile, paid memberships, the event's membership rules, the organizer's
/// published plans and their server-projected booking facts. Each listener
/// delivers its own writes, so a booking command needs no invalidation. The
/// UID isolates the account generation; it is never sent as authority.
// provider-graph: high-fan-out:eventViewerStateProvider accepted -- The listeners form one booking-state read model for one guest and event: auth, the event, the booking, the profile, scheduled events for the overlap check, paid memberships, the event's membership rules, the organizer's published plans, the server-projected guest facts, and (for capped plans) the cap-bounded upcoming benefit uses and signed-up events. Composing them in one place keeps the dock and the booking flow on the same rules as the server, which the shared parity cases pin.
@Riverpod(retry: _noViewerReadRetry)
Future<EventViewerState> eventViewerState(
  Ref ref,
  String eventId,
  String uid, {
  String? inviteCode,
}) async {
  final clock = ref.watch(appClockProvider);
  // Time rules (start, offer expiry, general sale) move on their own.
  final tick = clock.timer(const Duration(minutes: 1), ref.invalidateSelf);
  ref.onDispose(tick.cancel);

  final currentUid = await ref.watch(uidProvider.future);
  if (currentUid != uid) throw StateError('Event viewer account changed');

  // Start every independent listener before awaiting any of them.
  final eventFuture = ref.watch(watchEventProvider(eventId).future);
  final profileFuture = ref.watch(watchUserProfileProvider.future);
  final participationFuture = ref.watch(
    watchEventParticipationProvider(eventId, uid).future,
  );
  final scheduledFuture = ref.watch(
    watchScheduledEventCardsProvider(uid).future,
  );
  final membershipsFuture = ref.watch(
    watchMyHostMembershipsProvider(uid).future,
  );
  final rulesFuture = ref.watch(
    watchEventMembershipRulesProvider(eventId).future,
  );
  final communityFuture = ref.watch(
    watchGuestCommunityMembershipsProvider(uid).future,
  );

  final event = await eventFuture;
  if (event == null) {
    throw const DocumentNotFoundException('this event');
  }
  final plansFuture = ref.watch(
    watchPublishedHostMembershipPlansProvider(event.organizerId).future,
  );
  final memberships = await membershipsFuture;
  final hostMembership = memberships
      .where((membership) => membership.organizerId == event.organizerId)
      .firstOrNull;
  final plans = await plansFuture;
  final now = clock.now();

  return composeEventViewerState(
    EventViewerSources(
      event: event,
      profile: await profileFuture,
      participation: await participationFuture,
      now: now,
      communityMembership: (await communityFuture)[event.organizerId],
      membershipRules: await rulesFuture,
      hostMembership: hostMembership,
      publishedPlans: plans,
      upcomingMemberPricedBookings: await _upcomingMemberPricedBookings(
        ref,
        uid: uid,
        eventId: eventId,
        membership: hostMembership,
        cap: plans
            .where((plan) => plan.id == hostMembership?.planId)
            .firstOrNull
            ?.maxUpcomingMemberPricedBookings,
        now: now,
      ),
      scheduledEvents: await scheduledFuture,
      hasInviteCode: inviteCode?.trim().isNotEmpty ?? false,
    ),
  );
}

/// Other upcoming signed-up bookings with this organizer that used a member
/// price. Read only when the member's plan caps them, and never more than
/// the cap needs: the server's cap reader
/// (`functions/src/hostMemberships/entitlementReader.ts`) counts the same
/// booked uses.
Future<int> _upcomingMemberPricedBookings(
  Ref ref, {
  required String uid,
  required String eventId,
  required HostMembership? membership,
  required int? cap,
  required DateTime now,
}) async {
  if (membership == null ||
      cap == null ||
      !hostMembershipIsEntitled(membership, now)) {
    return 0;
  }
  // The window starts at the current hour so the listener survives the
  // viewer's minute tick; events that already started are dropped below.
  final nowMillis = now.millisecondsSinceEpoch;
  final usesFuture = ref.watch(
    watchUpcomingHostMembershipBenefitUsesProvider(
      uid: uid,
      organizerId: membership.organizerId,
      startingAfterMillis: nowMillis - nowMillis % Duration.millisecondsPerHour,
      limit: cap + _benefitUseWindowHeadroom,
    ).future,
  );
  final signedUp = {
    for (final card in await ref.watch(
      watchSignedUpEventCardsProvider(uid).future,
    ))
      if (card.startTime.isAfter(now)) card.eventId,
  };
  return (await usesFuture)
      .where(
        (use) =>
            !use.released &&
            use.organizerId == membership.organizerId &&
            use.eventId != eventId &&
            signedUp.contains(use.eventId),
      )
      .length;
}

/// Uses read beyond the cap: one to see the cap reached, one for this event
/// and two for events that started earlier in the current hour.
const _benefitUseWindowHeadroom = 4;

/// Firestore listeners restart only on the user's reload, never on an
/// automatic retry.
Duration? _noViewerReadRetry(int retryCount, Object error) => null;
