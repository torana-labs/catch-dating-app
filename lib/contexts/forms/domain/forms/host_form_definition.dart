import 'package:catch_dating_app/contexts/forms/domain/forms/form_definition_fields.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_logic.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_section.dart';
import 'package:meta/meta.dart';

@immutable
class HostFormDefinition {
  HostFormDefinition._(Map<String, Object?> json)
    : _json = Map.unmodifiable(formDefinitionDeepStringMap(json));

  factory HostFormDefinition.fromMap(Map<Object?, Object?> map) =>
      HostFormDefinition._(formDefinitionDeepStringMap(map));

  final Map<String, Object?> _json;

  String get title => formDefinitionStringValue(_json['title']);
  String? get description => formDefinitionNullableString(_json['description']);
  HostFormPurpose get purpose => formDefinitionEnumByName(
    HostFormPurpose.values,
    formDefinitionStringValue(_json['purpose']),
    'form purpose',
  );
  HostFormTargetKind get defaultTargetKind => formDefinitionEnumByName(
    HostFormTargetKind.values,
    formDefinitionStringValue(_json['defaultTargetKind']),
    'form target',
  );
  String? get defaultTargetId =>
      formDefinitionNullableString(_json['defaultTargetId']);

  HostFormDefinition withTarget({
    required HostFormTargetKind kind,
    String? eventId,
  }) {
    if (kind == HostFormTargetKind.campaign ||
        kind == HostFormTargetKind.event &&
            (eventId == null || eventId.trim().isEmpty) ||
        kind == HostFormTargetKind.organizer && eventId != null) {
      throw ArgumentError('Choose a reusable form or a specific event.');
    }
    if (kind == defaultTargetKind &&
        (kind == HostFormTargetKind.organizer
            ? defaultTargetId == null
            : defaultTargetId == eventId)) {
      return this;
    }
    final next = toJson();
    next['defaultTargetKind'] = kind.name;
    next['defaultTargetId'] = kind == HostFormTargetKind.event
        ? eventId!.trim()
        : null;
    return HostFormDefinition._(next);
  }
  HostFormIdentityPolicy get identityPolicy => formDefinitionEnumByName(
    HostFormIdentityPolicy.values,
    formDefinitionStringValue(_json['identityPolicy']),
    'form identity policy',
  );
  List<HostFormSection> get sections =>
      formDefinitionJsonList(_json['sections'])
          .map(
            (item) =>
                HostFormSection.fromMap(formDefinitionDeepStringMap(item)),
          )
          .toList(growable: false);
  String get completionTitle => formDefinitionStringValue(
    formDefinitionDeepStringMap(_json['completion'])['title'],
  );
  String? get completionMessage => formDefinitionNullableString(
    formDefinitionDeepStringMap(_json['completion'])['message'],
  );
  HostFormCompletionAction get completionAction => formDefinitionEnumByName(
    HostFormCompletionAction.values,
    formDefinitionStringValue(
      formDefinitionDeepStringMap(_json['completion'])['actionKind'],
    ),
    'form completion action',
  );
  String? get completionActionLabel => formDefinitionNullableString(
    formDefinitionDeepStringMap(_json['completion'])['actionLabel'],
  );
  String? get completionActionUrl => formDefinitionNullableString(
    formDefinitionDeepStringMap(_json['completion'])['actionUrl'],
  );
  HostFormAppearancePreset get appearancePreset => formDefinitionEnumByName(
    HostFormAppearancePreset.values,
    formDefinitionStringValue(
      formDefinitionDeepStringMap(_json['appearance'])['preset'],
    ),
    'form appearance preset',
  );
  String? get activityKind => formDefinitionNullableString(
    formDefinitionDeepStringMap(_json['appearance'])['activityKind'],
  );
  DateTime? get opensAt => formDefinitionNullableWireDateTime(
    formDefinitionDeepStringMap(_json['availability'])['opensAt'],
  );
  DateTime? get closesAt => formDefinitionNullableWireDateTime(
    formDefinitionDeepStringMap(_json['availability'])['closesAt'],
  );
  int? get responseLimit => formDefinitionNullableInt(
    formDefinitionDeepStringMap(_json['availability'])['responseLimit'],
  );
  String? get closedMessage => formDefinitionNullableString(
    formDefinitionDeepStringMap(_json['availability'])['closedMessage'],
  );
  String get consentCopy => formDefinitionStringValue(
    formDefinitionDeepStringMap(_json['consent'])['consentCopy'],
  );
  String get consentVersion => formDefinitionStringValue(
    formDefinitionDeepStringMap(_json['consent'])['consentVersion'],
  );
  String get retentionCopy => formDefinitionStringValue(
    formDefinitionDeepStringMap(_json['consent'])['retentionCopy'],
  );
  List<HostFormLogicRule> get logicRules => formDefinitionJsonList(
    _json['logicRules'],
  ).map(HostFormLogicRule.fromMap).toList(growable: false);

  bool get offersOrganizerWhatsapp =>
      formDefinitionDeepStringMap(
        _json['messagingConsent'],
      )['organizerWhatsapp'] ==
      true;
  bool get offersCatchWhatsapp =>
      formDefinitionDeepStringMap(_json['messagingConsent'])['catchWhatsapp'] ==
      true;
  bool get usesPurposeMessaging {
    final settings = formDefinitionDeepStringMap(_json['messagingConsent']);
    return settings.containsKey('organizerOperationsWhatsapp') ||
        settings.containsKey('organizerMarketingWhatsapp') ||
        settings.containsKey('catchMarketingWhatsapp');
  }
  bool get offersOrganizerOperationsWhatsapp =>
      formDefinitionDeepStringMap(
        _json['messagingConsent'],
      )['organizerOperationsWhatsapp'] == true;
  bool get offersOrganizerMarketingWhatsapp =>
      formDefinitionDeepStringMap(
        _json['messagingConsent'],
      )['organizerMarketingWhatsapp'] == true;
  bool get offersCatchMarketingWhatsapp =>
      formDefinitionDeepStringMap(
        _json['messagingConsent'],
      )['catchMarketingWhatsapp'] == true;

  bool get eventProfileEnabled =>
      formDefinitionDeepStringMap(_json['eventProfile'])['enabled'] == true;

  HostFormDefinition withEventProfileEnabled(bool enabled) {
    final next = toJson();
    if (enabled) {
      next['eventProfile'] = {
        'enabled': true,
        'allowedSlots': [
          'displayName',
          'portrait',
          'introduction',
          'customRow',
        ],
        'maxCustomRows': 20,
        'noticeVersion': 'event-profile-sharing-v2',
      };
    } else {
      next.remove('eventProfile');
      final sections = formDefinitionJsonList(next['sections']);
      for (final section in sections) {
        final questions = formDefinitionJsonList(section['questions']);
        for (final question in questions) {
          question.remove('answerAudience');
        }
        section['questions'] = questions;
      }
      next['sections'] = sections;
    }
    return HostFormDefinition._(next);
  }
  HostFormDefinition withMessagingConsent({
    bool? organizerWhatsapp,
    bool? catchWhatsapp,
    bool? organizerOperationsWhatsapp,
    bool? organizerMarketingWhatsapp,
    bool? catchMarketingWhatsapp,
  }) {
    final next = toJson();
    final purposeEdit = organizerOperationsWhatsapp != null ||
        organizerMarketingWhatsapp != null || catchMarketingWhatsapp != null;
    next['messagingConsent'] = purposeEdit || usesPurposeMessaging
        ? <String, Object?>{
            'organizerWhatsapp': false,
            'catchWhatsapp': false,
            'organizerOperationsWhatsapp': organizerOperationsWhatsapp ??
                offersOrganizerOperationsWhatsapp,
            'organizerMarketingWhatsapp': organizerMarketingWhatsapp ??
                offersOrganizerMarketingWhatsapp,
            'catchMarketingWhatsapp': catchMarketingWhatsapp ??
                offersCatchMarketingWhatsapp,
          }
        : <String, Object?>{
            'organizerWhatsapp': organizerWhatsapp ?? offersOrganizerWhatsapp,
            'catchWhatsapp': catchWhatsapp ?? offersCatchWhatsapp,
          };
    return HostFormDefinition._(next);
  }

  HostFormPayment? get payment => _json['payment'] == null
      ? null
      : HostFormPayment.fromMap(formDefinitionDeepStringMap(_json['payment']));

  HostFormDefinition withPayment(HostFormPayment? payment) {
    final next = toJson();
    next['payment'] = payment?.toJson();
    return HostFormDefinition._(next);
  }

  Map<String, Object?> toJson() => formDefinitionDeepStringMap(_json);

  HostFormDefinition copyWith({
    String? title,
    String? description,
    bool clearDescription = false,
    HostFormPurpose? purpose,
    HostFormIdentityPolicy? identityPolicy,
    String? completionTitle,
    String? completionMessage,
    bool clearCompletionMessage = false,
    HostFormCompletionAction? completionAction,
    String? completionActionLabel,
    bool clearCompletionActionLabel = false,
    String? completionActionUrl,
    bool clearCompletionActionUrl = false,
    HostFormAppearancePreset? appearancePreset,
    String? activityKind,
    bool clearActivityKind = false,
    DateTime? opensAt,
    bool setOpensAt = false,
    DateTime? closesAt,
    bool setClosesAt = false,
    int? responseLimit,
    bool setResponseLimit = false,
    String? closedMessage,
    bool clearClosedMessage = false,
    String? consentCopy,
    String? consentVersion,
    String? retentionCopy,
  }) {
    final next = toJson();
    if (title != null) next['title'] = title;
    if (description != null || clearDescription) {
      next['description'] = clearDescription ? null : description;
    }
    if (purpose != null) next['purpose'] = purpose.name;
    if (identityPolicy != null) {
      next['identityPolicy'] = identityPolicy.name;
    }
    if (completionTitle != null ||
        completionMessage != null ||
        clearCompletionMessage ||
        completionAction != null ||
        completionActionLabel != null ||
        clearCompletionActionLabel ||
        completionActionUrl != null ||
        clearCompletionActionUrl) {
      final completion = formDefinitionDeepStringMap(next['completion']);
      if (completionTitle != null) completion['title'] = completionTitle;
      if (completionMessage != null || clearCompletionMessage) {
        completion['message'] = clearCompletionMessage
            ? null
            : completionMessage;
      }
      if (completionAction != null) {
        completion['actionKind'] = completionAction.name;
      }
      if (completionActionLabel != null || clearCompletionActionLabel) {
        completion['actionLabel'] = clearCompletionActionLabel
            ? null
            : completionActionLabel;
      }
      if (completionActionUrl != null || clearCompletionActionUrl) {
        completion['actionUrl'] = clearCompletionActionUrl
            ? null
            : completionActionUrl;
      }
      next['completion'] = completion;
    }
    if (appearancePreset != null || activityKind != null || clearActivityKind) {
      final appearance = formDefinitionDeepStringMap(next['appearance']);
      if (appearancePreset != null) {
        appearance['preset'] = appearancePreset.name;
      }
      if (activityKind != null || clearActivityKind) {
        appearance['activityKind'] = clearActivityKind ? null : activityKind;
      }
      next['appearance'] = appearance;
    }
    if (setOpensAt ||
        setClosesAt ||
        setResponseLimit ||
        closedMessage != null ||
        clearClosedMessage) {
      final availability = formDefinitionDeepStringMap(next['availability']);
      if (setOpensAt) {
        availability['opensAt'] = formDefinitionWireDateTime(opensAt);
      }
      if (setClosesAt) {
        availability['closesAt'] = formDefinitionWireDateTime(closesAt);
      }
      if (setResponseLimit) availability['responseLimit'] = responseLimit;
      if (closedMessage != null || clearClosedMessage) {
        availability['closedMessage'] = clearClosedMessage
            ? null
            : closedMessage;
      }
      next['availability'] = availability;
    }
    if (consentCopy != null ||
        consentVersion != null ||
        retentionCopy != null) {
      final consent = formDefinitionDeepStringMap(next['consent']);
      if (consentCopy != null) consent['consentCopy'] = consentCopy;
      if (consentVersion != null) consent['consentVersion'] = consentVersion;
      if (retentionCopy != null) consent['retentionCopy'] = retentionCopy;
      next['consent'] = consent;
    }
    return HostFormDefinition._(next);
  }

  HostFormDefinition replaceSection(int index, HostFormSection section) {
    final next = toJson();
    final sections = formDefinitionJsonList(next['sections']);
    sections[index] = section.toJson();
    next['sections'] = sections;
    return HostFormDefinition._(next);
  }

  HostFormDefinition addSection(HostFormSection section) {
    final next = toJson();
    final sections = formDefinitionJsonList(next['sections'])
      ..add(section.toJson());
    next['sections'] = sections;
    return HostFormDefinition._(next);
  }

  HostFormDefinition removeSection(int index) {
    final next = toJson();
    final sections = formDefinitionJsonList(next['sections'])..removeAt(index);
    next['sections'] = sections;
    return HostFormDefinition._(next);
  }

  HostFormDefinition moveSection(int oldIndex, int newIndex) {
    final next = toJson();
    final sections = formDefinitionJsonList(next['sections']);
    final section = sections.removeAt(oldIndex);
    sections.insert(newIndex, section);
    next['sections'] = sections;
    return HostFormDefinition._(next);
  }

  HostFormDefinition moveQuestionToSection({
    required int sourceSectionIndex,
    required int questionIndex,
    required int targetSectionIndex,
  }) {
    if (sourceSectionIndex == targetSectionIndex) return this;
    final currentSections = sections;
    final question =
        currentSections[sourceSectionIndex].questions[questionIndex];
    final sourceSection = currentSections[sourceSectionIndex].removeQuestion(
      questionIndex,
    );
    final targetSection = currentSections[targetSectionIndex].addQuestion(
      question,
    );
    return replaceSection(
      sourceSectionIndex,
      sourceSection,
    ).replaceSection(targetSectionIndex, targetSection);
  }

  HostFormDefinition addLogicRule(HostFormLogicRule rule) {
    final next = toJson();
    final rules = formDefinitionJsonList(next['logicRules'])
      ..add(rule.toJson());
    next['logicRules'] = rules;
    return HostFormDefinition._(next);
  }

  HostFormDefinition removeLogicRule(int index) {
    final next = toJson();
    final rules = formDefinitionJsonList(next['logicRules'])..removeAt(index);
    next['logicRules'] = rules;
    return HostFormDefinition._(next);
  }

  List<HostFormSection> reachableSections(Map<String, Object?> answers) {
    final matchingRules = logicRules
        .where((rule) => rule.matches(answers))
        .toList(growable: false);
    final allShowSections = _logicTargets(
      logicRules,
      HostFormLogicAction.showSection,
      section: true,
    );
    final shownSections = _logicTargets(
      matchingRules,
      HostFormLogicAction.showSection,
      section: true,
    );
    final hiddenSections = _logicTargets(
      matchingRules,
      HostFormLogicAction.hideSection,
      section: true,
    );
    final allShowQuestions = _logicTargets(
      logicRules,
      HostFormLogicAction.showQuestion,
      section: false,
    );
    final shownQuestions = _logicTargets(
      matchingRules,
      HostFormLogicAction.showQuestion,
      section: false,
    );
    final hiddenQuestions = _logicTargets(
      matchingRules,
      HostFormLogicAction.hideQuestion,
      section: false,
    );
    final visible = <({int index, HostFormSection section})>[];
    for (final entry in sections.indexed) {
      final section = entry.$2;
      if ((allShowSections.contains(section.sectionId) &&
              !shownSections.contains(section.sectionId)) ||
          hiddenSections.contains(section.sectionId)) {
        continue;
      }
      final json = section.toJson();
      json['questions'] = section.questions
          .where(
            (question) =>
                (!allShowQuestions.contains(question.questionId) ||
                    shownQuestions.contains(question.questionId)) &&
                !hiddenQuestions.contains(question.questionId),
          )
          .map((question) => question.toJson())
          .toList(growable: false);
      visible.add((index: entry.$1, section: HostFormSection.fromMap(json)));
    }
    final questionSections = <String, int>{
      for (final entry in sections.indexed)
        for (final question in entry.$2.questions)
          question.questionId: entry.$1,
    };
    final result = <HostFormSection>[];
    var cursor = 0;
    while (cursor < visible.length) {
      final current = visible[cursor];
      result.add(current.section);
      final navigation = matchingRules
          .where(
            (rule) =>
                rule.action == HostFormLogicAction.routeToSection ||
                rule.action == HostFormLogicAction.finish,
          )
          .where(
            (rule) =>
                rule.conditions
                    .map(
                      (condition) =>
                          questionSections[condition.questionId] ?? -1,
                    )
                    .fold<int>(
                      -1,
                      (maximum, value) => value > maximum ? value : maximum,
                    ) ==
                current.index,
          )
          .firstOrNull;
      if (navigation?.action == HostFormLogicAction.finish) break;
      if (navigation?.action == HostFormLogicAction.routeToSection &&
          navigation?.targetSectionId != null) {
        final targetIndex = sections.indexWhere(
          (section) => section.sectionId == navigation!.targetSectionId,
        );
        final next = visible.indexWhere(
          (section) => section.index >= targetIndex,
        );
        if (next <= cursor) break;
        cursor = next;
      } else {
        cursor += 1;
      }
    }
    return List.unmodifiable(result);
  }
}

Set<String> _logicTargets(
  Iterable<HostFormLogicRule> rules,
  HostFormLogicAction action, {
  required bool section,
}) => rules
    .where((rule) => rule.action == action)
    .map((rule) => section ? rule.targetSectionId : rule.targetQuestionId)
    .whereType<String>()
    .toSet();
