import 'package:catch_dating_app/dashboard/presentation/widgets/empty_hero_card.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Find an event CTA stays legible in dark mode', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: const Scaffold(body: EmptyHeroCard()),
      ),
    );

    final label = tester.widget<Text>(find.text('Find an event near me'));

    expect(label.style?.color, CatchTokens.editorialLight.ink);
  });
}
