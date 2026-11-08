import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One person on an organizer's team: their face, name and role badge, a
/// "You" line for the signed-in host, and a tap for what an owner can do.
class OrganizerTeamMemberRow extends StatelessWidget {
  const OrganizerTeamMemberRow({
    super.key,
    required this.host,
    required this.isYou,
    this.onTap,
  });

  final OrganizerHostProfile host;
  final bool isYou;

  /// Null leaves the row inert, as for anyone who is not the owner.
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final owner = host.role == OrganizerHostRole.owner;
    return CatchIndexRow(
      title: host.displayName,
      subtitle: isYou ? l10n.hostOrganizerTeamYou : null,
      leading: CatchAvatar.system(
        size: CatchAvatarSize.md,
        name: host.displayName,
        imageUrl: host.avatarUrl,
      ),
      badge: CatchIndexRowBadge(
        label: owner
            ? l10n.hostOrganizerTeamRoleOwner
            : l10n.hostOrganizerTeamRoleHost,
        tone: owner ? CatchBadgeTone.warning : CatchBadgeTone.success,
      ),
      density: CatchIndexRowSize.regular,
      chevron: onTap != null,
      onTap: onTap,
    );
  }
}
