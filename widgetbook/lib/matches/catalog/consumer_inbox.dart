import 'package:catch_dating_app/chats/presentation/inbox/chat_inbox_screen.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/design_fixtures/matches_chat_surface_fixtures.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Consumer route states',
  type: ChatsListScreen,
  path: '[P1 product surfaces]/Matches and chat',
)
Widget matchesListConsumerRouteStates(BuildContext context) {
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'ChatsListScreen',
      contractId: 'screen.matches.list',
      children: [
        WidgetbookPageStateCard(
          label: 'matches loading',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              viewModel: const AsyncLoading<ChatsListViewModel>(),
              matches: widgetbookMatchesConsumerMatches,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'matches error',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              viewModel: AsyncError<ChatsListViewModel>(
                StateError('Matches failed'),
                StackTrace.empty,
              ),
              matches: widgetbookMatchesConsumerMatches,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'offline load error',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              viewModel: AsyncError<ChatsListViewModel>(
                MatchesChatSurfaceFixtures.offlineException(
                  action: 'load matches',
                ),
                StackTrace.empty,
              ),
              matches: widgetbookMatchesConsumerMatches,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'populated with unread and new match rows',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              viewModel: AsyncData<ChatsListViewModel>(
                widgetbookMatchesConsumerViewModel(),
              ),
              matches: widgetbookMatchesConsumerMatches,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'search empty',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              query: 'no dinner runners nearby',
              viewModel: AsyncData<ChatsListViewModel>(
                widgetbookMatchesEmptySearchViewModel(totalThreadCount: 3),
              ),
              matches: widgetbookMatchesConsumerMatches,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'no catches empty',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              viewModel: AsyncData<ChatsListViewModel>(
                widgetbookMatchesEmptySearchViewModel(totalThreadCount: 0),
              ),
              matches: const [],
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'match celebration',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              viewModel: AsyncData<ChatsListViewModel>(
                widgetbookMatchesConsumerViewModel(),
              ),
              matches: widgetbookMatchesConsumerMatches,
              child: WidgetbookMatchesCelebrationPreview(
                match: widgetbookMatchesTaylorMatch,
              ),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'thread tile variants',
          child: WidgetbookMatchesDeviceFrame(
            height: WidgetbookPreviewLayout.feedbackViewportHeight,
            child: WidgetbookMatchesMatchesListRouteScope(
              viewModel: AsyncData<ChatsListViewModel>(
                widgetbookMatchesConsumerViewModel(),
              ),
              matches: widgetbookMatchesConsumerMatches,
              child: _ThreadTileVariants(
                viewModel: widgetbookMatchesConsumerViewModel(),
              ),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'text scale 2.0',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMediaOverride(
              textScaler: const TextScaler.linear(2),
              child: WidgetbookMatchesMatchesListRouteScope(
                viewModel: AsyncData<ChatsListViewModel>(
                  widgetbookMatchesConsumerViewModel(),
                ),
                matches: widgetbookMatchesConsumerMatches,
              ),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'reduced motion',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMediaOverride(
              disableAnimations: true,
              child: WidgetbookMatchesMatchesListRouteScope(
                viewModel: AsyncData<ChatsListViewModel>(
                  widgetbookMatchesConsumerViewModel(),
                ),
                matches: widgetbookMatchesConsumerMatches,
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

class _ThreadTileVariants extends StatelessWidget {
  const _ThreadTileVariants({required this.viewModel});

  final ChatsListViewModel viewModel;

  @override
  Widget build(BuildContext context) {
    final previews = [...viewModel.newMatches, ...viewModel.conversations];
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: CatchInsets.chatListGutter,
          children: [
            for (final (index, preview) in previews.indexed)
              widgetbookMatchesChatPersonRowForPreview(
                context,
                preview,
                divider: index > 0,
                onTap: () {},
              ),
          ],
        ),
      ),
    );
  }
}
