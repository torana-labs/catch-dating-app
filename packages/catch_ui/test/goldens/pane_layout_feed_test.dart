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

/// A pane of [blocks] stacked tiles, so the two columns differ in height.
class _Pane extends StatelessWidget {
  const _Pane(this.label, this.blocks);

  final String label;
  final int blocks;

  @override
  Widget build(BuildContext context) => CatchStack(
    children: [
      for (var index = 0; index < blocks; index++)
        CatchSurface(
          child: SizedBox(
            height: CatchSpacing.s16,
            child: CatchText(
              '$label ${index + 1}',
              variant: CatchTextVariant.bodyMeta,
            ),
          ),
        ),
    ],
  );
}

/// The feed in a scrolling page, as a screen body holds it.
class _Feed extends StatelessWidget {
  const _Feed({required this.sizeClass});

  final CatchWindowSize sizeClass;

  @override
  Widget build(BuildContext context) => CatchRoot(
    theme: _themeOf(context),
    size: sizeClass,
    child: const SingleChildScrollView(
      padding: EdgeInsets.all(CatchSpacing.s5),
      child: CatchPaneLayout(
        pattern: CatchPaneLayoutMode.feed,
        children: [_Pane('Main', 3), _Pane('Side', 2)],
      ),
    ),
  );
}

void main() {
  testWidgets('the feed stacks at 700', (tester) async {
    await matchCatchGolden(
      tester,
      'pane_layout_feed_medium',
      size: const Size(700, 520),
      builder: (_) => const _Feed(sizeClass: CatchWindowSize.medium),
    );
  });

  testWidgets('the feed splits main and side at 1024', (tester) async {
    await matchCatchGolden(
      tester,
      'pane_layout_feed_expanded',
      size: const Size(1024, 320),
      builder: (_) => const _Feed(sizeClass: CatchWindowSize.expanded),
    );
  });
}
