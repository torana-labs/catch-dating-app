import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('explanatory production choices route through optionCards', () {
    final dartFiles = Directory('lib')
        .listSync(recursive: true)
        .whereType<File>()
        .where((file) => file.path.endsWith('.dart'));
    final productionSource = dartFiles
        .map((file) => file.readAsStringSync())
        .join('\n');

    for (final type in const [
      'EventAdmissionDefaultPreset',
      'EventAdmissionPreset',
      'EventCancellationPolicyId',
      'EventSuccessUnitKind',
      '_QuestionnaireMode',
    ]) {
      expect(
        productionSource,
        isNot(contains('CatchField<$type>.choices')),
        reason: '$type has per-option descriptions and must use optionCards.',
      );
    }

    final structureEditor = File(
      'lib/event_success/presentation/event_success_structure_config_editor.dart',
    ).readAsStringSync();
    expect(
      structureEditor,
      isNot(
        matches(
          RegExp(
            r'CatchField<bool>\.choices\s*\(\s*title:\s*value\.unitKind\.countLabel',
            multiLine: true,
          ),
        ),
      ),
      reason: 'Auto and Fixed need their own explanatory option cards.',
    );

    final questionnaireEditor = File(
      'lib/event_success/presentation/event_success_questionnaire_config_editor.dart',
    ).readAsStringSync();
    expect(
      questionnaireEditor,
      contains('CatchField<String>.optionCards('),
      reason: 'Question-set templates expose a subtitle per option.',
    );

    expect(
      RegExp(
        r'CatchField<[^>]+>\.optionCards',
      ).allMatches(productionSource).length,
      // Ten selectors were migrated; the EventAdmissionPreset and
      // EventCancellationPolicyId ones left with the legacy host screens in
      // #1598 (the type checks above still forbid their choices form).
      greaterThanOrEqualTo(9),
      reason: 'The approved migration covers nine live production selectors.',
    );
  });
}
