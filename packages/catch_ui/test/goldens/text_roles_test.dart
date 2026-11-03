import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

CatchThemeMode _themeOf(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
    ? CatchThemeMode.night
    : CatchThemeMode.day;

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('the 22 text roles at scale $scale', (tester) async {
      await matchCatchGolden(
        tester,
        'text_roles${scale == 1 ? '' : '@2.0'}',
        textScale: scale,
        size: Size(440, scale == 1 ? 1180 : 2300),
        builder: (context) => CatchRoot(
          theme: _themeOf(context),
          size: CatchWindowSize.compact,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: CatchStack(
              gap: CatchStackGap.g6,
              children: [
                for (final variant in CatchTextVariant.values)
                  CatchText(variant.name, variant: variant, maxLines: 1),
              ],
            ),
          ),
        ),
      );
    }, tags: const ['golden']);
  }

  testWidgets('tones, figures, line clamps and the responsive roles', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'text_roles_tones',
      size: const Size(960, 900),
      builder: (context) => CatchRoot(
        theme: _themeOf(context),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: CatchStack(
            gap: CatchStackGap.g16,
            children: [
              CatchStack(
                direction: CatchStackDirection.row,
                wrap: true,
                gap: CatchStackGap.g12,
                children: [
                  for (final tone in CatchTextTone.values)
                    CatchText(
                      tone.name,
                      variant: CatchTextVariant.titleRow,
                      tone: tone,
                    ),
                ],
              ),
              const CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g24,
                children: [
                  CatchText(
                    '11:11 · 1,111',
                    variant: CatchTextVariant.titleBar,
                  ),
                  CatchText(
                    '11:11 · 1,111',
                    variant: CatchTextVariant.titleBar,
                    numeric: true,
                  ),
                ],
              ),
              // A row keeps its children's own widths; a column would
              // stretch them to its width.
              const CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g24,
                children: [
                  SizedBox(
                    width: 240,
                    child: CatchText(
                      'A long description that runs past two lines ends in '
                      'an ellipsis instead of growing the block.',
                      maxLines: 2,
                    ),
                  ),
                  SizedBox(
                    width: 240,
                    child: CatchText(
                      'Centred',
                      variant: CatchTextVariant.labelKicker,
                      align: TextAlign.center,
                    ),
                  ),
                ],
              ),
              CatchStack(
                direction: CatchStackDirection.row,
                align: CatchStackAlign.end,
                gap: CatchStackGap.g16,
                children: [
                  for (final size in CatchWindowSize.values)
                    SizedBox(
                      width: 290,
                      child: CatchRoot(
                        theme: _themeOf(context),
                        size: size,
                        child: CatchStack(
                          gap: CatchStackGap.g4,
                          children: [
                            CatchText(
                              size.name,
                              variant: CatchTextVariant.bodyMeta,
                            ),
                            const CatchText(
                              'Page',
                              variant: CatchTextVariant.pageTitle,
                            ),
                            const CatchText(
                              'Section',
                              variant: CatchTextVariant.sectionTitle,
                            ),
                            const CatchText(
                              'Hero',
                              variant: CatchTextVariant.hero,
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }, tags: const ['golden']);
}
