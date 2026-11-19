import 'package:catch_dating_app/contexts/live/domain/event_success_assignment_features.dart';
import 'package:flutter_test/flutter_test.dart';

const _choiceQuestion = EventSuccessAssignmentFeatureQuestion(
  questionId: 'question-1',
  label: 'Music style',
  kind: 'singleChoice',
  options: [
    EventSuccessAssignmentFeatureOption(optionId: 'jazz', label: 'Jazz'),
    EventSuccessAssignmentFeatureOption(optionId: 'folk', label: 'Folk'),
  ],
);
const _source = EventSuccessAssignmentFeatureSource(
  formId: 'form-1',
  formTitle: 'Event questions',
  versionId: 'version-1',
  isActiveVersion: true,
  questions: [_choiceQuestion],
);
void main() {
  test(
    'published option identity and explicit ordinal order survive mapping',
    () {
      final rule = EventSuccessAssignmentFeatureRule.fromPublishedQuestion(
        source: _source,
        question: _choiceQuestion,
        kind: 'ordinal',
        mode: 'preferDifferent',
        weight: 2,
        ordinalOrder: const ['folk', 'jazz'],
      );
      expect(rule.toJson()['optionIds'], ['jazz', 'folk']);
      expect(rule.toJson()['scoreByOptionId'], {'folk': 0, 'jazz': 1});
      expect(rule.versionId, 'version-1');
      expect(rule.questionId, 'question-1');
      expect(
        () => EventSuccessAssignmentFeatureRule.fromPublishedQuestion(
          source: _source,
          question: _choiceQuestion,
          kind: 'ordinal',
          mode: 'preferDifferent',
          weight: 2,
          ordinalOrder: const ['folk'],
        ),
        throwsArgumentError,
      );
    },
  );

  test('number mapping requires finite distinct bounds', () {
    const number = EventSuccessAssignmentFeatureQuestion(
      questionId: 'distance',
      label: 'Distance',
      kind: 'number',
      options: [],
    );
    const source = EventSuccessAssignmentFeatureSource(
      formId: 'form-2',
      formTitle: 'Run form',
      versionId: 'version-2',
      isActiveVersion: true,
      questions: [number],
    );
    expect(
      () => EventSuccessAssignmentFeatureRule.fromPublishedQuestion(
        source: source,
        question: number,
        kind: 'number',
        mode: 'preferSimilar',
        weight: 1,
        minimum: double.nan,
        maximum: 10,
      ),
      throwsArgumentError,
    );
    expect(
      () => EventSuccessAssignmentFeatureRule.fromPublishedQuestion(
        source: source,
        question: number,
        kind: 'number',
        mode: 'preferSimilar',
        weight: 1,
        minimum: 10,
        maximum: 10,
      ),
      throwsArgumentError,
    );
  });
}
