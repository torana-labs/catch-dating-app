import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';

enum AssistanceCaseCategory { eventLogistics, accessibility, other }

enum AssistanceCaseResolutionOutcome { resolved, declined }

enum AssistanceCaseAssignmentAuthority { current, revoked }

sealed class AssistanceCaseAssignment {
  const AssistanceCaseAssignment();
  factory AssistanceCaseAssignment.fromJson(Object? value) {
    final map = assistanceObject(value);
    switch (map['kind']) {
      case 'unassigned':
        assistanceObject(map, {'kind'});
        return const AssistanceCaseUnassigned();
      case 'assigned':
        assistanceObject(map, {'kind', 'uid', 'authority'});
        return AssistanceCaseAssigned._(
          assistanceId(map['uid']),
          assistanceEnum(
            AssistanceCaseAssignmentAuthority.values,
            map['authority'],
          ),
        );
      default:
        throw const FormatException('Invalid help request assignment.');
    }
  }
}

final class AssistanceCaseUnassigned extends AssistanceCaseAssignment {
  const AssistanceCaseUnassigned();
}

final class AssistanceCaseAssigned extends AssistanceCaseAssignment {
  const AssistanceCaseAssigned._(this.managerUid, this.authority);
  final String managerUid;
  final AssistanceCaseAssignmentAuthority authority;
}

final class AssistanceCaseResolution {
  const AssistanceCaseResolution._(this.outcome, this.actorUid, this.at);
  factory AssistanceCaseResolution.fromJson(Object? value) {
    final map = assistanceObject(value, {'outcome', 'actorUid', 'at'});
    return AssistanceCaseResolution._(
      assistanceEnum(AssistanceCaseResolutionOutcome.values, map['outcome']),
      assistanceId(map['actorUid']),
      assistanceInteger(map['at']),
    );
  }

  final AssistanceCaseResolutionOutcome outcome;
  final String actorUid;
  final int at;
}

sealed class AssistanceHostCase {
  const AssistanceHostCase._({
    required this.scope,
    required this.sourceHash,
    required this.receivedAt,
    required this.observedAt,
    required this.category,
    required this.displayName,
  });

  final EventAssistanceCaseScope scope;
  final String sourceHash;
  final int receivedAt;
  final int observedAt;
  final AssistanceCaseCategory category;
  final String? displayName;
  AssistanceCaseStatus get status;

  factory AssistanceHostCase.fromJson(
    Object? value, {
    required EventAssistanceCaseScope scope,
    required int serverTime,
  }) {
    assistanceInteger(serverTime);
    final map = assistanceObject(value, {
      'caseId',
      'revision',
      'sourceHash',
      'availability',
      'attendeeId',
      'category',
      'receivedAt',
      'status',
      'resolution',
      'canChange',
      'assignment',
      if (assistanceObject(value).containsKey('displayName')) 'displayName',
    });
    if (map['caseId'] != scope.caseId) {
      throw const FormatException('Help request identity mismatch.');
    }
    final sourceHash = assistanceHash(map['sourceHash']);
    final category = assistanceEnum(
      AssistanceCaseCategory.values,
      map['category'],
    );
    final receivedAt = assistanceInteger(map['receivedAt']);
    if (receivedAt > serverTime) {
      throw const FormatException('Help request is newer than its snapshot.');
    }
    final status = assistanceEnum(AssistanceCaseStatus.values, map['status']);
    final canChange = assistanceBoolean(map['canChange']);
    final assignment = assistanceObject(map['assignment']);
    final availability = map['availability'];
    final displayName = map['displayName'] == null
        ? null
        : assistanceText(map['displayName'], 120);
    if (availability == 'legacy' || availability == 'sourceChanged') {
      assistanceObject(assignment, {'kind'});
      if (displayName != null ||
          map['attendeeId'] != null ||
          map['resolution'] != null ||
          canChange ||
          assignment['kind'] != 'unavailable') {
        throw const FormatException(
          'Unavailable case exposes current guest state.',
        );
      }
      if (availability == 'legacy') {
        if (map['revision'] != null) {
          throw const FormatException('Legacy case has an invented revision.');
        }
        return AssistanceLegacyHostCase._(
          scope: scope,
          sourceHash: sourceHash,
          category: category,
          displayName: displayName,
          receivedAt: receivedAt,
          observedAt: serverTime,
          status: status,
        );
      }
      return AssistanceStaleHostCase._(
        scope: scope,
        sourceHash: sourceHash,
        category: category,
        displayName: displayName,
        receivedAt: receivedAt,
        observedAt: serverTime,
        status: status,
        revision: assistanceInteger(map['revision']),
      );
    }
    if (availability != 'current') {
      throw const FormatException('Unknown help request availability.');
    }
    final guestScope = EventAssistanceGuestScope(
      organizerId: scope.organizerId,
      eventId: scope.eventId,
      attendeeId: assistanceId(map['attendeeId']),
    );
    final revision = assistanceInteger(map['revision']);
    final assigned = AssistanceCaseAssignment.fromJson(assignment);
    if (status == AssistanceCaseStatus.open) {
      if (!canChange || map['resolution'] != null) {
        throw const FormatException('Inconsistent open help request.');
      }
      return AssistanceOpenHostCase._(
        scope: scope,
        sourceHash: sourceHash,
        category: category,
        displayName: displayName,
        receivedAt: receivedAt,
        observedAt: serverTime,
        revision: revision,
        guestScope: guestScope,
        assignment: assigned,
      );
    }
    final resolution = AssistanceCaseResolution.fromJson(map['resolution']);
    if (canChange ||
        revision == 0 ||
        resolution.at < receivedAt ||
        resolution.at > serverTime) {
      throw const FormatException('Inconsistent settled help request.');
    }
    return AssistanceClosedHostCase._(
      scope: scope,
      sourceHash: sourceHash,
      category: category,
      displayName: displayName,
      receivedAt: receivedAt,
      observedAt: serverTime,
      revision: revision,
      guestScope: guestScope,
      assignment: assigned,
      resolution: resolution,
    );
  }
}

final class AssistanceOpenHostCase extends AssistanceHostCase {
  const AssistanceOpenHostCase._({
    required super.scope,
    required super.sourceHash,
    required super.receivedAt,
    required super.observedAt,
    required super.category,
    required super.displayName,
    required this.revision,
    required this.guestScope,
    required this.assignment,
  }) : super._();
  final int revision;
  final EventAssistanceGuestScope guestScope;
  final AssistanceCaseAssignment assignment;
  @override
  AssistanceCaseStatus get status => AssistanceCaseStatus.open;
}

final class AssistanceClosedHostCase extends AssistanceHostCase {
  const AssistanceClosedHostCase._({
    required super.scope,
    required super.sourceHash,
    required super.receivedAt,
    required super.observedAt,
    required super.category,
    required super.displayName,
    required this.revision,
    required this.guestScope,
    required this.assignment,
    required this.resolution,
  }) : super._();
  final int revision;
  final EventAssistanceGuestScope guestScope;
  final AssistanceCaseAssignment assignment;
  final AssistanceCaseResolution resolution;
  @override
  AssistanceCaseStatus get status => AssistanceCaseStatus.resolved;
}

final class AssistanceStaleHostCase extends AssistanceHostCase {
  const AssistanceStaleHostCase._({
    required super.scope,
    required super.sourceHash,
    required super.receivedAt,
    required super.observedAt,
    required super.category,
    required super.displayName,
    required this.revision,
    required this.status,
  }) : super._();
  final int revision;
  @override
  final AssistanceCaseStatus status;
}

final class AssistanceLegacyHostCase extends AssistanceHostCase {
  const AssistanceLegacyHostCase._({
    required super.scope,
    required super.sourceHash,
    required super.receivedAt,
    required super.observedAt,
    required super.category,
    required super.displayName,
    required this.status,
  }) : super._();
  @override
  final AssistanceCaseStatus status;
}
