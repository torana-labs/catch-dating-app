import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';

class HostAudienceSourceOption {
  const HostAudienceSourceOption({required this.id, required this.title});
  final String id;
  final String title;
}

class HostAudienceAnswerOption {
  const HostAudienceAnswerOption({required this.label, required this.value});
  final String label;
  final Object value;
}

class HostAudienceQuestionOption {
  const HostAudienceQuestionOption({
    required this.formId,
    required this.versionId,
    required this.version,
    required this.formTitle,
    required this.questionId,
    required this.label,
    required this.options,
    this.activeVersion = false,
  });
  final bool activeVersion;
  final String formId;
  final String versionId;
  final int version;
  final String formTitle;
  final String questionId;
  final String label;
  final List<HostAudienceAnswerOption> options;
}

class HostSavedAudienceFilterOptions {
  const HostSavedAudienceFilterOptions({
    required this.forms,
    required this.questions,
    required this.events,
    required this.tags,
  });
  const HostSavedAudienceFilterOptions.empty()
    : forms = const [],
      questions = const [],
      events = const [],
      tags = const [];

  factory HostSavedAudienceFilterOptions.fromCallableData(Object? data) {
    final root = crmRequiredMap(data, 'audience source options');
    final map = crmRequiredMap(
      root['filterOptions'],
      'audience source options',
    );
    return HostSavedAudienceFilterOptions(
      forms: crmMapList(map['forms'], 'audience forms')
          .map(
            (item) => HostAudienceSourceOption(
              id: crmRequiredString(item, 'formId'),
              title: crmRequiredString(item, 'title'),
            ),
          )
          .toList(growable: false),
      events: crmMapList(map['events'], 'audience events')
          .map(
            (item) => HostAudienceSourceOption(
              id: crmRequiredString(item, 'eventId'),
              title: crmRequiredString(item, 'title'),
            ),
          )
          .toList(growable: false),
      tags: crmMapList(
        map['tags'],
        'audience tags',
      ).map(HostManualTag.fromMap).toList(growable: false),
      questions: crmMapList(map['questions'], 'audience questions')
          .map(
            (item) => HostAudienceQuestionOption(
              formId: crmRequiredString(item, 'formId'),
              versionId: crmRequiredString(item, 'versionId'),
              activeVersion: item['activeVersion'] == true,
              version: crmRequiredInt(item, 'version'),
              formTitle: crmRequiredString(item, 'formTitle'),
              questionId: crmRequiredString(item, 'questionId'),
              label: crmRequiredString(item, 'label'),
              options: crmMapList(item['options'], 'answer options')
                  .map(
                    (option) => HostAudienceAnswerOption(
                      label: crmRequiredString(option, 'label'),
                      value: crmAudienceAnswerValue(option['value']),
                    ),
                  )
                  .toList(growable: false),
            ),
          )
          .toList(growable: false),
    );
  }

  final List<HostAudienceSourceOption> forms;
  final List<HostAudienceQuestionOption> questions;
  final List<HostAudienceSourceOption> events;
  final List<HostManualTag> tags;
}
