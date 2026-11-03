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

/// A small tile that shows where a child lands.
class _Cell extends StatelessWidget {
  const _Cell(this.label);

  final String label;

  @override
  Widget build(BuildContext context) => CatchSurface(
    padding: CatchSurfacePadding.sm,
    child: CatchText(label, variant: CatchTextVariant.bodyMeta, maxLines: 1),
  );
}

/// A two-column row that stacks below medium, inside a root of [width].
class _Collapsing extends StatelessWidget {
  const _Collapsing({required this.width});

  final double width;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: width,
    child: CatchRoot(
      theme: _themeOf(context),
      child: Builder(
        builder: (context) => CatchStack(
          gap: CatchStackGap.g8,
          children: [
            CatchText(
              '${width.toInt()} px · ${CatchRootScope.of(context).sizeClass.name}',
              variant: CatchTextVariant.bodyMeta,
            ),
            const CatchStack(
              direction: CatchStackDirection.row,
              equal: true,
              collapseBelow: CatchWindowSize.medium,
              gap: CatchStackGap.section,
              children: [_Cell('first'), _Cell('second')],
            ),
          ],
        ),
      ),
    ),
  );
}

void main() {
  testWidgets('gaps, equal shares and wrapping', (tester) async {
    await matchCatchGolden(
      tester,
      'stack_family',
      size: const Size(440, 1130),
      builder: (context) => CatchRoot(
        theme: _themeOf(context),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: CatchStack(
            gap: CatchStackGap.g16,
            children: [
              for (final gap in CatchStackGap.values)
                CatchStack(
                  direction: CatchStackDirection.row,
                  gap: gap,
                  align: CatchStackAlign.center,
                  children: [
                    SizedBox(
                      width: 72,
                      child: CatchText(
                        gap.name,
                        variant: CatchTextVariant.labelBadge,
                      ),
                    ),
                    const _Cell('a'),
                    const _Cell('b'),
                    const _Cell('c'),
                  ],
                ),
              const CatchStack(
                direction: CatchStackDirection.row,
                equal: true,
                gap: CatchStackGap.g8,
                children: [_Cell('equal'), _Cell('shares'), _Cell('of width')],
              ),
              const CatchStack(
                direction: CatchStackDirection.row,
                justify: CatchStackJustify.between,
                children: [_Cell('between'), _Cell('the ends')],
              ),
              CatchStack(
                direction: CatchStackDirection.row,
                wrap: true,
                gap: CatchStackGap.g8,
                children: [
                  for (final word
                      in 'a row that wraps onto new runs with the '
                              'same gap between them'
                          .split(' '))
                    _Cell(word),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }, tags: const ['golden']);

  testWidgets('a row collapses below medium: at 599 and at 600 px', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'stack_family_collapse',
      size: const Size(640, 320),
      builder: (context) => const Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 24,
          children: [_Collapsing(width: 599), _Collapsing(width: 600)],
        ),
      ),
    );
  }, tags: const ['golden']);
}
