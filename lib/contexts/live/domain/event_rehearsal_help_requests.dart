import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_managers.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/platform/cryptography/sha256_digest.dart';

typedef RehearsalHelpScope = ({
  String sessionId,
  String organizerId,
  int setupRevision,
  String clockId,
  String caseId,
});

RehearsalHelpScope rehearsalHelpScope(
  EventRehearsalBootstrap snapshot,
  RehearsalHelpCase request,
) {
  if (!(snapshot.helpRequests?.cases.any((r) => identical(r, request)) ??
      false)) {
    throw const FormatException('Review a request from this practice run.');
  }
  return (
    sessionId: snapshot.session.id,
    organizerId: snapshot.session.organizerId,
    setupRevision: snapshot.session.setupRevision,
    clockId: snapshot.helpRequests!.clockId,
    caseId: request.caseId,
  );
}

/// A bounded rehearsal queue; it never carries a live event command scope.
final class RehearsalHelpRequests {
  const RehearsalHelpRequests._(
    this.clockId,
    this.cases,
    this.untrackedActorIds,
    this.managerOptions,
  );
  final String clockId;
  final List<RehearsalHelpCase> cases;
  final List<String> untrackedActorIds;
  final AssistanceCaseManagerOptions? managerOptions;

  factory RehearsalHelpRequests.fromJson(
    Object? value, {
    required EventRehearsalSession session,
    required List<EventRehearsalActor> actors,
  }) {
    final map = assistanceObject(value, {
      'clockId',
      'coverage',
      'cases',
      'untrackedActorIds',
      if (assistanceObject(value).containsKey('managerOptions'))
        'managerOptions',
    });
    final startedAt = session.virtualStartedAt?.millisecondsSinceEpoch;
    final expectedClock =
        'clock:${sha256Digest(jsonEncode([session.id, startedAt, session.setupRevision]))}';
    final raw = map['cases'];
    final untracked = map['untrackedActorIds'];
    if (startedAt == null ||
        map['clockId'] != expectedClock ||
        map['coverage'] != 'boundedSession' ||
        raw is! List ||
        raw.length > 500 ||
        untracked is! List ||
        untracked.length > 50) {
      throw const FormatException('Invalid practice help request coverage.');
    }
    final actorIds = actors.map((a) => a.actorId).toSet();
    final rows = raw
        .map((r) => RehearsalHelpCase.fromJson(r, session: session))
        .toList(growable: false);
    final unknown = untracked.map(assistanceId).toList(growable: false);
    if (rows.map((r) => r.caseId).toSet().length != rows.length ||
        unknown.toSet().length != unknown.length ||
        rows.any((r) => !actorIds.contains(r.actorId)) ||
        rows.any(
          (r) =>
              r.displayName != null &&
              !actors.any(
                (a) => a.actorId == r.actorId && a.displayName == r.displayName,
              ),
        ) ||
        unknown.any((id) => !actorIds.contains(id))) {
      throw const FormatException(
        'Practice help request guest scope mismatch.',
      );
    }
    return RehearsalHelpRequests._(
      expectedClock,
      List.unmodifiable(rows),
      List.unmodifiable(unknown),
      map['managerOptions'] == null
          ? null
          : AssistanceCaseManagerOptions.fromJson(map['managerOptions']),
    );
  }
}

sealed class RehearsalHelpCase {
  const RehearsalHelpCase._({
    required this.sessionId,
    required this.setupRevision,
    required this.caseId,
    required this.actorId,
    required this.sourceHash,
    required this.revision,
    required this.receivedAt,
    required this.category,
    required this.displayName,
    required this.assignment,
  });
  final String sessionId;
  final int setupRevision;
  final String caseId;
  final String actorId;
  final String sourceHash;
  final int revision;
  final int receivedAt;
  final AssistanceCaseCategory category;
  final String? displayName;
  final AssistanceCaseAssignment assignment;

  factory RehearsalHelpCase.fromJson(
    Object? value, {
    required EventRehearsalSession session,
  }) {
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
    final caseId = assistanceId(map['caseId']);
    final receivedAt = assistanceInteger(map['receivedAt']);
    final revision = assistanceInteger(map['revision']);
    final canChange = assistanceBoolean(map['canChange']);
    if (!RegExp(r'^practice-case:[a-f0-9]{64}$').hasMatch(caseId) ||
        map['availability'] != 'current' ||
        session.virtualStartedAt?.millisecondsSinceEpoch == null ||
        receivedAt < session.virtualStartedAt!.millisecondsSinceEpoch ||
        receivedAt > session.virtualNow.millisecondsSinceEpoch) {
      throw const FormatException(
        'Practice help request belongs to another run.',
      );
    }
    final actorId = assistanceId(map['attendeeId']);
    final hash = assistanceHash(map['sourceHash']);
    final category = assistanceEnum(
      AssistanceCaseCategory.values,
      map['category'],
    );
    final displayName = map['displayName'] == null
        ? null
        : assistanceText(map['displayName'], 120);
    final assigned = AssistanceCaseAssignment.fromJson(map['assignment']);
    if (map['status'] == 'open') {
      if (!canChange || map['resolution'] != null) {
        throw const FormatException('Inconsistent open practice help request.');
      }
      return RehearsalOpenHelpCase._(
        sessionId: session.id,
        setupRevision: session.setupRevision,
        caseId: caseId,
        actorId: actorId,
        sourceHash: hash,
        revision: revision,
        receivedAt: receivedAt,
        category: category,
        displayName: displayName,
        assignment: assigned,
      );
    }
    final resolved = AssistanceCaseResolution.fromJson(map['resolution']);
    if (map['status'] != 'resolved' ||
        canChange ||
        revision == 0 ||
        resolved.at < receivedAt ||
        resolved.at > session.virtualNow.millisecondsSinceEpoch) {
      throw const FormatException(
        'Inconsistent settled practice help request.',
      );
    }
    return RehearsalClosedHelpCase._(
      sessionId: session.id,
      setupRevision: session.setupRevision,
      caseId: caseId,
      actorId: actorId,
      sourceHash: hash,
      revision: revision,
      receivedAt: receivedAt,
      category: category,
      displayName: displayName,
      assignment: assigned,
      resolution: resolved,
    );
  }
}

final class RehearsalOpenHelpCase extends RehearsalHelpCase {
  const RehearsalOpenHelpCase._({
    required super.sessionId,
    required super.setupRevision,
    required super.caseId,
    required super.actorId,
    required super.sourceHash,
    required super.revision,
    required super.receivedAt,
    required super.category,
    required super.displayName,
    required super.assignment,
  }) : super._();
}

final class RehearsalClosedHelpCase extends RehearsalHelpCase {
  const RehearsalClosedHelpCase._({
    required super.sessionId,
    required super.setupRevision,
    required super.caseId,
    required super.actorId,
    required super.sourceHash,
    required super.revision,
    required super.receivedAt,
    required super.category,
    required super.displayName,
    required super.assignment,
    required this.resolution,
  }) : super._();
  final AssistanceCaseResolution resolution;
}
