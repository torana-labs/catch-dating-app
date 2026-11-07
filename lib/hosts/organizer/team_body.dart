import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/parts/organizer_host_row.dart';
import 'package:catch_dating_app/hosts/organizer/team_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// The team in board order: the people on it, Invite someone for the
/// owner, and what each role can do.
class TeamBody extends StatelessWidget {
  const TeamBody({
    super.key,
    required this.state,
    required this.onPhone,
    required this.onInvite,
    required this.onHost,
  });

  final TeamState state;
  final ValueChanged<String> onPhone;
  final VoidCallback onInvite;

  /// The owner tapped someone else on the team.
  final ValueChanged<OrganizerHostProfile> onHost;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final roles = [
      (l10n.hostOrganizerRoleCheckIn, l10n.hostOrganizerRoleOwnerAndHost),
      (l10n.hostOrganizerRoleLive, l10n.hostOrganizerRoleOwnerAndHost),
      (l10n.hostOrganizerRoleEvents, l10n.hostOrganizerRoleOwnerAndHost),
      (l10n.hostOrganizerRoleMoney, l10n.hostOrganizerTeamRoleOwner),
    ];
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        CatchSection(
          empty: l10n.hostOrganizerTeamEmpty,
          children: [
            for (final host in state.hosts)
              OrganizerHostRow(
                key: ValueKey<String>('team-host-${host.uid}'),
                host: host,
                isYou: host.uid == state.currentUid,
                onTap:
                    state.isOwner &&
                        host.uid != state.currentUid &&
                        !state.changing
                    ? () => onHost(host)
                    : null,
              ),
          ],
        ),
        if (state.isOwner)
          CatchSection(
            title: l10n.hostOrganizerInviteTitle,
            dividers: CatchSectionPlacement.none,
            children: [
              CatchStack(
                children: [
                  CatchField.input(
                    key: ValueKey<String>(
                      'team-invite-phone-${state.revision}',
                    ),
                    copy: catchFieldCopy(l10n),
                    title: l10n.hostOrganizerInvitePhone,
                    placeholder: l10n.hostOrganizerInvitePhonePlaceholder,
                    prefixText: state.dialCode,
                    keyboardType: TextInputType.phone,
                    initialValue: state.phone,
                    onChanged: onPhone,
                  ),
                  CatchText(
                    l10n.hostOrganizerInviteNote,
                    variant: CatchTextVariant.bodySmall,
                    tone: CatchTextTone.secondary,
                  ),
                  CatchButton(
                    key: const ValueKey<String>('team-invite-send'),
                    label: l10n.hostOrganizerInviteSend,
                    leading: CatchIcon(CatchIcons.addPerson),
                    fullWidth: true,
                    status: state.inviting
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                    onPressed: state.canInvite ? onInvite : null,
                  ),
                ],
              ),
            ],
          ),
        CatchSection(
          title: l10n.hostOrganizerRolesTitle,
          children: [
            for (final (title, who) in roles)
              CatchIndexRow(
                title: title,
                value: who,
                density: CatchIndexRowSize.compact,
                onTap: null,
              ),
          ],
        ),
        CatchText(
          l10n.hostOrganizerRolesNote,
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
      ],
    );
  }
}
