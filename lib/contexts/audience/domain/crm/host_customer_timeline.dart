import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_revenue.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';

enum HostCustomerTimelineCoverageValue { exact, partial, unavailable }

class HostCustomerTimelineCoverage {
  const HostCustomerTimelineCoverage({
    required this.forms,
    required this.events,
    required this.sends,
    required this.replies,
    required this.outreach,
  });

  factory HostCustomerTimelineCoverage.fromMap(Map<Object?, Object?> map) {
    if (crmRequiredString(map, 'replyObservation') !=
        'catchAndManagedWhatsappOnly') {
      throw const FormatException(
        'Customer timeline had an unsupported reply observation boundary.',
      );
    }
    return HostCustomerTimelineCoverage(
      forms: _timelineCoverageValue(map, 'forms'),
      events: _timelineCoverageValue(map, 'events'),
      sends: _timelineCoverageValue(map, 'sends'),
      replies: _timelineCoverageValue(map, 'replies'),
      outreach: _timelineCoverageValue(map, 'outreach'),
    );
  }

  final HostCustomerTimelineCoverageValue forms;
  final HostCustomerTimelineCoverageValue events;
  final HostCustomerTimelineCoverageValue sends;
  final HostCustomerTimelineCoverageValue replies;
  final HostCustomerTimelineCoverageValue outreach;

  bool get isComplete =>
      forms == HostCustomerTimelineCoverageValue.exact &&
      events == HostCustomerTimelineCoverageValue.exact &&
      sends == HostCustomerTimelineCoverageValue.exact &&
      replies == HostCustomerTimelineCoverageValue.exact &&
      outreach == HostCustomerTimelineCoverageValue.exact;
}

HostCustomerTimelineCoverageValue _timelineCoverageValue(
  Map<Object?, Object?> map,
  String key,
) => crmEnumByName(
  HostCustomerTimelineCoverageValue.values,
  crmRequiredString(map, key),
  '$key timeline coverage',
);

sealed class HostCustomerTimelineEntry {
  const HostCustomerTimelineEntry({
    required this.timelineId,
    required this.occurredAt,
  });

  factory HostCustomerTimelineEntry.fromMap(Map<Object?, Object?> map) =>
      switch (crmRequiredString(map, 'kind')) {
        'form' => HostCustomerFormTimelineEntry.fromMap(map),
        'event' => HostCustomerEventTimelineEntry.fromMap(map),
        'send' => HostCustomerSendTimelineEntry.fromMap(map),
        'reply' => HostCustomerReplyTimelineEntry.fromMap(map),
        'outreach' => HostCustomerOutreachTimelineEntry.fromMap(map),
        _ => throw const FormatException(
          'Customer timeline contained an unsupported entry kind.',
        ),
      };

  final String timelineId;
  final DateTime occurredAt;
}

enum HostCustomerFormTimelineAction { submitted, withdrawn }

final class HostCustomerFormTimelineEntry extends HostCustomerTimelineEntry {
  const HostCustomerFormTimelineEntry({
    required super.timelineId,
    required super.occurredAt,
    required this.responseId,
    required this.formId,
    required this.formTitle,
    required this.action,
    required this.answeredQuestionCount,
  });

  factory HostCustomerFormTimelineEntry.fromMap(Map<Object?, Object?> map) =>
      HostCustomerFormTimelineEntry(
        timelineId: crmRequiredString(map, 'timelineId'),
        occurredAt: crmRequiredDateTimeFromMillis(map, 'occurredAtMillis'),
        responseId: crmRequiredString(map, 'responseId'),
        formId: crmRequiredString(map, 'formId'),
        formTitle: crmNullableString(map['formTitle']),
        action: crmEnumByName(
          HostCustomerFormTimelineAction.values,
          crmRequiredString(map, 'action'),
          'form timeline action',
        ),
        answeredQuestionCount: crmRequiredInt(map, 'answeredQuestionCount'),
      );

  final String responseId;
  final String formId;
  final String? formTitle;
  final HostCustomerFormTimelineAction action;
  final int answeredQuestionCount;
}

final class HostCustomerEventTimelineEntry extends HostCustomerTimelineEntry {
  const HostCustomerEventTimelineEntry({
    required super.timelineId,
    required super.occurredAt,
    required this.eventId,
    required this.eventName,
    required this.status,
    required this.checkedIn,
    required this.eventOrigin,
    required this.eventProvider,
  });

  factory HostCustomerEventTimelineEntry.fromMap(Map<Object?, Object?> map) =>
      HostCustomerEventTimelineEntry(
        timelineId: crmRequiredString(map, 'timelineId'),
        occurredAt: crmRequiredDateTimeFromMillis(map, 'occurredAtMillis'),
        eventId: crmRequiredString(map, 'eventId'),
        eventName: crmRequiredString(map, 'eventName'),
        status: crmRequiredString(map, 'status'),
        checkedIn: crmRequiredBool(map, 'checkedIn'),
        eventOrigin: crmEnumByName(
          HostCustomerEventOrigin.values,
          crmRequiredString(map, 'eventOriginMode'),
          'event timeline origin',
        ),
        eventProvider: crmNullableString(map['eventProvider']),
      );

  final String eventId;
  final String eventName;
  final String status;
  final bool checkedIn;
  final HostCustomerEventOrigin eventOrigin;
  final String? eventProvider;
}

enum HostCustomerTimelineSendKind { campaign, announcement, manualHandoff }

enum HostCustomerTimelineDeliveryMode { inCatch, api, byHand }

enum HostCustomerTimelineObservation {
  providerReceipt,
  catchActivity,
  hostOpened,
  hostAssertion,
  notSent,
}

final class HostCustomerSendTimelineEntry extends HostCustomerTimelineEntry {
  const HostCustomerSendTimelineEntry({
    required super.timelineId,
    required super.occurredAt,
    required this.sendKind,
    required this.name,
    required this.status,
    required this.deliveryMode,
    required this.observation,
    required this.referenceId,
  });

  factory HostCustomerSendTimelineEntry.fromMap(Map<Object?, Object?> map) =>
      HostCustomerSendTimelineEntry(
        timelineId: crmRequiredString(map, 'timelineId'),
        occurredAt: crmRequiredDateTimeFromMillis(map, 'occurredAtMillis'),
        sendKind: crmEnumByName(
          HostCustomerTimelineSendKind.values,
          crmRequiredString(map, 'sendKind'),
          'timeline send kind',
        ),
        name: crmRequiredString(map, 'name'),
        status: crmRequiredString(map, 'status'),
        deliveryMode: crmEnumByName(
          HostCustomerTimelineDeliveryMode.values,
          crmRequiredString(map, 'deliveryMode'),
          'timeline delivery mode',
        ),
        observation: crmEnumByName(
          HostCustomerTimelineObservation.values,
          crmRequiredString(map, 'observation'),
          'timeline observation',
        ),
        referenceId: crmRequiredString(map, 'referenceId'),
      );

  final HostCustomerTimelineSendKind sendKind;
  final String name;
  final String status;
  final HostCustomerTimelineDeliveryMode deliveryMode;
  final HostCustomerTimelineObservation observation;
  final String referenceId;
}

enum HostCustomerReplyTransport { catchChat, managedWhatsapp }

final class HostCustomerReplyTimelineEntry extends HostCustomerTimelineEntry {
  const HostCustomerReplyTimelineEntry({
    required super.timelineId,
    required super.occurredAt,
    required this.transport,
    required this.direction,
    required this.bodyPreview,
    required this.threadId,
  });

  factory HostCustomerReplyTimelineEntry.fromMap(Map<Object?, Object?> map) =>
      HostCustomerReplyTimelineEntry(
        timelineId: crmRequiredString(map, 'timelineId'),
        occurredAt: crmRequiredDateTimeFromMillis(map, 'occurredAtMillis'),
        transport: crmEnumByName(
          HostCustomerReplyTransport.values,
          crmRequiredString(map, 'transport'),
          'timeline reply transport',
        ),
        direction: crmEnumByName(
          HostWhatsappMessageDirection.values,
          crmRequiredString(map, 'direction'),
          'timeline reply direction',
        ),
        bodyPreview: crmRequiredString(map, 'bodyPreview'),
        threadId: crmRequiredString(map, 'threadId'),
      );

  final HostCustomerReplyTransport transport;
  final HostWhatsappMessageDirection direction;
  final String bodyPreview;
  final String threadId;
}

final class HostCustomerOutreachTimelineEntry
    extends HostCustomerTimelineEntry {
  const HostCustomerOutreachTimelineEntry({
    required super.timelineId,
    required super.occurredAt,
    required this.channel,
    required this.outcome,
    required this.notePreview,
  });

  factory HostCustomerOutreachTimelineEntry.fromMap(
    Map<Object?, Object?> map,
  ) => HostCustomerOutreachTimelineEntry(
    timelineId: crmRequiredString(map, 'timelineId'),
    occurredAt: crmRequiredDateTimeFromMillis(map, 'occurredAtMillis'),
    channel: crmEnumByName(
      HostCustomerOutreachChannel.values,
      crmRequiredString(map, 'channel'),
      'timeline outreach channel',
    ),
    outcome: crmEnumByName(
      HostCustomerOutreachOutcome.values,
      crmRequiredString(map, 'outcome'),
      'timeline outreach outcome',
    ),
    notePreview: crmNullableString(map['notePreview']),
  );

  final HostCustomerOutreachChannel channel;
  final HostCustomerOutreachOutcome outcome;
  final String? notePreview;
}
