import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';

enum HostWhatsappMessageDirection { inbound, outbound }

/// How long WhatsApp lets a business reply freely after the customer's last
/// message: the customer-service window.
const hostWhatsappServiceWindow = Duration(hours: 24);

/// Whether a free-form reply is allowed at [now], given the customer's last
/// message at [lastInboundAt]. The reply callable checks this again.
bool hostWhatsappServiceWindowOpen(DateTime lastInboundAt, DateTime now) =>
    !now.isBefore(lastInboundAt) &&
    now.isBefore(lastInboundAt.add(hostWhatsappServiceWindow));

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
    this.retainedUntil,
  });

  /// One `hostWhatsappThreadViews` document, read at [now]. The view holds
  /// the summary the server keeps; the service window depends on the
  /// reader's clock, so it is worked out here.
  factory HostWhatsappThreadSummary.fromView(
    Map<Object?, Object?> map, {
    required DateTime now,
  }) {
    final lastInboundAt = crmRequiredDateTimeFromMillis(
      map,
      'lastInboundAtMillis',
    );
    return HostWhatsappThreadSummary(
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
      lastInboundAt: lastInboundAt,
      serviceWindowExpiresAt: crmRequiredDateTimeFromMillis(
        map,
        'serviceWindowExpiresAtMillis',
      ),
      serviceWindowOpen: hostWhatsappServiceWindowOpen(lastInboundAt, now),
      retainedUntil: crmRequiredDateTimeFromMillis(map, 'expiresAtMillis'),
    );
  }

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

  /// When the thread's 12-month retention ends. A thread past it is hidden
  /// until the server deletes it.
  final DateTime? retainedUntil;

  bool isRetainedAt(DateTime now) =>
      retainedUntil == null || retainedUntil!.isAfter(now);
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

  /// One thread from its view and its newest [messages], oldest first, read
  /// at [now]. A customer message the view has not caught up with yet still
  /// opens the reply window: the reply is fenced on the latest inbound time,
  /// which the server checks again.
  factory HostWhatsappThreadDetail.fromView({
    required String organizerId,
    required HostWhatsappThreadSummary summary,
    required List<HostWhatsappMessage> messages,
    required bool messagesTruncated,
    required DateTime now,
  }) {
    var lastInboundAt = summary.lastInboundAt;
    for (final message in messages) {
      if (message.direction == HostWhatsappMessageDirection.inbound &&
          message.occurredAt.isAfter(lastInboundAt)) {
        lastInboundAt = message.occurredAt;
      }
    }
    return HostWhatsappThreadDetail(
      organizerId: organizerId,
      threadId: summary.threadId,
      contactId: summary.contactId,
      linkedUid: summary.linkedUid,
      displayName: summary.displayName,
      lastInboundAt: lastInboundAt,
      serviceWindowExpiresAt: lastInboundAt.add(hostWhatsappServiceWindow),
      serviceWindowOpen: hostWhatsappServiceWindowOpen(lastInboundAt, now),
      messages: List.unmodifiable(messages),
      messagesTruncated: messagesTruncated,
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
