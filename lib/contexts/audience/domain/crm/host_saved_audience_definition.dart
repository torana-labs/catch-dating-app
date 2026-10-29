import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';

enum HostSavedAudienceJoin { all, any }

sealed class HostSavedAudiencePredicate {
  const HostSavedAudiencePredicate();

  factory HostSavedAudiencePredicate.fromMap(Map<Object?, Object?> map) =>
      switch (crmRequiredString(map, 'kind')) {
        'staticMembers' => HostSavedAudienceStaticMembers(
          crmStringList(map['contactIds']),
        ),
        'spend' => HostSavedAudienceSpend(
          operator: crmEnumByName(
            HostSavedAudienceAttendanceOperator.values,
            crmRequiredString(map, 'operator'),
            'spend comparison',
          ),
          currency: crmRequiredString(map, 'currency'),
          amountMinor: crmRequiredInt(map, 'amountMinor'),
          withinDays: map['withinDays'] == null
              ? null
              : crmRequiredInt(map, 'withinDays'),
        ),
        'applicationStatus' => HostSavedAudienceApplicationStatusRule(
          formId: crmRequiredString(map, 'formId'),
          reviewStatus: crmEnumByName(
            HostSavedAudienceApplicationStatus.values,
            crmRequiredString(map, 'reviewStatus'),
            'application status',
          ),
        ),
        'formAnswer' => HostSavedAudienceFormAnswer(
          formId: crmRequiredString(map, 'formId'),
          versionId: crmRequiredString(map, 'versionId'),
          questionId: crmRequiredString(map, 'questionId'),
          value: crmAudienceAnswerValue(map['value']),
        ),
        'attendedEvent' => HostSavedAudienceAttendedEvent(
          crmRequiredString(map, 'eventId'),
        ),
        'directoryFilters' => HostSavedAudienceDirectoryFilters(
          segments: {
            for (final value in crmStringList(map['segmentIds']))
              _requiredAudienceSegment({'segmentId': value}, 'segmentId'),
          },
          manualTagIds: crmStringList(map['manualTagIds']).toSet(),
        ),
        'computedSegment' => HostSavedAudienceComputedSegment(
          _requiredAudienceSegment(map, 'segmentId'),
        ),
        'manualTag' => HostSavedAudienceManualTag(
          crmRequiredString(map, 'manualTagId'),
        ),
        'attendanceCount' => HostSavedAudienceAttendanceCount(
          operator: crmEnumByName(
            HostSavedAudienceAttendanceOperator.values,
            crmRequiredString(map, 'operator'),
            'saved audience attendance operator',
          ),
          eventCount: crmRequiredInt(map, 'eventCount'),
        ),
        'lastSeenWithinDays' => HostSavedAudienceLastSeenWithinDays(
          crmRequiredInt(map, 'days'),
        ),
        'reachableForIntent' =>
          crmRequiredString(map, 'intent') == 'organizerWhatsappCampaign'
              ? const HostSavedAudienceCampaignReachable()
              : throw const FormatException(
                  'Saved audience had an unsupported reach intent.',
                ),
        _ => throw const FormatException(
          'Saved audience had an unsupported predicate.',
        ),
      };

  Map<String, Object?> toJson();
}

final class HostSavedAudienceComputedSegment
    extends HostSavedAudiencePredicate {
  const HostSavedAudienceComputedSegment(this.segment);

  final HostAudienceSegment segment;

  @override
  Map<String, Object?> toJson() => {
    'kind': 'computedSegment',
    'segmentId': segment.wireValue,
  };
}

final class HostSavedAudienceManualTag extends HostSavedAudiencePredicate {
  const HostSavedAudienceManualTag(this.manualTagId);

  final String manualTagId;

  @override
  Map<String, Object?> toJson() => {
    'kind': 'manualTag',
    'manualTagId': manualTagId,
  };
}

enum HostSavedAudienceAttendanceOperator { atLeast, atMost }

final class HostSavedAudienceAttendanceCount
    extends HostSavedAudiencePredicate {
  const HostSavedAudienceAttendanceCount({
    required this.operator,
    required this.eventCount,
  });

  final HostSavedAudienceAttendanceOperator operator;
  final int eventCount;

  @override
  Map<String, Object?> toJson() => {
    'kind': 'attendanceCount',
    'operator': operator.name,
    'eventCount': eventCount,
  };
}

final class HostSavedAudienceLastSeenWithinDays
    extends HostSavedAudiencePredicate {
  const HostSavedAudienceLastSeenWithinDays(this.days);

  final int days;

  @override
  Map<String, Object?> toJson() => {'kind': 'lastSeenWithinDays', 'days': days};
}

final class HostSavedAudienceCampaignReachable
    extends HostSavedAudiencePredicate {
  const HostSavedAudienceCampaignReachable();

  @override
  Map<String, Object?> toJson() => {
    'kind': 'reachableForIntent',
    'intent': 'organizerWhatsappCampaign',
  };
}

class HostSavedAudienceDefinition {
  const HostSavedAudienceDefinition({
    required this.join,
    required this.predicates,
  });

  factory HostSavedAudienceDefinition.fromMap(Map<Object?, Object?> map) =>
      HostSavedAudienceDefinition(
        join: crmEnumByName(
          HostSavedAudienceJoin.values,
          crmRequiredString(map, 'join'),
          'saved audience join',
        ),
        predicates: crmMapList(
          map['predicates'],
          'saved audience predicates',
        ).map(HostSavedAudiencePredicate.fromMap).toList(growable: false),
      );

  final HostSavedAudienceJoin join;
  final List<HostSavedAudiencePredicate> predicates;

  bool get isStatic =>
      predicates.length == 1 &&
      predicates.single is HostSavedAudienceStaticMembers;
  List<String> get selectedContactIds => isStatic
      ? (predicates.single as HostSavedAudienceStaticMembers).contactIds
      : const [];

  Map<String, Object?> toJson() => {
    'join': join.name,
    'predicates': predicates.map((value) => value.toJson()).toList(),
  };
}

HostAudienceSegment _requiredAudienceSegment(
  Map<Object?, Object?> map,
  String key,
) {
  final segment = HostAudienceSegment.fromWireValue(
    crmRequiredString(map, key),
  );
  if (segment != null) return segment;
  throw const FormatException('Saved audience had an unknown CRM segment.');
}

enum HostSavedAudienceApplicationStatus {
  submitted,
  inReview,
  approved,
  waitlisted,
  declined,
}

final class HostSavedAudienceApplicationStatusRule
    extends HostSavedAudiencePredicate {
  const HostSavedAudienceApplicationStatusRule({
    required this.formId,
    required this.reviewStatus,
  });
  final String formId;
  final HostSavedAudienceApplicationStatus reviewStatus;
  @override
  Map<String, Object?> toJson() => {
    'kind': 'applicationStatus',
    'formId': formId,
    'reviewStatus': reviewStatus.name,
  };
}

final class HostSavedAudienceFormAnswer extends HostSavedAudiencePredicate {
  const HostSavedAudienceFormAnswer({
    required this.formId,
    required this.versionId,
    required this.questionId,
    required this.value,
  });
  final String formId;
  final String versionId;
  final String questionId;
  final Object value;
  @override
  Map<String, Object?> toJson() => {
    'kind': 'formAnswer',
    'formId': formId,
    'versionId': versionId,
    'questionId': questionId,
    'value': value,
  };
}

final class HostSavedAudienceAttendedEvent extends HostSavedAudiencePredicate {
  const HostSavedAudienceAttendedEvent(this.eventId);
  final String eventId;
  @override
  Map<String, Object?> toJson() => {
    'kind': 'attendedEvent',
    'eventId': eventId,
  };
}

final class HostSavedAudienceStaticMembers extends HostSavedAudiencePredicate {
  const HostSavedAudienceStaticMembers(this.contactIds);
  final List<String> contactIds;
  @override
  Map<String, Object?> toJson() => {
    'kind': 'staticMembers',
    'contactIds': contactIds,
  };
}

final class HostSavedAudienceSpend extends HostSavedAudiencePredicate {
  const HostSavedAudienceSpend({
    required this.operator,
    required this.currency,
    required this.amountMinor,
    this.withinDays,
  });
  final HostSavedAudienceAttendanceOperator operator;
  final String currency;
  final int amountMinor;
  final int? withinDays;

  HostSavedAudienceSpend copyWith({
    HostSavedAudienceAttendanceOperator? operator,
    String? currency,
    int? amountMinor,
    int? withinDays,
    bool lifetime = false,
  }) => HostSavedAudienceSpend(
    operator: operator ?? this.operator,
    currency: currency ?? this.currency,
    amountMinor: amountMinor ?? this.amountMinor,
    withinDays: lifetime ? null : withinDays ?? this.withinDays,
  );

  @override
  Map<String, Object?> toJson() => {
    'kind': 'spend',
    'operator': operator.name,
    'currency': currency,
    'amountMinor': amountMinor,
    'withinDays': withinDays,
  };
}

final class HostSavedAudienceDirectoryFilters
    extends HostSavedAudiencePredicate {
  const HostSavedAudienceDirectoryFilters({
    required this.segments,
    required this.manualTagIds,
  });
  final Set<HostAudienceSegment> segments;
  final Set<String> manualTagIds;
  @override
  Map<String, Object?> toJson() => {
    'kind': 'directoryFilters',
    'segmentIds': segments.map((s) => s.wireValue).toList()..sort(),
    'manualTagIds': manualTagIds.toList()..sort(),
  };
}
