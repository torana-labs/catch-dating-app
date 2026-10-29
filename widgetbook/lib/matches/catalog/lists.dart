import 'package:catch_dating_app/chats/presentation/inbox/chats_list_screen_state.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chat_conversations_list.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_empty_state.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_list.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_list_body.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Sliver states',
  type: ChatsList,
  path: '[P1 product surfaces]/Matches and chat/Components',
)
Widget chatsListSliverStates(BuildContext context) {
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'ChatsList',
      contractId: 'component.messaging.chats_list',
      children: [
        WidgetbookPageStateCard(
          label: 'loaded sliver',
          child: WidgetbookMatchesDeviceFrame(
            height: WidgetbookPreviewLayout.feedbackViewportHeight,
            child: WidgetbookMatchesMatchesListRouteScope(
              viewModel: AsyncData<ChatsListViewModel>(
                widgetbookMatchesConsumerViewModel(),
              ),
              matches: widgetbookMatchesConsumerMatches,
              child: Scaffold(
                body: SafeArea(
                  child: CustomScrollView(
                    slivers: [
                      ChatsList(
                        displayState: ChatsListContent(
                          viewModel: widgetbookMatchesConsumerViewModel(),
                        ),
                        onThreadSelected: (_) {},
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'loading skeleton',
          child: WidgetbookMatchesDeviceFrame(
            height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
            child: WidgetbookMatchesMatchesListRouteScope(
              viewModel: const AsyncLoading<ChatsListViewModel>(),
              matches: widgetbookMatchesConsumerMatches,
              child: const Scaffold(
                body: SafeArea(
                  child: CustomScrollView(
                    slivers: [ChatsList(displayState: ChatsListLoading())],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Body states',
  type: ChatsListBody,
  path: '[P1 product surfaces]/Matches and chat/Components',
)
Widget chatsListBodyStates(BuildContext context) {
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'ChatsListBody',
      contractId: 'component.messaging.chats_list_body',
      children: [
        WidgetbookPageStateCard(
          label: 'consumer conversations',
          child: WidgetbookMatchesChatSliverFrame(
            slivers: [
              ChatsListBody(
                viewModel: widgetbookMatchesConsumerViewModel(),
                onThreadSelected: (_) {},
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Sliver states',
  type: ChatConversationsList,
  path: '[P1 product surfaces]/Matches and chat/Components',
)
Widget chatConversationsListStates(BuildContext context) {
  final viewModel = widgetbookMatchesConsumerViewModel();
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'ChatConversationsList',
      contractId: 'component.messaging.chat_conversations_list',
      children: [
        WidgetbookPageStateCard(
          label: 'contiguous rows',
          child: WidgetbookMatchesChatSliverFrame(
            height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
            slivers: [
              ChatConversationsList(
                matches: [...viewModel.newMatches, ...viewModel.conversations],
                onThreadSelected: (_) {},
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Empty states',
  type: ChatsEmptyState,
  path: '[P1 product surfaces]/Matches and chat/Components',
)
Widget chatsEmptyStateVariants(BuildContext context) {
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'ChatsEmptyState',
      contractId: 'component.messaging.chats_empty_state',
      children: const [
        WidgetbookPageStateCard(
          label: 'no catches',
          child: WidgetbookMatchesPrimitiveReviewFrame(
            height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
            child: ChatsEmptyState(),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'host inbox empty',
          child: WidgetbookMatchesPrimitiveReviewFrame(
            height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
            child: ChatsEmptyState.hostInbox(),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'search empty',
          child: WidgetbookMatchesPrimitiveReviewFrame(
            height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
            child: ChatsEmptyState.noSearchResults(),
          ),
        ),
      ],
    ),
  );
}
