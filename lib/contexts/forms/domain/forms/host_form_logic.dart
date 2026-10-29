import 'package:catch_dating_app/contexts/forms/domain/forms/form_definition_fields.dart';
import 'package:meta/meta.dart';

enum HostFormLogicOperator {
  equals,
  notEquals,
  contains,
  notContains,
  greaterThan,
  lessThan,
  answered,
  notAnswered,
}

enum HostFormLogicAction {
  showQuestion,
  hideQuestion,
  showSection,
  hideSection,
  routeToSection,
  finish,
}

@immutable
class HostFormLogicRule {
  HostFormLogicRule.fromMap(Map<String, Object?> json)
    : _json = Map.unmodifiable(formDefinitionDeepStringMap(json));

  factory HostFormLogicRule.create({
    required String ruleId,
    required String questionId,
    required HostFormLogicOperator operator,
    required List<Object?> expectedValues,
    required HostFormLogicAction action,
    String? targetQuestionId,
    String? targetSectionId,
  }) => HostFormLogicRule.fromMap({
    'ruleId': ruleId,
    'conditionMode': 'all',
    'conditions': [
      {
        'questionId': questionId,
        'operator': operator.name,
        'expectedValues': expectedValues,
      },
    ],
    'action': action.name,
    'targetQuestionId': targetQuestionId,
    'targetSectionId': targetSectionId,
  });

  final Map<String, Object?> _json;

  String get ruleId => formDefinitionStringValue(_json['ruleId']);
  HostFormLogicAction get action => formDefinitionEnumByName(
    HostFormLogicAction.values,
    formDefinitionStringValue(_json['action']),
    'form logic action',
  );
  String? get targetQuestionId =>
      formDefinitionNullableString(_json['targetQuestionId']);
  String? get targetSectionId =>
      formDefinitionNullableString(_json['targetSectionId']);
  bool get allConditionsRequired => _json['conditionMode'] == 'all';
  List<HostFormLogicCondition> get conditions => formDefinitionJsonList(
    _json['conditions'],
  ).map(HostFormLogicCondition._).toList(growable: false);
  HostFormLogicCondition get condition => HostFormLogicCondition._(
    formDefinitionJsonList(_json['conditions']).first,
  );

  Map<String, Object?> toJson() => formDefinitionDeepStringMap(_json);

  bool matches(Map<String, Object?> answers) {
    final results = conditions.map((condition) => condition.matches(answers));
    return allConditionsRequired
        ? results.every((value) => value)
        : results.any((value) => value);
  }
}

@immutable
class HostFormLogicCondition {
  HostFormLogicCondition._(Map<String, Object?> json)
    : _json = Map.unmodifiable(formDefinitionDeepStringMap(json));

  final Map<String, Object?> _json;

  String get questionId => formDefinitionStringValue(_json['questionId']);
  HostFormLogicOperator get operator => formDefinitionEnumByName(
    HostFormLogicOperator.values,
    formDefinitionStringValue(_json['operator']),
    'form logic operator',
  );
  List<Object?> get expectedValues =>
      List<Object?>.unmodifiable(_json['expectedValues'] as List? ?? const []);

  bool matches(Map<String, Object?> answers) {
    final answer = answers[questionId];
    final values = answer is Iterable ? answer.toList() : [answer];
    return switch (operator) {
      HostFormLogicOperator.answered => !_emptyFormAnswer(answer),
      HostFormLogicOperator.notAnswered => _emptyFormAnswer(answer),
      HostFormLogicOperator.equals => expectedValues.any(
        (value) => answer == value,
      ),
      HostFormLogicOperator.notEquals => expectedValues.every(
        (value) => answer != value,
      ),
      HostFormLogicOperator.contains => expectedValues.any(
        (value) => values.contains(value),
      ),
      HostFormLogicOperator.notContains => expectedValues.every(
        (value) => !values.contains(value),
      ),
      HostFormLogicOperator.greaterThan =>
        answer is num &&
            expectedValues.firstOrNull is num &&
            answer > (expectedValues.first as num),
      HostFormLogicOperator.lessThan =>
        answer is num &&
            expectedValues.firstOrNull is num &&
            answer < (expectedValues.first as num),
    };
  }
}

bool _emptyFormAnswer(Object? value) =>
    value == null || value == '' || (value is Iterable && value.isEmpty);
