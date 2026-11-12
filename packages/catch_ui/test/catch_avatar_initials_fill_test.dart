import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

// The three names land on the three initials tones (the sum of their runes
// modulo 3 is 0, 1 and 2).
const _names = ['Zoya Merchant', 'Aanya Sharma', 'Dev Patel'];

void main() {
  for (final (label, theme) in [
    ('light', CatchTheme.light),
    ('dark', CatchTheme.dark),
  ]) {
    testWidgets(
      'every person initials tone stands off the page background ($label)',
      (tester) async {
        final fills = <Color>[];
        late CatchTokens tokens;
        for (final name in _names) {
          await tester.pumpWidget(
            MaterialApp(
              theme: theme,
              home: Scaffold(
                body: Center(
                  child: Builder(
                    builder: (context) {
                      tokens = CatchTokens.of(context);
                      return CatchAvatar(size: 40, name: name);
                    },
                  ),
                ),
              ),
            ),
          );
          fills.add(
            tester
                .widget<ColoredBox>(
                  find.descendant(
                    of: find.byType(CatchAvatar),
                    matching: find.byType(ColoredBox),
                  ),
                )
                .color,
          );
        }
        for (final (index, fill) in fills.indexed) {
          expect(
            fill,
            isNot(tokens.bg),
            reason: '${_names[index]} must not disappear into the page',
          );
        }
        expect(fills.toSet(), hasLength(3));
      },
    );
  }
}
