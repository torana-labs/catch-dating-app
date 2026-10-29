import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';

class HostPrivateLinkActionState {
  const HostPrivateLinkActionState({
    required this.inviteCode,
    required this.inviteLink,
    required this.shareDetail,
    required this.canShare,
  });

  factory HostPrivateLinkActionState.resolve({
    required AppLocalizations l10n,
    required CatchAsyncState<EventPrivateAccess?>? accessState,
    required CatchAsyncState<List<EventInviteLink>>? inviteLinksState,
    required String? inviteLink,
    required bool sharePending,
  }) {
    final inviteCode = accessState?.value?.inviteCode.trim();
    return HostPrivateLinkActionState(
      inviteCode: inviteCode,
      inviteLink: inviteLink,
      shareDetail: hostPrivateShareDetail(
        l10n: l10n,
        accessState: accessState,
        inviteLinksState: inviteLinksState,
        sharePending: sharePending,
      ),
      canShare: inviteLink != null && !sharePending,
    );
  }

  final String? inviteCode;
  final String? inviteLink;
  final String shareDetail;
  final bool canShare;

  bool get hasInviteCode => inviteCode != null && inviteCode!.isNotEmpty;
}

class HostPrivateAccessDisplayState {
  const HostPrivateAccessDisplayState({
    required this.description,
    required this.linkAction,
  });

  factory HostPrivateAccessDisplayState.resolve({
    required AppLocalizations l10n,
    required EventPrivateAccess? access,
    required CatchAsyncState<List<EventInviteLink>>? inviteLinksState,
    required String? inviteLink,
    required bool sharePending,
  }) {
    final linkAction = HostPrivateLinkActionState.resolve(
      l10n: l10n,
      accessState: CatchAsyncState<EventPrivateAccess?>.data(access),
      inviteLinksState: inviteLinksState,
      inviteLink: inviteLink,
      sharePending: sharePending,
    );
    return HostPrivateAccessDisplayState(
      description: linkAction.hasInviteCode
          ? l10n.hostsHostEventManageScreenStateDescriptionThisEventCanStay
          : l10n.hostsHostEventManageScreenStateDescriptionThisEventRequiresAn,
      linkAction: linkAction,
    );
  }

  final String description;
  final HostPrivateLinkActionState linkAction;

  bool get hasInviteCode => linkAction.hasInviteCode;
}

enum HostInviteLinksMutationMode { idle, creating, copying, disabling }

class HostInviteLinksListDisplayState {
  const HostInviteLinksListDisplayState({
    required this.mutationMode,
    required this.emptyCopy,
  });

  factory HostInviteLinksListDisplayState.resolve({
    required bool createPending,
    required bool copyPending,
    required bool disablePending,
  }) {
    final mutationMode = createPending
        ? HostInviteLinksMutationMode.creating
        : copyPending
        ? HostInviteLinksMutationMode.copying
        : disablePending
        ? HostInviteLinksMutationMode.disabling
        : HostInviteLinksMutationMode.idle;
    return HostInviteLinksListDisplayState(
      mutationMode: mutationMode,
      emptyCopy:
          'Create links for Instagram bio, WhatsApp alumni, venue partners, or any channel you want to compare.',
    );
  }

  final HostInviteLinksMutationMode mutationMode;
  final String emptyCopy;

  bool get isMutating => mutationMode != HostInviteLinksMutationMode.idle;

  bool get createPending =>
      mutationMode == HostInviteLinksMutationMode.creating;
}

class HostInviteLinkRowDisplayState {
  const HostInviteLinkRowDisplayState({
    required this.label,
    required this.source,
    required this.url,
    required this.stats,
    required this.actionsDisabled,
    required this.showDisabledBadge,
    required this.showDisableAction,
  });

  factory HostInviteLinkRowDisplayState.resolve({
    required EventInviteLink link,
    required String url,
    required bool actionsDisabled,
  }) {
    return HostInviteLinkRowDisplayState(
      label: link.label,
      source: link.source,
      url: url,
      stats: hostInviteLinkStats(link),
      actionsDisabled: actionsDisabled,
      showDisabledBadge: link.isDisabled,
      showDisableAction: !link.isDisabled,
    );
  }

  final String label;
  final String? source;
  final String url;
  final String stats;
  final bool actionsDisabled;
  final bool showDisabledBadge;
  final bool showDisableAction;
}

String hostPrivateShareDetail({
  required AppLocalizations l10n,
  required CatchAsyncState<EventPrivateAccess?>? accessState,
  required CatchAsyncState<List<EventInviteLink>>? inviteLinksState,
  required bool sharePending,
}) {
  if (sharePending) {
    return l10n.hostsHostEventManageScreenStateVisiblecopySharing;
  }
  if (accessState == null) {
    return l10n.hostsHostEventManageScreenStateVisiblecopyPublicEventLink;
  }
  if (accessState.status == CatchAsyncStatus.loading) {
    return l10n.hostsHostEventManageScreenStateVisiblecopyLoadingLink;
  }
  if (accessState.status == CatchAsyncStatus.error ||
      accessState.value == null) {
    return l10n
        .hostsHostEventManageScreenStateVisiblecopyInviteSetupUnavailable;
  }

  if (inviteLinksState == null ||
      inviteLinksState.status == CatchAsyncStatus.loading) {
    return l10n.hostsHostEventManageScreenStateVisiblecopyPrivateInviteLink;
  }
  if (inviteLinksState.status == CatchAsyncStatus.error) {
    return l10n
        .hostsHostEventManageScreenStateVisiblecopyInviteLinksUnavailable;
  }
  final count = inviteLinksState.value?.length ?? 0;
  if (count == 1) {
    return l10n.hostsHostEventManageScreenStateVisiblecopy1InviteLink;
  }
  return l10n.hostsHostEventManageScreenStateVisiblecopyCountInviteLinks(
    count: count,
  );
}

String hostInviteLinkStats(EventInviteLink link) {
  return [
    '${link.openCount} opens',
    '${link.requestCount} requests',
    '${link.confirmedCount} confirmed',
    '${link.checkedInCount} checked in',
    '${link.catcherCount} caught',
    '${link.chatStartedCount} chats',
  ].join(' | ');
}
