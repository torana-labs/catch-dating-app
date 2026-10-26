import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchIcon,
  path: '[Core primitives]/Icon atoms',
)
Widget catchIconContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchIcon',
    contractId: 'catch.icon',
    states: const ['sizes', 'tones', 'labelled'],
    children: [
      WidgetbookContractStateCard(
        label: 'sizes',
        child: WidgetbookContractWrap(
          children: [
            for (final size in const [
              CatchIconSize.micro,
              CatchIconSize.sm,
              CatchIconSize.xs,
              CatchIconSize.md,
              CatchIconSize.control,
              CatchIconSize.row,
              CatchIconSize.lg,
              CatchIconSize.tile,
              CatchIconSize.emptyState,
              CatchIconSize.hero,
            ])
              CatchIcon(CatchIcons.event, size: size),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'tones',
        child: WidgetbookContractWrap(
          children: [
            for (final tone in CatchIconTone.values)
              CatchIcon(CatchIcons.success, size: CatchIconSize.lg, tone: tone),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'labelled',
        child: CatchIcon(
          CatchIcons.search,
          size: CatchIconSize.lg,
          tone: CatchIconTone.ink,
          semanticLabel: 'Search',
        ),
      ),
    ],
  );
}
