import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';

/// Directory metadata excludes predicates and selected-member IDs.
class HostSavedAudienceSummary {
  const HostSavedAudienceSummary({
    required this.organizerId,
    required this.audienceId,
    required this.name,
    required this.status,
    required this.isStatic,
    required this.revision,
    required this.lastPreviewMatchCount,
    required this.lastPreviewAt,
    required this.updatedAt,
  });

  factory HostSavedAudienceSummary.fromMap(Map<Object?, Object?> data) =>
      HostSavedAudienceSummary(
        organizerId: crmRequiredString(data, 'organizerId'),
        audienceId: crmRequiredString(data, 'audienceId'),
        name: crmRequiredString(data, 'name'),
        status: crmRequiredString(data, 'status'),
        isStatic: crmRequiredBool(data, 'isStatic'),
        revision: crmRequiredInt(data, 'revision'),
        lastPreviewMatchCount: data['lastPreviewMatchCount'] == null
            ? null
            : crmRequiredInt(data, 'lastPreviewMatchCount'),
        lastPreviewAt: crmDateTimeFromMillis(data['lastPreviewAtMillis']),
        updatedAt: crmRequiredDateTimeFromMillis(data, 'updatedAtMillis'),
      );

  factory HostSavedAudienceSummary.fromAudience(HostSavedAudience audience) =>
      HostSavedAudienceSummary(
        organizerId: audience.organizerId,
        audienceId: audience.audienceId,
        name: audience.name,
        status: audience.status,
        isStatic: audience.definition.isStatic,
        revision: audience.revision,
        lastPreviewMatchCount: audience.lastPreviewMatchCount,
        lastPreviewAt: audience.lastPreviewAt,
        updatedAt: audience.updatedAt,
      );

  final String organizerId;
  final String audienceId;
  final String name;
  final String status;
  final bool isStatic;
  final int revision;
  final int? lastPreviewMatchCount;
  final DateTime? lastPreviewAt;
  final DateTime updatedAt;
}

class HostSavedAudienceSummaryPage {
  const HostSavedAudienceSummaryPage({
    required this.audiences,
    required this.nextCursor,
  });
  final List<HostSavedAudienceSummary> audiences;
  final String? nextCursor;
}

class HostGroupDirectoryState {
  const HostGroupDirectoryState({
    required this.page,
    this.loadingMore = false,
    this.loadMoreError,
  });
  final HostSavedAudienceSummaryPage page;
  final bool loadingMore;
  final Object? loadMoreError;
}
