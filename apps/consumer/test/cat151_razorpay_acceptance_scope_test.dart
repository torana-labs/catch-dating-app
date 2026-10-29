import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_viewer_state.dart';
import 'package:flutter_test/flutter_test.dart';

import '../integration_test/support/cat151_razorpay_acceptance_scope.dart';

void main() {
  test('accepts only the exact isolated ₹10 native checkout scope', () {
    expect(_scope().rejections, isEmpty);
  });

  test(
    'rejects non-profile, non-production, emulator, or non-consumer execution',
    () {
      expect(_scope(isConsumer: false).isAccepted, isFalse);
      expect(_scope(isProfileMode: false).isAccepted, isFalse);
      expect(_scope(isApprovedProduction: false).isAccepted, isFalse);
      expect(_scope(isSupportedNativePlatform: false).isAccepted, isFalse);
      expect(_scope(usesLiveFirebase: false).isAccepted, isFalse);
      expect(_scope(usesProductionAppCheck: false).isAccepted, isFalse);
      expect(_scope(testModeConfirmed: false).isAccepted, isFalse);
    },
  );

  test('rejects identity or synthetic seed mismatches', () {
    expect(_scope(signedInUid: 'other').isAccepted, isFalse);
    expect(_scope(userSynthetic: false).isAccepted, isFalse);
    expect(_scope(eventSeedPrefix: 'other').isAccepted, isFalse);
    expect(_scope(organizerSeedPrefix: 'other').isAccepted, isFalse);
  });

  test('rejects non-Catch, non-INR, non-private, or non-₹10 events', () {
    expect(_scope(currency: 'USD').isAccepted, isFalse);
    expect(
      _scope(bookingAuthority: EventBookingAuthority.external).isAccepted,
      isFalse,
    );
    expect(_scope(inviteRequired: false).isAccepted, isFalse);
    expect(_scope(viewerQuoteInPaise: 999).isAccepted, isFalse);
  });

  test(
    'rejects stale authority, existing effects, or short refund windows',
    () {
      expect(_scope(viewerAllowed: false).isAccepted, isFalse);
      expect(
        _scope(viewerRoute: EventViewerRoute.catchFreeBooking).isAccepted,
        isFalse,
      );
      expect(
        _scope(
          viewerAdmission: EventViewerAdmission.nativeParticipation,
        ).isAccepted,
        isFalse,
      );
      expect(_scope(hasSuccessfulPayment: true).isAccepted, isFalse);
      expect(
        _scope(beforeStart: const Duration(hours: 24)).isAccepted,
        isFalse,
      );
    },
  );
}

Cat151AcceptanceScope _scope({
  bool isConsumer = true,
  bool isProfileMode = true,
  bool isApprovedProduction = true,
  bool isSupportedNativePlatform = true,
  bool usesLiveFirebase = true,
  bool usesProductionAppCheck = true,
  bool testModeConfirmed = true,
  String signedInUid = 'synthetic-user',
  bool userSynthetic = true,
  String? eventSeedPrefix = 'cat151-seed',
  String? organizerSeedPrefix = 'cat151-seed',
  String currency = 'INR',
  EventBookingAuthority? bookingAuthority = EventBookingAuthority.catchPlatform,
  bool inviteRequired = true,
  bool viewerAllowed = true,
  EventViewerRoute? viewerRoute = EventViewerRoute.catchCheckout,
  int? viewerQuoteInPaise = 1000,
  EventViewerAdmission viewerAdmission = EventViewerAdmission.none,
  bool hasSuccessfulPayment = false,
  Duration beforeStart = const Duration(hours: 25),
}) => Cat151AcceptanceScope(
  isConsumer: isConsumer,
  isProfileMode: isProfileMode,
  isApprovedProduction: isApprovedProduction,
  isSupportedNativePlatform: isSupportedNativePlatform,
  usesLiveFirebase: usesLiveFirebase,
  usesProductionAppCheck: usesProductionAppCheck,
  testModeConfirmed: testModeConfirmed,
  expectedUid: 'synthetic-user',
  signedInUid: signedInUid,
  expectedSeedPrefix: 'cat151-seed',
  userSynthetic: userSynthetic,
  userSeedPrefix: 'cat151-seed',
  eventSynthetic: true,
  eventSeedPrefix: eventSeedPrefix,
  organizerSynthetic: true,
  organizerSeedPrefix: organizerSeedPrefix,
  eventActive: true,
  currency: currency,
  bookingAuthority: bookingAuthority,
  inviteRequired: inviteRequired,
  privateInviteRequired: true,
  inviteCode: 'private-invite',
  eventId: 'synthetic-event',
  organizerId: 'synthetic-organizer',
  viewerEventId: 'synthetic-event',
  viewerOrganizerId: 'synthetic-organizer',
  viewerAllowed: viewerAllowed,
  viewerRoute: viewerRoute,
  viewerQuoteInPaise: viewerQuoteInPaise,
  viewerAdmission: viewerAdmission,
  viewerPayment: EventViewerPayment.notRead,
  viewerWaitlisted: false,
  hasParticipation: false,
  hasSuccessfulPayment: hasSuccessfulPayment,
  beforeStart: beforeStart,
  fullRefundUntilBeforeStart: const Duration(hours: 24),
);
