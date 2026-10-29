import 'package:catch_dating_app/contexts/forms/domain/forms/form_definition_fields.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:meta/meta.dart';

@immutable
class HostFormSection {
  HostFormSection.fromMap(Map<String, Object?> json)
    : _json = Map.unmodifiable(formDefinitionDeepStringMap(json));

  factory HostFormSection.create({required String sectionId, String? title}) =>
      HostFormSection.fromMap({
        'sectionId': sectionId,
        'title': title ?? 'New section',
        'description': null,
        'pageBreak': false,
        'questions': const <Object?>[],
      });

  final Map<String, Object?> _json;

  String get sectionId => formDefinitionStringValue(_json['sectionId']);
  String get title => formDefinitionStringValue(_json['title']);
  String? get description => formDefinitionNullableString(_json['description']);
  bool get pageBreak => _json['pageBreak'] == true;
  List<HostFormQuestion> get questions =>
      formDefinitionJsonList(_json['questions'])
          .map(
            (item) =>
                HostFormQuestion.fromMap(formDefinitionDeepStringMap(item)),
          )
          .toList(growable: false);

  Map<String, Object?> toJson() => formDefinitionDeepStringMap(_json);

  HostFormSection copyWith({
    String? title,
    String? description,
    bool clearDescription = false,
    bool? pageBreak,
  }) {
    final next = toJson();
    if (title != null) next['title'] = title;
    if (description != null || clearDescription) {
      next['description'] = clearDescription ? null : description;
    }
    if (pageBreak != null) next['pageBreak'] = pageBreak;
    return HostFormSection.fromMap(next);
  }

  HostFormSection addQuestion(HostFormQuestion question) {
    final next = toJson();
    final questions = formDefinitionJsonList(next['questions'])
      ..add(question.toJson());
    next['questions'] = questions;
    return HostFormSection.fromMap(next);
  }

  HostFormSection replaceQuestion(int index, HostFormQuestion question) {
    final next = toJson();
    final questions = formDefinitionJsonList(next['questions']);
    questions[index] = question.toJson();
    next['questions'] = questions;
    return HostFormSection.fromMap(next);
  }

  HostFormSection removeQuestion(int index) {
    final next = toJson();
    final questions = formDefinitionJsonList(next['questions'])
      ..removeAt(index);
    next['questions'] = questions;
    return HostFormSection.fromMap(next);
  }

  HostFormSection moveQuestion(int oldIndex, int newIndex) {
    final next = toJson();
    final questions = formDefinitionJsonList(next['questions']);
    final question = questions.removeAt(oldIndex);
    questions.insert(newIndex, question);
    next['questions'] = questions;
    return HostFormSection.fromMap(next);
  }
}
