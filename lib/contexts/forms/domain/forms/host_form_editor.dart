import 'package:catch_dating_app/contexts/forms/domain/forms/form_definition_fields.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:meta/meta.dart';

enum HostFormValidationSeverity { error, warning }

@immutable
class HostFormTemplateSummary {
  const HostFormTemplateSummary({
    required this.templateId,
    required this.version,
    required this.title,
    required this.description,
    required this.purpose,
    required this.identityPolicy,
    required this.sectionCount,
    required this.questionCount,
  });

  factory HostFormTemplateSummary.fromMap(Map<Object?, Object?> map) =>
      HostFormTemplateSummary(
        templateId: formDefinitionRequiredString(map, 'templateId'),
        version: formDefinitionRequiredInt(map, 'version'),
        title: formDefinitionRequiredString(map, 'title'),
        description: formDefinitionNullableString(map['description']),
        purpose: formDefinitionEnumByName(
          HostFormPurpose.values,
          formDefinitionRequiredString(map, 'purpose'),
          'form purpose',
        ),
        identityPolicy: formDefinitionEnumByName(
          HostFormIdentityPolicy.values,
          formDefinitionRequiredString(map, 'identityPolicy'),
          'form identity policy',
        ),
        sectionCount: formDefinitionRequiredInt(map, 'sectionCount'),
        questionCount: formDefinitionRequiredInt(map, 'questionCount'),
      );

  final String templateId;
  final int version;
  final String title;
  final String? description;
  final HostFormPurpose purpose;
  final HostFormIdentityPolicy identityPolicy;
  final int sectionCount;
  final int questionCount;
}

@immutable
class HostFormValidationIssue {
  const HostFormValidationIssue({
    required this.code,
    required this.path,
    required this.message,
    required this.severity,
  });

  factory HostFormValidationIssue.fromMap(Map<Object?, Object?> map) =>
      HostFormValidationIssue(
        code: formDefinitionRequiredString(map, 'code'),
        path: formDefinitionRequiredString(map, 'path'),
        message: formDefinitionRequiredString(map, 'message'),
        severity: formDefinitionEnumByName(
          HostFormValidationSeverity.values,
          formDefinitionRequiredString(map, 'severity'),
          'validation severity',
        ),
      );

  final String code;
  final String path;
  final String message;
  final HostFormValidationSeverity severity;
}

@immutable
class HostFormEditor {
  const HostFormEditor({
    required this.form,
    required this.definition,
    required this.validationIssues,
  });

  factory HostFormEditor.fromCallableData(Object? data) {
    final map = formDefinitionRequiredMap(data, 'organizer form editor');
    return HostFormEditor(
      form: HostFormSummary.fromMap(
        formDefinitionRequiredMap(map['form'], 'organizer form summary'),
      ),
      definition: HostFormDefinition.fromMap(
        formDefinitionRequiredMap(
          map['definition'],
          'organizer form definition',
        ),
      ),
      validationIssues: formDefinitionMapList(
        map['validationIssues'],
        'form validation issues',
      ).map(HostFormValidationIssue.fromMap).toList(growable: false),
    );
  }

  final HostFormSummary form;
  final HostFormDefinition definition;
  final List<HostFormValidationIssue> validationIssues;

  HostFormEditor copyWith({
    HostFormSummary? form,
    HostFormDefinition? definition,
    List<HostFormValidationIssue>? validationIssues,
  }) => HostFormEditor(
    form: form ?? this.form,
    definition: definition ?? this.definition,
    validationIssues: validationIssues ?? this.validationIssues,
  );
}
