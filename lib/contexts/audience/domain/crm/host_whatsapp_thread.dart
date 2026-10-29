import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';

enum HostWhatsappMessageDirection { inbound, outbound }

class HostWhatsappThreadSummary {
  const HostWhatsappThreadSummary({
    required this.threadId,
    required this.contactId,
    this.linkedUid,
    required this.displayName,
    required this.eventIds,
    required this.lastMessageBody,
    required this.lastMessageDirection,
    required this.lastMessageAt,
    required this.lastInboundAt,
    required this.serviceWindowExpiresAt,
    required this.serviceWindowOpen,
  });

  factory HostWhatsappThreadSummary.fromMap(
    Map<Object?, Object?> map,
  ) => HostWhatsappThreadSummary(
    threadId: crmRequiredString(map, 'threadId'),
    contactId: crmRequiredString(map, 'contactId'),
    linkedUid: crmNullableString(map['linkedUid']),
    displayName: crmRequiredString(map, 'displayName'),
    eventIds: crmStringList(map['eventIds']),
    lastMessageBody: crmRequiredString(map, 'lastMessageBody'),
    lastMessageDirection: crmEnumByName(
      HostWhatsappMessageDirection.values,
      crmRequiredString(map, 'lastMessageDirection'),
      'WhatsApp message direction',
    ),
    lastMessageAt: crmRequiredDateTimeFromMillis(map, 'lastMessageAtMillis'),
    lastInboundAt: crmRequiredDateTimeFromMillis(map, 'lastInboundAtMillis'),
    serviceWindowExpiresAt: crmRequiredDateTimeFromMillis(
      map,
      'serviceWindowExpiresAtMillis',
    ),
    serviceWindowOpen: crmRequiredBool(map, 'serviceWindowOpen'),
  );

  final String threadId;
  final String contactId;
  final String? linkedUid;
  final String displayName;
  final List<String> eventIds;
  final String lastMessageBody;
  final HostWhatsappMessageDirection lastMessageDirection;
  final DateTime lastMessageAt;
  final DateTime lastInboundAt;
  final DateTime serviceWindowExpiresAt;
  final bool serviceWindowOpen;
}

class HostWhatsappThreadPage {
  const HostWhatsappThreadPage({
    required this.organizerId,
    required this.threads,
    required this.nextCursor,
  });

  factory HostWhatsappThreadPage.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'organizer WhatsApp threads');
    return HostWhatsappThreadPage(
      organizerId: crmRequiredString(map, 'organizerId'),
      threads: crmMapList(
        map['threads'],
        'organizer WhatsApp threads',
      ).map(HostWhatsappThreadSummary.fromMap).toList(growable: false),
      nextCursor: crmNullableString(map['nextCursor']),
    );
  }

  final String organizerId;
  final List<HostWhatsappThreadSummary> threads;
  final String? nextCursor;
}

class HostWhatsappMessage {
  const HostWhatsappMessage({
    required this.messageId,
    required this.direction,
    required this.body,
    required this.occurredAt,
  });

  factory HostWhatsappMessage.fromMap(Map<Object?, Object?> map) =>
      HostWhatsappMessage(
        messageId: crmRequiredString(map, 'messageId'),
        direction: crmEnumByName(
          HostWhatsappMessageDirection.values,
          crmRequiredString(map, 'direction'),
          'WhatsApp message direction',
        ),
        body: crmRequiredString(map, 'body'),
        occurredAt: crmRequiredDateTimeFromMillis(map, 'occurredAtMillis'),
      );

  final String messageId;
  final HostWhatsappMessageDirection direction;
  final String body;
  final DateTime occurredAt;
}

class HostWhatsappThreadDetail {
  const HostWhatsappThreadDetail({
    required this.organizerId,
    required this.threadId,
    required this.contactId,
    this.linkedUid,
    required this.displayName,
    required this.lastInboundAt,
    required this.serviceWindowExpiresAt,
    required this.serviceWindowOpen,
    required this.messages,
    required this.messagesTruncated,
  });

  factory HostWhatsappThreadDetail.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'organizer WhatsApp thread');
    return HostWhatsappThreadDetail(
      organizerId: crmRequiredString(map, 'organizerId'),
      threadId: crmRequiredString(map, 'threadId'),
      contactId: crmRequiredString(map, 'contactId'),
      linkedUid: crmNullableString(map['linkedUid']),
      displayName: crmRequiredString(map, 'displayName'),
      lastInboundAt: crmRequiredDateTimeFromMillis(map, 'lastInboundAtMillis'),
      serviceWindowExpiresAt: crmRequiredDateTimeFromMillis(
        map,
        'serviceWindowExpiresAtMillis',
      ),
      serviceWindowOpen: crmRequiredBool(map, 'serviceWindowOpen'),
      messages: crmMapList(
        map['messages'],
        'organizer WhatsApp messages',
      ).map(HostWhatsappMessage.fromMap).toList(growable: false),
      messagesTruncated: crmRequiredBool(map, 'messagesTruncated'),
    );
  }

  final String organizerId;
  final String threadId;
  final String contactId;
  final String? linkedUid;
  final String displayName;
  final DateTime lastInboundAt;
  final DateTime serviceWindowExpiresAt;
  final bool serviceWindowOpen;
  final List<HostWhatsappMessage> messages;
  final bool messagesTruncated;
}
