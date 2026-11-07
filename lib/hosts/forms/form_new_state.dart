import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:flutter/foundation.dart';

/// Where the new form step is: reading the templates or choosing.
enum HostFormNewStatus { loading, content }

/// One choice on the new form step: a kind (what happens after someone
/// answers) or, in the template list, one template.
@immutable
class HostFormNewChoice {
  const HostFormNewChoice({
    required this.templateId,
    required this.purpose,
    this.title,
    this.description,
  });

  final String templateId;
  final HostFormPurpose purpose;

  /// A template's own name and description; null for a kind.
  final String? title;
  final String? description;
}

/// Everything the new form step shows, as plain values.
@immutable
class HostFormNewState {
  const HostFormNewState({
    required this.status,
    this.choices = const <HostFormNewChoice>[],
    this.templates = false,
    this.selectedTemplateId,
    this.creating = false,
  });

  final HostFormNewStatus status;
  final List<HostFormNewChoice> choices;

  /// Showing every template rather than the kinds.
  final bool templates;
  final String? selectedTemplateId;

  /// The form is being made from the chosen template.
  final bool creating;

  /// One kind per purpose the templates offer, in template order; a kind
  /// starts from the first template made for it, the blank form last.
  static List<HostFormNewChoice> kinds(List<HostFormTemplateSummary> all) {
    final byPurpose = <HostFormPurpose, HostFormTemplateSummary>{};
    for (final template in all) {
      final current = byPurpose[template.purpose];
      if (current == null || current.templateId == _blankTemplateId) {
        byPurpose[template.purpose] = template;
      }
    }
    return [
      for (final template in byPurpose.values)
        HostFormNewChoice(
          templateId: template.templateId,
          purpose: template.purpose,
        ),
    ];
  }

  /// Every template as its own choice.
  static List<HostFormNewChoice> templateChoices(
    List<HostFormTemplateSummary> all,
  ) => [
    for (final template in all)
      HostFormNewChoice(
        templateId: template.templateId,
        purpose: template.purpose,
        title: template.title,
        description: template.description,
      ),
  ];

  static const _blankTemplateId = 'blank_form';
}
