import 'package:catch_dating_app/chats/presentation/chat_screen.dart';
import 'package:catch_dating_app/contexts/messaging/data/suvbot_repository.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/design_fixtures/matches_chat_surface_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'composer.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

final _blockedMatch = MatchesChatSurfaceFixtures.blockedMatch();

final _suvbotMatch = MatchesChatSurfaceFixtures.suvbotMatch();

@widgetbook.UseCase(
  name: 'Route states',
  type: ChatScreen,
  path: '[P1 product surfaces]/Matches and chat',
)
Widget matchChatRouteStates(BuildContext context) {
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'ChatScreen',
      contractId: 'screen.matches.chat',
      children: [
        WidgetbookPageStateCard(
          label: 'messages loading',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              match: widgetbookMatchesTaylorMatch,
              messagesLoading: true,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'messages error',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              match: widgetbookMatchesTaylorMatch,
              messagesError: StateError('Messages failed'),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'offline message error',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              match: widgetbookMatchesTaylorMatch,
              messagesError: MatchesChatSurfaceFixtures.offlineException(
                action: 'load conversation messages',
              ),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'empty thread',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              match: MatchesChatSurfaceFixtures.newMatch(),
              messages: const [],
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'populated thread',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              match: widgetbookMatchesTaylorMatch,
              messages: MatchesChatSurfaceFixtures.conversationMessages,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'image attachment thread',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              match: widgetbookMatchesTaylorMatch,
              messages: MatchesChatSurfaceFixtures.imageMessages,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'chat unavailable',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              match: null,
              matchId: 'missing-match',
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'blocked chat',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              match: _blockedMatch,
              messages: MatchesChatSurfaceFixtures.conversationMessages,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'host inquiry identity',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              match: widgetbookMatchesHostMatches.first,
              messages: [
                MatchesChatSurfaceFixtures.message(
                  id: 'host-msg-1',
                  senderId: MatchesChatSurfaceFixtures.guestUid,
                  text: 'Is there parking near the start?',
                  sentAt: MatchesChatSurfaceFixtures.now.subtract(
                    const Duration(minutes: 18),
                  ),
                ),
              ],
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'Suvbot controls',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              match: _suvbotMatch,
              messages: [
                MatchesChatSurfaceFixtures.message(
                  id: 'suvbot-msg-1',
                  senderId: suvbotUid,
                  text: 'I can refresh your seeded demo state.',
                  sentAt: MatchesChatSurfaceFixtures.now.subtract(
                    const Duration(minutes: 3),
                  ),
                ),
              ],
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'Suvbot action error',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              match: _suvbotMatch,
              messages: const [],
              suvbotRepository: MatchesChatFixtureSuvbotRepository(
                error: StateError('Suvbot failed'),
              ),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'share card sheet',
          child: WidgetbookMatchesDeviceFrame(
            height: WidgetbookPreviewLayout.celebrationViewportHeight,
            child: WidgetbookMatchesShareCardPreview(
              messages: MatchesChatSurfaceFixtures.conversationMessages,
              event: widgetbookMatchesEvent,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'composer states',
          child: WidgetbookMatchesDeviceFrame(
            height: WidgetbookPreviewLayout.feedbackViewportHeight,
            child: const WidgetbookMatchesComposerStatesPreview(),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'text scale 2.0',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMediaOverride(
              textScaler: const TextScaler.linear(2),
              child: WidgetbookMatchesChatRouteScope(
                match: widgetbookMatchesTaylorMatch,
                messages: MatchesChatSurfaceFixtures.conversationMessages,
              ),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'reduced motion',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMediaOverride(
              disableAnimations: true,
              child: WidgetbookMatchesChatRouteScope(
                match: widgetbookMatchesTaylorMatch,
                messages: MatchesChatSurfaceFixtures.conversationMessages,
              ),
            ),
          ),
        ),
      ],
    ),
  );
}
