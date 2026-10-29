import 'package:catch_dating_app/chats/presentation/inbox/chats_list_celebration_controller.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_screen_state.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/chats/presentation/inbox/host_inbox_filter.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chat_conversations_list.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_empty_state.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_list_body.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ChatsList extends ConsumerWidget {
  const ChatsList({
    super.key,
    this.hostFilter,
    this.displayState,
    this.onThreadSelected,
  });

  final HostInboxFilter? hostFilter;
  final ChatsListDisplayState? displayState;
  final ChatThreadSelectedCallback? onThreadSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uidAsync = ref.watch(uidProvider);
    final uid = _catchAsyncState(uidAsync).value;
    final query = ref.watch(chatSearchQueryProvider).trim();

    if (uid != null) {
      ref.listen(watchMatchesForUserProvider(uid), (previous, next) {
        const ChatsListCelebrationController().showNewMatchCelebrations(
          context: context,
          uid: uid,
          previous: previous,
          next: next,
          isHostApp: AppConfig.appRole.isHost,
        );
      });
    }

    final effectiveState =
        displayState ??
        ChatsListDisplayState.fromAsync(
          viewModel: _catchAsyncState(ref.watch(chatsListViewModelProvider)),
          uid: uid,
          query: query,
          hostFilter: hostFilter,
        );

    return switch (effectiveState) {
      ChatsListLoading() => const ChatsListSkeleton(),
      ChatsListError(:final error, :final retryIntent) =>
        CatchLocalizedSliverErrorState(
          error,
          context: AppErrorContext.chat,
          onRetry: () {
            switch (retryIntent) {
              case ChatsListRetryIntent.reloadViewModel:
                ref.invalidate(chatsListViewModelProvider);
            }
          },
        ),
      ChatsListContent(:final viewModel) => ChatsListBody(
        viewModel: viewModel,
        onThreadSelected: onThreadSelected ?? (_) {},
      ),
      ChatsListEmpty(:final kind) => CatchStateViewport.sliver(
        child: switch (kind) {
          ChatsListEmptyKind.noSearchResults =>
            const ChatsEmptyState.noSearchResults(),
          ChatsListEmptyKind.noHostSearchResults =>
            const ChatsEmptyState.noHostSearchResults(),
          ChatsListEmptyKind.noUnreadQueries =>
            const ChatsEmptyState.noUnreadQueries(),
          ChatsListEmptyKind.noThreads =>
            AppConfig.appRole.isHost
                ? const ChatsEmptyState.hostInbox()
                : const ChatsEmptyState(),
        },
      ),
    };
  }
}

CatchAsyncState<T> _catchAsyncState<T>(AsyncValue<T> value) {
  return catchAsyncStateFromAsyncValue(value);
}

class ChatsListSkeleton extends StatelessWidget {
  const ChatsListSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SliverMainAxisGroup(
      slivers: [
        SliverPadding(
          padding: CatchInsets.chatListGutter,
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) => ChatPersonRowSkeleton(
                divider: index > 0,
                squareAvatar: AppConfig.appRole.isHost,
              ),
              childCount: 5,
            ),
          ),
        ),
      ],
    );
  }
}

class ChatPersonRowSkeleton extends StatelessWidget {
  const ChatPersonRowSkeleton({
    super.key,
    required this.divider,
    required this.squareAvatar,
  });

  final bool divider;
  final bool squareAvatar;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        if (divider)
          const Positioned(
            top: 0,
            left: CatchLayout.chatListDividerInset,
            right: 0,
            child: CatchDivider(),
          ),
        Padding(
          padding: CatchInsets.chatListTileVertical,
          child: Row(
            children: [
              squareAvatar
                  ? CatchSkeleton.box(
                      width: CatchLayout.chatListAvatarExtent,
                      height: CatchLayout.chatListAvatarExtent,
                      radius: CatchRadius.md,
                    )
                  : CatchSkeleton.circle(
                      size: CatchLayout.chatListAvatarExtent,
                    ),
              const SizedBox(width: CatchLayout.chatListTextGap),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CatchSkeleton.text(
                      width: CatchLayout.skeletonTextTitleWidth,
                    ),
                    const SizedBox(height: CatchSpacing.micro6),
                    CatchSkeleton.text(),
                  ],
                ),
              ),
              const SizedBox(width: CatchLayout.chatListTextGap),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  CatchSkeleton.text(width: CatchLayout.skeletonTextTimeWidth),
                  const SizedBox(height: CatchSpacing.micro6),
                  CatchSkeleton.box(
                    width: CatchLayout.chatUnreadPillWidth,
                    height: CatchSpacing.s4,
                    radius: CatchRadius.pill,
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
