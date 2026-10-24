import 'dart:async';
import 'package:catch_dating_app/chats/domain/event_chat_directory.dart';
import 'package:catch_dating_app/chats/presentation/inbox/event_chat_directory_controller.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class EventChatDirectorySection extends ConsumerWidget {
  const EventChatDirectorySection({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      CatchAsyncBoundary<EventChatDirectoryPage>.sliver(
        value: ref.watch(eventChatDirectoryControllerProvider),
        retainDataOn: const {},
        onRetry: () => unawaited(
          ref.read(eventChatDirectoryControllerProvider.notifier).refresh(),
        ),
        builder: (context, page) => EventChatDirectoryRowList(
          page: page,
          onLoadMore: () => unawaited(
            ref.read(eventChatDirectoryControllerProvider.notifier).loadMore(),
          ),
          onSelected: (eventId) async {
            await context.pushNamed(
              Routes.eventChatScreen.name,
              pathParameters: {'eventId': eventId},
            );
            if (context.mounted) {
              unawaited(
                ref
                    .read(eventChatDirectoryControllerProvider.notifier)
                    .refresh(),
              );
            }
          },
        ),
      );
}

/// Sliver directory of currently admitted events, including rooms not open yet.
class EventChatDirectoryRowList extends StatelessWidget {
  const EventChatDirectoryRowList({
    super.key,
    required this.page,
    required this.onLoadMore,
    required this.onSelected,
  });
  final EventChatDirectoryPage page;
  final VoidCallback onLoadMore;
  final ValueChanged<String> onSelected;
  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return SliverPadding(
      padding: CatchInsets.pageHorizontal,
      sliver: SliverList.list(
        children: [
          gapH24,
          if (page.items.isEmpty) ...[
            CatchText(
              l.eventChatsEmptyTitle,
              variant: CatchTextVariant.sectionTitle,
            ),
            gapH8,
            CatchText(
              l.eventChatsEmptyBody,
              variant: CatchTextVariant.bodyL,
              color: CatchTokens.of(context).ink,
            ),
            gapH24,
          ],
          for (final room in page.items)
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
                  icon: CatchIcons.chatBubbleOutlineRounded,
                  titleMaxLines: 3,
                  bodyMaxLines: 3,
                  onTap: () => onSelected(room.eventId),
                ),
              ],
            ),
          if (page.nextCursor != null) ...[
            gapH16,
            CatchButton(
              label: l.eventChatsLoadMore,
              variant: CatchButtonVariant.secondary,
              fullWidth: true,
              onPressed: onLoadMore,
            ),
          ],
          gapH24,
        ],
      ),
    );
  }
}
