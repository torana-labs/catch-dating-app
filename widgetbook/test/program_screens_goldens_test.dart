import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/programs/use_cases.dart';

void main() {
  final cases = <String, WidgetBuilder>{
    'program_work': programWorkScreenStates,
    'program_arrivals': programArrivalsScreenStates,
    'program_dispatch': programDispatchScreenStates,
    'program_hotel_desk': programHotelDeskScreenStates,
    'program_trips': programTripsScreenStates,
  };
  for (final entry in cases.entries) {
    testWidgets('${entry.key} renders', (tester) async {
      tester.view.devicePixelRatio = 1.0;
      tester.view.physicalSize = const Size(460, 1000);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Builder(builder: entry.value),
        ),
      );
      for (var i = 0; i < 12; i++) {
        await tester.pump(const Duration(milliseconds: 50));
      }
      expect(tester.takeException(), isNull);
      await expectLater(
        find.byType(MaterialApp),
        matchesGoldenFile('program_screens/${entry.key}.png'),
      );
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
}
