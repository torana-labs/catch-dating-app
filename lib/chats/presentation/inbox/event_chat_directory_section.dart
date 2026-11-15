import 'dart:async';

import 'package:catch_dating_app/chats/presentation/inbox/event_chat_directory_controller.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class EventChatDirectorySection extends ConsumerWidget {
  const EventChatDirectorySection({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      CatchAsyncBoundary<List<EventChatAccess>>.sliver(
        value: ref.watch(eventChatDirectoryProvider),
        retainDataOn: const {},
        onRetry: () => ref.invalidate(eventChatDirectoryProvider),
        builder: (context, rooms) => EventChatDirectoryRowList(
          rooms: rooms,
          onSelected: (eventId) => unawaited(
            context.pushNamed(
              Routes.eventChatScreen.name,
              pathParameters: {'eventId': eventId},
            ),
          ),
        ),
      );
}

/// Sliver directory of currently admitted events, including rooms not open yet.
class EventChatDirectoryRowList extends StatelessWidget {
  const EventChatDirectoryRowList({
    super.key,
    required this.rooms,
    required this.onSelected,
  });
  final List<EventChatAccess> rooms;
  final ValueChanged<String> onSelected;
  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return SliverPadding(
      padding: CatchInsets.pageHorizontal,
      sliver: SliverList.list(
        children: [
          gapH24,
          if (rooms.isEmpty) ...[
            CatchLegacyText(
              l.eventChatsEmptyTitle,
              variant: CatchLegacyTextVariant.sectionTitle,
            ),
            gapH8,
            CatchLegacyText(
              l.eventChatsEmptyBody,
              variant: CatchLegacyTextVariant.bodyL,
              color: CatchTokens.of(context).ink,
            ),
            gapH24,
          ],
          for (final room in rooms)
            CatchSection.fieldRows(
              first: true,
              children: [
                CatchField.action(
                  key: ValueKey('event-chat-${room.eventId}'),
                  copy: catchFieldCopy(l),
                  title: room.title,
                  body: !room.isRoomOpen
                      ? l.eventChatsWaiting
                      : room.profileClaimRequired
                      ? l.eventChatsReviewProfile
                      : room.hasJoined
                      ? l.eventChatsJoined
                      : l.eventChatsReady,
                  emphasis: CatchFieldEmphasis.title,
                  icon: CatchIcons.chat,
                  titleMaxLines: 3,
                  bodyMaxLines: 3,
                  onTap: () => onSelected(room.eventId),
                ),
              ],
            ),
          gapH24,
        ],
      ),
    );
  }
}
