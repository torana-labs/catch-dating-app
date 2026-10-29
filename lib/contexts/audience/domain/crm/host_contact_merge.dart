import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';

enum HostContactMergeMatchKind {
  sameVerifiedUid,
  sameVerifiedPhone,
  sameImportedPhone,
  sameEmail,
}

enum HostContactMergeConfidence { verified, proposed }

enum HostContactMergeDecisionState { none, differentPeople, reopened }

class HostContactMergeCandidateContact {
  const HostContactMergeCandidateContact({
    required this.contactId,
    required this.displayName,
    required this.phoneE164,
    required this.email,
    required this.linkedAccount,
    required this.primarySource,
    required this.revision,
  });

  factory HostContactMergeCandidateContact.fromMap(Map<Object?, Object?> map) =>
      HostContactMergeCandidateContact(
        contactId: crmRequiredString(map, 'contactId'),
        displayName: crmRequiredString(map, 'displayName'),
        phoneE164: crmNullableString(map['phoneE164']),
        email: crmNullableString(map['email']),
        linkedAccount: crmRequiredBool(map, 'linkedAccount'),
        primarySource: crmRequiredString(map, 'primarySource'),
        revision: crmRequiredInt(map, 'revision'),
      );

  final String contactId;
  final String displayName;
  final String? phoneE164;
  final String? email;
  final bool linkedAccount;
  final String primarySource;
  final int revision;
}

class HostContactMergeCandidate {
  const HostContactMergeCandidate({
    required this.candidateId,
    required this.contacts,
    required this.matchKinds,
    required this.confidence,
    required this.sourceKinds,
    required this.sharedEventIds,
    required this.sharedEventCount,
    required this.updatedAt,
    required this.decisionState,
    required this.decisionRevision,
    required this.canReopen,
  });

  factory HostContactMergeCandidate.fromMap(Map<Object?, Object?> map) =>
      HostContactMergeCandidate(
        candidateId: crmRequiredString(map, 'candidateId'),
        contacts: crmMapList(
          map['contacts'],
          'merge candidate contacts',
        ).map(HostContactMergeCandidateContact.fromMap).toList(growable: false),
        matchKinds: crmStringList(map['matchKinds'])
            .map(
              (value) => crmEnumByName(
                HostContactMergeMatchKind.values,
                value,
                'merge match kind',
              ),
            )
            .toSet(),
        confidence: crmEnumByName(
          HostContactMergeConfidence.values,
          crmRequiredString(map, 'confidence'),
          'merge confidence',
        ),
        sourceKinds: crmStringList(map['sourceKinds']).toSet(),
        sharedEventIds: crmStringList(map['sharedEventIds']),
        sharedEventCount: crmRequiredInt(map, 'sharedEventCount'),
        updatedAt: crmRequiredDateTimeFromMillis(map, 'updatedAtMillis'),
        decisionState: crmEnumByName(
          HostContactMergeDecisionState.values,
          crmRequiredString(map, 'decisionState'),
          'merge decision state',
        ),
        decisionRevision: map['decisionRevision'] == null
            ? null
            : crmRequiredInt(map, 'decisionRevision'),
        canReopen: crmRequiredBool(map, 'canReopen'),
      );

  final String candidateId;
  final List<HostContactMergeCandidateContact> contacts;
  final Set<HostContactMergeMatchKind> matchKinds;
  final HostContactMergeConfidence confidence;
  final Set<String> sourceKinds;
  final List<String> sharedEventIds;
  final int sharedEventCount;
  final DateTime updatedAt;
  final HostContactMergeDecisionState decisionState;
  final int? decisionRevision;
  final bool canReopen;
}

class HostContactMergeCandidatePage {
  const HostContactMergeCandidatePage({
    required this.organizerId,
    required this.candidates,
    required this.dismissedCandidates,
    required this.nextCursor,
    required this.truncated,
  });

  factory HostContactMergeCandidatePage.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'contact merge candidates');
    return HostContactMergeCandidatePage(
      organizerId: crmRequiredString(map, 'organizerId'),
      candidates: crmMapList(
        map['candidates'],
        'contact merge candidates',
      ).map(HostContactMergeCandidate.fromMap).toList(growable: false),
      dismissedCandidates: crmMapList(
        map['dismissedCandidates'],
        'dismissed contact merge candidates',
      ).map(HostContactMergeCandidate.fromMap).toList(growable: false),
      nextCursor: crmNullableString(map['nextCursor']),
      truncated: crmRequiredBool(map, 'truncated'),
    );
  }

  final String organizerId;
  final List<HostContactMergeCandidate> candidates;
  final List<HostContactMergeCandidate> dismissedCandidates;
  final String? nextCursor;
  final bool truncated;
}

class HostActiveContactMerge {
  const HostActiveContactMerge({
    required this.mergeReceiptId,
    required this.sourceContactId,
    required this.sourceDisplayName,
    required this.evidence,
    required this.conflicts,
    required this.movedFactCount,
    required this.mergedAt,
  });

  factory HostActiveContactMerge.fromMap(Map<Object?, Object?> map) =>
      HostActiveContactMerge(
        mergeReceiptId: crmRequiredString(map, 'mergeReceiptId'),
        sourceContactId: crmRequiredString(map, 'sourceContactId'),
        sourceDisplayName: crmRequiredString(map, 'sourceDisplayName'),
        evidence: crmStringList(map['evidence']),
        conflicts: crmStringList(map['conflicts']),
        movedFactCount: crmRequiredInt(map, 'movedFactCount'),
        mergedAt: crmRequiredDateTimeFromMillis(map, 'mergedAtMillis'),
      );

  final String mergeReceiptId;
  final String sourceContactId;
  final String sourceDisplayName;
  final List<String> evidence;
  final List<String> conflicts;
  final int movedFactCount;
  final DateTime mergedAt;
}
