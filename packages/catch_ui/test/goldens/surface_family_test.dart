@Tags(['golden'])
library;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

CatchThemeMode _themeOf(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
    ? CatchThemeMode.night
    : CatchThemeMode.day;

/// A labelled block: what it is, in the ink of its ground.
class _Label extends StatelessWidget {
  const _Label(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Row(
    spacing: 6,
    children: [
      CatchIcon(CatchIcons.event, size: CatchIconSize.xs),
      Flexible(child: CatchText(text, variant: CatchTextVariant.bodySmall)),
    ],
  );
}

Widget _page(BuildContext context, List<Widget> children) => CatchRoot(
  theme: _themeOf(context),
  size: CatchWindowSize.compact,
  child: Padding(
    padding: const EdgeInsets.all(16),
    child: CatchStack(gap: CatchStackGap.g12, children: children),
  ),
);

void main() {
  testWidgets('the five blocks on the ground, nesting and padding', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'surface_family',
      size: const Size(440, 1060),
      builder: (context) => _page(context, [
        const CatchSurface(
          block: CatchSurfaceBlock.plain,
          child: _Label('plain'),
        ),
        const CatchSurface(child: _Label('tile')),
        const CatchSurface(
          block: CatchSurfaceBlock.spotlight,
          child: _Label('spotlight (ink)'),
        ),
        const CatchSurface(
          block: CatchSurfaceBlock.floating,
          child: _Label('floating'),
        ),
        const CatchSurface(
          child: CatchStack(
            gap: CatchStackGap.g8,
            children: [
              _Label('tile in tile'),
              CatchSurface(child: _Label('nested')),
            ],
          ),
        ),
        CatchSurface(
          onPress: () {},
          semanticLabel: 'Pressable tile',
          child: const _Label('pressable tile'),
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          gap: CatchStackGap.g8,
          children: [
            for (final padding in CatchSurfacePadding.values)
              CatchSurface(padding: padding, child: _Label('pad')),
          ],
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          gap: CatchStackGap.g8,
          children: [
            for (final aspect in const [1.0, 1.5])
              CatchSurface(
                block: CatchSurfaceBlock.spotlight,
                color: CatchSurfaceColor.courts,
                aspect: aspect,
                child: _Label('aspect $aspect'),
              ),
          ],
        ),
        const CatchSurface(
          block: CatchSurfaceBlock.spotlight,
          color: CatchSurfaceColor.games,
          child: CatchSurface(
            child: CatchStack(
              gap: CatchStackGap.g8,
              children: [
                _Label('tile in a games spotlight'),
                CatchSurface(child: _Label('and a tile in that')),
              ],
            ),
          ),
        ),
      ]),
    );
  }, tags: const ['golden']);

  testWidgets('a tile in a spotlight of each format, and floating on night', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'surface_family_spotlights',
      size: const Size(440, 860),
      builder: (context) => _page(context, [
        for (final color in const [
          CatchSurfaceColor.run,
          CatchSurfaceColor.dinner,
          CatchSurfaceColor.games,
          CatchSurfaceColor.courts,
          CatchSurfaceColor.nightsOut,
        ])
          CatchSurface(
            block: CatchSurfaceBlock.spotlight,
            color: color,
            child: CatchStack(
              gap: CatchStackGap.g8,
              children: [
                _Label('spotlight ${color.name}'),
                const CatchSurface(child: _Label('tile inside')),
              ],
            ),
          ),
        const CatchSurface(
          block: CatchSurfaceBlock.spotlight,
          color: CatchSurfaceColor.ink,
          child: CatchStack(
            gap: CatchStackGap.g8,
            children: [
              _Label('ink spotlight: night inside'),
              CatchSurface(child: _Label('night tile')),
              CatchSurface(
                block: CatchSurfaceBlock.floating,
                child: _Label('floating on night'),
              ),
            ],
          ),
        ),
      ]),
    );
  }, tags: const ['golden']);

  testWidgets('a band in each colour', (tester) async {
    await matchCatchGolden(
      tester,
      'surface_family_bands',
      size: const Size(440, 640),
      builder: (context) => CatchRoot(
        theme: _themeOf(context),
        size: CatchWindowSize.compact,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const CatchSurface(
              block: CatchSurfaceBlock.band,
              child: _Label('band (ground)'),
            ),
            for (final color in CatchSurfaceColor.values)
              CatchSurface(
                block: CatchSurfaceBlock.band,
                color: color,
                child: _Label('band ${color.name}'),
              ),
          ],
        ),
      ),
    );
  }, tags: const ['golden']);
}
