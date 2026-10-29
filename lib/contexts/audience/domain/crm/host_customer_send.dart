import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';

enum HostCustomerSendDeliveryStatus {
  available,
  pending,
  sending,
  suppressed,
  accepted,
  sent,
  delivered,
  read,
  failed,
  replied,
  optedOut,
}

enum HostCustomerSendKind { campaign, announcement }

class HostCustomerSend {
  const HostCustomerSend({
    this.kind = HostCustomerSendKind.campaign,
    required this.campaignId,
    required this.name,
    required this.messageClass,
    required this.deliveryStatus,
    required this.createdAt,
    required this.sentAt,
    required this.updatedAt,
    this.broadcastId,
    this.eventId,
    this.audience,
    this.partialFailure = false,
  });

  factory HostCustomerSend.fromMap(Map<Object?, Object?> map) {
    final kind = crmRequiredString(map, 'kind');
    if (kind == 'announcement') {
      final broadcastId = crmRequiredString(map, 'broadcastId');
      final sentAt = crmRequiredDateTimeFromMillis(map, 'sentAtMillis');
      return HostCustomerSend(
        kind: HostCustomerSendKind.announcement,
        campaignId: broadcastId,
        name: crmRequiredString(map, 'eventName'),
        messageClass: 'announcement',
        deliveryStatus: crmEnumByName(
          HostCustomerSendDeliveryStatus.values,
          crmRequiredString(map, 'deliveryStatus'),
          'announcement delivery status',
        ),
        createdAt: sentAt,
        sentAt: sentAt,
        updatedAt: sentAt,
        broadcastId: broadcastId,
        eventId: crmRequiredString(map, 'eventId'),
        audience: crmRequiredString(map, 'audience'),
        partialFailure: crmRequiredBool(map, 'partialFailure'),
      );
    }
    if (kind != 'campaign') {
      throw const FormatException('Contact send had an unsupported kind.');
    }
    return HostCustomerSend(
      campaignId: crmRequiredString(map, 'campaignId'),
      name: crmRequiredString(map, 'name'),
      messageClass: crmRequiredString(map, 'messageClass'),
      deliveryStatus: crmEnumByName(
        HostCustomerSendDeliveryStatus.values,
        crmRequiredString(map, 'deliveryStatus'),
        'contact send delivery status',
      ),
      createdAt: crmRequiredDateTimeFromMillis(map, 'createdAtMillis'),
      sentAt: crmDateTimeFromMillis(map['sentAtMillis']),
      updatedAt: crmRequiredDateTimeFromMillis(map, 'updatedAtMillis'),
    );
  }

  final HostCustomerSendKind kind;
  final String campaignId;
  final String name;
  final String messageClass;
  final HostCustomerSendDeliveryStatus deliveryStatus;
  final DateTime createdAt;
  final DateTime? sentAt;
  final DateTime updatedAt;
  final String? broadcastId;
  final String? eventId;
  final String? audience;
  final bool partialFailure;
}
