import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class OrganizerPostsHomeSection extends ConsumerWidget {
  const OrganizerPostsHomeSection({
    super.key,
    required this.notifications,
    required this.onOpenPost,
  });

  final List<ActivityNotification> notifications;
  final ValueChanged<ActivityNotification> onOpenPost;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (notifications.isEmpty) return const SizedBox.shrink();

    final organizerIds = notifications
        .map(_organizerIdFor)
        .whereType<String>()
        .toSet()
        .toList(growable: false);
    final organizersAsync = ref.watch(
      watchOrganizersByIdsProvider(OrganizersByIdQuery(organizerIds)),
    );
    final organizersState = catchAsyncStateFromAsyncValue(organizersAsync);
    final organizersById = {
      for (final organizer in organizersState.value ?? const <Organizer>[])
        organizer.id: organizer,
    };

    return CatchSection.fieldRows(
      title:
          context.l10n.dashboardOrganizerPostsHomeSectionTitleOrganizerUpdates,
      children: [
        for (final entry in notifications.indexed)
          OrganizerPostHomeCard(
            notification: entry.$2,
            organizer: organizersById[_organizerIdFor(entry.$2)],
            onTap: () => onOpenPost(entry.$2),
          ),
      ],
    );
  }

  String? _organizerIdFor(ActivityNotification notification) =>
      notification.organizerId ?? notification.clubId;
}

class OrganizerPostHomeCard extends StatelessWidget {
  const OrganizerPostHomeCard({
    super.key,
    required this.notification,
    required this.organizer,
    required this.onTap,
  });

  final ActivityNotification notification;
  final Organizer? organizer;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final organizerName =
        organizer?.name ?? notification.actorName ?? notification.title;
    final hasEventLink = notification.eventId != null;

    return CatchSurface(
      padding: CatchInsets.contentVerticalMedium,
      backgroundColor: Colors.transparent,
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchAvatar(
            size: CatchLayout.avatarRowExtent,
            name: organizerName,
            imageUrl: organizer?.logoPhotoUrl,
            variant: CatchAvatarVariant.square,
          ),
          gapW12,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchMetadataText(organizerName.toUpperCase(), color: t.ink3),
                gapH4,
                CatchText(
                  notification.body,
                  variant: CatchTextVariant.bodyLead,
                  color: CatchTokens.of(context).ink,
                  maxLines: 3,
                ),
                if (hasEventLink) ...[
                  gapH8,
                  Row(
                    children: [
                      Icon(
                        CatchIcons.event,
                        size: CatchIconSize.sm,
                        color: t.ink2,
                      ),
                      gapW6,
                      Expanded(
                        child: CatchText(
                          context
                              .l10n
                              .dashboardOrganizerPostsHomeSectionTextLinkedEvent,
                          maxLines: 1,

                          variant: CatchTextVariant.supporting,
                          color: t.ink2,
                        ),
                      ),
                      Icon(
                        CatchIcons.disclosure,
                        size: CatchIconSize.sm,
                        color: t.ink3,
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
