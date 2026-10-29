import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'CatchSurface.tinted renders the handoff primary-soft inset row',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: const Scaffold(
            body: Center(
              child: CatchSurface.tinted(
                child: Text('Only you see this privacy note.'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Only you see this privacy note.'), findsOneWidget);

      final surface = tester.widget<CatchSurface>(find.byType(CatchSurface));
      expect(surface.tone, CatchSurfaceTone.primarySoft);
      expect(surface.emphasis, CatchSurfaceEmphasis.flat);
      expect(surface.radius, CatchRadius.sm);
      final container = tester.widget<AnimatedContainer>(
        find.descendant(
          of: find.byType(CatchSurface),
          matching: find.byType(AnimatedContainer),
        ),
      );
      expect(container.foregroundDecoration, isNull);
      expect(
        surface.padding,
        const EdgeInsets.symmetric(
          horizontal: CatchSpacing.micro14,
          vertical: CatchSpacing.s3,
        ),
      );
    },
  );
}
