import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_viewer_state.dart';

/// Immutable inputs to the destructive boundary of the CAT-151 native
/// checkout acceptance harness.
///
/// The harness may display partial diagnostics, but it must not create an
/// order unless every rejection below is absent.
final class Cat151AcceptanceScope {
  const Cat151AcceptanceScope({
    required this.isConsumer,
    required this.isProfileMode,
    required this.isApprovedProduction,
    required this.isSupportedNativePlatform,
    required this.usesLiveFirebase,
    required this.usesProductionAppCheck,
    required this.testModeConfirmed,
    required this.expectedUid,
    required this.signedInUid,
    required this.expectedSeedPrefix,
    required this.userSynthetic,
    required this.userSeedPrefix,
    required this.eventSynthetic,
    required this.eventSeedPrefix,
    required this.organizerSynthetic,
    required this.organizerSeedPrefix,
    required this.eventActive,
    required this.currency,
    required this.bookingAuthority,
    required this.inviteRequired,
    required this.privateInviteRequired,
    required this.inviteCode,
    required this.eventId,
    required this.organizerId,
    required this.viewerEventId,
    required this.viewerOrganizerId,
    required this.viewerAllowed,
    required this.viewerRoute,
    required this.viewerQuoteInPaise,
    required this.viewerAdmission,
    required this.viewerPayment,
    required this.viewerWaitlisted,
    required this.hasParticipation,
    required this.hasSuccessfulPayment,
    required this.beforeStart,
    required this.fullRefundUntilBeforeStart,
  });

  static const expectedAmountInPaise = 1000;
  static const minimumExecutionBuffer = Duration(minutes: 30);

  final bool isConsumer;
  final bool isProfileMode;
  final bool isApprovedProduction;
  final bool isSupportedNativePlatform;
  final bool usesLiveFirebase;
  final bool usesProductionAppCheck;
  final bool testModeConfirmed;
  final String expectedUid;
  final String signedInUid;
  final String expectedSeedPrefix;
  final bool userSynthetic;
  final String? userSeedPrefix;
  final bool eventSynthetic;
  final String? eventSeedPrefix;
  final bool organizerSynthetic;
  final String? organizerSeedPrefix;
  final bool eventActive;
  final String currency;
  final EventBookingAuthority? bookingAuthority;
  final bool inviteRequired;
  final bool privateInviteRequired;
  final String inviteCode;
  final String eventId;
  final String organizerId;
  final String viewerEventId;
  final String viewerOrganizerId;
  final bool viewerAllowed;
  final EventViewerRoute? viewerRoute;
  final int? viewerQuoteInPaise;
  final EventViewerAdmission viewerAdmission;
  final EventViewerPayment viewerPayment;
  final bool viewerWaitlisted;
  final bool hasParticipation;
  final bool hasSuccessfulPayment;
  final Duration beforeStart;
  final Duration fullRefundUntilBeforeStart;

  List<String> get rejections {
    final reasons = <String>[];
    if (!isConsumer) reasons.add('The app role is not Consumer.');
    if (!isProfileMode) reasons.add('Only profile-mode builds are permitted.');
    if (!isApprovedProduction) {
      reasons.add(
        'Only the explicitly approved production environment is permitted.',
      );
    }
    if (!isSupportedNativePlatform) {
      reasons.add('Only native Android and iOS devices are permitted.');
    }
    if (!usesLiveFirebase) {
      reasons.add(
        'The native harness requires App Check against non-emulated Firebase.',
      );
    }
    if (!usesProductionAppCheck) {
      reasons.add('Firebase App Check is not using production providers.');
    }
    if (!testModeConfirmed) {
      reasons.add('The operator has not confirmed the Razorpay TEST binding.');
    }
    if (expectedUid.trim().isEmpty || signedInUid != expectedUid.trim()) {
      reasons.add('The signed-in UID does not equal the operator-entered UID.');
    }

    final seed = expectedSeedPrefix.trim();
    if (seed.isEmpty ||
        !userSynthetic ||
        !eventSynthetic ||
        !organizerSynthetic ||
        userSeedPrefix != seed ||
        eventSeedPrefix != seed ||
        organizerSeedPrefix != seed) {
      reasons.add(
        'User, event, and organizer are not one exact synthetic seed.',
      );
    }
    if (!eventActive) reasons.add('The event is not active.');
    if (currency.trim().toUpperCase() != 'INR') {
      reasons.add('The event currency is not INR.');
    }
    if (bookingAuthority != EventBookingAuthority.catchPlatform) {
      reasons.add('Catch is not the event booking authority.');
    }
    if (!inviteRequired ||
        !privateInviteRequired ||
        inviteCode.trim().isEmpty) {
      reasons.add(
        'The event is not guarded by a supplied private invite code.',
      );
    }
    if (viewerEventId != eventId || viewerOrganizerId != organizerId) {
      reasons.add('The canonical viewer response has a different scope.');
    }
    if (!viewerAllowed || viewerRoute != EventViewerRoute.catchCheckout) {
      reasons.add('The canonical viewer did not authorize Catch checkout.');
    }
    if (viewerQuoteInPaise != expectedAmountInPaise) {
      reasons.add('The canonical quote is not exactly ₹10 TEST scope.');
    }
    if (viewerAdmission != EventViewerAdmission.none ||
        viewerPayment != EventViewerPayment.notRead ||
        viewerWaitlisted ||
        hasParticipation ||
        hasSuccessfulPayment) {
      reasons.add(
        'The identity already has booking, waitlist, or payment state.',
      );
    }
    if (beforeStart < fullRefundUntilBeforeStart + minimumExecutionBuffer) {
      reasons.add(
        'The full-refund window lacks the 30-minute execution buffer.',
      );
    }
    return List.unmodifiable(reasons);
  }

  bool get isAccepted => rejections.isEmpty;
}
