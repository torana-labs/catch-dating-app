import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_formatters.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef OrganizerHostProfileHandler = void Function(String hostUid);
typedef OrganizerHostMessageHandler =
    Future<void> Function(BuildContext context, OrganizerHostProfile host);

class OrganizerHostSection extends StatelessWidget {
  const OrganizerHostSection({
    super.key,
    required this.organizer,
    required this.canViewProfile,
    required this.isMessageHostPending,
    required this.messageableHostUids,
    required this.onViewProfile,
    required this.onMessageHost,
  });

  final Organizer organizer;
  final bool canViewProfile;
  final bool isMessageHostPending;
  final Set<String> messageableHostUids;
  final OrganizerHostProfileHandler? onViewProfile;
  final OrganizerHostMessageHandler? onMessageHost;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final hosts = organizer.displayHostProfiles;
    final activity = ActivityPalette.resolve(
      context,
      organizer.hostDefaults.primaryActivityKind,
    );
    final establishedLabel = organizerEstablishedLabel(organizer);

    return CatchSurface(
      borderRole: CatchBorderRole.separator,
      padding: CatchInsets.tileContentCompact,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final host in hosts) ...[
            Semantics(
              button: canViewProfile,
              label: canViewProfile
                  ? context.l10n
                        .organizersOrganizerHostSectionLabelViewDisplaynameProfile(
                          displayName: host.displayName,
                        )
                  : null,
              child: OrganizerHostRow(
                host: host,
                borderColor: t.primarySoft,
                ownerSealColor: activity.accent,
                establishedLabel: establishedLabel,
                onTap: canViewProfile
                    ? () => onViewProfile?.call(host.uid)
                    : null,
                onMessage:
                    messageableHostUids.contains(host.uid) &&
                        !isMessageHostPending &&
                        onMessageHost != null
                    ? () => unawaited(onMessageHost!(context, host))
                    : null,
              ),
            ),
            if (host != hosts.last) gapH12,
          ],
        ],
      ),
    );
  }
}

class OrganizerHostRow extends StatelessWidget {
  const OrganizerHostRow({
    super.key,
    required this.host,
    required this.borderColor,
    required this.ownerSealColor,
    required this.establishedLabel,
    required this.onTap,
    required this.onMessage,
  });

  final OrganizerHostProfile host;
  final Color borderColor;
  final Color ownerSealColor;
  final String establishedLabel;
  final VoidCallback? onTap;
  final VoidCallback? onMessage;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    final isOwner = host.role == OrganizerHostRole.owner;
    final role = isOwner
        ? context.l10n.organizersOrganizerHostRoleOwner
        : context.l10n.organizersOrganizerHostRoleHost;
    final meta = context.l10n.organizersOrganizerHostEstablishedMeta(
      role: role,
      established: establishedLabel,
    );

    final row = Row(
      children: [
        CatchAvatar(
          name: host.displayName,
          imageUrl: host.avatarUrl,
          size: CatchSpacing.s10,
          borderWidth: CatchStroke.avatarRing,
          borderColor: borderColor,
        ),
        gapW12,
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Flexible(
                    child: CatchText(
                      host.displayName,
                      variant: CatchTextVariant.sectionTitle,
                      color: CatchTokens.of(context).ink,
                      maxLines: 1,
                    ),
                  ),
                  if (isOwner) ...[
                    const SizedBox(width: CatchSpacing.micro6),
                    Icon(
                      CatchIcons.verified,
                      size: CatchIconSize.sm,
                      color: ownerSealColor,
                    ),
                  ],
                ],
              ),
              const SizedBox(height: CatchSpacing.s1),
              CatchMetadataText(meta, color: CatchTokens.of(context).ink2),
            ],
          ),
        ),
        if (onMessage != null) ...[
          gapW8,
          Tooltip(
            message:
                context.l10n.organizersOrganizerHostSectionMessageMessageHost,
            child: CatchIconAction(
              key: ValueKey<String>('club-host-message-${host.uid}'),
              onPressed: onMessage,
              child: Icon(
                CatchIcons.chat,
                size: CatchIconSize.control,
                color: t.primary,
              ),
            ),
          ),
        ],
        if (onTap != null) ...[
          gapW8,
          Icon(CatchIcons.disclosure, size: CatchIconSize.lg, color: t.ink3),
        ],
      ],
    );

    if (onTap == null) return row;
    return CatchSurface(
      duration: Duration.zero,
      tone: CatchSurfaceTone.transparent,
      radius: CatchRadius.none,
      onTap: onTap,
      child: row,
    );
  }
}
