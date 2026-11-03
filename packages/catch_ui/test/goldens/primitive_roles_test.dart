@Tags(['golden'])
library;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('primitive roles and control precedence at scale $scale', (
      tester,
    ) async {
      await matchCatchGolden(
        tester,
        'primitive_roles${scale == 1 ? '' : '@2.0'}',
        textScale: scale,
        size: const Size(440, 1020),
        builder: (context) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              for (final enabled in [true, false])
                for (final hasError in [false, true])
                  for (final focused in [false, true])
                    CatchControlSurface(
                      status: hasError
                          ? CatchControlSurfaceStatus.error
                          : focused
                          ? CatchControlSurfaceStatus.focused
                          : CatchControlSurfaceStatus.resting,

                      enabled: enabled,

                      child: Text('Enabled $enabled · error $hasError'),
                    ),
              const CatchSheetDragIndicator(),
              const CatchPageIndicator(selectedIndex: 1, itemCount: 4),
              const Align(child: CatchStatusIndicator()),
              const SizedBox(height: 64, child: CatchImageFallbackSurface()),
              CatchFractionalViewport(
                fraction: 0.7,
                maxWidth: 180,
                child: ColoredBox(
                  color: CatchTokens.of(context).primarySoft,
                  child: const SizedBox(height: 32, width: double.infinity),
                ),
              ),
              const CatchPagerFocusViewport(child: Text('Page content')),
            ],
          ),
        ),
      );
    }, tags: const ['golden']);
  }
}
