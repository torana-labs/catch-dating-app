import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/hosts/events/access/event_share_body.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_controller.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_private_access_section.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/clipboard.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/app_deep_links.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Share and invite links for a saved event: its link to copy or share
/// and, for an invite-only night, its private link and named invite links.
///
/// Copy and Share use the clipboard and the share sheet; an invite-only
/// night shares its private link with the existing invite text. Named
/// links are the existing commands (`createEventInviteLink`, the link
/// token read, `disableEventInviteLink`) through
/// [hostEventManageActionsProvider]; a new link is copied as it is made.
class HostEventShareScreen extends ConsumerStatefulWidget {
  const HostEventShareScreen({super.key, required this.request});

  final HostEventRequest request;

  @override
  ConsumerState<HostEventShareScreen> createState() =>
      _HostEventShareScreenState();
}

class _HostEventShareScreenState extends ConsumerState<HostEventShareScreen> {
  final TextEditingController _label = TextEditingController();
  String _newLabel = '';

  @override
  void dispose() {
    _label.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final request = widget.request;
    final event = ref.watch(watchEventProvider(request.eventId)).value;
    final inviteOnly = event?.effectiveEventPolicy.usesInviteOnly ?? false;
    final inviteCode = inviteOnly
        ? ref
              .watch(watchEventPrivateAccessProvider(request.eventId))
              .value
              ?.inviteCode
        : null;
    final inviteLinks = inviteOnly
        ? ref.watch(watchEventInviteLinksProvider(request.eventId)).value
        : null;
    final mutations = [
      HostEventManageController.createInviteLinkMutation,
      HostEventManageController.copyInviteLinkMutation,
      HostEventManageController.disableInviteLinkMutation,
      HostEventManageController.sharePrivateLinkMutation,
    ];
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: mutations,
      errorContext: AppErrorContext.event,
    );
    final pending = [
      for (final mutation in mutations) ref.watch(mutation),
    ].any((state) => state.isPending);
    final link = event == null
        ? null
        : inviteOnly
        ? hostEventInviteUrl(
            organizerId: request.organizerId,
            eventId: request.eventId,
            inviteCode: inviteCode,
          )
        : AppDeepLinks.event(
            organizerId: request.organizerId,
            eventId: request.eventId,
          ).toString();
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-event-share-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostEventsBack),
          kicker: event?.title,
          title: l10n.hostEventsLinkShare,
        ),
        bodyScrolls: false,
        body: event == null
            ? const CatchPageBody.screen(child: CatchLoadingIndicator())
            : HostEventShareBody(
                link: link,
                inviteOnly: inviteOnly,
                onCopy: () => unawaited(_copy(link)),
                onShare: () => unawaited(_share(event, link)),
                inviteLinks: inviteLinks == null
                    ? null
                    : ([...inviteLinks]
                        ..sort((a, b) => b.createdAt.compareTo(a.createdAt))),
                newLabel: _newLabel,
                labelController: _label,
                onNewLabel: (value) => setState(() => _newLabel = value),
                pending: pending,
                onCreate: inviteCode == null
                    ? null
                    : () => unawaited(_create(event, inviteCode)),
                onCopyInvite: inviteCode == null
                    ? null
                    : (invite) =>
                          unawaited(_copyInvite(event, inviteCode, invite)),
                onTurnOff: (invite) => unawaited(_turnOff(event, invite)),
              ),
      ),
    );
  }

  Future<void> _copy(String? link) async {
    if (link == null) return;
    final copied = context.l10n.hostEventsShareCopied;
    await ref.read(clipboardControllerProvider).copyText(link);
    if (mounted) showCatchNotice(context, copied);
  }

  Future<void> _share(Event event, String? link) async {
    if (link == null) return;
    final l10n = context.l10n;
    final box = context.findRenderObject() as RenderBox?;
    final origin = box == null
        ? null
        : box.localToGlobal(Offset.zero) & box.size;
    if (!event.effectiveEventPolicy.usesInviteOnly) {
      await ref
          .read(externalShareControllerProvider)
          .shareText(text: link, origin: origin);
      return;
    }
    final organizer = ref
        .read(watchOrganizerProvider(widget.request.organizerId))
        .value;
    if (organizer == null) return;
    await _quietly(
      HostEventManageController.sharePrivateLinkMutation.run(
        ref,
        (tx) => tx
            .get(hostEventManageActionsProvider)
            .sharePrivateLink(
              organizer: organizer,
              event: event,
              inviteLink: link,
              l10n: l10n,
              origin: origin,
            ),
      ),
    );
  }

  Future<void> _create(Event event, String inviteCode) async {
    final label = _newLabel.trim();
    if (label.isEmpty) return;
    final l10n = context.l10n;
    final String made;
    try {
      made = await HostEventManageController.createInviteLinkMutation.run(
        ref,
        (tx) => tx
            .get(hostEventManageActionsProvider)
            .createInviteLink(
              event: event,
              inviteCode: inviteCode,
              draft: HostInviteLinkDraft(label: label),
            ),
      );
    } on Object {
      // The create mutation's error notice, set up in build, says why.
      return;
    }
    if (!mounted) return;
    _label.clear();
    setState(() => _newLabel = '');
    showCatchNotice(context, l10n.hostEventsShareCopiedNamed(label: made));
  }

  Future<void> _copyInvite(
    Event event,
    String inviteCode,
    EventInviteLink invite,
  ) async {
    final l10n = context.l10n;
    final String label;
    try {
      label = await HostEventManageController.copyInviteLinkMutation.run(
        ref,
        (tx) => tx
            .get(hostEventManageActionsProvider)
            .copyInviteLink(event: event, inviteCode: inviteCode, link: invite),
      );
    } on Object {
      return;
    }
    if (mounted) {
      showCatchNotice(context, l10n.hostEventsShareCopiedNamed(label: label));
    }
  }

  Future<void> _turnOff(Event event, EventInviteLink invite) async {
    final l10n = context.l10n;
    final confirmed = await showCatchAdaptiveDialog<bool>(
      context: context,
      title: l10n.hostEventsShareTurnOffTitle(label: invite.label),
      message: l10n.hostEventsShareTurnOffBody,
      actions: [
        CatchDialogAction(
          label: l10n.hostEventsShareKeepOn,
          value: false,
          isDefault: true,
        ),
        CatchDialogAction(
          label: l10n.hostEventsShareTurnOff,
          value: true,
          isDestructive: true,
        ),
      ],
    );
    if (confirmed != true || !mounted) return;
    await _quietly(
      HostEventManageController.disableInviteLinkMutation.run(
        ref,
        (tx) => tx
            .get(hostEventManageActionsProvider)
            .disableInviteLink(event: event, link: invite),
      ),
    );
  }

  Future<void> _quietly(Future<Object?> command) =>
      command.then<void>((_) {}, onError: (Object _) {});
}
