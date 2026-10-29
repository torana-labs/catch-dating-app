import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';

part 'event_rehearsal_checkpoint_management_command.dart';
part 'event_rehearsal_checkpoint_visit_command.dart';

/// Group controls have no synthetic guest target. Each decision retains its
/// reviewed generation, source and complete observation or selection set.
sealed class RehearsalMovementCommand {
  const RehearsalMovementCommand(this.snapshot);
  final RehearsalMovementReview snapshot;
  String get kind;
  int get selectedRevision;
  Map<String, Object?> toJson();
}

final class RehearsalChangeRoute extends RehearsalMovementCommand {
  RehearsalChangeRoute({
    required RehearsalMovementReview snapshot,
    required this.alternativeId,
    required this.decisionId,
  }) : super(snapshot) {
    final choices = snapshot.destinations.where(
      (item) => item.alternativeId == alternativeId,
    );
    if (!snapshot.canChangeRoute ||
        choices.length != 1 ||
        choices.single.target == snapshot.activeDestination ||
        !RegExp(r'^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$').hasMatch(decisionId)) {
      throw const FormatException('Review a current route alternative.');
    }
  }

  final String alternativeId;
  final String decisionId;

  RehearsalMovementDestination get destination => snapshot.destinations
      .singleWhere((item) => item.alternativeId == alternativeId);

  @override
  String get kind => 'changeRoute';
  @override
  int get selectedRevision => snapshot.current!.revision;
  @override
  Map<String, Object?> toJson() => {
    'kind': kind,
    'payload': {
      'routeRevision': snapshot.revision,
      'groupId': snapshot.scope.groupId,
      'expectedSourceHash': snapshot.sourceHash,
      'alternativeId': alternativeId,
      'decisionId': decisionId,
    },
  };
}

final class RehearsalConfirmDeparture extends RehearsalMovementCommand {
  RehearsalConfirmDeparture({
    required RehearsalMovementReview snapshot,
    required this.destination,
    this.roster,
    this.checkpoint,
  }) : super(snapshot) {
    if (!snapshot.canConfirm ||
        snapshot.revision >= 500 ||
        !snapshot.destinations.any((d) => d.target == destination)) {
      throw const FormatException('Review a current configured destination.');
    }
    if (roster != null &&
        (roster!.attendeeIds.length > 50 ||
            !roster!.attendeeIds.every(
              (id) => snapshot.candidates.any((m) => m.attendeeId == id),
            ))) {
      throw const FormatException(
        'Every selected guest needs a current departure visit.',
      );
    }
    if (checkpoint != null &&
        (roster == null ||
            destination is AssistanceFixedPlace ||
            checkpoint!.dueAt < snapshot.serverTime ||
            checkpoint!.dueAt > snapshot.serverTime + 604800000 ||
            checkpoint!.dueAt > snapshot.endAt + 14400000)) {
      throw const FormatException(
        'Review the checkpoint roster and reporting deadline.',
      );
    }
    if (checkpoint != null &&
        snapshot.staffReview?.isManager == false &&
        checkpoint!.responsibleOperatorId != snapshot.actorUid) {
      throw const FormatException(
        'Only the rehearsal Host can name another reporter.',
      );
    }
    if (checkpoint != null &&
        snapshot.staffReview != null &&
        checkpoint!.responsibleOperatorId.startsWith('practice-staff:')) {
      final until = snapshot.staffReview!.operatorPermissionUntil(
        checkpoint!.responsibleOperatorId,
        snapshot.scope.groupId,
        AssistanceGroupPermission.recordCheckpoint,
      );
      if (until == null || until <= checkpoint!.dueAt) {
        throw const FormatException(
          'The reporter needs duty beyond the checkpoint deadline.',
        );
      }
    }
    // Current real account authority is checked by the backend at execution.
  }
  final AssistanceJoiningTarget destination;
  final EventAssistanceDepartureRosterSelection? roster;
  final AssistanceDepartureCheckpointRequest? checkpoint;
  @override
  String get kind => 'confirmDeparture';
  @override
  int get selectedRevision => snapshot.revision + 1;
  @override
  Map<String, Object?> toJson() => {
    'kind': kind,
    'expectedSourceHash': snapshot.sourceHash,
    'payload': {
      'groupId': snapshot.scope.groupId,
      'expectedProgressRevision': snapshot.revision,
      'destination': destination.toJson(),
      if (roster != null)
        'departureRoster': {
          'attendeeIds': roster!.attendeeIds.toList(),
          'expectedSourceHash': snapshot.rosterSourceHash,
        },
      if (checkpoint != null) 'checkpointRequest': checkpoint!.toJson(),
    },
  };
}

final class RehearsalRecordCheckpoint extends RehearsalMovementCommand {
  RehearsalRecordCheckpoint({
    required RehearsalMovementReview snapshot,
    required this.observation,
  }) : super(snapshot) {
    if (!snapshot.canReport || observation.accountedFor.length > 50) {
      throw const FormatException(
        'Review a recorded checkpoint before reporting.',
      );
    }
    final c = snapshot.checkpoint!;
    assistanceInteger(c.revision + 1);
    requireCheckpointObservation(
      availability: c.availability,
      previouslyAccountedFor: c.report?.accountedFor ?? const [],
      decision: observation,
    );
  }
  final AssistanceCheckpointObservation observation;
  @override
  String get kind => 'recordCheckpoint';
  @override
  int get selectedRevision => snapshot.checkpoint!.progressRevision;
  @override
  Map<String, Object?> toJson() => {
    'kind': kind,
    'expectedSourceHash': snapshot.checkpoint!.sourceHash,
    'payload': {
      'groupId': snapshot.scope.groupId,
      'expectedProgressRevision': selectedRevision,
      'checkpointId': snapshot.checkpoint!.checkpointId,
      'expectedCheckpointRevision': snapshot.checkpoint!.revision,
      'accountedFor': observation.accountedFor.toList(),
      'correctionReason': observation.correctionReason,
    },
  };
}

final class RehearsalMovementChange {
  RehearsalMovementChange({
    required this.command,
    required this.clientActionId,
  }) {
    if (!RegExp(r'^[A-Za-z0-9_-]{8,120}$').hasMatch(clientActionId)) {
      throw const FormatException(
        'Invalid rehearsal movement request identity.',
      );
    }
  }
  final RehearsalMovementCommand command;
  final String clientActionId;
  RehearsalMovementReview get snapshot => command.snapshot;
  Map<String, Object?> toJson() => {
    'sessionId': snapshot.scope.sessionId,
    'expectedRevision': snapshot.session.runtimeRevision,
    'expectedSetupRevision': snapshot.scope.setupRevision,
    'clientActionId': clientActionId,
    if (snapshot.selection.practiceOperatorId != null)
      'practiceOperatorId': snapshot.selection.practiceOperatorId,
    'action': 'movement',
    'movement': command.toJson(),
  };

  void requireResult(EventRehearsalBootstrap result) {
    snapshot.staffReview?.requireSameRole(result.staffReview);
    final before = snapshot.session;
    final next = result.movementReview;
    final receipts = result.actions.where(
      (a) => a.clientActionId == clientActionId,
    );
    final immediate =
        result.session.runtimeRevision == before.runtimeRevision + 1;
    if (next == null ||
        next.scope != snapshot.scope ||
        next.actorUid != snapshot.actorUid ||
        next.selected?.revision != command.selectedRevision ||
        result.session.runtimeRevision <= before.runtimeRevision ||
        result.session.actionCount < before.actionCount + 1 ||
        result.session.virtualNow.isBefore(before.virtualNow) ||
        receipts.length != 1 ||
        receipts.single.actorId != null ||
        receipts.single.kind != 'control' ||
        receipts.single.name != 'movement:${command.kind}' ||
        receipts.single.runtimeRevision != before.runtimeRevision + 1 ||
        receipts.single.virtualNow != before.virtualNow ||
        immediate &&
            (result.session.virtualNow != before.virtualNow ||
                result.session.status != before.status)) {
      throw const FormatException(
        'Practice response does not confirm this group command.',
      );
    }
    final record = next.selected!;
    switch (command) {
      case final RehearsalChangeRoute change:
        final route = next.routeDecision;
        if (!immediate && route?.operationId != clientActionId) break;
        if (route == null ||
            route.progressRevision != snapshot.revision + 1 ||
            route.previousRevision != snapshot.revision ||
            route.departureRevision != snapshot.current!.revision ||
            route.sourceHash != snapshot.sourceHash ||
            route.alternativeId != change.alternativeId ||
            route.destination != change.destination.target ||
            route.decisionId != change.decisionId ||
            route.operationId != clientActionId ||
            route.decidedBy != snapshot.actorUid ||
            route.decidedAt != snapshot.serverTime) {
          throw const FormatException(
            'Route confirmation changed the reviewed decision.',
          );
        }
      case final RehearsalResolveCheckpointVisit visit:
        visit._requireResult(next, immediate);
      case final RehearsalManageCheckpoint management:
        management._requireResult(next, clientActionId, immediate);
      case RehearsalConfirmDeparture(
        :final destination,
        :final roster,
        :final checkpoint,
      ):
        final d = record.departure;
        if (d.operationId != clientActionId ||
            d.confirmedBy != snapshot.actorUid ||
            d.confirmedAt != snapshot.serverTime ||
            d.sourceHash != snapshot.sourceHash ||
            d.destination != destination ||
            (d.roster == null) != (roster == null) ||
            d.roster != null &&
                (d.roster!.selectionHash != snapshot.rosterSourceHash ||
                    !_sameIds(
                      d.roster!.members.map((m) => m.attendeeId).toList(),
                      roster!.attendeeIds,
                    )) ||
            (d.checkpointRequest == null) != (checkpoint == null) ||
            checkpoint != null &&
                (d.checkpointRequest!.responsibleOperatorId !=
                        checkpoint.responsibleOperatorId ||
                    d.checkpointRequest!.dueAt != checkpoint.dueAt) ||
            immediate && record.report != null) {
          throw const FormatException(
            'Departure confirmation changed the reviewed decision.',
          );
        }
        for (final member
            in d.roster?.members ?? <RehearsalDepartureMember>[]) {
          final old = snapshot.candidates.singleWhere(
            (m) => m.attendeeId == member.attendeeId,
          );
          if (member.visitHash != old.visitHash ||
              member.episodeId != old.episodeId ||
              member.membershipHash != old.membershipHash ||
              member.displayName != old.displayName) {
            throw const FormatException(
              'Departure lost its reviewed guest visit.',
            );
          }
        }
      case RehearsalRecordCheckpoint(:final observation):
        final old = snapshot.checkpoint!;
        final report = record.report;
        if (record.departure.hash != old.departure.hash ||
            report == null ||
            report.revision < old.revision + 1 ||
            immediate &&
                (report.revision != old.revision + 1 ||
                    report.reportedAt != snapshot.serverTime ||
                    report.reportedBy != snapshot.actorUid ||
                    report.correctionReason != observation.correctionReason ||
                    !_sameIds(report.accountedFor, observation.accountedFor))) {
          throw const FormatException(
            'Checkpoint confirmation changed its departure or observations.',
          );
        }
    }
    // Exact retries return subsequent corrections and current group progress.
    // The selected immutable departure and parent receipt prove this operation.
  }
}

bool _sameIds(List<String> a, List<String> b) =>
    a.length == b.length &&
    Iterable<int>.generate(a.length).every((i) => a[i] == b[i]);
