import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_query_editor_section.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

void main() {
  testWidgets(
    'editor applies a typed city condition from the published catalog',
    (tester) async {
      HostResponsePredicate? applied;
      await _pumpEditor(tester, (value) => applied = value);
      await tester.tap(find.text('Add condition'));
      await pumpFeatureUi(tester);
      expect(
        find.byKey(const ValueKey('response-condition-0')),
        findsOneWidget,
      );

      await tester.tap(find.text('Condition: Present'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Any selected'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Mumbai'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Apply filters'));
      await pumpFeatureUi(tester);

      expect(applied, isA<HostResponseGroup>());
      expect(applied!.toJson(), {
        'all': [
          {
            'questionId': 'city',
            'op': 'choiceAny',
            'values': ['Mumbai'],
          },
        ],
      });
    },
  );

  testWidgets('reset clears conditions and nested groups stay bounded', (
    tester,
  ) async {
    HostResponsePredicate? applied = const HostResponseCondition(
      questionId: 'city',
      operator: HostResponseOperator.present,
    );
    await _pumpEditor(tester, (value) => applied = value);
    await tester.tap(find.text('Add group'));
    await pumpFeatureUi(tester);
    expect(find.byKey(const ValueKey('response-group-0')), findsOneWidget);
    expect(
      find.byKey(const ValueKey('response-condition-0-0')),
      findsOneWidget,
    );
    expect(find.text('Add group'), findsOneWidget);

    await tester.tap(find.text('Reset filters'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Apply filters'));
    await pumpFeatureUi(tester);
    expect(applied, isNull);
  });
}

Future<void> _pumpEditor(
  WidgetTester tester,
  ValueChanged<HostResponsePredicate?> onApply,
) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(
        body: SingleChildScrollView(
          child: HostResponseQueryEditorSection(
            fields: const [
              HostResponseQueryField(
                questionId: 'city',
                label: 'Event city',
                kind: 'singleChoice',
                operators: {
                  HostResponseOperator.present,
                  HostResponseOperator.missing,
                  HostResponseOperator.choiceAny,
                },
                sortable: true,
                options: {'Mumbai': 'Mumbai', 'Delhi': 'Delhi'},
              ),
            ],
            copy: _copy,
            onApply: onApply,
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

final _copy = HostResponseQueryEditorCopy(
  title: 'Filter responses',
  matchAll: 'Match all',
  matchAny: 'Match any',
  field: 'Field',
  condition: 'Condition',
  value: 'Value',
  minimum: 'Minimum',
  maximum: 'Maximum',
  yes: 'Yes',
  no: 'No',
  addCondition: 'Add condition',
  addGroup: 'Add group',
  remove: 'Remove',
  apply: 'Apply filters',
  reset: 'Reset filters',
  invalidCondition: 'Complete the filter before applying it.',
  operatorLabels: {
    for (final operator in HostResponseOperator.values)
      operator: switch (operator) {
        HostResponseOperator.present => 'Present',
        HostResponseOperator.choiceAny => 'Any selected',
        _ => operator.name,
      },
  },
);
