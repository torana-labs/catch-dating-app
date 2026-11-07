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

final _variants = <CatchTopBar>[
  CatchTopBar(
    variant: CatchTopBarVariant.tabHome,
    kicker: 'Lantern Lane Social',
    title: 'Events',
    actions: [
      CatchIconAction.icon(
        icon: CatchIcons.search,
        tooltip: 'Search',
        onPressed: () {},
        size: GeneratedCatchSizeTokens.controlMd,
      ),
    ],
  ),
  CatchTopBar(
    variant: CatchTopBarVariant.tool,
    kicker: 'Rooftop Run Club',
    title: 'Edit event',
    back: CatchTopBarBack(onPressed: () {}),
    action: CatchTopBarAction(label: 'Save', onPressed: () {}),
  ),
  CatchTopBar(
    variant: CatchTopBarVariant.subject,
    title: 'Harbor Social',
    back: CatchTopBarBack(onPressed: () {}),
  ),
  CatchTopBar(
    variant: CatchTopBarVariant.step,
    title: 'When is it?',
    back: CatchTopBarBack(onPressed: () {}),
    step: const CatchTopBarStep(index: 2, total: 5, label: 'Step 2 of 5'),
  ),
  CatchTopBar(
    variant: CatchTopBarVariant.live,
    title: 'Thursday social run',
    kicker: '42 checked in',
    live: 'Live · 9:04 PM',
    back: CatchTopBarBack(onPressed: () {}),
  ),
  CatchTopBar(
    variant: CatchTopBarVariant.moment,
    back: CatchTopBarBack(close: true, onPressed: () {}),
  ),
];

/// Every variant at rest and scrolled, in a root of [width] and [sizeClass].
class _Variants extends StatelessWidget {
  const _Variants({required this.width, required this.sizeClass});

  final double width;
  final CatchWindowSize sizeClass;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: width,
    child: CatchRoot(
      theme: _themeOf(context),
      size: sizeClass,
      child: Builder(
        builder: (context) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: CatchSpacing.s3,
          children: [
            for (final bar in _variants)
              for (final scrolled in const [false, true])
                ColoredBox(
                  // A subject bar sits over its hero; the tile stands in.
                  color: bar.variant == CatchTopBarVariant.subject
                      ? CatchTokens.of(context).tile
                      : CatchTokens.of(context).ground,
                  child: CatchScreenScope(
                    data: CatchScreenScopeData(scrolled: scrolled),
                    child: bar,
                  ),
                ),
          ],
        ),
      ),
    ),
  );
}

void main() {
  testWidgets('the six variants on a phone, at rest and scrolled', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'top_bar_family_compact',
      size: const Size(390, 1240),
      builder: (_) => const Align(
        alignment: Alignment.topLeft,
        child: _Variants(width: 390, sizeClass: CatchWindowSize.compact),
      ),
    );
  });

  testWidgets('the six variants as the wide 56 px row, at rest and scrolled', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'top_bar_family_wide',
      size: const Size(900, 900),
      builder: (_) => const Align(
        alignment: Alignment.topLeft,
        child: _Variants(width: 900, sizeClass: CatchWindowSize.medium),
      ),
    );
  });
}
