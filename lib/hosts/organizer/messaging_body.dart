import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/hosts/organizer/messaging_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// WhatsApp Business settings in order: why the organizer brings their own
/// sender, then either Connect WhatsApp Business, or the connected sender
/// (name, number, status), its message templates, Sync templates and
/// Disconnect, and, until the sender is active, the verification message.
/// Where this client cannot manage a sender, nothing is offered.
class OrganizerMessagingBody extends StatelessWidget {
  const OrganizerMessagingBody({
    super.key,
    required this.state,
    required this.testPhone,
    required this.onAction,
  });

  final OrganizerMessagingState state;

  /// The verification message's recipient.
  final TextEditingController testPhone;
  final ValueChanged<OrganizerMessagingAction> onAction;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final setup = state.setup;
    final connection = state.connection;
    final busy = state.busy;
    final Widget content;
    if (setup == null && state.error != null) {
      content = CatchErrorState(
        title: l10n.hostsHostAudienceWhatsappSender,
        message: l10n.hostPeopleMessagesErrorBody,
        retryLabel: l10n.hostOrganizerRetry,
        onRetry: () => onAction(OrganizerMessagingAction.retry),
        mode: CatchErrorStateMode.inline,
      );
    } else if (setup == null) {
      content = const CatchLoadingIndicator();
    } else if (!state.canManage) {
      // As before, nothing is offered where the sender cannot be managed.
      return const SizedBox.shrink();
    } else if (connection == null) {
      content = CatchButton(
        key: const ValueKey<String>('organizer-messaging-connect'),
        label: l10n.hostsHostAudienceConnectWhatsapp,
        status: busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
        onPressed: busy
            ? null
            : () => onAction(OrganizerMessagingAction.connect),
      );
    } else {
      content = CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchSection(
            children: [
              CatchIndexRow(
                key: const ValueKey<String>('organizer-messaging-sender'),
                title:
                    connection.verifiedName ??
                    l10n.hostsHostAudienceWhatsappSender,
                subtitle: connection.displayPhoneNumber,
                value: organizerMessagingStatusLabel(l10n, connection),
                icon: CatchIcons.chat,
                onTap: null,
              ),
              CatchIndexRow(
                key: const ValueKey<String>('organizer-messaging-templates'),
                title: l10n.hostsHostAudienceTemplates,
                subtitle: l10n.hostsHostAudienceApprovedTemplates(
                  count: setup.approvedTemplates.length,
                ),
                value: connection.templateSyncStatus,
                onTap: null,
              ),
            ],
          ),
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g8,
            wrap: true,
            children: [
              CatchButton(
                key: const ValueKey<String>('organizer-messaging-sync'),
                label: l10n.hostsHostAudienceSyncTemplates,
                variant: CatchButtonVariant.secondary,
                size: CatchButtonSize.md,
                status: busy
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                onPressed: busy
                    ? null
                    : () => onAction(OrganizerMessagingAction.syncTemplates),
              ),
              CatchButton(
                key: const ValueKey<String>('organizer-messaging-disconnect'),
                label: l10n.hostsHostAudienceDisconnect,
                variant: CatchButtonVariant.quiet,
                size: CatchButtonSize.md,
                onPressed: busy
                    ? null
                    : () => onAction(OrganizerMessagingAction.disconnect),
              ),
            ],
          ),
          if (state.canSendTest)
            CatchStack(
              gap: CatchStackGap.g8,
              children: [
                CatchFieldLanes.single(
                  child: CatchField.input(
                    key: const ValueKey<String>('organizer-messaging-phone'),
                    copy: catchFieldCopy(l10n),
                    title: l10n.hostsHostAudienceTestPhone,
                    contract: CatchContractConstraints
                        .sendOrganizerWhatsappTestCallablePayloadToE164,
                    controller: testPhone,
                    keyboardType: TextInputType.phone,
                    placeholder: '+919876543210',
                    helperText: l10n.hostsHostAudienceTestPhoneHelp,
                    states: {if (busy) WidgetState.disabled},
                  ),
                ),
                CatchButton(
                  key: const ValueKey<String>('organizer-messaging-test'),
                  label: l10n.hostsHostAudienceSendTest,
                  status: busy
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                  onPressed: busy
                      ? null
                      : () => onAction(OrganizerMessagingAction.sendTest),
                ),
              ],
            ),
        ],
      );
    }
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        CatchText(
          l10n.hostsHostAudienceWhatsappSender,
          variant: CatchTextVariant.titleRow,
        ),
        CatchText(
          l10n.hostsHostAudienceWhatsappOwnedSender,
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
        content,
      ],
    );
  }
}

/// The sender's status: active, testing, degraded, needs attention, or the
/// server's own word for anything newer.
String organizerMessagingStatusLabel(
  AppLocalizations l10n,
  HostWhatsappConnection connection,
) => switch (connection.status) {
  'active' => l10n.hostsHostAudienceSenderActive,
  'testing' => l10n.hostsHostAudienceSenderTesting,
  'degraded' => l10n.hostsHostAudienceSenderDegraded,
  'blocked' || 'tokenRevoked' => l10n.hostsHostAudienceSenderNeedsAttention,
  _ => connection.status,
};
