import 'package:catch_dating_app/chats/presentation/widgets/chat_share_card.dart';
import 'package:catch_dating_app/design_fixtures/matches_chat_surface_fixtures.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_external_share_sheet.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Sheet states',
  type: CatchExternalShareSheet,
  path: '[P1 product surfaces]/Matches and chat/Components',
)
Widget chatShareCardSheetStates(BuildContext context) {
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'CatchShareCardSheet',
      contractId: 'sheet.messaging.chat_share_card',
      children: [
        WidgetbookPageStateCard(
          label: 'export preview',
          child: WidgetbookMatchesDeviceFrame(
            height: WidgetbookPreviewLayout.celebrationViewportHeight,
            child: WidgetbookMatchesShareCardPreview(
              messages: MatchesChatSurfaceFixtures.conversationMessages,
              event: widgetbookMatchesEvent,
            ),
          ),
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Card states',
  type: ChatShareCard,
  path: '[P1 product surfaces]/Matches and chat/Components',
)
Widget chatShareCardStates(BuildContext context) {
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'ChatShareCard',
      contractId: 'component.messaging.chat_share_card',
      children: [
        WidgetbookPageStateCard(
          label: 'event conversation card',
          child: WidgetbookMatchesPrimitiveReviewFrame(
            height: WidgetbookPreviewLayout.catchesSkeletonPreviewHeight,
            child: Padding(
              padding: CatchInsets.content,
              child: ChatShareCard(
                messages: MatchesChatSurfaceFixtures.conversationMessages,
                currentUid: MatchesChatSurfaceFixtures.viewerUid,
                event: widgetbookMatchesEvent,
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Share card header',
  type: ShareCardHeader,
  path: '[P1 product surfaces]/Matches and chat/Components',
)
Widget chatShareCardHeaderState(BuildContext context) {
  final t = CatchTokens.of(context);

  return Padding(
    padding: CatchInsets.content,
    child: ShareCardHeader(
      event: widgetbookMatchesEvent,
      accent: t.primary,
      visual: null,
    ),
  );
}

@widgetbook.UseCase(
  name: 'Share card bubbles',
  type: ShareCardBubble,
  path: '[P1 product surfaces]/Matches and chat/Components',
)
Widget chatShareCardBubbleStates(BuildContext context) {
  return const Padding(
    padding: CatchInsets.content,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        ShareCardBubble(
          text: 'That was weirdly easy to say yes to.',
          isMe: false,
          isFirstInGroup: true,
          isLastInGroup: false,
        ),
        ShareCardBubble(
          text: 'Same. Coffee after?',
          isMe: true,
          isFirstInGroup: true,
          isLastInGroup: true,
        ),
      ],
    ),
  );
}
