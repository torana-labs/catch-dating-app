import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_age_range_field.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('event age range maps slider endpoints to policy sentinels', (
    tester,
  ) async {
    final minController = TextEditingController();
    final maxController = TextEditingController();
    addTearDown(minController.dispose);
    addTearDown(maxController.dispose);
    var committed = (minAge: -1, maxAge: -1);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: EventAgeRangeField(
            minAgeController: minController,
            maxAgeController: maxController,
            minimumContract: CatchContractConstraints
                .createEventCallablePayloadConstraintsMinAge,
            maximumContract: CatchContractConstraints
                .createEventCallablePayloadConstraintsMaxAge,
            initiallyOpen: true,
            onChangeEnd: (minAge, maxAge) =>
                committed = (minAge: minAge, maxAge: maxAge),
          ),
        ),
      ),
    );

    expect(find.text('18–99+'), findsOneWidget);
    var slider = tester.widget<CatchRangeInput>(find.byType(CatchRangeInput));
    expect(slider.values, const RangeValues(18, 99));

    slider.onChanged!(const RangeValues(21, 35));
    await tester.pump();
    expect(minController.text, '21');
    expect(maxController.text, '35');
    expect(find.text('21–35'), findsOneWidget);

    slider = tester.widget<CatchRangeInput>(find.byType(CatchRangeInput));
    slider.onChangeEnd!(const RangeValues(21, 35));
    expect(committed, (minAge: 21, maxAge: 35));

    slider.onChanged!(const RangeValues(18, 99));
    await tester.pump();
    expect(minController.text, isEmpty);
    expect(maxController.text, isEmpty);
    slider = tester.widget<CatchRangeInput>(find.byType(CatchRangeInput));
    slider.onChangeEnd!(const RangeValues(18, 99));
    expect(committed, (minAge: 0, maxAge: 99));
  });

  testWidgets('event age range follows externally restored controller values', (
    tester,
  ) async {
    final minController = TextEditingController();
    final maxController = TextEditingController();
    addTearDown(minController.dispose);
    addTearDown(maxController.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: EventAgeRangeField(
            minAgeController: minController,
            maxAgeController: maxController,
            minimumContract: CatchContractConstraints
                .createEventCallablePayloadConstraintsMinAge,
            maximumContract: CatchContractConstraints
                .createEventCallablePayloadConstraintsMaxAge,
          ),
        ),
      ),
    );

    minController.text = '25';
    maxController.text = '42';
    await tester.pump();

    expect(find.text('25–42'), findsOneWidget);
    expect(
      tester
          .widget<CatchRangeInput>(
            find.byType(CatchRangeInput, skipOffstage: false),
          )
          .values,
      const RangeValues(25, 42),
    );
  });
}
