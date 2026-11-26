import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The host own professional profile as guests see it: the photo, name,
/// role, status and bio, and the organizers they host with their role in
/// each. It reads nothing; Settings passes the profile and organizers.
class HostProfilePreviewSheet extends StatelessWidget {
  const HostProfilePreviewSheet({
    super.key,
    required this.profile,
    required this.organizers,
  });

  final HostProfile profile;
  final List<Organizer> organizers;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final role = profile.roleTitle?.trim();
    final bio = profile.bio?.trim();
    final hosted = [
      for (final organizer in organizers)
        if (organizer.isHostedBy(profile.uid)) organizer,
    ];
    return CatchSheet.standard(
      title: l10n.hostsHostOrganizerTeamScreenLabelPreview,
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchStack(
            gap: CatchStackGap.g8,
            align: CatchStackAlign.center,
            children: [
              CatchAvatar.system(
                size: CatchAvatarSize.xl,
                name: profile.displayName,
                imageUrl: profile.avatarUrl,
              ),
              CatchText(
                profile.displayName,
                variant: CatchTextVariant.displaySm,
                align: TextAlign.center,
              ),
              if (role != null && role.isNotEmpty)
                CatchText(
                  role,
                  variant: CatchTextVariant.bodySmall,
                  tone: CatchTextTone.secondary,
                  align: TextAlign.center,
                ),
              CatchBadge.functional(
                label: hostProfileStatusLabel(profile.status, l10n),
                tone: profile.isActive
                    ? CatchBadgeTone.success
                    : CatchBadgeTone.neutral,
              ),
            ],
          ),
          if (bio != null && bio.isNotEmpty) CatchText(bio),
          CatchSection(
            title: l10n.hostsHostOrganizerTeamScreenTitleOrganizersYouHost,
            children: [
              for (final organizer in hosted)
                CatchIndexRow(
                  key: ValueKey<String>('profile-preview-${organizer.id}'),
                  title: organizer.name,
                  value: organizer.isOwnedBy(profile.uid)
                      ? l10n.organizersOrganizerHostRoleOwner
                      : l10n.organizersOrganizerHostRoleHost,
                  density: CatchIndexRowSize.regular,
                  onTap: null,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// The label for a host profile status.
String hostProfileStatusLabel(
  HostProfileStatus status,
  AppLocalizations l10n,
) => switch (status) {
  HostProfileStatus.active => l10n.hostsProfileStatusActive,
  HostProfileStatus.pending => l10n.hostsProfileStatusPending,
  HostProfileStatus.suspended => l10n.hostsProfileStatusSuspended,
};
