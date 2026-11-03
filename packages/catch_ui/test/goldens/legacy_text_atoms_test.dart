@Tags(['golden'])
library;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

/// The kicker and metadata atoms the system CatchLegacyText absorbs. They stay
/// pixel-identical until P7 deletes them; text_roles_test.dart holds the
/// system roles.
void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('legacy text atoms preserve typography at scale $scale', (
      tester,
    ) async {
      await matchCatchGolden(
        tester,
        'legacy_text_atoms${scale == 1 ? '' : '@2.0'}',
        textScale: scale,
        size: const Size(440, 500),
        builder: (context) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 16,
            children: [
              const CatchKickerText(label: 'Host notes'),
              const CatchKickerText(
                label: 'Featured',
                variant: CatchKickerTextVariant.lg,
              ),
              const CatchKickerText(
                label: 'Your details',
                variant: CatchKickerTextVariant.fieldSection,
              ),
              CatchMetadataText(
                '250 views',
                color: CatchTokens.of(context).ink2,
              ),
              CatchMetadataText(
                'Sold out',
                color: CatchTokens.of(context).ink2,
                uppercase: true,
              ),
            ],
          ),
        ),
      );
    }, tags: const ['golden']);
  }
}
