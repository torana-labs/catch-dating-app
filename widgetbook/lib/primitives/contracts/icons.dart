import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchIconTile,
  path: '[Core primitives]/Icon atoms',
)
Widget catchIconTileContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchIconTile',
    contractId: 'catch.icon_tile',
    states: const [
      'default',
      'tinted',
      'compact',
      'plain',
      'bubble',
      'sized',
      'error',
      'custom-icon',
      'compact-error',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'default',
        child: CatchIconTile(icon: CatchIcons.event, iconColor: t.primary),
      ),
      WidgetbookContractStateCard(
        label: 'tinted',
        child: CatchIconTile(
          icon: CatchIcons.locked,
          iconColor: t.danger,
          backgroundColor: t.primarySoft,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'compact',
        child: CatchIconTile(
          icon: CatchIcons.spark,
          iconColor: t.ink,
          size: 32,
          iconSize: 16,
          radius: CatchRadius.sm,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'error',
        child: CatchIconTile.error(),
      ),
      WidgetbookContractStateCard(
        label: 'custom-icon',
        child: CatchIconTile.error(icon: CatchIcons.info),
      ),
      const WidgetbookContractStateCard(
        label: 'compact-error',
        child: CatchIconTile.error(size: 40, iconSize: 20),
      ),
      WidgetbookContractStateCard(
        label: 'icon styles',
        child: WidgetbookContractWrap(
          children: [
            CatchIconTile.empty(
              icon: CatchIcons.event,
              variant: CatchIconTileVariant.plain,
            ),
            CatchIconTile.empty(
              icon: CatchIcons.people,
              variant: CatchIconTileVariant.bubble,
            ),
            CatchIconTile.empty(
              icon: CatchIcons.search,
              variant: CatchIconTileVariant.bubble,
              iconSize: 24,
              size: 56,
            ),
          ],
        ),
      ),
    ],
  );
}
