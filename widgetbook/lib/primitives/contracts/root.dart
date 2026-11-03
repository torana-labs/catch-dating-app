import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchRoot,
  path: '[Core primitives]/Foundations',
)
Widget catchRootContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchRoot',
    contractId: 'catch.root',
    states: const [
      'day-compact',
      'day-medium',
      'day-expanded',
      'night-compact',
      'night-medium',
      'night-expanded',
      'auto',
      'format',
    ],
    children: [
      for (final theme in CatchThemeMode.values)
        for (final size in CatchWindowSize.values)
          WidgetbookContractStateCard(
            label: '${theme.name}-${size.name}',
            child: CatchRoot(
              theme: theme,
              size: size,
              child: const _RootReadout(),
            ),
          ),
      const WidgetbookContractStateCard(
        label: 'auto',
        description:
            "Follows the phone's dark-mode setting and measures "
            'its own width.',
        child: CatchRoot(child: _RootReadout()),
      ),
      const WidgetbookContractStateCard(
        label: 'format',
        child: CatchRoot(format: CatchFormat.dinner, child: _RootReadout()),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchScope,
  path: '[Core primitives]/Foundations',
)
Widget catchScopeContractStates(BuildContext context) {
  return const WidgetbookContractFrame(
    title: 'CatchScope',
    contractId: 'catch.root.scope',
    states: ['read'],
    children: [
      WidgetbookContractStateCard(
        label: 'read',
        description:
            'What a component reads: theme, size class, ground, format, '
            'register and reduced motion.',
        child: CatchRoot(
          theme: CatchThemeMode.day,
          size: CatchWindowSize.medium,
          format: CatchFormat.games,
          register: CatchRegister.quiet,
          child: _RootReadout(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchGroundScope,
  path: '[Core primitives]/Foundations',
)
Widget catchGroundScopeContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchGroundScope',
    contractId: 'catch.root.ground_scope',
    states: const ['grounds'],
    children: [
      WidgetbookContractStateCard(
        label: 'grounds',
        description: 'Each ground resets the text and icon ink beneath it.',
        child: CatchRoot(
          theme: CatchThemeMode.day,
          child: CatchStack(
            gap: CatchStackGap.g4,
            children: [
              for (final ground in CatchGround.values)
                CatchGroundScope(
                  ground: ground,
                  format: ground == CatchGround.colour
                      ? CatchFormat.courts
                      : null,
                  child: const _RootReadout(),
                ),
            ],
          ),
        ),
      ),
    ],
  );
}

/// What the root publishes, in its own ground, ink and type.
class _RootReadout extends StatelessWidget {
  const _RootReadout();

  @override
  Widget build(BuildContext context) {
    final scope = CatchScope.of(context);
    return CatchSurface(
      block: CatchSurfaceBlock.plain,
      padding: CatchSurfacePadding.md,
      child: CatchStack(
        gap: CatchStackGap.g6,
        children: [
          CatchStack(
            direction: CatchStackDirection.row,
            align: CatchStackAlign.center,
            gap: CatchStackGap.g8,
            children: [
              CatchIcon(CatchIcons.event),
              CatchText(
                [
                  scope.theme.name,
                  scope.sizeClass.name,
                  scope.ground.name,
                  ?scope.format?.name,
                ].join(' · '),
              ),
            ],
          ),
          const CatchText('Page title', variant: CatchTextVariant.pageTitle),
        ],
      ),
    );
  }
}
