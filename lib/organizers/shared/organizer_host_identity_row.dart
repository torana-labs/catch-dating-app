import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

String organizerMemberCountLabel(Organizer organizer) {
  final count = organizer.memberCount;
  if (count == 1) return '1 follower';
  if (count > 0) return '$count followers';
  return 'New organizer';
}

List<String> visibleOrganizerTags(
  Organizer organizer, {
  int? limit,
  bool excludeLocationTags = true,
}) {
  final locationNames = excludeLocationTags
      ? {
          organizer.location.toLowerCase(),
          cityLabel(organizer.location).toLowerCase(),
          organizer.area.toLowerCase(),
        }
      : const <String>{};
  final tags = organizer.tags
      .where((tag) {
        final normalized = tag.trim().toLowerCase();
        return normalized.isNotEmpty && !locationNames.contains(normalized);
      })
      .toList(growable: false);
  if (limit == null || tags.length <= limit) return tags;
  return tags.take(limit).toList(growable: false);
}

class OrganizerTagList extends StatelessWidget {
  const OrganizerTagList({
    super.key,
    required this.tags,
    this.tone = CatchBadgeTone.brand,
    this.size = CatchBadgeSize.sm,
  });

  final List<String> tags;
  final CatchBadgeTone tone;
  final CatchBadgeSize size;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: CatchSpacing.micro6,
      runSpacing: CatchSpacing.micro6,
      children: [
        for (final tag in tags) CatchBadge(label: tag, tone: tone, size: size),
      ],
    );
  }
}

class OrganizerHostIdentityRow extends StatelessWidget {
  const OrganizerHostIdentityRow({
    super.key,
    required this.hostName,
    this.hostAvatarUrl,
    this.eyebrow = 'HOSTED BY',
    this.avatarSize = 28,
    this.trailing,
  });

  final String hostName;
  final String? hostAvatarUrl;
  final String eyebrow;
  final double avatarSize;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Row(
      children: [
        CatchAvatar(name: hostName, imageUrl: hostAvatarUrl, size: avatarSize),
        gapW10,
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              CatchKickerText(label: eyebrow, color: t.ink3),
              gapH2,
              CatchText(
                hostName,
                maxLines: 1,

                variant: CatchTextVariant.statusLabel,
                color: t.ink,
              ),
            ],
          ),
        ),
        if (trailing != null) ...[gapW10, trailing!],
      ],
    );
  }
}
