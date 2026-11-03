import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchSurface,
  path: '[Core primitives]/Surfaces',
)
Widget catchSurfaceContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchSurface',
    contractId: 'catch.surface',
    states: const [
      'five-blocks',
      'tile-in-tile',
      'tile-in-spotlight',
      'floating-on-night',
      'band-colours',
      'pressable',
    ],
    children: [
      const WidgetbookContractStateCard(
        label: 'five-blocks',
        child: _Root(
          child: CatchStack(
            gap: CatchStackGap.g12,
            children: [
              CatchSurface(
                block: CatchSurfaceBlock.plain,
                child: _Label('plain'),
              ),
              CatchSurface(child: _Label('tile')),
              CatchSurface(
                block: CatchSurfaceBlock.spotlight,
                child: _Label('spotlight'),
              ),
              CatchSurface(
                block: CatchSurfaceBlock.floating,
                child: _Label('floating'),
              ),
              CatchSurface(
                block: CatchSurfaceBlock.band,
                color: CatchSurfaceColor.tile,
                child: _Label('band'),
              ),
            ],
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'tile-in-tile',
        child: _Root(
          child: CatchSurface(
            child: CatchStack(
              gap: CatchStackGap.g8,
              children: [
                _Label('tile'),
                CatchSurface(child: _Label('nested: white, 16 corners')),
              ],
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'tile-in-spotlight',
        child: _Root(
          child: CatchStack(
            gap: CatchStackGap.g8,
            children: [
              for (final color in const [
                CatchSurfaceColor.run,
                CatchSurfaceColor.dinner,
                CatchSurfaceColor.games,
                CatchSurfaceColor.courts,
                CatchSurfaceColor.nightsOut,
                CatchSurfaceColor.ink,
              ])
                CatchSurface(
                  block: CatchSurfaceBlock.spotlight,
                  color: color,
                  child: CatchSurface(child: _Label('tile in ${color.name}')),
                ),
            ],
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'floating-on-night',
        child: _Root(
          theme: CatchThemeMode.night,
          child: CatchSurface(
            block: CatchSurfaceBlock.floating,
            child: _Label('floating on night: the raised night tile'),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'band-colours',
        child: _Root(
          child: CatchStack(
            gap: CatchStackGap.none,
            children: [
              for (final color in CatchSurfaceColor.values)
                CatchSurface(
                  block: CatchSurfaceBlock.band,
                  color: color,
                  child: _Label('band ${color.name}'),
                ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'pressable',
        child: _Root(
          child: CatchSurface(
            onPress: widgetbookNoop,
            semanticLabel: 'Open the event',
            child: const _Label('the whole block is a button'),
          ),
        ),
      ),
    ],
  );
}

class _Root extends StatelessWidget {
  const _Root({this.theme = CatchThemeMode.day, required this.child});

  final CatchThemeMode theme;
  final Widget child;

  @override
  Widget build(BuildContext context) => CatchRoot(
    theme: theme,
    size: CatchWindowSize.compact,
    child: CatchSurface(
      block: CatchSurfaceBlock.plain,
      padding: CatchSurfacePadding.sm,
      child: child,
    ),
  );
}

class _Label extends StatelessWidget {
  const _Label(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => CatchStack(
    direction: CatchStackDirection.row,
    align: CatchStackAlign.center,
    gap: CatchStackGap.g6,
    children: [
      CatchIcon(CatchIcons.event, size: CatchIconSize.xs),
      Flexible(child: CatchText(text, variant: CatchTextVariant.bodySmall)),
    ],
  );
}
