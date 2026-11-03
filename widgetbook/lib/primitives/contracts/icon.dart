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
        child: CatchRoot(
          theme: CatchThemeMode.day,
          child: WidgetbookContractWrap(
            children: [
              for (final size in const [
                CatchIconSize.xs,
                CatchIconSize.md,
                CatchIconSize.control,
                CatchIconSize.lg,
              ])
                CatchIcon(CatchIcons.event, size: size),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'tones',
        description:
            'No tone of its own: the colour of the ground (tile, a format '
            'colour, night).',
        child: CatchRoot(
          theme: CatchThemeMode.day,
          child: CatchStack(
            gap: CatchStackGap.g8,
            children: [
              for (final (block, color) in const [
                (CatchSurfaceBlock.tile, null),
                (CatchSurfaceBlock.spotlight, CatchSurfaceColor.run),
                (CatchSurfaceBlock.spotlight, CatchSurfaceColor.ink),
              ])
                CatchSurface(
                  block: block,
                  color: color,
                  padding: CatchSurfacePadding.sm,
                  child: CatchStack(
                    direction: CatchStackDirection.row,
                    gap: CatchStackGap.g12,
                    children: [
                      CatchIcon(CatchIcons.success),
                      CatchIcon(CatchIcons.event),
                      CatchIcon(CatchIcons.search),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'labelled',
        child: CatchRoot(
          theme: CatchThemeMode.day,
          child: CatchIcon(
            CatchIcons.search,
            size: CatchIconSize.lg,
            label: 'Search',
          ),
        ),
      ),
    ],
  );
}
