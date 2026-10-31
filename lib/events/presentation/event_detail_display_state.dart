import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_readiness.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:flutter/foundation.dart';

enum EventDetailCompanionStatus { hidden, loading, available, error }

@immutable
class EventDetailCompanionState {
  const EventDetailCompanionState._({required this.status, this.error});

  const EventDetailCompanionState.hidden()
    : this._(status: EventDetailCompanionStatus.hidden);

  const EventDetailCompanionState.loading()
    : this._(status: EventDetailCompanionStatus.loading);

  const EventDetailCompanionState.available()
    : this._(status: EventDetailCompanionStatus.available);

  const EventDetailCompanionState.error(Object error)
    : this._(status: EventDetailCompanionStatus.error, error: error);

  final EventDetailCompanionStatus status;
  final Object? error;
}

enum EventDetailHostStatus { hidden, loading, content, error }

@immutable
class EventDetailHostState {
  const EventDetailHostState._({
    required this.status,
    this.error,
    this.organizerId,
    this.hostUid,
    this.hostName,
    this.photoUrl,
    this.meta,
    this.verified = false,
    this.canMessage = false,
  });

  const EventDetailHostState.hidden()
    : this._(status: EventDetailHostStatus.hidden);

  const EventDetailHostState.loading()
    : this._(status: EventDetailHostStatus.loading);

  const EventDetailHostState.error(Object error)
    : this._(status: EventDetailHostStatus.error, error: error);

  const EventDetailHostState.content({
    required String organizerId,
    required String hostName,
    String? hostUid,
    String? photoUrl,
    String? meta,
    bool verified = false,
    bool canMessage = false,
  }) : this._(
         status: EventDetailHostStatus.content,
         organizerId: organizerId,
         hostUid: hostUid,
         hostName: hostName,
         photoUrl: photoUrl,
         meta: meta,
         verified: verified,
         canMessage: canMessage,
       );

  final EventDetailHostStatus status;
  final Object? error;
  final String? organizerId;
  final String? hostUid;
  final String? hostName;
  final String? photoUrl;
  final String? meta;
  final bool verified;
  final bool canMessage;
}

@immutable
class EventDetailSectionVisibilityState {
  const EventDetailSectionVisibilityState({
    required this.showConsumerActions,
    required this.renderSocialAsHost,
    required this.showInviteLoop,
    required this.showBottomNavigation,
  });

  final bool showConsumerActions;
  final bool renderSocialAsHost;
  final bool showInviteLoop;
  final bool showBottomNavigation;
}

EventDetailSectionVisibilityState eventDetailSectionVisibilityStateFrom({
  required Event event,
  required EventParticipation? participation,
  required bool isHostApp,
  required bool isHost,
  required DateTime now,
}) {
  final showConsumerActions = !isHostApp && !isHost;
  return EventDetailSectionVisibilityState(
    showConsumerActions: showConsumerActions,
    renderSocialAsHost: isHostApp || isHost,
    showInviteLoop: eventDetailCanShowInviteLoop(
      event: event,
      participation: participation,
      showConsumerActions: showConsumerActions,
      now: now,
    ),
    showBottomNavigation: !isHostApp,
  );
}

bool eventDetailCanShowInviteLoop({
  required Event event,
  required EventParticipation? participation,
  required bool showConsumerActions,
  required DateTime now,
}) {
  if (!showConsumerActions ||
      event.isCancelled ||
      !event.startTime.isAfter(now)) {
    return false;
  }
  return participation?.status == EventParticipationStatus.signedUp;
}

@immutable
class EventDetailSocialState {
  const EventDetailSocialState({
    required this.showMemberContext,
    required this.renderAsHost,
    required this.reviews,
    this.isLoading = false,
  });

  const EventDetailSocialState.loading()
    : this(
        showMemberContext: false,
        renderAsHost: false,
        reviews: const EventDetailReviewsState.hidden(),
        isLoading: true,
      );

  final bool showMemberContext;
  final bool renderAsHost;
  final EventDetailReviewsState reviews;
  final bool isLoading;
}

enum EventDetailReviewsMode { hidden, content, emptyWritePrompt }

/// Capability-derived review presentation for Event Detail.
///
/// Call sites cannot independently request an empty review tile or expose a
/// write/respond action to an ineligible viewer. The route resolver owns those
/// combinations and the section simply renders the resulting mode.
@immutable
class EventDetailReviewsState {
  const EventDetailReviewsState._({
    required this.mode,
    required this.canWrite,
    required this.canRespond,
  });

  const EventDetailReviewsState.hidden()
    : this._(
        mode: EventDetailReviewsMode.hidden,
        canWrite: false,
        canRespond: false,
      );

  const EventDetailReviewsState.content({
    required bool canWrite,
    required bool canRespond,
  }) : this._(
         mode: EventDetailReviewsMode.content,
         canWrite: canWrite,
         canRespond: canRespond,
       );

  const EventDetailReviewsState.emptyWritePrompt()
    : this._(
        mode: EventDetailReviewsMode.emptyWritePrompt,
        canWrite: true,
        canRespond: false,
      );

  final EventDetailReviewsMode mode;
  final bool canWrite;
  final bool canRespond;

  bool get visible => mode != EventDetailReviewsMode.hidden;
}

EventDetailSocialState eventDetailSocialStateFrom({
  required Event event,
  required bool hasReviews,
  required UserProfile? userProfile,
  required bool isAuthenticated,
  required bool renderAsHost,
  required EventParticipation? participation,
  required DateTime now,
}) {
  final isMember = isAuthenticated && userProfile != null;
  final isSocialReady = isMember && userProfile.hasSocialReadyProfileOn(now);
  final reviewAccessStarted = !event.endTime.isAfter(now);
  final canWrite =
      isSocialReady &&
      !renderAsHost &&
      !event.isCancelled &&
      participation?.status == EventParticipationStatus.attended &&
      reviewAccessStarted;
  final canRespond = isMember && renderAsHost && hasReviews;
  final reviews = !isMember
      ? const EventDetailReviewsState.hidden()
      : hasReviews
      ? EventDetailReviewsState.content(
          canWrite: canWrite,
          canRespond: canRespond,
        )
      : canWrite
      ? const EventDetailReviewsState.emptyWritePrompt()
      : const EventDetailReviewsState.hidden();

  return EventDetailSocialState(
    showMemberContext: isMember,
    renderAsHost: renderAsHost,
    reviews: reviews,
  );
}
