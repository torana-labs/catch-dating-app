import 'package:catch_dating_app/chats/presentation/widgets/suvbot_dock.dart';
import 'package:catch_dating_app/contexts/messaging/domain/suvbot_action_item.dart';
import 'package:catch_dating_app/design_fixtures/matches_chat_surface_fixtures.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Primitive states',
  type: SuvbotDock,
  path: '[P1 product surfaces]/Matches and chat/Primitives',
)
Widget suvbotActionBarPrimitiveStates(BuildContext context) {
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'SuvbotDock',
      contractId: 'primitive.messaging.suvbot_action_bar',
      children: [
        WidgetbookPageStateCard(
          label: 'loaded actions',
          child: _SuvbotDockPrimitiveFrame(
            actions: AsyncData<List<SuvbotActionItem>>(
              MatchesChatSurfaceFixtures.suvbotActions,
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'pending action',
          child: _SuvbotDockPrimitiveFrame(
            actions: AsyncData<List<SuvbotActionItem>>(
              MatchesChatSurfaceFixtures.suvbotActions,
            ),
            pending: true,
          ),
        ),
        const WidgetbookPageStateCard(
          label: 'loading',
          child: _SuvbotDockPrimitiveFrame(
            actions: AsyncLoading<List<SuvbotActionItem>>(),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'load error',
          child: _SuvbotDockPrimitiveFrame(
            actions: AsyncError<List<SuvbotActionItem>>(
              StateError('Suvbot controls unavailable'),
              StackTrace.empty,
            ),
          ),
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Primitive states',
  type: SuvbotResetActionRow,
  path: '[P1 product surfaces]/Matches and chat/Primitives',
)
Widget suvbotResetActionRowPrimitiveStates(BuildContext context) {
  const resetActionIds = {
    'resetChats',
    'resetBookings',
    'resetNotifications',
    'clearDemoState',
  };
  final resetActions = MatchesChatSurfaceFixtures.suvbotActions
      .where((action) => resetActionIds.contains(action.id))
      .toList(growable: false);

  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'SuvbotResetActionRow',
      contractId: 'primitive.messaging.suvbot_reset_action_row',
      children: [
        WidgetbookPageStateCard(
          label: 'destructive reset actions',
          child: _SuvbotResetActionRowsFrame(actions: resetActions),
        ),
        WidgetbookPageStateCard(
          label: 'pending disabled',
          child: _SuvbotResetActionRowsFrame(
            actions: resetActions,
            pending: true,
          ),
        ),
      ],
    ),
  );
}

class _SuvbotDockPrimitiveFrame extends StatelessWidget {
  const _SuvbotDockPrimitiveFrame({
    required this.actions,
    this.pending = false,
  });

  final AsyncValue<List<SuvbotActionItem>> actions;
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
              child: Column(
                children: [
                  const Spacer(),
                  SuvbotDock(
                    actions: actions,
                    pending: pending,
                    onAction: (_) async {},
                    onTextAction: (_, _) async {},
                    onRetry: () {},
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

class _SuvbotResetActionRowsFrame extends StatelessWidget {
  const _SuvbotResetActionRowsFrame({
    required this.actions,
    this.pending = false,
  });

  final List<SuvbotActionItem> actions;
  final bool pending;

  @override
  Widget build(BuildContext context) {
    return WidgetbookMatchesDeviceFrame(
      height: WidgetbookPreviewLayout.exploreMediaPreviewHeight,
      child: Builder(
        builder: (context) {
          final t = CatchTokens.of(context);
          return Scaffold(
            backgroundColor: t.bg,
            body: SafeArea(
              child: Padding(
                padding: CatchInsets.content,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: t.surface,
                    border: Border.all(color: t.line),
                    borderRadius: BorderRadius.circular(CatchRadius.md),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (final (index, action) in actions.indexed) ...[
                        SuvbotResetActionRow(
                          action: action,
                          pending: pending,
                          onTap: () {},
                        ),
                        if (index != actions.length - 1)
                          const CatchDivider.fieldRow(indent: 0),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
