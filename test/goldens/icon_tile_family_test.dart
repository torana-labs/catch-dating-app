import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('icon family preserves recipes at scale $scale', (
      tester,
    ) async {
      await matchCatchGolden(
        tester,
        'icon_tile_family${scale == 1 ? '' : '@2.0'}',
        textScale: scale,
        size: const Size(500, 750),
        builder: (context) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            spacing: 20,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  CatchIconTile(
                    icon: CatchIcons.event,
                    iconColor: CatchTokens.of(context).primary,
                  ),
                  CatchIconTile.empty(icon: CatchIcons.search),
                  CatchIconTile.empty(
                    icon: CatchIcons.search,
                    variant: CatchIconTileVariant.bubble,
                  ),
                  const CatchIconTile.error(),
                ],
              ),
              CatchEmptyState(
                icon: CatchIcons.search,
                iconVariant: CatchIconTileVariant.bubble,
                title: 'No matches yet',
                message: 'Try a different filter.',
              ),
              const CatchErrorState(
                title: 'Could not load',
                message: 'Try again shortly.',
                mode: CatchErrorStateMode.compact,
              ),
            ],
          ),
        ),
      );
    }, tags: const ['golden']);
  }
}
