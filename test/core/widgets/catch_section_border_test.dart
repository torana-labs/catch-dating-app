import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('CatchSection contained error owns the danger state', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: CatchSection.contained(
            states: {WidgetState.focused, WidgetState.error},
            child: Text('Section body'),
          ),
        ),
      ),
    );

    final surface = tester.widget<CatchSurface>(find.byType(CatchSurface));
    expect(
      surface.borderSpec?.side,
      CatchBorder.resolve(
        CatchTokens.editorialLight,
        CatchBorderRole.danger,
      ).side,
    );
    expect(surface.boxShadow, isNull);
  });
}
