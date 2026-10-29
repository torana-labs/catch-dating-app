import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/matches/shared/match_celebration_dialog.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Dialog states',
  type: MatchCelebrationDialog,
  path: '[P1 product surfaces]/Matches and chat/Components',
)
Widget matchCelebrationDialogStates(BuildContext context) {
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'MatchCelebrationDialog',
      contractId: 'dialog.matches.celebration',
      children: [
        WidgetbookPageStateCard(
          label: 'new catch',
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
      ],
    ),
  );
}
