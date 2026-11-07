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

class _Pane extends StatelessWidget {
  const _Pane(this.label);

  final String label;

  @override
  Widget build(BuildContext context) => CatchSurface(
    child: SizedBox(
      height: CatchSpacing.s16,
      child: CatchText(label, variant: CatchTextVariant.bodyMeta),
    ),
  );
}

void main() {
  testWidgets('editor, operations and browse on a wide desktop', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'pane_layout_family',
      size: const Size(1440, 640),
      builder: (context) => CatchRoot(
        theme: _themeOf(context),
        size: CatchWindowSize.expanded,
        child: const Padding(
          padding: EdgeInsets.all(CatchSpacing.s5),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: CatchSpacing.s6,
            children: [
              SizedBox(
                height: CatchSpacing.s16 * 2,
                child: CatchPaneLayout(
                  pattern: CatchPaneLayoutMode.editor,
                  children: [_Pane('Form'), _Pane('Preview'), _Pane('Steps')],
                ),
              ),
              SizedBox(
                height: CatchSpacing.s16 * 2,
                child: CatchPaneLayout(
                  pattern: CatchPaneLayoutMode.operations,
                  children: [_Pane('Live console'), _Pane('Live pane')],
                ),
              ),
              SizedBox(
                height: CatchSpacing.s16 * 3,
                child: CatchPaneLayout(
                  pattern: CatchPaneLayoutMode.browse,
                  children: [
                    _Pane('Cell 1'),
                    _Pane('Cell 2'),
                    _Pane('Cell 3'),
                    _Pane('Cell 4'),
                    _Pane('Cell 5'),
                    _Pane('Cell 6'),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  });
}
