import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

EventSuccessPlan withoutModule(EventSuccessPlan plan, String moduleId) {
  return plan.copyWith(
    selectedModuleIds: plan.selectedModuleIds
        .where((id) => id != moduleId)
        .toList(growable: false),
  );
}

Future<void> revealCustomization(WidgetTester tester, Finder content) async {
  expect(content, findsNothing);
  await tester.tap(find.text('Customize'));
  await pumpFeatureUi(tester);
  expect(content, findsOneWidget);
}
