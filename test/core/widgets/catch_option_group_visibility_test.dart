import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

void main() {
  for (final direction in TextDirection.values) {
    testWidgets('Selected tab stays visible at large text in $direction', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(402, 874);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final selected = ValueNotifier('Responses');
      addTearDown(selected.dispose);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: MediaQuery(
            data: const MediaQueryData(
              size: Size(402, 874),
              textScaler: TextScaler.linear(2),
            ),
            child: Directionality(
              textDirection: direction,
              child: Scaffold(
                body: ValueListenableBuilder<String>(
                  valueListenable: selected,
                  builder: (context, value, _) =>
                      CatchChoiceInput<String>.segmented(
                        options: const [
                          CatchOption(value: 'People', label: 'People'),
                          CatchOption(value: 'Groups', label: 'Groups'),
                          CatchOption(value: 'Forms', label: 'Forms'),
                          CatchOption(value: 'Responses', label: 'Responses'),
                        ],
                        selected: value,
                        contractExemption: 'Test navigation destinations.',
                        onChanged: (value) => selected.value = value,
                      ),
                ),
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      void expectVisible(String label) {
        final rect = tester.getRect(find.text(label));
        expect(rect.left, greaterThanOrEqualTo(0));
        expect(rect.right, lessThanOrEqualTo(402));
        expect(find.text(label).hitTestable(), findsOneWidget);
      }

      expectVisible('Responses');
      selected.value = 'People';
      await pumpFeatureUi(tester);
      expectVisible('People');
      expect(tester.takeException(), isNull);
    });
  }
}
