import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The longest invite link name the server takes.
const int hostEventInviteLabelLimit = 80;

/// Sharing a saved event: its link with Copy and Share and, for an
/// invite-only night, named invite links, one per place the host shares it,
/// each counting who opened and booked through it, with Copy and Turn off,
/// and a field to name a new one.
///
/// [link] is null while an invite-only night's private link is still read.
class HostEventShareBody extends StatelessWidget {
  const HostEventShareBody({
    super.key,
    required this.link,
    required this.inviteOnly,
    required this.onCopy,
    required this.onShare,
    this.inviteLinks,
    this.newLabel = '',
    this.labelController,
    this.onNewLabel,
    this.onCreate,
    this.onCopyInvite,
    this.onTurnOff,
    this.pending = false,
  });

  final String? link;

  /// The night is invite-only: the link is its private link, and named
  /// invite links show.
  final bool inviteOnly;
  final VoidCallback onCopy;
  final VoidCallback onShare;

  /// Named invite links, newest first; null while they are read.
  final List<EventInviteLink>? inviteLinks;
  final String newLabel;

  /// The new link's name field, which the screen clears after a create.
  final TextEditingController? labelController;
  final ValueChanged<String>? onNewLabel;
  final VoidCallback? onCreate;
  final ValueChanged<EventInviteLink>? onCopyInvite;
  final ValueChanged<EventInviteLink>? onTurnOff;

  /// An invite link command is on its way.
  final bool pending;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final link = this.link;
    final inviteLinks = this.inviteLinks;
    return CatchPageBody.screen(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [
          CatchSection(
            title: inviteOnly
                ? l10n.hostEventsShareInviteLinkTitle
                : l10n.hostEventsShareLinkTitle,
            kicker: inviteOnly
                ? l10n.hostEventsShareInviteLinkNote
                : l10n.hostEventsShareLinkNote,
            children: [
              if (link == null)
                const CatchLoadingIndicator()
              else
                CatchStack(
                  children: [
                    CatchText(
                      link,
                      key: const ValueKey<String>('host-event-share-link'),
                      tone: CatchTextTone.secondary,
                      maxLines: 2,
                    ),
                    CatchStack(
                      direction: CatchStackDirection.row,
                      gap: CatchStackGap.g8,
                      children: [
                        Expanded(
                          child: CatchButton(
                            key: const ValueKey<String>(
                              'host-event-share-copy',
                            ),
                            label: l10n.hostEventsShareCopy,
                            leading: CatchIcon(CatchIcons.copy),
                            fullWidth: true,
                            onPressed: onCopy,
                          ),
                        ),
                        Expanded(
                          child: CatchButton(
                            key: const ValueKey<String>(
                              'host-event-share-share',
                            ),
                            label: l10n.hostEventsShareShare,
                            variant: CatchButtonVariant.secondary,
                            leading: CatchIcon(CatchIcons.share),
                            fullWidth: true,
                            onPressed: onShare,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
            ],
          ),
          if (inviteOnly)
            CatchSection(
              title: l10n.hostEventsShareNamedTitle,
              kicker: l10n.hostEventsShareNamedNote,
              empty: inviteLinks == null
                  ? null
                  : l10n.hostEventsShareNamedEmpty,
              children: [
                if (inviteLinks == null)
                  const CatchLoadingIndicator()
                else
                  for (final invite in inviteLinks)
                    HostEventInviteLinkRow(
                      key: ValueKey<String>('host-event-invite-${invite.id}'),
                      invite: invite,
                      pending: pending,
                      onCopy: onCopyInvite,
                      onTurnOff: onTurnOff,
                    ),
              ],
            ),
          if (inviteOnly)
            CatchSection(
              children: [
                CatchField.input(
                  key: const ValueKey<String>('host-event-invite-new-label'),
                  copy: catchFieldCopy(l10n),
                  title: l10n.hostEventsShareNewLabel,
                  placeholder: l10n.hostEventsShareNewPlaceholder,
                  maxLength: hostEventInviteLabelLimit,
                  controller: labelController,
                  contractExemption:
                      'A name the host gives an invite link; the create '
                      'command validates it and stores no contact detail.',
                  onChanged: onNewLabel,
                ),
                CatchButton(
                  key: const ValueKey<String>('host-event-invite-create'),
                  label: l10n.hostEventsShareCreate,
                  variant: CatchButtonVariant.secondary,
                  leading: CatchIcon(CatchIcons.add),
                  fullWidth: true,
                  onPressed: pending || newLabel.trim().isEmpty
                      ? null
                      : onCreate,
                ),
              ],
            ),
        ],
      ),
    );
  }
}

/// One named invite link: its name, how many opened and booked through
/// it (or that it is turned off), and Copy and Turn off while it works.
class HostEventInviteLinkRow extends StatelessWidget {
  const HostEventInviteLinkRow({
    super.key,
    required this.invite,
    required this.pending,
    this.onCopy,
    this.onTurnOff,
  });

  final EventInviteLink invite;
  final bool pending;
  final ValueChanged<EventInviteLink>? onCopy;
  final ValueChanged<EventInviteLink>? onTurnOff;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final off = invite.isDisabled;
    return CatchIndexRow(
      title: invite.label,
      subtitle: off
          ? l10n.hostEventsShareNamedOff
          : l10n.hostEventsShareNamedCounts(
              opened: invite.openCount,
              booked: invite.confirmedCount,
            ),
      onTap: null,
      density: CatchIndexRowSize.roomy,
      trailing: off
          ? null
          : CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              children: [
                CatchButton(
                  key: ValueKey<String>('host-event-invite-copy-${invite.id}'),
                  label: l10n.hostEventsShareCopyShort,
                  size: CatchButtonSize.sm,
                  variant: CatchButtonVariant.secondary,
                  onPressed: pending || onCopy == null
                      ? null
                      : () => onCopy!(invite),
                ),
                CatchButton(
                  key: ValueKey<String>('host-event-invite-off-${invite.id}'),
                  label: l10n.hostEventsShareTurnOff,
                  size: CatchButtonSize.sm,
                  variant: CatchButtonVariant.secondary,
                  onPressed: pending || onTurnOff == null
                      ? null
                      : () => onTurnOff!(invite),
                ),
              ],
            ),
    );
  }
}
