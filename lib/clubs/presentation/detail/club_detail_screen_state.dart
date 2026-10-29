import 'package:catch_dating_app/clubs/presentation/detail/club_detail_view_model.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_membership.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_readiness.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';

enum HostClubDetailRetryIntent { reloadDetail }

enum ClubContactActionKind { instagram, phone, email }

enum ClubDetailEventRouteTarget { consumerEventDetail, hostEventDetail }

Club? clubDetailInitialClubForRoute({
  required String clubId,
  required Club? initialClub,
}) => initialClub?.id == clubId ? initialClub : null;

class ClubContactAction {
  const ClubContactAction._({
    required this.kind,
    required this.label,
    required this.uri,
    required this.openExternally,
  });

  factory ClubContactAction.instagram(String handle) {
    final normalized = handle.replaceFirst('@', '');
    return ClubContactAction._(
      kind: ClubContactActionKind.instagram,
      label: handle,
      uri: Uri.parse('https://instagram.com/$normalized'),
      openExternally: true,
    );
  }

  factory ClubContactAction.phone(String phoneNumber) {
    return ClubContactAction._(
      kind: ClubContactActionKind.phone,
      label: phoneNumber,
      uri: Uri(scheme: 'tel', path: phoneNumber),
      openExternally: false,
    );
  }

  factory ClubContactAction.email(String email) {
    return ClubContactAction._(
      kind: ClubContactActionKind.email,
      label: email,
      uri: Uri(scheme: 'mailto', path: email),
      openExternally: false,
    );
  }

  final ClubContactActionKind kind;
  final String label;
  final Uri uri;
  final bool openExternally;
}

class ClubDetailDockState {
  const ClubDetailDockState({
    required this.club,
    required this.isMember,
    required this.isAuthenticated,
    required this.isMutating,
    required this.pushNotificationsEnabled,
    required this.isPushMutating,
  });

  final Club club;
  final bool isMember;
  final bool isAuthenticated;
  final bool isMutating;
  final bool pushNotificationsEnabled;
  final bool isPushMutating;
}

class ClubDetailBodyState {
  const ClubDetailBodyState({
    required this.club,
    required this.upcomingEvents,
    required this.reviews,
    required this.userProfile,
    required this.uid,
    required this.isHost,
    required this.isMember,
    required this.isMutating,
    required this.clubPushNotificationsEnabled,
    required this.isClubPushMutating,
    required this.isAuthenticated,
    required this.canMessageHosts,
    required this.isMessageHostPending,
    required this.nextEvent,
    required this.contactActions,
    required this.showReviews,
    required this.messageableHostUids,
    required this.eventRouteTarget,
    required this.dockState,
  });

  factory ClubDetailBodyState.fromContent(
    HostClubDetailContent content, {
    required AppRole appRole,
    bool isMutating = false,
    bool clubPushNotificationsEnabled = false,
    bool isClubPushMutating = false,
    bool isMessageHostPending = false,
  }) {
    if (content.publicPreviewMode) {
      return ClubDetailBodyState.publicPreview(
        club: content.club,
        upcomingEvents: content.upcomingEvents,
        reviews: content.reviews,
        userProfile: content.userProfile,
        uid: content.uid,
        isAuthenticated: content.isAuthenticated,
        appRole: appRole,
      );
    }
    return ClubDetailBodyState.fromDomain(
      club: content.club,
      upcomingEvents: content.upcomingEvents,
      reviews: content.reviews,
      userProfile: content.userProfile,
      uid: content.uid,
      isHost: content.isHost,
      isMember: content.isMember,
      isAuthenticated: content.isAuthenticated,
      appRole: appRole,
      isMutating: isMutating,
      clubPushNotificationsEnabled: clubPushNotificationsEnabled,
      isClubPushMutating: isClubPushMutating,
      isMessageHostPending: isMessageHostPending,
      showMembershipDock: content.showMembershipDock,
    );
  }

  /// Consumer-facing club presentation with every mutation and membership
  /// affordance disabled for an owner preview.
  factory ClubDetailBodyState.publicPreview({
    required Club club,
    List<Event> upcomingEvents = const [],
    List<Review> reviews = const [],
    UserProfile? userProfile,
    String? uid,
    bool isAuthenticated = true,
    AppRole appRole = AppRole.consumer,
  }) {
    return ClubDetailBodyState.fromDomain(
      club: club,
      upcomingEvents: upcomingEvents,
      reviews: reviews,
      userProfile: userProfile,
      uid: uid,
      isAuthenticated: isAuthenticated,
      appRole: appRole,
      showMembershipDock: false,
    );
  }

  factory ClubDetailBodyState.fromDomain({
    required Club club,
    List<Event> upcomingEvents = const [],
    List<Review> reviews = const [],
    UserProfile? userProfile,
    String? uid,
    bool isHost = false,
    bool isMember = false,
    bool isMutating = false,
    bool clubPushNotificationsEnabled = false,
    bool isClubPushMutating = false,
    bool isAuthenticated = false,
    bool isMessageHostPending = false,
    AppRole appRole = AppRole.consumer,
    bool? showMembershipDock,
    DateTime? now,
  }) {
    final shouldShowDock = showMembershipDock ?? (!appRole.isHost && !isHost);
    final canMessageHosts =
        isAuthenticated &&
        userProfile?.hasSocialReadyProfileOn(now ?? DateTime.now()) == true &&
        club.supplyCapabilities.hostContactEnabled &&
        !appRole.isHost &&
        !isHost;
    final messageableHostUids = {
      if (canMessageHosts && uid != null)
        for (final host in club.displayHostProfiles)
          if (host.uid != uid) host.uid,
    };
    return ClubDetailBodyState(
      club: club,
      upcomingEvents: upcomingEvents,
      reviews: reviews,
      userProfile: userProfile,
      uid: uid,
      isHost: isHost,
      isMember: isMember,
      isMutating: isMutating,
      clubPushNotificationsEnabled: clubPushNotificationsEnabled,
      isClubPushMutating: isClubPushMutating,
      isAuthenticated: isAuthenticated,
      canMessageHosts: canMessageHosts,
      isMessageHostPending: isMessageHostPending,
      nextEvent: _nextPublishedEvent(upcomingEvents),
      contactActions: club.supplyCapabilities.hostContactEnabled
          ? _clubContactActions(club)
          : const [],
      showReviews: isAuthenticated,
      messageableHostUids: messageableHostUids,
      eventRouteTarget: appRole.isHost
          ? ClubDetailEventRouteTarget.hostEventDetail
          : ClubDetailEventRouteTarget.consumerEventDetail,
      dockState: shouldShowDock
          ? ClubDetailDockState(
              club: club,
              isMember: isMember,
              isAuthenticated: isAuthenticated,
              isMutating: isMutating,
              pushNotificationsEnabled: clubPushNotificationsEnabled,
              isPushMutating: isClubPushMutating,
            )
          : null,
    );
  }

  final Club club;
  final List<Event> upcomingEvents;
  final List<Review> reviews;
  final UserProfile? userProfile;
  final String? uid;
  final bool isHost;
  final bool isMember;
  final bool isMutating;
  final bool clubPushNotificationsEnabled;
  final bool isClubPushMutating;
  final bool isAuthenticated;
  final bool canMessageHosts;
  final bool isMessageHostPending;
  final Event? nextEvent;
  final List<ClubContactAction> contactActions;
  final bool showReviews;
  final Set<String> messageableHostUids;
  final ClubDetailEventRouteTarget eventRouteTarget;
  final ClubDetailDockState? dockState;

  bool canMessageHost(String hostUid) {
    return messageableHostUids.contains(hostUid) && !isMessageHostPending;
  }
}

sealed class HostClubDetailScreenState {
  const HostClubDetailScreenState();

  factory HostClubDetailScreenState.fromState({
    required CatchAsyncState<ClubDetailViewModel?> viewModel,
    required Club? initialClub,
    required String? currentUid,
    required UserProfile? currentUserProfile,
    required ClubMembership? currentMembership,
    required AppRole appRole,
    bool authResolved = true,
  }) {
    final liveViewModel = viewModel.value;
    if (viewModel.status == CatchAsyncStatus.data && liveViewModel != null) {
      return HostClubDetailContent.fromViewModel(
        liveViewModel,
        appRole: appRole,
      );
    }

    if (viewModel.status == CatchAsyncStatus.loading &&
        initialClub != null &&
        !appRole.isHost &&
        !initialClub.isPubliclyBrowseable) {
      return const HostClubDetailNotFound();
    }

    // Route extras are only an optimistic data cache. Until auth resolves they
    // must not choose guest actions for a viewer who may already be signed in.
    if (viewModel.status == CatchAsyncStatus.loading && !authResolved) {
      return const HostClubDetailLoading();
    }

    if (viewModel.status == CatchAsyncStatus.loading &&
        initialClub != null &&
        appRole.isHost &&
        (currentUid == null || !initialClub.isHostedBy(currentUid))) {
      return const HostClubDetailNotFound();
    }

    if (viewModel.status == CatchAsyncStatus.loading && initialClub != null) {
      final isAuthenticated = currentUid != null;
      return HostClubDetailContent(
        club: initialClub,
        upcomingEvents: const [],
        reviews: const [],
        userProfile: currentUserProfile,
        uid: currentUid,
        isHost: isAuthenticated && initialClub.isHostedBy(currentUid),
        isMember:
            isAuthenticated &&
            currentMembership?.status == ClubMembershipStatus.active,
        isAuthenticated: isAuthenticated,
        isInitialFallback: true,
        publicPreviewMode: appRole.isHost,
        showMembershipDock:
            !appRole.isHost &&
            !(isAuthenticated && initialClub.isHostedBy(currentUid)),
      );
    }

    return switch (viewModel.status) {
      CatchAsyncStatus.error => HostClubDetailError(error: viewModel.error!),
      CatchAsyncStatus.loading => const HostClubDetailLoading(),
      CatchAsyncStatus.data => const HostClubDetailNotFound(),
    };
  }
}

final class HostClubDetailLoading extends HostClubDetailScreenState {
  const HostClubDetailLoading();
}

final class HostClubDetailError extends HostClubDetailScreenState {
  const HostClubDetailError({
    required this.error,
    this.retryIntent = HostClubDetailRetryIntent.reloadDetail,
  });

  final Object error;
  final HostClubDetailRetryIntent retryIntent;
}

final class HostClubDetailNotFound extends HostClubDetailScreenState {
  const HostClubDetailNotFound();
}

final class HostClubDetailContent extends HostClubDetailScreenState {
  const HostClubDetailContent({
    required this.club,
    required this.upcomingEvents,
    required this.reviews,
    required this.userProfile,
    required this.uid,
    required this.isHost,
    required this.isMember,
    required this.isAuthenticated,
    required this.isInitialFallback,
    required this.publicPreviewMode,
    required this.showMembershipDock,
  });

  factory HostClubDetailContent.fromViewModel(
    ClubDetailViewModel viewModel, {
    required AppRole appRole,
  }) {
    return HostClubDetailContent(
      club: viewModel.club,
      upcomingEvents: viewModel.upcomingEvents,
      reviews: viewModel.reviews,
      userProfile: viewModel.userProfile,
      uid: viewModel.uid,
      isHost: viewModel.isHost,
      isMember: viewModel.isMember,
      isAuthenticated: viewModel.isAuthenticated,
      isInitialFallback: false,
      publicPreviewMode: appRole.isHost,
      showMembershipDock: !appRole.isHost && !viewModel.isHost,
    );
  }

  final Club club;
  final List<Event> upcomingEvents;
  final List<Review> reviews;
  final UserProfile? userProfile;
  final String? uid;
  final bool isHost;
  final bool isMember;
  final bool isAuthenticated;
  final bool isInitialFallback;
  final bool publicPreviewMode;
  final bool showMembershipDock;
}

Event? _nextPublishedEvent(List<Event> events) {
  final upcoming = [
    for (final event in events)
      if (!event.isCancelled) event,
  ]..sort((a, b) => a.startTime.compareTo(b.startTime));
  return upcoming.isEmpty ? null : upcoming.first;
}

List<ClubContactAction> _clubContactActions(Club club) {
  return [
    if (club.instagramHandle != null)
      ClubContactAction.instagram(club.instagramHandle!),
    if (club.phoneNumber != null) ClubContactAction.phone(club.phoneNumber!),
    if (club.email != null) ClubContactAction.email(club.email!),
  ];
}
