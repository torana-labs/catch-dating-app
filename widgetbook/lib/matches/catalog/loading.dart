import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_list.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';
import 'scope.dart';

const _chatsListSkeletonPreviewHeight = 360.0;

@widgetbook.UseCase(
  name: 'Skeleton states',
  type: ChatsListSkeleton,
  path: '[P1 product surfaces]/Matches and chat/Components',
)
Widget chatsListSkeletonStates(BuildContext context) {
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'ChatsListSkeleton',
      contractId: 'component.messaging.chats_list_skeleton',
      children: const [
        WidgetbookPageStateCard(
          label: 'consumer loading',
          child: WidgetbookMatchesDeviceFrame(
            height: _chatsListSkeletonPreviewHeight,
            child: Scaffold(
              body: SafeArea(
                child: CustomScrollView(slivers: [ChatsListSkeleton()]),
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Skeleton states',
  type: ChatPersonRowSkeleton,
  path: '[P1 product surfaces]/Matches and chat/Components',
)
Widget chatPersonRowSkeletonStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ChatPersonRowSkeleton',
    contractId: 'component.messaging.chat_person_row_skeleton',
    children: const [
      WidgetbookPageStateCard(
        label: 'match row',
        child: ChatPersonRowSkeleton(divider: false, squareAvatar: false),
      ),
      WidgetbookPageStateCard(
        label: 'host inquiry row',
        child: ChatPersonRowSkeleton(divider: true, squareAvatar: true),
      ),
    ],
  );
}
