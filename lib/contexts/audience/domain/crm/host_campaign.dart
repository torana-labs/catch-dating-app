import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';

class HostCampaignDraft {
  const HostCampaignDraft({
    required this.requestId,
    required this.name,
    required this.messageClass,
    required this.savedAudienceId,
    required this.connectionId,
    required this.templateId,
    required this.templateVariables,
    this.campaignId,
    this.expectedRevision,
    this.eventId,
    this.inviteDestinationKind,
    this.scheduledAt,
  });

  final String requestId;
  final String name;
  final String messageClass;
  final String savedAudienceId;
  final String connectionId;
  final String templateId;
  final Map<String, String> templateVariables;
  final String? campaignId;
  final int? expectedRevision;
  final String? eventId;
  final String? inviteDestinationKind;
  final DateTime? scheduledAt;
}

class HostCampaignCounts {
  const HostCampaignCounts(this.values);

  factory HostCampaignCounts.fromMap(Object? value, String label) {
    final map = crmRequiredMap(value, label);
    return HostCampaignCounts({
      for (final entry in map.entries)
        if (entry.key is String && entry.value is num)
          entry.key as String: (entry.value as num).toInt(),
    });
  }

  final Map<String, int> values;

  int operator [](String key) => values[key] ?? 0;
}

class HostCampaign {
  const HostCampaign({
    required this.organizerId,
    required this.campaignId,
    this.savedAudienceId,
    required this.status,
    required this.revision,
    required this.audienceCounts,
    required this.deliveryCounts,
    required this.senderStatus,
    required this.templateStatus,
    required this.canApprove,
    required this.canDispatch,
    required this.blockers,
  });

  factory HostCampaign.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'organizer campaign response');
    return HostCampaign(
      organizerId: crmRequiredString(map, 'organizerId'),
      campaignId: crmRequiredString(map, 'campaignId'),
      savedAudienceId: crmNullableString(map['savedAudienceId']),
      status: crmRequiredString(map, 'status'),
      revision: crmRequiredInt(map, 'revision'),
      audienceCounts: HostCampaignCounts.fromMap(
        map['audienceCounts'],
        'audienceCounts',
      ),
      deliveryCounts: HostCampaignCounts.fromMap(
        map['deliveryCounts'],
        'deliveryCounts',
      ),
      senderStatus: crmRequiredString(map, 'senderStatus'),
      templateStatus: crmRequiredString(map, 'templateStatus'),
      canApprove: crmRequiredBool(map, 'canApprove'),
      canDispatch: crmRequiredBool(map, 'canDispatch'),
      blockers: crmStringList(map['blockers']).toSet(),
    );
  }

  final String organizerId;
  final String campaignId;
  final String? savedAudienceId;
  final String status;
  final int revision;
  final HostCampaignCounts audienceCounts;
  final HostCampaignCounts deliveryCounts;
  final String senderStatus;
  final String templateStatus;
  final bool canApprove;
  final bool canDispatch;
  final Set<String> blockers;
}
