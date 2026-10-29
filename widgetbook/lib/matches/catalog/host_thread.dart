import 'package:catch_dating_app/chats/presentation/chat_screen.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/design_fixtures/matches_chat_surface_fixtures.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'composer.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Host chat states',
  type: ChatScreen,
  path: '[P1 product surfaces]/Matches and chat',
)
Widget hostChatRouteStates(BuildContext context) {
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.host,
    child: WidgetbookPageCatalogFrame(
      title: 'ChatScreen host inquiry',
      contractId: 'screen.host.chat',
      children: [
        WidgetbookPageStateCard(
          label: 'match loading',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              match: widgetbookMatchesHostMatches.first,
              matchLoading: true,
              hostRoute: true,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'match error',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              match: widgetbookMatchesHostMatches.first,
              matchError: StateError('Host chat failed'),
              hostRoute: true,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'chat unavailable',
          child: WidgetbookMatchesDeviceFrame(
            child: const WidgetbookMatchesChatRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              match: null,
              matchId: 'design-host-chat-missing',
              hostRoute: true,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'host inquiry identity',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              match: widgetbookMatchesHostMatches.first,
              hostRoute: true,
              messages: [
                MatchesChatSurfaceFixtures.message(
                  id: 'host-msg-1',
                  senderId: MatchesChatSurfaceFixtures.guestUid,
                  text: 'Is there parking near the start?',
                  sentAt: MatchesChatSurfaceFixtures.now.subtract(
                    const Duration(minutes: 18),
                  ),
                ),
                MatchesChatSurfaceFixtures.message(
                  id: 'host-msg-2',
                  senderId: MatchesChatSurfaceFixtures.hostUid,
                  text: 'Yes. Park by the promenade and meet at the jetty.',
                  sentAt: MatchesChatSurfaceFixtures.now.subtract(
                    const Duration(minutes: 12),
                  ),
                ),
              ],
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'messages loading',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              match: widgetbookMatchesHostMatches.first,
              hostRoute: true,
              messagesLoading: true,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'messages error',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              match: widgetbookMatchesHostMatches.first,
              hostRoute: true,
              messagesError: StateError('Host messages failed'),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'offline message error',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              match: widgetbookMatchesHostMatches.first,
              hostRoute: true,
              messagesError: MatchesChatSurfaceFixtures.offlineException(
                action: 'load host inquiry messages',
              ),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'empty inquiry thread',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              match: widgetbookMatchesHostMatches.first,
              hostRoute: true,
              messages: const [],
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'event context fallback',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              match: widgetbookMatchesHostMatches.first,
              hostRoute: true,
              includeEvent: false,
              messages: MatchesChatSurfaceFixtures.conversationMessages,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'blocked host chat',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              match: widgetbookMatchesHostMatches.first.copyWith(
                status: MatchStatus.blocked,
                blockedBy: MatchesChatSurfaceFixtures.guestUid,
                blockedAt: MatchesChatSurfaceFixtures.now.subtract(
                  const Duration(hours: 2),
                ),
              ),
              hostRoute: true,
              messages: MatchesChatSurfaceFixtures.conversationMessages,
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
                uid: MatchesChatSurfaceFixtures.hostUid,
                match: widgetbookMatchesHostMatches.first,
                hostRoute: true,
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
                uid: MatchesChatSurfaceFixtures.hostUid,
                match: widgetbookMatchesHostMatches.first,
                hostRoute: true,
                messages: MatchesChatSurfaceFixtures.conversationMessages,
              ),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'dark theme',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesChatRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              match: widgetbookMatchesHostMatches.first,
              hostRoute: true,
              themeMode: ThemeMode.dark,
              messages: MatchesChatSurfaceFixtures.conversationMessages,
            ),
          ),
        ),
      ],
    ),
  );
}
