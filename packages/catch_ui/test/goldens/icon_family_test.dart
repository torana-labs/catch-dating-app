import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

CatchThemeMode _themeOf(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
    ? CatchThemeMode.night
    : CatchThemeMode.day;

const _sizes = [
  CatchIconSize.xs,
  CatchIconSize.md,
  CatchIconSize.control,
  CatchIconSize.lg,
];

/// The four sizes of three roles, in whatever colour the ground gives them.
class _Sizes extends StatelessWidget {
  const _Sizes(this.label);

  final String label;

  @override
  Widget build(BuildContext context) => CatchStack(
    direction: CatchStackDirection.row,
    align: CatchStackAlign.center,
    gap: CatchStackGap.g12,
    children: [
      for (final size in _sizes) CatchIcon(CatchIcons.event, size: size),
      CatchIcon(CatchIcons.search),
      CatchIcon(CatchIcons.back, label: 'Back'),
      CatchText(label, variant: CatchTextVariant.bodySmall),
    ],
  );
}

void main() {
  testWidgets('icons in four sizes take the colour of their ground', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'icon_family',
      size: const Size(440, 420),
      builder: (context) => CatchRoot(
        theme: _themeOf(context),
        child: const Padding(
          padding: EdgeInsets.all(16),
          child: CatchStack(
            gap: CatchStackGap.g12,
            children: [
              _Sizes('ground'),
              CatchSurface(child: _Sizes('tile')),
              CatchSurface(
                block: CatchSurfaceBlock.spotlight,
                color: CatchSurfaceColor.run,
                child: _Sizes('colour'),
              ),
              CatchSurface(
                block: CatchSurfaceBlock.spotlight,
                child: _Sizes('night'),
              ),
            ],
          ),
        ),
      ),
    );
    expect(find.bySemanticsLabel('Back'), findsWidgets);
  }, tags: const ['golden']);
}
