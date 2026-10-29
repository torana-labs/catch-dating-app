import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/chats/presentation/inbox/host_inbox_filter.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_sliver_header.dart';
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
  name: 'Header states',
  type: ChatsBrowseHeader,
  path: '[P1 product surfaces]/Matches and chat/Components',
)
Widget chatsBrowseHeaderStates(BuildContext context) {
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.host,
    child: WidgetbookPageCatalogFrame(
      title: 'ChatsBrowseHeader',
      contractId: 'component.messaging.chats_browse_header',
      children: [
        WidgetbookPageStateCard(
          label: 'host inbox filters',
          child: WidgetbookMatchesDeviceFrame(
            height: WidgetbookPreviewLayout.mediaPanelHeight,
            child: WidgetbookMatchesMatchesListRouteScope(
              viewModel: AsyncData<ChatsListViewModel>(
                widgetbookMatchesHostInboxViewModel(),
              ),
              matches: widgetbookMatchesHostMatches,
              child: Scaffold(
                body: SafeArea(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ChatsBrowseHeader(
                        presentation: ChatsBrowsePresentation.host,
                        showSearchAction: true,
                        searchValue: '',
                        onSearchChanged: (_) {},
                        hostFilter: HostInboxFilter.all,
                        hostUnreadCount: 2,
                        onHostFilterChanged: (_) {},
                      ),
                    ],
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
