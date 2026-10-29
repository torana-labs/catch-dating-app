import 'package:catch_dating_app/chats/presentation/inbox/chat_inbox_screen.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/chats/presentation/inbox/host_inbox_filter.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_list.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_sliver_header.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/design_fixtures/matches_chat_surface_fixtures.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

final _hostNewInquiryMatches = [
  MatchesChatSurfaceFixtures.hostInquiryMatches.first.copyWith(
    id: 'design-host-inquiry-new',
    lastMessageAt: null,
    lastMessagePreview: null,
    lastMessageSenderId: null,
  ),
];

@widgetbook.UseCase(
  name: 'Legacy shared Host list states',
  type: ChatsListScreen,
  path: '[P2 supporting surfaces]/Matches and chat',
)
Widget matchesListHostInboxStates(BuildContext context) {
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.host,
    child: WidgetbookPageCatalogFrame(
      title: 'Legacy ChatsListScreen Host branch',
      contractId: 'component.messaging.legacy_host_list',
      children: [
        WidgetbookPageStateCard(
          label: 'uid loading',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              uid: null,
              initialLocation: Routes.hostInboxScreen.path,
              viewModel: const AsyncLoading<ChatsListViewModel>(),
              matches: widgetbookMatchesHostMatches,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'matches loading',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              initialLocation: Routes.hostInboxScreen.path,
              viewModel: const AsyncLoading<ChatsListViewModel>(),
              matches: widgetbookMatchesHostMatches,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'matches error',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              initialLocation: Routes.hostInboxScreen.path,
              viewModel: AsyncError<ChatsListViewModel>(
                StateError('Host inbox unavailable'),
                StackTrace.empty,
              ),
              matches: widgetbookMatchesHostMatches,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'offline',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              initialLocation: Routes.hostInboxScreen.path,
              viewModel: AsyncError<ChatsListViewModel>(
                MatchesChatSurfaceFixtures.offlineException(
                  action: 'load host inbox',
                ),
                StackTrace.empty,
              ),
              matches: widgetbookMatchesHostMatches,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'empty attendee queries',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              initialLocation: Routes.hostInboxScreen.path,
              viewModel: const AsyncData<ChatsListViewModel>(
                ChatsListViewModel(
                  newMatches: <ChatThreadPreview>[],
                  conversations: <ChatThreadPreview>[],
                  totalThreadCount: 0,
                ),
              ),
              matches: const <Match>[],
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'attendee queries',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              initialLocation: Routes.hostInboxScreen.path,
              viewModel: AsyncData<ChatsListViewModel>(
                widgetbookMatchesHostInboxViewModel(),
              ),
              matches: widgetbookMatchesHostMatches,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'unread filter with rows',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              initialLocation: Routes.hostInboxScreen.path,
              viewModel: AsyncData<ChatsListViewModel>(
                widgetbookMatchesHostInboxViewModel(),
              ),
              matches: widgetbookMatchesHostMatches,
              child: const _HostUnreadOnlyInbox(),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'host unread filter empty',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              initialLocation: Routes.hostInboxScreen.path,
              viewModel: AsyncData<ChatsListViewModel>(
                _hostInboxReadOnlyViewModel(),
              ),
              matches: widgetbookMatchesHostMatches
                  .map((match) => match.copyWith(unreadCounts: const {}))
                  .toList(),
              child: const _HostUnreadOnlyInbox(),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'search active',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              initialLocation: Routes.hostInboxScreen.path,
              query: 'Aarav',
              viewModel: AsyncData<ChatsListViewModel>(
                widgetbookMatchesHostInboxViewModel(),
              ),
              matches: widgetbookMatchesHostMatches,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'search empty',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              initialLocation: Routes.hostInboxScreen.path,
              query: 'No attendee by this name',
              viewModel: AsyncData<ChatsListViewModel>(
                widgetbookMatchesEmptySearchViewModel(
                  totalThreadCount: widgetbookMatchesHostMatches.length,
                ),
              ),
              matches: widgetbookMatchesHostMatches,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'new inquiry row',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              initialLocation: Routes.hostInboxScreen.path,
              viewModel: AsyncData<ChatsListViewModel>(
                widgetbookMatchesViewModelFor(
                  uid: MatchesChatSurfaceFixtures.hostUid,
                  matches: _hostNewInquiryMatches,
                ),
              ),
              matches: _hostNewInquiryMatches,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'text scale 2.0',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMediaOverride(
              textScaler: const TextScaler.linear(2),
              child: WidgetbookMatchesMatchesListRouteScope(
                uid: MatchesChatSurfaceFixtures.hostUid,
                initialLocation: Routes.hostInboxScreen.path,
                viewModel: AsyncData<ChatsListViewModel>(
                  widgetbookMatchesHostInboxViewModel(),
                ),
                matches: widgetbookMatchesHostMatches,
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
                uid: MatchesChatSurfaceFixtures.hostUid,
                initialLocation: Routes.hostInboxScreen.path,
                viewModel: AsyncData<ChatsListViewModel>(
                  widgetbookMatchesHostInboxViewModel(),
                ),
                matches: widgetbookMatchesHostMatches,
              ),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'dark theme',
          child: WidgetbookMatchesDeviceFrame(
            child: WidgetbookMatchesMatchesListRouteScope(
              uid: MatchesChatSurfaceFixtures.hostUid,
              initialLocation: Routes.hostInboxScreen.path,
              themeMode: ThemeMode.dark,
              viewModel: AsyncData<ChatsListViewModel>(
                widgetbookMatchesHostInboxViewModel(),
              ),
              matches: widgetbookMatchesHostMatches,
            ),
          ),
        ),
      ],
    ),
  );
}

class _HostUnreadOnlyInbox extends StatelessWidget {
  const _HostUnreadOnlyInbox();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            ...CatchSliverHeader(
              title: const SizedBox.shrink(),
              bottomHeight: chatsBrowseHeaderHeight(
                context: context,
                hasHostFilter: true,
                hasHeaderSubtitle: true,
              ),
              bottom: ChatsBrowseHeader(
                presentation: ChatsBrowsePresentation.host,
                showSearchAction: true,
                searchValue: '',
                onSearchChanged: null,
                hostFilter: HostInboxFilter.unread,
                hostUnreadCount: 0,
                onHostFilterChanged: (_) {},
              ),
            ).buildSlivers(context),
            const ChatsList(hostFilter: HostInboxFilter.unread),
          ],
        ),
      ),
    );
  }
}

ChatsListViewModel _hostInboxReadOnlyViewModel() {
  return widgetbookMatchesViewModelFor(
    uid: MatchesChatSurfaceFixtures.hostUid,
    matches: widgetbookMatchesHostMatches
        .map((match) => match.copyWith(unreadCounts: const {}))
        .toList(),
  );
}
