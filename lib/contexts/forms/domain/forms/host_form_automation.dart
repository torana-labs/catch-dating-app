import 'package:catch_dating_app/contexts/forms/domain/forms/form_operation_fields.dart';
import 'package:meta/meta.dart';

enum HostFormAutomationTrigger {
  responseSubmitted,
  responseWithdrawn,
  answerMatches,
  applicationAccepted,
  eventAttended,
}

enum HostFormAutomationActionKind {
  notifyTeam,
  addOrganizerTag,
  createCrmContact,
  addApplicationQueue,
  proposeEventAttendee,
  signedWebhook,
  campaignHandoff,
}

enum HostFormAutomationRunStatus {
  pending,
  running,
  succeeded,
  partiallyFailed,
  failed,
  skipped,
}

/// Client-side URL shape checks. Delivery still enforces server network policy.
bool isHostAutomationWebhookUrl(String? value) {
  final url = Uri.tryParse(value?.trim() ?? '');
  return url != null &&
      url.scheme == 'https' &&
      url.host.isNotEmpty &&
      url.userInfo.isEmpty &&
      !url.hasFragment &&
      url.port == 443;
}

@immutable
class HostFormAutomationAction {
  const HostFormAutomationAction({
    required this.actionId,
    required this.kind,
    required this.tagId,
    required this.eventId,
    required this.webhookUrl,
    required this.webhookSecretConfigured,
    required this.channel,
    this.campaignId,
    this.campaignRevision,
  });

  factory HostFormAutomationAction.fromMap(Map<Object?, Object?> map) =>
      HostFormAutomationAction(
        actionId: formOperationRequiredString(map, 'actionId'),
        kind: formOperationEnumByName(
          HostFormAutomationActionKind.values,
          formOperationRequiredString(map, 'kind'),
        ),
        tagId: formOperationNullableString(map['tagId']),
        eventId: formOperationNullableString(map['eventId']),
        webhookUrl: formOperationNullableString(map['webhookUrl']),
        webhookSecretConfigured: formOperationRequiredBool(
          map,
          'webhookSecretConfigured',
        ),
        channel: formOperationNullableString(map['channel']),
        campaignId: formOperationNullableString(map['campaignId']),
        campaignRevision: formOperationNullableInt(map['campaignRevision']),
      );

  final String actionId;
  final HostFormAutomationActionKind kind;
  final String? tagId;
  final String? eventId;
  final String? webhookUrl;
  final bool webhookSecretConfigured;
  final String? channel;
  final String? campaignId;
  final int? campaignRevision;
}

@immutable
class HostFormAutomationRule {
  const HostFormAutomationRule({
    required this.ruleId,
    required this.organizerId,
    required this.formId,
    required this.name,
    required this.enabled,
    required this.revision,
    required this.trigger,
    this.triggerEventId,
    this.delayMinutes = 0,
    required this.condition,
    required this.actions,
    required this.updatedAt,
  });

  factory HostFormAutomationRule.fromMap(Map<Object?, Object?> map) =>
      HostFormAutomationRule(
        ruleId: formOperationRequiredString(map, 'ruleId'),
        organizerId: formOperationRequiredString(map, 'organizerId'),
        formId: formOperationNullableString(map['formId']),
        name: formOperationRequiredString(map, 'name'),
        enabled: formOperationRequiredBool(map, 'enabled'),
        revision: formOperationRequiredInt(map, 'revision'),
        trigger: formOperationEnumByName(
          HostFormAutomationTrigger.values,
          formOperationRequiredString(map, 'trigger'),
        ),
        triggerEventId: formOperationNullableString(map['triggerEventId']),
        delayMinutes: formOperationNullableInt(map['delayMinutes']) ?? 0,
        condition: map['condition'] == null
            ? null
            : formOperationRequiredMap(
                map['condition'],
                'automation condition',
              ),
        actions: formOperationMapList(
          map['actions'],
          'automation actions',
        ).map(HostFormAutomationAction.fromMap).toList(growable: false),
        updatedAt: formOperationDateTime(map, 'updatedAtMillis'),
      );

  final String ruleId;
  final String organizerId;
  final String? formId;
  final String name;
  final bool enabled;
  final int revision;
  final HostFormAutomationTrigger trigger;
  final String? triggerEventId;
  final int delayMinutes;
  final Map<Object?, Object?>? condition;
  final List<HostFormAutomationAction> actions;
  final DateTime updatedAt;
}

@immutable
class HostFormAutomationRun {
  const HostFormAutomationRun({
    required this.runId,
    required this.ruleId,
    required this.ruleRevision,
    required this.responseId,
    this.sourceId,
    this.dueAt,
    required this.eventKind,
    required this.status,
    required this.attemptCount,
    required this.actionResults,
    required this.errorMessage,
    required this.createdAt,
    required this.completedAt,
  });

  factory HostFormAutomationRun.fromMap(Map<Object?, Object?> map) =>
      HostFormAutomationRun(
        runId: formOperationRequiredString(map, 'runId'),
        ruleId: formOperationRequiredString(map, 'ruleId'),
        ruleRevision: formOperationRequiredInt(map, 'ruleRevision'),
        responseId: formOperationNullableString(map['responseId']),
        sourceId: formOperationNullableString(map['sourceId']),
        dueAt: formOperationNullableDateTime(map['dueAtMillis']),
        eventKind: formOperationRequiredString(map, 'eventKind'),
        status: formOperationEnumByName(
          HostFormAutomationRunStatus.values,
          formOperationRequiredString(map, 'status'),
        ),
        attemptCount: formOperationRequiredInt(map, 'attemptCount'),
        actionResults: formOperationMapList(
          map['actionResults'],
          'automation action results',
        ),
        errorMessage: formOperationNullableString(map['errorMessage']),
        createdAt: formOperationDateTime(map, 'createdAtMillis'),
        completedAt: formOperationNullableDateTime(map['completedAtMillis']),
      );

  final String runId;
  final String ruleId;
  final int ruleRevision;
  final String? responseId;
  final String? sourceId;
  final DateTime? dueAt;
  final String eventKind;
  final HostFormAutomationRunStatus status;
  final int attemptCount;
  final List<Map<Object?, Object?>> actionResults;
  final String? errorMessage;
  final DateTime createdAt;
  final DateTime? completedAt;
}

@immutable
class HostFormAutomationPage {
  const HostFormAutomationPage({
    required this.rules,
    required this.runs,
    required this.nextCursor,
  });

  factory HostFormAutomationPage.fromCallableData(Object? data) {
    final map = formOperationRequiredMap(data, 'form automations');
    return HostFormAutomationPage(
      rules: formOperationMapList(
        map['rules'],
        'automation rules',
      ).map(HostFormAutomationRule.fromMap).toList(growable: false),
      runs: formOperationMapList(
        map['runs'],
        'automation runs',
      ).map(HostFormAutomationRun.fromMap).toList(growable: false),
      nextCursor: formOperationNullableString(map['nextCursor']),
    );
  }

  final List<HostFormAutomationRule> rules;
  final List<HostFormAutomationRun> runs;
  final String? nextCursor;
}
