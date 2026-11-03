import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('compact action recipes at scale $scale', (tester) async {
      await matchCatchGolden(
        tester,
        'compact_action_family@$scale',
        size: const Size(440, 1400),
        textScale: scale,
        builder: (context) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 20,
            children: [
              for (final tone in CatchButtonTone.values)
                Row(
                  children: [
                    Expanded(
                      child: CatchButton.text(
                        label: 'Try again',
                        tone: tone,
                        onPressed: _noop,
                      ),
                    ),
                    Expanded(
                      child: CatchButton.text(
                        label: 'Try again',
                        tone: tone,
                        onPressed: null,
                      ),
                    ),
                  ],
                ),
              const CatchButton.text(
                label: 'Open a longer action',
                leading: Icon(Icons.open_in_new),
                onPressed: _noop,
              ),
              CatchButton.text(
                label: 'Custom color',
                onPressed: _noop,
                foregroundColor: CatchTokens.of(context).danger,
                backgroundColor: CatchTokens.of(context).surface,
                side: BorderSide(color: CatchTokens.of(context).line2),
                padding: const EdgeInsets.all(12),
              ),
              for (final variant in CatchIconActionVariant.values)
                Wrap(
                  spacing: 24,
                  children: [
                    CatchIconAction.icon(
                      icon: Icons.favorite,
                      tooltip: 'Save',
                      variant: variant,
                      onPressed: _noop,
                    ),
                    CatchIconAction.icon(
                      icon: Icons.favorite,
                      tooltip: 'Saved',
                      variant: variant,
                      active: true,
                      onPressed: _noop,
                    ),
                    CatchIconAction.icon(
                      icon: Icons.favorite,
                      tooltip: 'Save unavailable',
                      variant: variant,
                      status: CatchIconActionStatus.disabled,
                      onPressed: _noop,
                    ),
                    CatchIconAction.counted(
                      icon: Icons.notifications,
                      tooltip: 'Notifications',
                      variant: variant,
                      count: 123,
                      onPressed: _noop,
                    ),
                  ],
                ),
              const Wrap(
                spacing: 24,
                children: [
                  CatchIconAction.toolbar(
                    icon: Icons.close,
                    tooltip: 'Close',
                    onPressed: _noop,
                  ),
                  CatchIconAction.toolbar(
                    icon: Icons.close,
                    tooltip: 'Close unavailable',
                  ),
                  CatchIconAction(
                    tooltip: 'Close overlay',
                    variant: CatchIconActionVariant.float,
                    onPressed: _noop,
                    child: Icon(Icons.close, size: CatchIconSize.md),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }, tags: const ['golden']);
  }
}

void _noop() {}
