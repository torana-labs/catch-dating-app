import 'package:catch_dating_app/event_success/presentation/event_success_progress_status.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_stepper.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'progress cue state resolves complete, current, and future positions',
    () {
      expect(
        EventSuccessProgressStatus.fromPosition(index: 0, currentIndex: 1),
        EventSuccessProgressStatus.complete,
      );
      expect(
        EventSuccessProgressStatus.fromPosition(index: 1, currentIndex: 1),
        EventSuccessProgressStatus.current,
      );
      expect(
        EventSuccessProgressStatus.fromPosition(index: 2, currentIndex: 1),
        EventSuccessProgressStatus.future,
      );
    },
  );

  testWidgets('countdown rail owns rendering for ordered progress items', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: EventSuccessCountdownStepper(
            items: const [
              (label: 'Hold', icon: Icons.pan_tool_alt_outlined),
              (label: 'Watch', icon: Icons.visibility_outlined),
              (label: 'Move', icon: Icons.bolt_rounded),
            ],
            currentIndex: 1,
          ),
        ),
      ),
    );

    expect(find.text('Hold'), findsOneWidget);
    expect(find.text('Watch'), findsOneWidget);
    expect(find.text('Move'), findsOneWidget);
    expect(find.byIcon(CatchIcons.success), findsOneWidget);
    expect(find.byIcon(Icons.pan_tool_alt_outlined), findsNothing);

    final icons = tester.widgetList<Icon>(find.byType(Icon)).toList();
    expect(icons.map((icon) => icon.color), [
      CatchTokens.light.success,
      CatchTokens.light.gold,
      CatchTokens.light.ink3,
    ]);
  });
}
