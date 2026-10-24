import 'dart:async';

import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_detail_formatters.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef ClubHostProfileHandler = void Function(String hostUid);
typedef ClubHostMessageHandler =
    Future<void> Function(BuildContext context, ClubHostProfile host);

class ClubHostSection extends StatelessWidget {
  const ClubHostSection({
    super.key,
    required this.club,
    required this.canViewProfile,
    required this.isMessageHostPending,
    required this.messageableHostUids,
    required this.onViewProfile,
    required this.onMessageHost,
  });

  final Club club;
  final bool canViewProfile;
  final bool isMessageHostPending;
  final Set<String> messageableHostUids;
  final ClubHostProfileHandler? onViewProfile;
  final ClubHostMessageHandler? onMessageHost;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final hosts = club.displayHostProfiles;
    final activity = ActivityPalette.resolve(
      context,
      club.hostDefaults.primaryActivityKind,
    );
    final establishedLabel = clubEstablishedLabel(club);

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
                        .clubsClubHostSectionLabelViewDisplaynameProfile(
                          displayName: host.displayName,
                        )
                  : null,
              child: ClubHostRow(
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

class ClubHostRow extends StatelessWidget {
  const ClubHostRow({
    super.key,
    required this.host,
    required this.borderColor,
    required this.ownerSealColor,
    required this.establishedLabel,
    required this.onTap,
    required this.onMessage,
  });

  final ClubHostProfile host;
  final Color borderColor;
  final Color ownerSealColor;
  final String establishedLabel;
  final VoidCallback? onTap;
  final VoidCallback? onMessage;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    final isOwner = host.role == ClubHostRole.owner;
    final role = isOwner
        ? context.l10n.clubsClubHostRoleOwner
        : context.l10n.clubsClubHostRoleHost;
    final meta = context.l10n.clubsClubHostEstablishedMeta(
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
                      CatchIcons.sealCheck,
                      size: CatchIcon.sm,
                      color: ownerSealColor,
                    ),
                  ],
                ],
              ),
              const SizedBox(height: CatchSpacing.s1),
              Text(
                meta,
                style: CatchTextStyles.monoLabel(context),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        if (onMessage != null) ...[
          gapW8,
          Tooltip(
            message: context.l10n.clubsClubHostSectionMessageMessageHost,
            child: CatchIconAction(
              key: ValueKey<String>('club-host-message-${host.uid}'),
              onPressed: onMessage,
              child: Icon(
                CatchIcons.chatBubbleOutlineRounded,
                size: CatchIcon.control,
                color: t.primary,
              ),
            ),
          ),
        ],
        if (onTap != null) ...[
          gapW8,
          Icon(
            CatchIcons.chevronRightRounded,
            size: CatchIcon.lg,
            color: t.ink3,
          ),
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
