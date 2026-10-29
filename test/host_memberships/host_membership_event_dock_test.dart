import 'package:catch_dating_app/contexts/events/domain/event_viewer_state.dart';
import 'package:catch_dating_app/events/presentation/event_detail_screen_state.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/event_viewer_state_fixtures.dart';
import '../events/events_test_helpers.dart';
import 'host_membership_fixtures.dart';

Map<String, Object?> _facts({
  Map<String, Object?>? member,
  int listPrice = 50000,
  bool applied = false,
  String? blocked,
  int savings = 0,
  bool membersOnly = false,
  int? opensAt,
  Map<String, Object?>? offer,
}) => {
  'member': member,
  'listPriceInPaise': listPrice,
  'memberPriceApplied': applied,
  'memberPriceBlockedReason': blocked,
  'savingsInPaise': savings,
  'membersOnly': membersOnly,
  'generalSaleOpensAtMillis': opensAt,
  'offer': offer,
};

const _member = {
  'membershipId': testMembershipId,
  'planId': testPlanId,
  'planName': 'Sunday Runners',
  'status': 'active',
  'entitled': true,
};

const _offer = {
  'planId': testPlanId,
  'planName': 'Sunday Runners',
  'interval': 'monthly',
  'planPriceInPaise': 49900,
  'memberPriceInPaise': 0,
  'savingsInPaise': 50000,
  'unlocksAccess': false,
};

EventViewerState _viewer(
  Map<String, Object?> facts, {
  String? reason,
  int price = 50000,
}) {
  final response = viewerResponse(reason: reason, price: price);
  (response['viewer']! as Map<String, Object?>)['hostMembership'] = facts;
  return EventViewerState.fromResponse(response);
}

void main() {
  final now = DateTime(2026, 10, 2, 12);
  final event = buildEvent(
    startTime: now.add(const Duration(days: 3)),
    priceInPaise: 50000,
  );
  final user = buildUser();
  final l10n = AppLocalizationsEn();

  EventDetailBookingDockState dock(EventViewerState viewer) =>
      eventDetailBookingDockStateFrom(
        l10n: l10n,
        event: event,
        userProfile: user,
        participation: null,
        currentViewer: viewer,
        now: now,
        hasInviteCode: false,
        supportsPaidBookings: true,
      );

  test('older responses without membership facts still parse', () {
    expect(viewerFixture().hostMembership, isNull);
  });

  test('an included member books free with an included note', () {
    final state = dock(
      _viewer(_facts(member: _member, applied: true, savings: 50000), price: 0),
    );
    expect(state.primaryAction, EventDetailBookingDockAction.book);
    expect(state.price, isNull);
    expect(
      state.membershipNote,
      'Included with your Sunday Runners membership',
    );
    expect(state.membershipOffer, isNull);
  });

  test('a discounted member sees the usual price beside the member price', () {
    final state = dock(
      _viewer(
        _facts(member: _member, applied: true, savings: 10000),
        price: 40000,
      ),
    );
    expect(state.leadingKind, EventDetailBookingDockLeadingKind.price);
    expect(state.priceNote, contains('Member price'));
    expect(state.membershipNote, contains('save'));
  });

  test('non-members get the upsell offer', () {
    final state = dock(_viewer(_facts(offer: _offer)));
    expect(state.membershipOffer?.planName, 'Sunday Runners');
    expect(state.membershipOffer?.makesEventFree, isTrue);
  });

  test('members-only and early access restrictions explain themselves', () {
    final membersOnly = dock(
      _viewer(
        _facts(membersOnly: true, offer: {..._offer, 'unlocksAccess': true}),
        reason: 'paidMembershipRequired',
      ),
    );
    expect(membersOnly.label, 'Members only');
    expect(membersOnly.primaryAction, EventDetailBookingDockAction.none);
    expect(membersOnly.membershipOffer?.unlocksAccess, isTrue);

    final opens = now.add(const Duration(days: 1));
    final early = dock(
      _viewer(
        _facts(opensAt: opens.millisecondsSinceEpoch),
        reason: 'memberEarlyAccess',
      ),
    );
    expect(early.label, startsWith('Members only until'));
    expect(early.primaryAction, EventDetailBookingDockAction.none);
  });

  test('the booking cap falls back to list price with a note', () {
    final state = dock(
      _viewer(_facts(member: _member, blocked: 'bookingCapReached')),
    );
    expect(state.membershipNote, contains('upcoming booking limit'));
  });
}
