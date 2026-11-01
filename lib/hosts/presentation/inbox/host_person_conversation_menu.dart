import 'package:catch_dating_app/chats/chats.dart';
import 'package:catch_dating_app/contexts/safety/parts/block_user_dialog.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum _PersonAction { share, report, block }

/// Keeps the existing Catch conversation actions available in the shared pane.
/// The parent supplies only a currently authorized source and its messages.
class HostPersonConversationMenu extends ConsumerStatefulWidget {
  const HostPersonConversationMenu({
    super.key,
    required this.matchId,
    required this.currentUid,
    required this.personUid,
    required this.name,
    required this.messages,
    required this.onBlocked,
  });
  final String matchId;
  final String currentUid;
  final String personUid;
  final String name;
  final List<ChatMessage> messages;
  final VoidCallback? onBlocked;
  @override
  ConsumerState<HostPersonConversationMenu> createState() =>
      _HostPersonConversationMenuState();
}

class _HostPersonConversationMenuState
    extends ConsumerState<HostPersonConversationMenu> {
  bool _busy = false;
  @override
  Widget build(BuildContext context) => CatchActionMenu<_PersonAction>(
    tooltip: context.l10n.chatsChatScreenTooltipChatActions,
    onSelected: _busy ? null : _act,
    items: [
      if (hasShareableChatMessages(widget.messages))
        CatchActionMenuItem(
          value: _PersonAction.share,
          label: context.l10n.chatsChatScreenLabelShareCard,
          icon: CatchIcons.platformShare(platform: Theme.of(context).platform),
        ),
      CatchActionMenuItem(
        value: _PersonAction.report,
        label: context.l10n.chatsChatScreenLabelReport,
        icon: CatchIcons.flag,
      ),
      CatchActionMenuItem(
        value: _PersonAction.block,
        label: context.l10n.chatsChatScreenLabelBlock,
        icon: CatchIcons.block,
        isDestructive: true,
      ),
    ],
  );

  Future<void> _act(_PersonAction action) async {
    if (_busy) return;
    final matchId = widget.matchId;
    final personUid = widget.personUid;
    if (action == _PersonAction.share) {
      await showChatShareCardSheet(
        context,
        messages: widget.messages,
        currentUid: widget.currentUid,
        event: null,
        share: ref.read(externalShareControllerProvider),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      if (action == _PersonAction.block) {
        if (await showBlockUserDialog(context: context, name: widget.name) !=
                true ||
            !mounted) {
          return;
        }
        // provider-graph: ownership-widget-async:_HostPersonConversationMenuState._act:await:chatControllerProvider.blockUser watch CAT156 -- Existing bounded review signal at _HostPersonConversationMenuState._act (await:chatControllerProvider.blockUser). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
        await ref
            .read(chatControllerProvider.notifier)
            .blockUser(targetUserId: personUid);
        if (mounted) widget.onBlocked?.call();
      } else {
        // provider-graph: ownership-widget-async:_HostPersonConversationMenuState._act:await:chatControllerProvider.reportUser watch CAT156 -- Existing bounded review signal at _HostPersonConversationMenuState._act (await:chatControllerProvider.reportUser). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
        await ref
            .read(chatControllerProvider.notifier)
            .reportUser(targetUserId: personUid, matchId: matchId);
        if (mounted) {
          showCatchNotice(
            context,
            context
                .l10n
                .publicProfilePublicProfileScreenVisiblecopyReportSubmitted,
          );
        }
      }
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.chat,
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}
