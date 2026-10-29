import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_candidate_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_hype_avatar_row.g.dart';

class EventHypeAvatarQuery {
  const EventHypeAvatarQuery({required this.eventId, this.limit = 4});

  final String eventId;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EventHypeAvatarQuery &&
          runtimeType == other.runtimeType &&
          eventId == other.eventId &&
          limit == other.limit;

  @override
  int get hashCode => Object.hash(eventId, limit);
}

@riverpod
Future<List<CatchPersonAvatarItem>> eventHypeAvatars(
  Ref ref,
  EventHypeAvatarQuery query,
) async {
  final profiles = await ref.watch(
    swipeCandidatesProvider(query.eventId).future,
  );
  return profiles
      .take(query.limit)
      .map(
        (profile) => CatchPersonAvatarItem(
          name: profile.name,
          imageUrl: profile.primaryPhotoThumbnailUrl,
        ),
      )
      .toList(growable: false);
}

class EventHypeAvatarRow extends StatelessWidget {
  const EventHypeAvatarRow({
    super.key,
    required this.eventId,
    required this.totalCount,
    this.avatarItems,
    this.size = 32,
    this.limit = 4,
    this.obscured = true,
    this.showOverflowCount = false,
    this.activityKind = ActivityKind.openActivity,
  });

  final String eventId;
  final int totalCount;
  final List<CatchPersonAvatarItem>? avatarItems;
  final double size;
  final int limit;
  final bool obscured;
  final bool showOverflowCount;
  final ActivityKind activityKind;

  @override
  Widget build(BuildContext context) {
    if (totalCount <= 0) return const SizedBox.shrink();
    if (obscured) {
      return CatchAvatarRow(
        countLabelBuilder: catchAvatarCountLabelBuilder(context.l10n),
        items: const [],
        totalCount: totalCount,
        size: size,
        limit: limit,
        veiledCount: totalCount,
        veiledColors: ActivityPalette.resolve(
          context,
          activityKind,
        ).avatarColors,
        showOverflowCount: showOverflowCount,
      );
    }

    final items = avatarItems;
    final visibleItems = items == null || items.isEmpty
        ? _fallbackItems(eventId, totalCount, limit)
        : items;

    return CatchAvatarRow(
      countLabelBuilder: catchAvatarCountLabelBuilder(context.l10n),
      items: visibleItems,
      totalCount: totalCount,
      size: size,
      limit: limit,
      showOverflowCount: showOverflowCount,
    );
  }
}

List<CatchPersonAvatarItem> _fallbackItems(
  String eventId,
  int totalCount,
  int limit,
) {
  final count = totalCount.clamp(0, limit);
  return [
    for (var i = 0; i < count; i++)
      CatchPersonAvatarItem(name: '$eventId-hype-avatar-$i'),
  ];
}
