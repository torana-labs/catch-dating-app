import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  for (final brightness in Brightness.values) {
    testWidgets('standalone foundations render in $brightness', (tester) async {
      final theme = brightness == Brightness.light
          ? CatchTheme.light
          : CatchTheme.dark;
      final tokens = brightness == Brightness.light
          ? CatchTokens.light
          : CatchTokens.dark;
      await tester.pumpWidget(
        MaterialApp(
          theme: theme,
          home: Builder(
            builder: (context) {
              expect(CatchTokens.of(context), tokens);
              expect(Theme.of(context).brightness, brightness);
              return Scaffold(
                body: Column(
                  children: [
                    Text('Catch', style: CatchTextStyles.titleL(context)),
                    Text('12:30', style: CatchTextStyles.mono(context)),
                    Icon(CatchIcons.activityRunning),
                  ],
                ),
              );
            },
          ),
        ),
      );
      expect(
        tester.widget<Text>(find.text('Catch')).style!.fontFamily,
        CatchFonts.functionFamily,
      );
      expect(
        tester.widget<Text>(find.text('12:30')).style!.fontFamily,
        'packages/catch_ui/IBM Plex Mono',
      );
      expect(tester.takeException(), isNull);
    });
  }

  test('standalone package bundles every branded font and license', () async {
    for (final name in [
      'Archivo-Roman-VF.ttf',
      'IBMPlexMono-Regular.ttf',
      'IBMPlexMono-Medium.ttf',
      'IBMPlexMono-SemiBold.ttf',
      'IBMPlexMono-Bold.ttf',
      'OFL-Archivo.txt',
      'OFL-IBMPlexMono.txt',
    ]) {
      final bytes = await rootBundle.load(
        'packages/catch_ui/assets/fonts/$name',
      );
      expect(bytes.lengthInBytes, greaterThan(0), reason: name);
    }
  });
}
