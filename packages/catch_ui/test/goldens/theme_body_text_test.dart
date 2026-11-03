import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  testWidgets('golden theme switches refresh inherited body text', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'theme_body_text',
      size: const Size(440, 200),
      builder: (context) => Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('Inherited body text'),
          Text(
            'Explicit body text',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
    final label = find.text('Inherited body text');
    final theme = Theme.of(tester.element(label));
    final paragraph = tester.renderObject<RenderParagraph>(label);
    expect(theme.brightness, Brightness.values.last);
    expect(
      paragraph.text.style?.color,
      theme.textTheme.bodyMedium?.color,
      reason: 'Paused inherited text must not retain the previous theme color',
    );
  });
}
