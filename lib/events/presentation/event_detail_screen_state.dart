import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_arrival_action.dart';
import 'package:catch_dating_app/events/domain/event_capacity_labels.dart';
import 'package:catch_dating_app/events/domain/event_eligibility.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/events/domain/event_participation.dart';
import 'package:catch_dating_app/events/domain/event_profile_requirements.dart';
import 'package:catch_dating_app/events/domain/event_viewer_state.dart';
import 'package:catch_dating_app/events/domain/viewer_event_availability.dart';
import 'package:catch_dating_app/events/presentation/event_detail_display_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/domain/organizer_supply_capabilities.dart';
import 'package:catch_dating_app/organizers/organizers.dart';
import 'package:catch_dating_app/user_profile/domain/profile_readiness.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';

bool eventDetailHasBookingReadyProfile(
  UserProfile? userProfile, {
  required DateTime now,
  Event? event,
}) =>
    userProfile != null &&
    (event?.hasRequiredProfileDetails(userProfile, now) ??
        userProfile.hasBookingReadyIdentityOn(now));

enum EventDetailBookingDockAction {
  none,
  openRunPreferences,
  book,
  cancelBooking,
  joinWaitlist,
  leaveWaitlist,
  acceptWaitlistOffer,
  declineWaitlistOffer,
}

enum EventDetailBookingDockButtonKey { book, cancelBooking, joinWaitlist }

enum EventDetailBookingDockLeadingKind {
  none,
  price,
  booked,
  waitlistOffer,
  attended,
}

class EventDetailBookingDockState {
  const EventDetailBookingDockState._({
    required this.visible,
    required this.label,
    required this.primaryAction,
    required this.buttonKey,
    required this.leadingKind,
    required this.isLoading,
    required this.useAccent,
    this.price,
    this.priceNote,
    this.priceWarn = false,
    this.waitlistOfferExpiresAt,
    this.secondaryAction = EventDetailBookingDockAction.none,
    this.isSecondaryLoading = false,
    this.catchLine,
    this.error,
  });

  const EventDetailBookingDockState.hidden()
    : this._(
        visible: false,
        label: '',
        primaryAction: EventDetailBookingDockAction.none,
        buttonKey: null,
        leadingKind: EventDetailBookingDockLeadingKind.none,
        isLoading: false,
        useAccent: false,
      );

  const EventDetailBookingDockState({
    required String label,
    required EventDetailBookingDockAction primaryAction,
    EventDetailBookingDockButtonKey? buttonKey,
    EventDetailBookingDockLeadingKind leadingKind =
        EventDetailBookingDockLeadingKind.none,
    bool isLoading = false,
    bool useAccent = false,
    String? price,
    String? priceNote,
    bool priceWarn = false,
    DateTime? waitlistOfferExpiresAt,
    EventDetailBookingDockAction secondaryAction =
        EventDetailBookingDockAction.none,
    bool isSecondaryLoading = false,
    String? catchLine,
    Object? error,
  }) : this._(
         visible: true,
         label: label,
         primaryAction: primaryAction,
         buttonKey: buttonKey,
         leadingKind: leadingKind,
         isLoading: isLoading,
         useAccent: useAccent,
         price: price,
         priceNote: priceNote,
         priceWarn: priceWarn,
         waitlistOfferExpiresAt: waitlistOfferExpiresAt,
         secondaryAction: secondaryAction,
         isSecondaryLoading: isSecondaryLoading,
         catchLine: catchLine,
         error: error,
       );

  final bool visible;
  final String label;
  final EventDetailBookingDockAction primaryAction;
  final EventDetailBookingDockButtonKey? buttonKey;
  final EventDetailBookingDockLeadingKind leadingKind;
  final bool isLoading;
  final bool useAccent;
  final String? price;
  final String? priceNote;
  final bool priceWarn;
  final DateTime? waitlistOfferExpiresAt;
  final EventDetailBookingDockAction secondaryAction;
  final bool isSecondaryLoading;
  final String? catchLine;
  final Object? error;

  bool get isPrimaryActionEnabled =>
      visible &&
      !isLoading &&
      primaryAction != EventDetailBookingDockAction.none;

  bool get isSecondaryActionEnabled =>
      visible &&
      !isSecondaryLoading &&
      secondaryAction != EventDetailBookingDockAction.none;
}

class EventDetailBookingDockMutationState {
  const EventDetailBookingDockMutationState({
    this.bookPending = false,
    this.cancelPending = false,
    this.joinWaitlistPending = false,
    this.leaveWaitlistPending = false,
    this.acceptWaitlistOfferPending = false,
    this.declineWaitlistOfferPending = false,
    this.error,
  });

  final bool bookPending;
  final bool cancelPending;
  final bool joinWaitlistPending;
  final bool leaveWaitlistPending;
  final bool acceptWaitlistOfferPending;
  final bool declineWaitlistOfferPending;
  final Object? error;
}

EventDetailBookingDockState eventDetailBookingDockStateFrom({
  required AppLocalizations l10n,
  required Event event,
  required UserProfile userProfile,
  required EventParticipation? participation,
  required DateTime now,
  required bool hasInviteCode,
  required bool supportsPaidBookings,
  OrganizerSupplyCapabilities organizerCapabilities =
      const OrganizerSupplyCapabilities.claimedManaged(),
  bool isSaved = false,
  bool isHosted = false,
  bool isClubMember = false,
  EventViewerState? currentViewer,
  EventDetailBookingDockMutationState mutationState =
      const EventDetailBookingDockMutationState(),
}) {
  if (!organizerCapabilities.bookable) {
    return const EventDetailBookingDockState.hidden();
  }
  if (currentViewer != null &&
      (currentViewer.eventId != event.id ||
          currentViewer.organizerId != event.organizerId)) {
    throw const FormatException('Mismatched current viewer scope');
  }
  if (event.isCancelled) {
    return EventDetailBookingDockState(
      label: l10n.eventsEventDetailScreenStateLabelEventCancelled,
      primaryAction: EventDetailBookingDockAction.none,
      error: mutationState.error,
    );
  }
  if (!event.endTime.isAfter(now)) {
    if (currentViewer == null
        ? participation?.status == EventParticipationStatus.attended
        : currentViewer.attendance == EventViewerAttendance.attended) {
      return EventDetailBookingDockState(
        label: l10n.eventsEventDetailScreenStateLabelYouAttendedThisEvent,
        primaryAction: EventDetailBookingDockAction.none,
        leadingKind: EventDetailBookingDockLeadingKind.attended,
        error: mutationState.error,
      );
    }
    return EventDetailBookingDockState(
      label: l10n.eventsEventDetailScreenStateLabelThisEventHasEnded,
      primaryAction: EventDetailBookingDockAction.none,
      error: mutationState.error,
    );
  }
  if (!event.startTime.isAfter(now)) {
    return EventDetailBookingDockState(
      label: l10n.eventsEventDetailScreenStateLabelEventInProgress,
      primaryAction: EventDetailBookingDockAction.none,
      error: mutationState.error,
    );
  }
  if (currentViewer?.admission == EventViewerAdmission.publicPaidRoster) {
    return EventDetailBookingDockState(
      label: l10n.eventsEventDetailCtaLabelYouReIn,
      primaryAction: EventDetailBookingDockAction.none,
      leadingKind: EventDetailBookingDockLeadingKind.booked,
      error: mutationState.error,
    );
  }
  final availability = currentViewer == null
      ? resolveViewerEventAvailability(
          event: event,
          userProfile: userProfile,
          participation: participation,
          isSaved: isSaved,
          isHosted: isHosted,
          isClubMember: isClubMember,
          now: now,
          hasValidInvite: hasInviteCode,
        )
      : viewerEventAvailabilityFromState(
          viewer: currentViewer,
          event: event,
          userProfile: userProfile,
          now: now,
          isSaved: isSaved,
        );
  final eligibility = availability.eligibility;
  final signUpStatus = eventSignUpStatusForViewerAvailability(
    availability.status,
  );
  final admissionPolicy = event.effectiveEventPolicy.admissionPolicy;
  final activeMember = currentViewer == null
      ? isClubMember
      : currentViewer.membership == EventViewerMembership.active;
  final requiresHostApproval =
      admissionPolicy.manualApprovalRequired &&
      !(admissionPolicy.approvedMembersSkipReview && activeMember);
  final waitlistEnabled =
      event.effectiveEventPolicy.admissionPolicy.waitlistPolicy.isEnabled;
  final hasApprovedJoinRequest =
      availability.status == ViewerEventAvailabilityStatus.approvedToBook;
  final hasActiveWaitlistOffer = participation != null
      ? ParticipationStatusSnapshot.of(
          participation,
          now: now,
        ).isWaitlistOfferActive
      : false;
  final canRequestHostApproval =
      availability.status == ViewerEventAvailabilityStatus.requestRequired;
  final quotedPriceInPaise =
      availability.quotedPriceInPaise ?? event.priceInPaiseFor(userProfile);
  final isFreeForViewer = quotedPriceInPaise == 0;
  final needsRunPreferences =
      availability.status ==
      ViewerEventAvailabilityStatus.runPreferencesRequired;

  if (currentViewer?.hasAdmission != true &&
      (currentViewer?.canAcceptOffer == true || hasActiveWaitlistOffer)) {
    final paidUnsupported = !isFreeForViewer && !supportsPaidBookings;
    final currentOfferAllows =
        currentViewer == null || currentViewer.canAcceptOffer;
    return EventDetailBookingDockState(
      label: !currentOfferAllows
          ? l10n.eventsEventViewerBookingUnavailable
          : paidUnsupported
          ? l10n.eventsEventDetailScreenStateLabelPaidBookingUnavailable
          : isFreeForViewer
          ? l10n.eventsEventDetailScreenStateLabelAcceptSpot
          : l10n.eventsEventDetailScreenStateLabelAcceptSpotAndPay,
      primaryAction: paidUnsupported || !currentOfferAllows
          ? EventDetailBookingDockAction.none
          : EventDetailBookingDockAction.acceptWaitlistOffer,
      leadingKind: EventDetailBookingDockLeadingKind.waitlistOffer,
      waitlistOfferExpiresAt: participation?.waitlistOfferExpiresAt,
      secondaryAction: EventDetailBookingDockAction.declineWaitlistOffer,
      isLoading: mutationState.acceptWaitlistOfferPending,
      isSecondaryLoading: mutationState.declineWaitlistOfferPending,
      useAccent: true,
      error: mutationState.error,
    );
  }

  if (currentViewer != null &&
      !currentViewer.hasAdmission &&
      !currentViewer.allowed &&
      {
        EventViewerRestriction.bookingDetailsRequired,
        EventViewerRestriction.scheduleConflict,
        EventViewerRestriction.eventUnavailable,
        EventViewerRestriction.unsupportedRoute,
      }.contains(currentViewer.restriction)) {
    return EventDetailBookingDockState(
      label: l10n.eventsEventViewerBookingUnavailable,
      primaryAction: EventDetailBookingDockAction.none,
      error: mutationState.error,
    );
  }

  if (canRequestHostApproval) {
    return EventDetailBookingDockState(
      label: needsRunPreferences
          ? l10n.eventsEventDetailScreenStateLabelSetRunPreferences
          : l10n.eventsEventDetailScreenStateLabelRequestToJoin,
      primaryAction: needsRunPreferences
          ? EventDetailBookingDockAction.openRunPreferences
          : EventDetailBookingDockAction.joinWaitlist,
      buttonKey: EventDetailBookingDockButtonKey.joinWaitlist,
      isLoading: mutationState.joinWaitlistPending,
      useAccent: true,
      error: mutationState.error,
    );
  }

  return switch (signUpStatus) {
    EventSignUpStatus.eligible => _eligibleBookingDockState(
      l10n: l10n,
      event: event,
      quotedPriceInPaise: quotedPriceInPaise,
      isFreeForViewer: isFreeForViewer,
      supportsPaidBookings: supportsPaidBookings,
      needsRunPreferences: needsRunPreferences,
      hasApprovedJoinRequest: hasApprovedJoinRequest,
      mutationState: mutationState,
    ),
    EventSignUpStatus.signedUp => _signedUpBookingDockState(
      l10n: l10n,
      event: event,
      participation: participation,
      now: now,
      mutationState: mutationState,
    ),
    EventSignUpStatus.full =>
      waitlistEnabled
          ? EventDetailBookingDockState(
              label: needsRunPreferences
                  ? l10n.eventsEventDetailScreenStateLabelSetRunPreferences
                  : requiresHostApproval
                  ? l10n.eventsEventDetailScreenStateLabelRequestToJoin
                  : l10n.eventsEventDetailScreenStateLabelJoinWaitlist,
              primaryAction: needsRunPreferences
                  ? EventDetailBookingDockAction.openRunPreferences
                  : EventDetailBookingDockAction.joinWaitlist,
              buttonKey: EventDetailBookingDockButtonKey.joinWaitlist,
              isLoading: mutationState.joinWaitlistPending,
              error: mutationState.error,
            )
          : EventDetailBookingDockState(
              label: l10n.eventsEventDetailScreenStateLabelEventFull,
              primaryAction: EventDetailBookingDockAction.none,
              error: mutationState.error,
            ),
    EventSignUpStatus.waitlisted => EventDetailBookingDockState(
      label: requiresHostApproval
          ? l10n.eventsEventDetailScreenStateLabelWithdrawRequest
          : l10n.eventsEventDetailScreenStateLabelLeaveWaitlist,
      primaryAction: EventDetailBookingDockAction.leaveWaitlist,
      isLoading: mutationState.leaveWaitlistPending,
      error: mutationState.error,
    ),
    EventSignUpStatus.attended => EventDetailBookingDockState(
      label: l10n.eventsEventDetailScreenStateLabelYouAttendedThisEvent,
      primaryAction: EventDetailBookingDockAction.none,
      leadingKind: EventDetailBookingDockLeadingKind.attended,
      error: mutationState.error,
    ),
    EventSignUpStatus.past => EventDetailBookingDockState(
      label: l10n.eventsEventDetailScreenStateLabelThisEventHasEnded,
      primaryAction: EventDetailBookingDockAction.none,
      error: mutationState.error,
    ),
    EventSignUpStatus.ineligible => EventDetailBookingDockState(
      label: switch (eligibility) {
        AgeTooYoung(:final minAge) =>
          l10n.eventsEventDetailScreenStateLabelMustBeMinageTo(minAge: minAge),
        AgeTooOld(:final maxAge) =>
          l10n.eventsEventDetailScreenStateLabelMustBeMaxageOr(maxAge: maxAge),
        EventInviteRequired() =>
          l10n.eventsEventDetailScreenStateLabelInviteRequired,
        GenderCapacityReached() =>
          requiresHostApproval
              ? l10n.eventsEventDetailScreenStateLabelRequestRequired
              : l10n.eventsEventDetailScreenStateLabelSpotsForYourGender,
        _ =>
          availability.status ==
                  ViewerEventAvailabilityStatus.membershipRequired
              ? l10n.eventsEventDetailDesignPrimitivesVisiblecopyMembersOnly
              : l10n.eventsEventDetailScreenStateLabelNotEligibleForThis,
      },
      primaryAction: EventDetailBookingDockAction.none,
      error: mutationState.error,
    ),
  };
}

EventDetailBookingDockState _eligibleBookingDockState({
  required AppLocalizations l10n,
  required Event event,
  required int quotedPriceInPaise,
  required bool isFreeForViewer,
  required bool supportsPaidBookings,
  required bool needsRunPreferences,
  required bool hasApprovedJoinRequest,
  required EventDetailBookingDockMutationState mutationState,
}) {
  final paidUnsupported = !isFreeForViewer && !supportsPaidBookings;
  final presenter = EventCapacityLabels(event);
  final spotsRemaining = presenter.spotsRemaining;
  final isScarce = spotsRemaining > 0 && spotsRemaining <= 3;

  return EventDetailBookingDockState(
    label: paidUnsupported
        ? l10n.eventsEventDetailScreenStateLabelPaidBookingUnavailable
        : needsRunPreferences
        ? l10n.eventsEventDetailScreenStateLabelSetRunPreferences
        : hasApprovedJoinRequest
        ? isFreeForViewer
              ? l10n.eventsEventDetailScreenStateLabelJoinApprovedEvent
              : l10n.eventsEventDetailScreenStateLabelCompleteApprovedBooking
        : isFreeForViewer
        ? l10n.eventsEventDetailScreenStateLabelJoinEventJoinctaavailabilitylabel(
            joinCtaAvailabilityLabel: presenter.joinCtaAvailabilityLabel,
          )
        : l10n.eventsEventDetailScreenStateLabelBookEvent,
    primaryAction: paidUnsupported
        ? EventDetailBookingDockAction.none
        : needsRunPreferences
        ? EventDetailBookingDockAction.openRunPreferences
        : EventDetailBookingDockAction.book,
    buttonKey: EventDetailBookingDockButtonKey.book,
    leadingKind: isFreeForViewer
        ? EventDetailBookingDockLeadingKind.none
        : EventDetailBookingDockLeadingKind.price,
    price: isFreeForViewer
        ? null
        : EventFormatters.priceInPaise(
            quotedPriceInPaise,
            currencyCode: event.currency,
          ),
    priceNote: !isFreeForViewer && isScarce
        ? l10n.eventsEventDetailScreenStateVisiblecopySpotsremainingSpotsLeft(
            spotsRemaining: spotsRemaining,
          )
        : null,
    priceWarn: !isFreeForViewer && isScarce,
    isLoading: mutationState.bookPending,
    useAccent: true,
    catchLine:
        l10n.eventsEventDetailScreenStateVisiblecopyMatchingOpensForEveryone,
    error: mutationState.error,
  );
}

EventDetailBookingDockState _signedUpBookingDockState({
  required AppLocalizations l10n,
  required Event event,
  required EventParticipation? participation,
  required DateTime now,
  required EventDetailBookingDockMutationState mutationState,
}) {
  if (isSelfCheckInOpenForParticipationStatus(
    event: event,
    status: participation?.status,
    now: now,
  )) {
    return const EventDetailBookingDockState.hidden();
  }

  return EventDetailBookingDockState(
    label: l10n.eventsEventDetailScreenStateLabelCancelBooking,
    primaryAction: EventDetailBookingDockAction.cancelBooking,
    buttonKey: EventDetailBookingDockButtonKey.cancelBooking,
    leadingKind: EventDetailBookingDockLeadingKind.booked,
    isLoading: mutationState.cancelPending,
    error: mutationState.error,
  );
}

/// Canonical presentation bridge from domain availability into the booking
/// dock's coarse action family. The public-surface behavior harness exercises
/// every availability enum value through this bridge.
EventSignUpStatus eventSignUpStatusForViewerAvailability(
  ViewerEventAvailabilityStatus status,
) => switch (status) {
  ViewerEventAvailabilityStatus.open ||
  ViewerEventAvailabilityStatus.saved ||
  ViewerEventAvailabilityStatus.approvedToBook ||
  ViewerEventAvailabilityStatus.runPreferencesRequired =>
    EventSignUpStatus.eligible,
  ViewerEventAvailabilityStatus.joined => EventSignUpStatus.signedUp,
  ViewerEventAvailabilityStatus.waitlisted => EventSignUpStatus.waitlisted,
  ViewerEventAvailabilityStatus.attended => EventSignUpStatus.attended,
  ViewerEventAvailabilityStatus.waitlistAvailable ||
  ViewerEventAvailabilityStatus.full => EventSignUpStatus.full,
  ViewerEventAvailabilityStatus.past => EventSignUpStatus.past,
  ViewerEventAvailabilityStatus.hosted ||
  ViewerEventAvailabilityStatus.requestRequired ||
  ViewerEventAvailabilityStatus.fullForViewer ||
  ViewerEventAvailabilityStatus.inviteRequired ||
  ViewerEventAvailabilityStatus.membershipRequired ||
  ViewerEventAvailabilityStatus.profileRequired ||
  ViewerEventAvailabilityStatus.ageRestricted ||
  ViewerEventAvailabilityStatus.cancelled => EventSignUpStatus.ineligible,
};

EventDetailCompanionState eventDetailCompanionStateFrom<T>({
  required EventParticipation? participation,
  required bool showConsumerActions,
  required CatchAsyncState<T?>? planState,
}) {
  if (!eventDetailCanOpenCompanion(
    participation: participation,
    showConsumerActions: showConsumerActions,
  )) {
    return const EventDetailCompanionState.hidden();
  }

  final resolvedPlan = planState;
  if (resolvedPlan == null) return const EventDetailCompanionState.loading();
  return switch (resolvedPlan.status) {
    CatchAsyncStatus.data =>
      resolvedPlan.value == null
          ? const EventDetailCompanionState.hidden()
          : const EventDetailCompanionState.available(),
    CatchAsyncStatus.loading => const EventDetailCompanionState.loading(),
    CatchAsyncStatus.error => EventDetailCompanionState.error(
      resolvedPlan.error!,
    ),
  };
}

bool eventDetailCanOpenCompanion({
  required EventParticipation? participation,
  required bool showConsumerActions,
}) {
  if (!showConsumerActions) return false;
  return switch (participation?.status) {
    EventParticipationStatus.signedUp ||
    EventParticipationStatus.attended => true,
    EventParticipationStatus.waitlisted ||
    EventParticipationStatus.cancelled ||
    EventParticipationStatus.deleted ||
    null => false,
  };
}

EventDetailHostState eventDetailHostStateFrom({
  required AppLocalizations l10n,
  required CatchAsyncState<Club?> clubState,
  required String? currentUid,
  required bool canMessageHost,
}) {
  return switch (clubState.status) {
    CatchAsyncStatus.data => () {
      final club = clubState.value;
      if (club == null) return const EventDetailHostState.hidden();
      final hostProfiles = club.displayHostProfiles;
      final hostProfile = hostProfiles.isEmpty ? null : hostProfiles.first;
      final hostUid = hostProfile?.uid ?? club.ownerOrPrimaryHostUserId;
      final canMessage =
          canMessageHost &&
          hostUid != null &&
          currentUid != null &&
          currentUid != hostUid;

      return EventDetailHostState.content(
        clubId: club.id,
        hostUid: hostUid,
        hostName: club.displayHostName,
        photoUrl: hostProfile?.avatarUrl ?? club.logoPhotoUrl,
        meta: _hostMeta(club, l10n),
        verified: club.organizerAuthority.isOwnerVerified,
        canMessage: canMessage,
      );
    }(),
    CatchAsyncStatus.loading => const EventDetailHostState.loading(),
    CatchAsyncStatus.error => EventDetailHostState.error(clubState.error!),
  };
}

String? _hostMeta(Club club, AppLocalizations l10n) {
  final parts = <String>[];
  parts.add(organizerTrustLabel(club.organizerAuthority.trustState, l10n));
  final area = club.area.trim();
  if (area.isNotEmpty) parts.add(area.toUpperCase());
  if (club.reviewCount > 0) {
    parts.add(
      l10n.eventsEventDetailScreenStateVisiblecopyClubReviewSummary(
        rating: club.rating.toStringAsFixed(1),
        reviewCount: club.reviewCount,
      ),
    );
  }
  return parts.isEmpty ? null : parts.join(' · ');
}
