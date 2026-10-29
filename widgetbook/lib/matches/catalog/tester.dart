import 'package:catch_dating_app/chats/presentation/widgets/suvbot_dock.dart';
import 'package:catch_dating_app/contexts/messaging/domain/suvbot_action_item.dart';
import 'package:catch_dating_app/design_fixtures/matches_chat_surface_fixtures.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Sheet states',
  type: MatchTesterSheet,
  path: '[P1 product surfaces]/Matches and chat/Primitives',
)
Widget matchTesterSheetStates(BuildContext context) {
  final action = MatchesChatSurfaceFixtures.suvbotActions.firstWhere(
    (action) => action.id == 'matchTesterByPhone',
  );

  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'MatchTesterSheet',
      contractId: 'sheet.messaging.match_tester',
      children: [
        WidgetbookPageStateCard(
          label: 'ready for phone input',
          child: _MatchTesterSheetFrame(action: action),
        ),
        WidgetbookPageStateCard(
          label: 'pending submit',
          child: _MatchTesterSheetFrame(action: action, pending: true),
        ),
      ],
    ),
  );
}

class _MatchTesterSheetFrame extends StatelessWidget {
  const _MatchTesterSheetFrame({required this.action, this.pending = false});

  final SuvbotActionItem action;
  final bool pending;

  @override
  Widget build(BuildContext context) {
    return WidgetbookMatchesDeviceFrame(
      height: WidgetbookPreviewLayout.matchesTallPreviewHeight,
      child: Builder(
        builder: (context) {
          final t = CatchTokens.of(context);
          return Scaffold(
            backgroundColor: t.bg,
            body: SafeArea(
              child: Align(
                alignment: Alignment.bottomCenter,
                child: MatchTesterSheet(
                  action: action,
                  pending: pending,
                  onTextAction: (_, _) async {},
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
