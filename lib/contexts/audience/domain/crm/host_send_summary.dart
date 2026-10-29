import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign.dart';

sealed class HostSendSummary {
  const HostSendSummary({required this.activityAt});

  factory HostSendSummary.fromMap(Map<Object?, Object?> map) =>
      switch (crmRequiredString(map, 'kind')) {
        'campaign' => HostCampaignSendSummary.fromMap(map),
        'announcement' => HostAnnouncementSendSummary.fromMap(map),
        'followerUpdate' => HostFollowerUpdateSendSummary.fromMap(map),
        _ => throw const FormatException('Send row had an unsupported kind.'),
      };

  final DateTime activityAt;
  String get id;
}

final class HostCampaignSendSummary extends HostSendSummary {
  const HostCampaignSendSummary({
    required this.campaignId,
    required this.name,
    required this.status,
    this.savedAudienceId,
    this.savedAudienceName,
    required this.segments,
    required this.templateId,
    required this.templateName,
    required this.audienceCounts,
    required this.deliveryCounts,
    required this.scheduledAt,
    required this.dispatchedAt,
    required super.activityAt,
  });

  factory HostCampaignSendSummary.fromMap(Map<Object?, Object?> map) =>
      HostCampaignSendSummary(
        campaignId: crmRequiredString(map, 'campaignId'),
        name: crmRequiredString(map, 'name'),
        status: crmRequiredString(map, 'status'),
        savedAudienceId: crmNullableString(map['savedAudienceId']),
        savedAudienceName: crmNullableString(map['savedAudienceName']),
        segments: crmStringList(map['segmentIds'])
            .map(HostAudienceSegment.fromWireValue)
            .whereType<HostAudienceSegment>()
            .toSet(),
        templateId: crmRequiredString(map, 'templateId'),
        templateName: crmNullableString(map['templateName']),
        audienceCounts: HostCampaignCounts.fromMap(
          map['audienceCounts'],
          'send audience counts',
        ),
        deliveryCounts: HostCampaignCounts.fromMap(
          map['deliveryCounts'],
          'send delivery counts',
        ),
        scheduledAt: crmDateTimeFromMillis(map['scheduledAtMillis']),
        dispatchedAt: crmDateTimeFromMillis(map['dispatchedAtMillis']),
        activityAt: crmRequiredDateTimeFromMillis(map, 'activityAtMillis'),
      );

  final String campaignId;
  final String name;
  final String status;
  final String? savedAudienceId;
  final String? savedAudienceName;
  final Set<HostAudienceSegment> segments;
  final String templateId;
  final String? templateName;
  final HostCampaignCounts audienceCounts;
  final HostCampaignCounts deliveryCounts;
  final DateTime? scheduledAt;
  final DateTime? dispatchedAt;

  @override
  String get id => campaignId;
}

final class HostAnnouncementSendSummary extends HostSendSummary {
  const HostAnnouncementSendSummary({
    required this.broadcastId,
    required this.eventId,
    required this.eventName,
    required this.audience,
    required this.recipientCount,
    required this.sentAt,
    required this.partialFailure,
    required super.activityAt,
  });

  factory HostAnnouncementSendSummary.fromMap(Map<Object?, Object?> map) =>
      HostAnnouncementSendSummary(
        broadcastId: crmRequiredString(map, 'broadcastId'),
        eventId: crmRequiredString(map, 'eventId'),
        eventName: crmRequiredString(map, 'eventName'),
        audience: crmRequiredString(map, 'audience'),
        recipientCount: crmRequiredInt(map, 'recipientCount'),
        sentAt: crmRequiredDateTimeFromMillis(map, 'sentAtMillis'),
        partialFailure: crmRequiredBool(map, 'partialFailure'),
        activityAt: crmRequiredDateTimeFromMillis(map, 'activityAtMillis'),
      );

  final String broadcastId;
  final String eventId;
  final String eventName;
  final String audience;
  final int recipientCount;
  final DateTime sentAt;
  final bool partialFailure;

  @override
  String get id => broadcastId;
}

final class HostFollowerUpdateSendSummary extends HostSendSummary {
  const HostFollowerUpdateSendSummary({
    required this.postId,
    required this.eventId,
    required this.audience,
    required this.status,
    required this.deliveryStatus,
    required this.recipientCount,
    required this.excludedCount,
    required this.activityAvailableCount,
    required this.pushAttemptedCount,
    required this.pushAcceptedCount,
    required this.pushFailedCount,
    required this.pushUnknownCount,
    required this.createdAt,
    required super.activityAt,
  });

  factory HostFollowerUpdateSendSummary.fromMap(Map<Object?, Object?> map) =>
      HostFollowerUpdateSendSummary(
        postId: crmRequiredString(map, 'postId'),
        eventId: crmNullableString(map['eventId']),
        audience: crmRequiredString(map, 'audience'),
        status: crmRequiredString(map, 'status'),
        deliveryStatus: crmRequiredString(map, 'deliveryStatus'),
        recipientCount: crmRequiredInt(map, 'recipientCount'),
        excludedCount: crmRequiredInt(map, 'excludedCount'),
        activityAvailableCount: crmRequiredInt(map, 'activityAvailableCount'),
        pushAttemptedCount: crmRequiredInt(map, 'pushAttemptedCount'),
        pushAcceptedCount: crmRequiredInt(map, 'pushAcceptedCount'),
        pushFailedCount: crmRequiredInt(map, 'pushFailedCount'),
        pushUnknownCount: crmRequiredInt(map, 'pushUnknownCount'),
        createdAt: crmRequiredDateTimeFromMillis(map, 'createdAtMillis'),
        activityAt: crmRequiredDateTimeFromMillis(map, 'activityAtMillis'),
      );

  final String postId;
  final String? eventId;
  final String audience;
  final String status;
  final String deliveryStatus;
  final int recipientCount;
  final int excludedCount;
  final int activityAvailableCount;
  final int pushAttemptedCount;
  final int pushAcceptedCount;
  final int pushFailedCount;
  final int pushUnknownCount;
  final DateTime createdAt;

  bool get hasTrackedDelivery => deliveryStatus != 'unknown';

  bool get deliveryCompleted => deliveryStatus == 'completed';

  @override
  String get id => postId;
}

class HostSendsPage {
  const HostSendsPage({
    required this.organizerId,
    required this.sends,
    required this.nextCursor,
  });

  factory HostSendsPage.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'organizer Sends response');
    return HostSendsPage(
      organizerId: crmRequiredString(map, 'organizerId'),
      sends: crmMapList(
        map['sends'],
        'organizer Sends rows',
      ).map(HostSendSummary.fromMap).toList(growable: false),
      nextCursor: crmNullableString(map['nextCursor']),
    );
  }

  final String organizerId;
  final List<HostSendSummary> sends;
  final String? nextCursor;
}
