import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_readiness.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_view_model.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';

enum HostOrganizerDetailRetryIntent { reloadDetail }

enum OrganizerContactActionKind { instagram, phone, email }

enum OrganizerDetailEventRouteTarget { consumerEventDetail, hostEventDetail }

Organizer? organizerDetailInitialOrganizerForRoute({
  required String organizerId,
  required Organizer? initialOrganizer,
}) => initialOrganizer?.id == organizerId ? initialOrganizer : null;

class OrganizerContactAction {
  const OrganizerContactAction._({
    required this.kind,
    required this.label,
    required this.uri,
    required this.openExternally,
  });

  factory OrganizerContactAction.instagram(String handle) {
    final normalized = handle.replaceFirst('@', '');
    return OrganizerContactAction._(
      kind: OrganizerContactActionKind.instagram,
      label: handle,
      uri: Uri.parse('https://instagram.com/$normalized'),
      openExternally: true,
    );
  }

  factory OrganizerContactAction.phone(String phoneNumber) {
    return OrganizerContactAction._(
      kind: OrganizerContactActionKind.phone,
      label: phoneNumber,
      uri: Uri(scheme: 'tel', path: phoneNumber),
      openExternally: false,
    );
  }

  factory OrganizerContactAction.email(String email) {
    return OrganizerContactAction._(
      kind: OrganizerContactActionKind.email,
      label: email,
      uri: Uri(scheme: 'mailto', path: email),
      openExternally: false,
    );
  }

  final OrganizerContactActionKind kind;
  final String label;
  final Uri uri;
  final bool openExternally;
}

class OrganizerDetailDockState {
  const OrganizerDetailDockState({
    required this.organizer,
    required this.isMember,
    required this.isAuthenticated,
    required this.isMutating,
    required this.pushNotificationsEnabled,
    required this.isPushMutating,
  });

  final Organizer organizer;
  final bool isMember;
  final bool isAuthenticated;
  final bool isMutating;
  final bool pushNotificationsEnabled;
  final bool isPushMutating;
}

class OrganizerDetailBodyState {
  const OrganizerDetailBodyState({
    required this.organizer,
    required this.upcomingEvents,
    required this.reviews,
    required this.userProfile,
    required this.uid,
    required this.isHost,
    required this.isMember,
    required this.isMutating,
    required this.organizerPushNotificationsEnabled,
    required this.isOrganizerPushMutating,
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

  factory OrganizerDetailBodyState.fromContent(
    HostOrganizerDetailContent content, {
    required AppRole appRole,
    bool isMutating = false,
    bool organizerPushNotificationsEnabled = false,
    bool isOrganizerPushMutating = false,
    bool isMessageHostPending = false,
  }) {
    if (content.publicPreviewMode) {
      return OrganizerDetailBodyState.publicPreview(
        organizer: content.organizer,
        upcomingEvents: content.upcomingEvents,
        reviews: content.reviews,
        userProfile: content.userProfile,
        uid: content.uid,
        isAuthenticated: content.isAuthenticated,
        appRole: appRole,
      );
    }
    return OrganizerDetailBodyState.fromDomain(
      organizer: content.organizer,
      upcomingEvents: content.upcomingEvents,
      reviews: content.reviews,
      userProfile: content.userProfile,
      uid: content.uid,
      isHost: content.isHost,
      isMember: content.isMember,
      isAuthenticated: content.isAuthenticated,
      appRole: appRole,
      isMutating: isMutating,
      organizerPushNotificationsEnabled: organizerPushNotificationsEnabled,
      isOrganizerPushMutating: isOrganizerPushMutating,
      isMessageHostPending: isMessageHostPending,
      showMembershipDock: content.showMembershipDock,
    );
  }

  /// Consumer-facing club presentation with every mutation and membership
  /// affordance disabled for an owner preview.
  factory OrganizerDetailBodyState.publicPreview({
    required Organizer organizer,
    List<Event> upcomingEvents = const [],
    List<Review> reviews = const [],
    UserProfile? userProfile,
    String? uid,
    bool isAuthenticated = true,
    AppRole appRole = AppRole.consumer,
  }) {
    return OrganizerDetailBodyState.fromDomain(
      organizer: organizer,
      upcomingEvents: upcomingEvents,
      reviews: reviews,
      userProfile: userProfile,
      uid: uid,
      isAuthenticated: isAuthenticated,
      appRole: appRole,
      showMembershipDock: false,
    );
  }

  factory OrganizerDetailBodyState.fromDomain({
    required Organizer organizer,
    List<Event> upcomingEvents = const [],
    List<Review> reviews = const [],
    UserProfile? userProfile,
    String? uid,
    bool isHost = false,
    bool isMember = false,
    bool isMutating = false,
    bool organizerPushNotificationsEnabled = false,
    bool isOrganizerPushMutating = false,
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
        organizer.supplyCapabilities.hostContactEnabled &&
        !appRole.isHost &&
        !isHost;
    final messageableHostUids = {
      if (canMessageHosts && uid != null)
        for (final host in organizer.displayHostProfiles)
          if (host.uid != uid) host.uid,
    };
    return OrganizerDetailBodyState(
      organizer: organizer,
      upcomingEvents: upcomingEvents,
      reviews: reviews,
      userProfile: userProfile,
      uid: uid,
      isHost: isHost,
      isMember: isMember,
      isMutating: isMutating,
      organizerPushNotificationsEnabled: organizerPushNotificationsEnabled,
      isOrganizerPushMutating: isOrganizerPushMutating,
      isAuthenticated: isAuthenticated,
      canMessageHosts: canMessageHosts,
      isMessageHostPending: isMessageHostPending,
      nextEvent: _nextPublishedEvent(upcomingEvents),
      contactActions: organizer.supplyCapabilities.hostContactEnabled
          ? _organizerContactActions(organizer)
          : const [],
      showReviews: isAuthenticated,
      messageableHostUids: messageableHostUids,
      eventRouteTarget: appRole.isHost
          ? OrganizerDetailEventRouteTarget.hostEventDetail
          : OrganizerDetailEventRouteTarget.consumerEventDetail,
      dockState: shouldShowDock
          ? OrganizerDetailDockState(
              organizer: organizer,
              isMember: isMember,
              isAuthenticated: isAuthenticated,
              isMutating: isMutating,
              pushNotificationsEnabled: organizerPushNotificationsEnabled,
              isPushMutating: isOrganizerPushMutating,
            )
          : null,
    );
  }

  final Organizer organizer;
  final List<Event> upcomingEvents;
  final List<Review> reviews;
  final UserProfile? userProfile;
  final String? uid;
  final bool isHost;
  final bool isMember;
  final bool isMutating;
  final bool organizerPushNotificationsEnabled;
  final bool isOrganizerPushMutating;
  final bool isAuthenticated;
  final bool canMessageHosts;
  final bool isMessageHostPending;
  final Event? nextEvent;
  final List<OrganizerContactAction> contactActions;
  final bool showReviews;
  final Set<String> messageableHostUids;
  final OrganizerDetailEventRouteTarget eventRouteTarget;
  final OrganizerDetailDockState? dockState;

  bool canMessageHost(String hostUid) {
    return messageableHostUids.contains(hostUid) && !isMessageHostPending;
  }
}

sealed class HostOrganizerDetailScreenState {
  const HostOrganizerDetailScreenState();

  factory HostOrganizerDetailScreenState.fromState({
    required CatchAsyncState<OrganizerDetailViewModel?> viewModel,
    required Organizer? initialOrganizer,
    required String? currentUid,
    required UserProfile? currentUserProfile,
    required OrganizerMembership? currentMembership,
    required AppRole appRole,
    bool authResolved = true,
  }) {
    final liveViewModel = viewModel.value;
    if (viewModel.status == CatchAsyncStatus.data && liveViewModel != null) {
      return HostOrganizerDetailContent.fromViewModel(
        liveViewModel,
        appRole: appRole,
      );
    }

    if (viewModel.status == CatchAsyncStatus.loading &&
        initialOrganizer != null &&
        !appRole.isHost &&
        !initialOrganizer.isPubliclyBrowseable) {
      return const HostOrganizerDetailNotFound();
    }

    // Route extras are only an optimistic data cache. Until auth resolves they
    // must not choose guest actions for a viewer who may already be signed in.
    if (viewModel.status == CatchAsyncStatus.loading && !authResolved) {
      return const HostOrganizerDetailLoading();
    }

    if (viewModel.status == CatchAsyncStatus.loading &&
        initialOrganizer != null &&
        appRole.isHost &&
        (currentUid == null || !initialOrganizer.isHostedBy(currentUid))) {
      return const HostOrganizerDetailNotFound();
    }

    if (viewModel.status == CatchAsyncStatus.loading &&
        initialOrganizer != null) {
      final isAuthenticated = currentUid != null;
      return HostOrganizerDetailContent(
        organizer: initialOrganizer,
        upcomingEvents: const [],
        reviews: const [],
        userProfile: currentUserProfile,
        uid: currentUid,
        isHost: isAuthenticated && initialOrganizer.isHostedBy(currentUid),
        isMember:
            isAuthenticated &&
            currentMembership?.status == OrganizerMembershipStatus.active,
        isAuthenticated: isAuthenticated,
        isInitialFallback: true,
        publicPreviewMode: appRole.isHost,
        showMembershipDock:
            !appRole.isHost &&
            !(isAuthenticated && initialOrganizer.isHostedBy(currentUid)),
      );
    }

    return switch (viewModel.status) {
      CatchAsyncStatus.error => HostOrganizerDetailError(
        error: viewModel.error!,
      ),
      CatchAsyncStatus.loading => const HostOrganizerDetailLoading(),
      CatchAsyncStatus.data => const HostOrganizerDetailNotFound(),
    };
  }
}

final class HostOrganizerDetailLoading extends HostOrganizerDetailScreenState {
  const HostOrganizerDetailLoading();
}

final class HostOrganizerDetailError extends HostOrganizerDetailScreenState {
  const HostOrganizerDetailError({
    required this.error,
    this.retryIntent = HostOrganizerDetailRetryIntent.reloadDetail,
  });

  final Object error;
  final HostOrganizerDetailRetryIntent retryIntent;
}

final class HostOrganizerDetailNotFound extends HostOrganizerDetailScreenState {
  const HostOrganizerDetailNotFound();
}

final class HostOrganizerDetailContent extends HostOrganizerDetailScreenState {
  const HostOrganizerDetailContent({
    required this.organizer,
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

  factory HostOrganizerDetailContent.fromViewModel(
    OrganizerDetailViewModel viewModel, {
    required AppRole appRole,
  }) {
    return HostOrganizerDetailContent(
      organizer: viewModel.organizer,
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

  final Organizer organizer;
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

List<OrganizerContactAction> _organizerContactActions(Organizer organizer) {
  return [
    if (organizer.instagramHandle != null)
      OrganizerContactAction.instagram(organizer.instagramHandle!),
    if (organizer.phoneNumber != null)
      OrganizerContactAction.phone(organizer.phoneNumber!),
    if (organizer.email != null) OrganizerContactAction.email(organizer.email!),
  ];
}
