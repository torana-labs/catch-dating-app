import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_receivers.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';

enum AssistanceMembershipAction {
  place,
  propose,
  accept,
  reject,
  cancel,
  leave,
}

enum AssistanceMembershipOutcome { read, applied, replayed }

enum AssistancePendingTransferState { pending, expired, sourceChanged }

enum AssistanceClosedTransferState { accepted, rejected, cancelled }

typedef AssistanceMembershipGroup = ({String groupId, String label});
typedef AssistanceAcceptedGroup = ({
  String groupId,
  String groupSourceHash,
  String responsibleOperatorId,
  int acceptedAt,
});
typedef AssistanceTransferProposal = ({
  String transferId,
  String? from,
  String to,
  String targetSourceHash,
  String receivingOperatorId,
  String requestedBy,
  int requestedAt,
  int expiresAt,
});

sealed class AssistanceMembershipTransfer {
  const AssistanceMembershipTransfer._(this.proposal);
  final AssistanceTransferProposal proposal;
}

final class AssistancePendingTransfer extends AssistanceMembershipTransfer {
  const AssistancePendingTransfer._(super.proposal, this.state) : super._();
  final AssistancePendingTransferState state;
}

final class AssistanceClosedTransfer extends AssistanceMembershipTransfer {
  const AssistanceClosedTransfer._(
    super.proposal,
    this.state,
    this.resolvedBy,
    this.resolvedAt,
  ) : super._();
  final AssistanceClosedTransferState state;
  final String resolvedBy;
  final int resolvedAt;
}

/// Historical assignment remains explicit when its event, episode or group changed.
sealed class AssistanceMembershipRecord {
  const AssistanceMembershipRecord._();
  int get revision;
  AssistanceMembershipTransfer? get transfer;
}

final class AssistanceUninitializedMembership
    extends AssistanceMembershipRecord {
  const AssistanceUninitializedMembership._() : super._();
  @override
  int get revision => 0;
  @override
  AssistanceMembershipTransfer? get transfer => null;
}

final class AssistanceCurrentMembership extends AssistanceMembershipRecord {
  const AssistanceCurrentMembership._(
    this.revision,
    this.accepted,
    this.transfer,
  ) : super._();
  @override
  final int revision;
  final AssistanceAcceptedGroup? accepted;
  @override
  final AssistanceMembershipTransfer? transfer;
}

final class AssistanceChangedMembership extends AssistanceMembershipRecord {
  const AssistanceChangedMembership._(
    this.revision,
    this.previousAccepted,
    this.transfer,
  ) : super._();
  @override
  final int revision;
  final AssistanceAcceptedGroup? previousAccepted;
  @override
  final AssistanceMembershipTransfer? transfer;
}

final class AssistanceMembershipFacts {
  const AssistanceMembershipFacts._({
    required this.sourceHash,
    required this.serverTime,
    required this.episodeId,
    required this.participationRevision,
    required this.ready,
    required this.membership,
    required this.groups,
    required this.actions,
  });
  final String sourceHash;
  final int serverTime, participationRevision;
  final String? episodeId;
  final bool ready;
  final AssistanceMembershipRecord membership;
  final List<AssistanceMembershipGroup> groups;
  final Set<AssistanceMembershipAction> actions;
  int get revision => membership.revision;
  AssistanceMembershipTransfer? get transfer => membership.transfer;
  AssistanceAcceptedGroup? get accepted => switch (membership) {
    AssistanceCurrentMembership(:final accepted) => accepted,
    AssistanceUninitializedMembership() ||
    AssistanceChangedMembership() => null,
  };

  factory AssistanceMembershipFacts.fromJson(Object? value) {
    final map = assistanceObject(value, {
      'sourceHash',
      'serverTime',
      'revision',
      'episodeId',
      'participationRevision',
      'freshness',
      'ready',
      'accepted',
      'transfer',
      'transferState',
      'groups',
      'actions',
    });
    final now = assistanceInteger(map['serverTime']);
    final revision = assistanceInteger(map['revision']);
    final episode = map['episodeId'] == null
        ? null
        : assistanceId(map['episodeId']);
    final participationRevision = assistanceInteger(
      map['participationRevision'],
    );
    final ready = assistanceBoolean(map['ready']);
    final rawGroups = map['groups'];
    if (rawGroups is! List || rawGroups.length > 40) {
      throw const FormatException('Invalid membership groups.');
    }
    final groups = rawGroups
        .map((value) {
          final group = assistanceObject(value, {'groupId', 'label'});
          final id = assistanceId(group['groupId']);
          if (id == 'event:whole') {
            throw const FormatException('Expected a saved pace group.');
          }
          return (groupId: id, label: assistanceText(group['label'], 240));
        })
        .toList(growable: false);
    if (groups.map((g) => g.groupId).toSet().length != groups.length) {
      throw const FormatException('Duplicate membership group.');
    }
    final accepted = _accepted(map['accepted'], now);
    final transfer = _transfer(map['transfer'], map['transferState'], now);
    final membership = switch (map['freshness']) {
      'uninitialized'
          when revision == 0 && accepted == null && transfer == null =>
        const AssistanceUninitializedMembership._(),
      'current'
          when revision > 0 &&
              episode != null &&
              (accepted == null ||
                  groups.any((g) => g.groupId == accepted.groupId)) =>
        AssistanceCurrentMembership._(revision, accepted, transfer),
      'sourceChanged' when revision > 0 => AssistanceChangedMembership._(
        revision,
        accepted,
        transfer,
      ),
      _ => throw const FormatException('Inconsistent membership freshness.'),
    };
    if (transfer case AssistancePendingTransfer(
      :final proposal,
      :final state,
    )) {
      if (proposal.from != accepted?.groupId ||
          state != AssistancePendingTransferState.sourceChanged &&
              (membership is! AssistanceCurrentMembership ||
                  !groups.any((g) => g.groupId == proposal.to))) {
        throw const FormatException('Inconsistent group transfer source.');
      }
    }
    final rawActions = map['actions'];
    if (rawActions is! List || rawActions.length > 6) {
      throw const FormatException('Invalid membership actions.');
    }
    final actions = rawActions
        .map(
          (value) => assistanceEnum(AssistanceMembershipAction.values, value),
        )
        .toSet();
    final pending =
        transfer is AssistancePendingTransfer &&
        transfer.state == AssistancePendingTransferState.pending;
    final currentAccepted = membership is AssistanceCurrentMembership
        ? membership.accepted
        : null;
    if (actions.length != rawActions.length ||
        episode == null &&
            (participationRevision != 0 || ready || actions.isNotEmpty) ||
        ready && groups.isEmpty ||
        actions.any(
          (action) => !switch (action) {
            AssistanceMembershipAction.place =>
              ready && !pending && currentAccepted == null,
            AssistanceMembershipAction.propose => ready && !pending,
            AssistanceMembershipAction.accept => ready && pending,
            AssistanceMembershipAction.reject => pending,
            AssistanceMembershipAction.cancel =>
              transfer is AssistancePendingTransfer,
            AssistanceMembershipAction.leave => accepted != null,
          },
        )) {
      throw const FormatException('Inconsistent membership actions.');
    }
    return AssistanceMembershipFacts._(
      sourceHash: assistanceHash(map['sourceHash']),
      serverTime: now,
      episodeId: episode,
      participationRevision: participationRevision,
      ready: ready,
      membership: membership,
      groups: List.unmodifiable(groups),
      actions: Set.unmodifiable(actions),
    );
  }
}

final class EventAssistanceMembershipView {
  const EventAssistanceMembershipView._(
    this.scope,
    this.facts,
    this.handoverReview,
  );
  final EventAssistanceGuestScope scope;
  final AssistanceMembershipFacts facts;
  final AssistanceMembershipHandoverReview? handoverReview;
  String get sourceHash => facts.sourceHash;
  int get serverTime => facts.serverTime;
  int get participationRevision => facts.participationRevision;
  String? get episodeId => facts.episodeId;
  bool get ready => facts.ready;
  AssistanceMembershipRecord get membership => facts.membership;
  List<AssistanceMembershipGroup> get groups => facts.groups;
  Set<AssistanceMembershipAction> get actions => facts.actions;
  int get revision => facts.revision;
  AssistanceMembershipTransfer? get transfer => facts.transfer;
  AssistanceAcceptedGroup? get accepted => facts.accepted;

  factory EventAssistanceMembershipView.fromJson(
    Object? value, {
    required EventAssistanceGuestScope expectedScope,
  }) {
    final map = assistanceObject(value, {
      'context',
      'attendeeId',
      if (assistanceObject(value).containsKey('handoverReview'))
        'handoverReview',
      'sourceHash',
      'serverTime',
      'revision',
      'episodeId',
      'participationRevision',
      'freshness',
      'ready',
      'accepted',
      'transfer',
      'transferState',
      'groups',
      'actions',
    });
    final context = assistanceObject(map['context'], {
      'mode',
      'eventId',
      'organizerId',
    });
    if (context['mode'] != 'live' ||
        context['eventId'] != expectedScope.eventId ||
        context['organizerId'] != expectedScope.organizerId ||
        map['attendeeId'] != expectedScope.attendeeId) {
      throw const FormatException('Group membership scope mismatch.');
    }
    final facts = AssistanceMembershipFacts.fromJson({
      for (final entry in map.entries)
        if (entry.key != 'context' &&
            entry.key != 'attendeeId' &&
            entry.key != 'handoverReview')
          entry.key: entry.value,
    });
    return EventAssistanceMembershipView._(
      expectedScope,
      facts,
      !map.containsKey('handoverReview')
          ? null
          : AssistanceMembershipHandoverReview.fromJson(
              map['handoverReview'],
              facts: facts,
            ),
    );
  }
}

final class EventAssistanceMembershipResult {
  const EventAssistanceMembershipResult._(
    this.outcome,
    this.operationRevision,
    this.view,
  );
  final AssistanceMembershipOutcome outcome;
  final int? operationRevision;
  final EventAssistanceMembershipView view;

  factory EventAssistanceMembershipResult.fromCallableData(
    Object? value, {
    required EventAssistanceGuestScope expectedScope,
  }) {
    final map = assistanceObject(value, {
      'outcome',
      'operationRevision',
      'view',
    });
    final outcome = assistanceEnum(
      AssistanceMembershipOutcome.values,
      map['outcome'],
    );
    final revision = assistanceNullableInteger(map['operationRevision']);
    final view = EventAssistanceMembershipView.fromJson(
      map['view'],
      expectedScope: expectedScope,
    );
    if (outcome == AssistanceMembershipOutcome.read
        ? revision != null
        : revision == null ||
              revision == 0 ||
              revision > view.revision ||
              outcome == AssistanceMembershipOutcome.applied &&
                  revision != view.revision) {
      throw const FormatException('Inconsistent membership receipt.');
    }
    return EventAssistanceMembershipResult._(outcome, revision, view);
  }
}

AssistanceAcceptedGroup? _accepted(Object? value, int now) {
  if (value == null) return null;
  final map = assistanceObject(value, {
    'groupId',
    'groupSourceHash',
    'responsibleOperatorId',
    'acceptedAt',
  });
  final at = assistanceInteger(map['acceptedAt']);
  if (at > now) throw const FormatException('Future group acceptance.');
  return (
    groupId: assistanceId(map['groupId']),
    groupSourceHash: assistanceHash(map['groupSourceHash']),
    responsibleOperatorId: assistanceText(map['responsibleOperatorId'], 180),
    acceptedAt: at,
  );
}

AssistanceMembershipTransfer? _transfer(Object? value, Object? state, int now) {
  if (value == null) {
    if (state != 'none') throw const FormatException('Missing group transfer.');
    return null;
  }
  final map = assistanceObject(value, {
    'transferId',
    'from',
    'to',
    'targetSourceHash',
    'receivingOperatorId',
    'requestedBy',
    'requestedAt',
    'expiresAt',
    'status',
    'resolvedAt',
    'resolvedBy',
  });
  final proposal = (
    transferId: assistanceId(map['transferId']),
    from: map['from'] == null ? null : assistanceId(map['from']),
    to: assistanceId(map['to']),
    targetSourceHash: assistanceHash(map['targetSourceHash']),
    receivingOperatorId: assistanceText(map['receivingOperatorId'], 180),
    requestedBy: assistanceText(map['requestedBy'], 180),
    requestedAt: assistanceInteger(map['requestedAt']),
    expiresAt: assistanceInteger(map['expiresAt']),
  );
  if (proposal.from == proposal.to ||
      proposal.requestedAt > now ||
      proposal.expiresAt <= proposal.requestedAt ||
      proposal.expiresAt - proposal.requestedAt > 1800000) {
    throw const FormatException('Invalid group handover interval.');
  }
  if (map['status'] == 'pending') {
    final availability = assistanceEnum(
      AssistancePendingTransferState.values,
      state,
    );
    if (map['resolvedAt'] != null ||
        map['resolvedBy'] != null ||
        availability == AssistancePendingTransferState.pending &&
            now >= proposal.expiresAt ||
        availability == AssistancePendingTransferState.expired &&
            now < proposal.expiresAt) {
      throw const FormatException('Inconsistent pending handover.');
    }
    return AssistancePendingTransfer._(proposal, availability);
  }
  final outcome = assistanceEnum(
    AssistanceClosedTransferState.values,
    map['status'],
  );
  final at = assistanceInteger(map['resolvedAt']);
  if (state != outcome.name || at < proposal.requestedAt || at > now) {
    throw const FormatException('Inconsistent handover resolution.');
  }
  return AssistanceClosedTransfer._(
    proposal,
    outcome,
    assistanceText(map['resolvedBy'], 180),
    at,
  );
}
