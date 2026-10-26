import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/core/widgets/block_user_dialog.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  testWidgets('date picker uses Cupertino chrome on iOS', (tester) async {
    await _withIosPlatform(() async {
      DateTime? picked;

      await tester.pumpWidget(
        _wrap(
          Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                picked = await showCatchDatePicker(
                  copy: catchDatePickerCopy(context.l10n),
                  context: context,
                  initialDate: DateTime(2026, 5, 12),
                  firstDate: DateTime(2026, 5),
                  lastDate: DateTime(2026, 5, 31),
                  title: 'Event date',
                );
              },
              child: const Text('Open date picker'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open date picker'));
      await pumpFeatureUi(tester);

      expect(find.byType(CupertinoDatePicker), findsOneWidget);
      expect(find.text('Event date'), findsOneWidget);
      expect(find.text('OK'), findsNothing);

      await tester.tap(find.text('Done'));
      await pumpFeatureUi(tester);

      expect(picked, DateTime(2026, 5, 12));
    });
  });

  testWidgets('time picker uses Cupertino chrome on iOS', (tester) async {
    await _withIosPlatform(() async {
      TimeOfDay? picked;

      await tester.pumpWidget(
        _wrap(
          Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                picked = await showCatchTimePicker(
                  copy: catchTimePickerCopy(context.l10n),
                  context: context,
                  initialTime: const TimeOfDay(hour: 7, minute: 30),
                  title: 'Start time',
                );
              },
              child: const Text('Open time picker'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open time picker'));
      await pumpFeatureUi(tester);

      expect(find.byType(CupertinoDatePicker), findsOneWidget);
      expect(find.text('Start time'), findsOneWidget);
      expect(find.byIcon(CatchIcons.keyboard), findsNothing);

      await tester.tap(find.text('Done'));
      await pumpFeatureUi(tester);

      expect(picked, const TimeOfDay(hour: 7, minute: 30));
    });
  });

  testWidgets('adaptive dialog uses Cupertino alerts on iOS', (tester) async {
    await _withIosPlatform(() async {
      bool? result;

      await tester.pumpWidget(
        _wrap(
          Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                result = await showCatchAdaptiveDialog<bool>(
                  context: context,
                  title: 'Delete draft?',
                  message: 'This will permanently delete the draft.',
                  actions: const [
                    CatchDialogAction(label: 'Cancel', value: false),
                    CatchDialogAction(
                      label: 'Delete',
                      value: true,
                      isDestructive: true,
                    ),
                  ],
                );
              },
              child: const Text('Open dialog'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open dialog'));
      await pumpFeatureUi(tester);

      expect(find.byType(CupertinoAlertDialog), findsOneWidget);
      expect(find.byType(AlertDialog), findsNothing);

      await tester.tap(find.text('Delete'));
      await pumpFeatureUi(tester);

      expect(result, isTrue);
    });
  });

  testWidgets(
    'adaptive dialog uses Catch confirm cards on Material platforms',
    (tester) async {
      bool? result;

      await tester.pumpWidget(
        _wrap(
          Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                result = await showCatchAdaptiveDialog<bool>(
                  context: context,
                  title: 'Delete draft?',
                  message: 'This will permanently delete the draft.',
                  actions: const [
                    CatchDialogAction(label: 'Cancel', value: false),
                    CatchDialogAction(
                      label: 'Delete',
                      value: true,
                      isDestructive: true,
                    ),
                  ],
                );
              },
              child: const Text('Open dialog'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open dialog'));
      await pumpFeatureUi(tester);

      expect(find.byType(Dialog), findsOneWidget);
      expect(find.byType(CatchDialog<bool>), findsOneWidget);
      expect(find.byType(AlertDialog), findsNothing);
      expect(find.widgetWithText(CatchButton, 'Cancel'), findsOneWidget);
      expect(find.widgetWithText(CatchButton, 'Delete'), findsOneWidget);
      final surface = tester.widget<CatchSurface>(
        find.descendant(
          of: find.byType(CatchDialog<bool>),
          matching: find.byType(CatchSurface),
        ),
      );
      expect(surface.width, CatchLayout.confirmDialogMaxWidth);
      expect(surface.padding, CatchInsets.confirmDialogCard);

      await tester.tap(find.widgetWithText(CatchButton, 'Delete'));
      await pumpFeatureUi(tester);

      expect(result, isTrue);
    },
  );

  testWidgets(
    'showCatchConfirmDialog applies handoff labels and danger action',
    (tester) async {
      bool? result;

      await tester.pumpWidget(
        _wrap(
          Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                result = await showCatchConfirmDialog(
                  copy: catchDialogCopy(context.l10n),
                  context: context,
                  title: 'Remove host?',
                  message: 'This host will lose access.',
                  confirmLabel: 'Remove',
                  danger: true,
                );
              },
              child: const Text('Open confirm dialog'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open confirm dialog'));
      await pumpFeatureUi(tester);

      expect(find.byType(CatchDialog<bool>), findsOneWidget);
      expect(find.text('Remove host?'), findsOneWidget);
      expect(find.text('This host will lose access.'), findsOneWidget);
      expect(find.widgetWithText(CatchButton, 'Cancel'), findsOneWidget);
      expect(find.widgetWithText(CatchButton, 'Remove'), findsOneWidget);

      final cancel = tester.widget<CatchButton>(
        find.widgetWithText(CatchButton, 'Cancel'),
      );
      final confirm = tester.widget<CatchButton>(
        find.widgetWithText(CatchButton, 'Remove'),
      );
      expect(cancel.variant, CatchButtonVariant.secondary);
      expect(confirm.variant, CatchButtonVariant.danger);

      await tester.tap(find.widgetWithText(CatchButton, 'Remove'));
      await pumpFeatureUi(tester);

      expect(result, isTrue);
    },
  );

  testWidgets('block user dialog uses the shared danger confirm card', (
    tester,
  ) async {
    bool? result;

    await tester.pumpWidget(
      _wrap(
        Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              result = await showBlockUserDialog(
                context: context,
                name: 'Riya',
              );
            },
            child: const Text('Open block dialog'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open block dialog'));
    await pumpFeatureUi(tester);

    expect(find.byType(Dialog), findsOneWidget);
    expect(find.byType(AlertDialog), findsNothing);
    expect(find.text('Block Riya?'), findsOneWidget);
    expect(find.widgetWithText(CatchButton, 'Cancel'), findsOneWidget);
    expect(find.widgetWithText(CatchButton, 'Block'), findsOneWidget);

    await tester.tap(find.widgetWithText(CatchButton, 'Block'));
    await pumpFeatureUi(tester);

    expect(result, isTrue);
  });

  testWidgets('page tabs use the canonical selection renderer on iOS', (
    tester,
  ) async {
    await _withIosPlatform(() async {
      final controller = TabController(length: 2, vsync: tester);
      addTearDown(controller.dispose);

      await tester.pumpWidget(
        _wrap(
          CatchPageTabBar<int>.controlled(
            controller: controller,
            options: const [
              CatchOption(value: 0, label: 'Dashboard'),
              CatchOption(value: 1, label: 'Activity'),
            ],
          ),
        ),
      );

      expect(find.byType(CatchChoiceInput<int>), findsOneWidget);
      expect(find.byType(TabBar), findsNothing);

      await tester.tap(find.text('Activity'));
      await pumpFeatureUi(tester);

      expect(controller.index, 1);
    });
  });
}

Future<void> _withIosPlatform(Future<void> Function() body) async {
  debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
  try {
    await body();
  } finally {
    debugDefaultTargetPlatformOverride = null;
  }
}

Widget _wrap(Widget child) {
  return MaterialApp(
    theme: AppTheme.light,
    darkTheme: AppTheme.dark,
    localizationsDelegates: const [
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    supportedLocales: const [Locale('en')],
    home: Scaffold(body: Center(child: child)),
  );
}
