import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/design_fixtures/matches_chat_surface_fixtures.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

Widget catchPersonRowChatPreviewPrimitiveStates(BuildContext context) {
  final readMatch = widgetbookMatchesTaylorMatch.copyWith(
    unreadCounts: const {},
  );
  final longCopyMatch = MatchesChatSurfaceFixtures.activeConversationMatch(
    id: 'design-match-long-copy',
    preview:
        'I checked with the host and the post-run coffee table can fit everyone if we arrive together.',
    lastMessageAt: MatchesChatSurfaceFixtures.now.subtract(
      const Duration(minutes: 9),
    ),
  );

  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'CatchPersonRow chat previews',
      contractId: 'primitive.messaging.person_row_chat_preview',
      children: [
        WidgetbookPageStateCard(
          label: 'default read conversation',
          child: _CatchPersonRowChatPreviewFrame(
            preview: widgetbookMatchesThreadPreviewFor(
              match: readMatch,
              uid: MatchesChatSurfaceFixtures.viewerUid,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'unread active conversation',
          child: _CatchPersonRowChatPreviewFrame(
            preview: widgetbookMatchesThreadPreviewFor(
              match: widgetbookMatchesTaylorMatch,
              uid: MatchesChatSurfaceFixtures.viewerUid,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'new match indicator',
          child: _CatchPersonRowChatPreviewFrame(
            preview: widgetbookMatchesThreadPreviewFor(
              match: MatchesChatSurfaceFixtures.newMatch(),
              uid: MatchesChatSurfaceFixtures.viewerUid,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'own latest message',
          child: _CatchPersonRowChatPreviewFrame(
            preview: widgetbookMatchesThreadPreviewFor(
              match: MatchesChatSurfaceFixtures.ownLatestMessageMatch(),
              uid: MatchesChatSurfaceFixtures.viewerUid,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'host inquiry unread',
          child: _CatchPersonRowChatPreviewFrame(
            preview: widgetbookMatchesThreadPreviewFor(
              match: widgetbookMatchesHostMatches.first,
              uid: MatchesChatSurfaceFixtures.hostUid,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'long preview truncation',
          child: _CatchPersonRowChatPreviewFrame(
            preview: widgetbookMatchesThreadPreviewFor(
              match: longCopyMatch,
              uid: MatchesChatSurfaceFixtures.viewerUid,
            ),
          ),
        ),
      ],
    ),
  );
}

class _CatchPersonRowChatPreviewFrame extends StatelessWidget {
  const _CatchPersonRowChatPreviewFrame({required this.preview});

  final ChatThreadPreview preview;

  @override
  Widget build(BuildContext context) {
    return WidgetbookMatchesDeviceFrame(
      height: WidgetbookPreviewLayout.photoLikePanelHeight,
      child: Builder(
        builder: (context) {
          final t = CatchTokens.of(context);
          return Scaffold(
            backgroundColor: t.bg,
            body: SafeArea(
              child: ListView(
                padding: CatchInsets.chatListGutter,
                children: [
                  widgetbookMatchesChatPersonRowForPreview(
                    context,
                    preview,
                    onTap: () {},
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
