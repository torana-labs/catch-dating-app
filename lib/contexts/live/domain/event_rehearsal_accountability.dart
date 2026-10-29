import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_staff.dart';
import 'package:catch_dating_app/platform/cryptography/sha256_digest.dart';

/// One synthetic guest in one run. A new visit keeps the same pending owner.
final class RehearsalAccountabilityScope {
  const RehearsalAccountabilityScope._({
    required this.sessionId,
    required this.organizerId,
    required this.setupRevision,
    required this.clockId,
    required this.actorId,
  });
  final String sessionId, organizerId, clockId, actorId;
  final int setupRevision;

  String get episodeId {
    // Match the backend content hash's sorted object keys.
    final context = {
      'clockId': clockId,
      'mode': 'rehearsal',
      'rehearsalId': sessionId,
      'virtualEventId': 'practice:${sha256Digest(jsonEncode(sessionId))}',
    };
    return 'episode:${sha256Digest(jsonEncode([context, actorId]))}';
  }

  @override
  bool operator ==(Object other) =>
      other is RehearsalAccountabilityScope &&
      sessionId == other.sessionId &&
      organizerId == other.organizerId &&
      setupRevision == other.setupRevision &&
      clockId == other.clockId &&
      actorId == other.actorId;
  @override
  int get hashCode =>
      Object.hash(sessionId, organizerId, setupRevision, clockId, actorId);
}

enum RehearsalVisitUnavailableReason {
  notApplicable,
  notCheckedIn,
  visitNotRecorded,
  invalidSource,
}

sealed class RehearsalVisitAvailability {
  const RehearsalVisitAvailability();
  factory RehearsalVisitAvailability.fromJson(Object? value) {
    final map = assistanceObject(value);
    switch (map['kind']) {
      case 'ready':
        assistanceObject(map, {'kind'});
        return const RehearsalVisitReady();
      case 'unavailable':
        assistanceObject(map, {'kind', 'reason'});
        return RehearsalVisitUnavailable(
          assistanceEnum(RehearsalVisitUnavailableReason.values, map['reason']),
        );
      default:
        throw const FormatException('Unknown practice visit availability.');
    }
  }
}

final class RehearsalVisitReady extends RehearsalVisitAvailability {
  const RehearsalVisitReady();
}

final class RehearsalVisitUnavailable extends RehearsalVisitAvailability {
  const RehearsalVisitUnavailable(this.reason);
  final RehearsalVisitUnavailableReason reason;
}

final class RehearsalAccountabilityReviews {
  const RehearsalAccountabilityReviews._(this.clockId, this.rows);
  final String clockId;
  final List<RehearsalAccountabilityRow> rows;

  factory RehearsalAccountabilityReviews.fromJson(
    Object? value, {
    required EventRehearsalSession session,
    required List<EventRehearsalActor> actors,
    RehearsalStaffReview? staffReview,
    RehearsalMembershipReviews? membershipReviews,
  }) {
    final map = assistanceObject(value, {'clockId', 'coverage', 'rows'});
    assistanceId(session.id);
    assistanceId(session.organizerId);
    final start = session.virtualStartedAt?.millisecondsSinceEpoch;
    final now = assistanceInteger(session.virtualNow.millisecondsSinceEpoch);
    final generation = assistanceInteger(session.setupRevision);
    assistanceInteger(session.runtimeRevision);
    assistanceInteger(session.actionCount);
    if (start == null ||
        start < 0 ||
        start > now ||
        generation > 2147483647 ||
        session.actionCount > 500 ||
        session.actorCount < 2 ||
        session.actorCount > 50) {
      throw const FormatException('Invalid practice visit clock or capacity.');
    }
    final clock =
        'clock:${sha256Digest(jsonEncode([session.id, start, generation]))}';
    final raw = map['rows'];
    if (map['clockId'] != clock ||
        map['coverage'] != 'boundedSession' ||
        raw is! List ||
        raw.length != actors.length ||
        actors.length != session.actorCount ||
        actors.map((a) => a.actorId).toSet().length != actors.length) {
      throw const FormatException('Incomplete practice visit coverage.');
    }
    if (staffReview != null &&
        (!identical(staffReview.session, session) ||
            staffReview.clockId != clock ||
            !staffReview.isManager &&
                membershipReviews?.actorUid != staffReview.actorUid)) {
      throw const FormatException(
        'Practice visit role needs current membership evidence.',
      );
    }
    final rows = <RehearsalAccountabilityRow>[];
    String? previous;
    for (final rawRow in raw) {
      final rawMap = assistanceObject(rawRow);
      final row = assistanceObject(rawMap, {
        if (rawMap.containsKey('groupId')) 'groupId',
        'attendeeId',
        'episodeId',
        'sourceHash',
        'visitRevision',
        'checkedInAtMillis',
        'revision',
        'disposition',
        'availability',
        'canResolve',
      });
      final actorId = assistanceId(row['attendeeId']);
      final actor = actors.where((a) => a.actorId == actorId).firstOrNull;
      final scope = RehearsalAccountabilityScope._(
        sessionId: session.id,
        organizerId: session.organizerId,
        setupRevision: generation,
        clockId: clock,
        actorId: actorId,
      );
      if (actor == null ||
          row['episodeId'] != scope.episodeId ||
          previous != null && previous.compareTo(actorId) >= 0) {
        throw const FormatException('Practice visit identity changed.');
      }
      final revision = assistanceInteger(row['revision']);
      final visit = assistanceNullableInteger(row['visitRevision']);
      final checkedIn = assistanceNullableInteger(row['checkedInAtMillis']);
      final availability = RehearsalVisitAvailability.fromJson(
        row['availability'],
      );
      final disposition = assistanceEnum(
        AssistanceVisitDisposition.values,
        row['disposition'],
      );
      final canResolve = assistanceBoolean(row['canResolve']);
      final groupId = row.containsKey('groupId')
          ? assistanceText(row['groupId'], 180)
          : 'event:whole';
      final manager = staffReview?.isManager ?? true;
      final membership = membershipReviews?.rows
          .where((r) => r.scope.actorId == actorId)
          .firstOrNull;
      final whole =
          staffReview?.canPerform(
            'event:whole',
            AssistanceGroupPermission.resolveAccountability,
          ) ??
          true;
      final expectedGroup = manager || whole
          ? 'event:whole'
          : membership?.facts.accepted?.groupId ?? 'event:whole';
      final permitted =
          manager ||
          (staffReview?.canPerform(
                groupId,
                AssistanceGroupPermission.resolveAccountability,
              ) ??
              false);
      if (groupId != expectedGroup ||
          !manager && !row.containsKey('groupId') ||
          manager && groupId != 'event:whole') {
        throw const FormatException(
          'Practice visit does not belong to the reviewed group.',
        );
      }
      final reason = switch (availability) {
        RehearsalVisitReady() => null,
        RehearsalVisitUnavailable(:final reason) => reason,
      };
      final applicable = session.setup.modules.contains(
        EventRehearsalModule.accountability,
      );
      final physical = [
        EventRehearsalActorStatus.present,
        EventRehearsalActorStatus.late,
        EventRehearsalActorStatus.returned,
      ].contains(actor.status);
      if (checkedIn != null &&
              (visit == null ||
                  visit == 0 ||
                  checkedIn < start ||
                  checkedIn > now) ||
          visit == null && (checkedIn != null || revision != 0) ||
          revision == 0 &&
              disposition != AssistanceVisitDisposition.unresolved ||
          (!applicable &&
              reason != RehearsalVisitUnavailableReason.notApplicable) ||
          (applicable &&
              reason == RehearsalVisitUnavailableReason.notApplicable) ||
          reason != null &&
              disposition != AssistanceVisitDisposition.unresolved ||
          reason == null &&
              (!physical || visit == null || visit == 0 || checkedIn == null) ||
          reason == RehearsalVisitUnavailableReason.visitNotRecorded &&
              (visit != null || checkedIn != null || revision != 0) ||
          reason == RehearsalVisitUnavailableReason.notCheckedIn &&
              (physical ||
                  actor.status == EventRehearsalActorStatus.disconnected ||
                  visit == null ||
                  checkedIn != null) ||
          canResolve !=
              (permitted &&
                  reason == null &&
                  session.hasStarted &&
                  session.actionCount < 500 &&
                  revision < 9007199254740991)) {
        throw const FormatException('Inconsistent practice visit evidence.');
      }
      final evidence = RehearsalVisitEvidence._(
        revision: revision,
        visitRevision: visit,
        checkedInAtMillis: checkedIn,
        disposition: disposition,
        availability: availability,
        sourceHash: assistanceHash(row['sourceHash']),
      );
      rows.add(
        canResolve
            ? RehearsalActionableAccountability._(
                scope,
                evidence,
                groupId,
                staffReview,
              )
            : RehearsalObservedAccountability._(
                scope,
                evidence,
                groupId,
                staffReview,
              ),
      );
      previous = actorId;
    }
    return RehearsalAccountabilityReviews._(clock, List.unmodifiable(rows));
  }
}

final class RehearsalVisitEvidence {
  const RehearsalVisitEvidence._({
    required this.revision,
    required this.visitRevision,
    required this.checkedInAtMillis,
    required this.disposition,
    required this.availability,
    required this.sourceHash,
  });
  final int revision;
  final int? visitRevision, checkedInAtMillis;
  final String sourceHash;
  final AssistanceVisitDisposition disposition;
  final RehearsalVisitAvailability availability;
}

sealed class RehearsalAccountabilityRow {
  const RehearsalAccountabilityRow._(
    this.scope,
    this.evidence,
    this.groupId,
    this.staffReview,
  );
  final String groupId;
  final RehearsalStaffReview? staffReview;
  final RehearsalAccountabilityScope scope;
  final RehearsalVisitEvidence evidence;
  String get actorId => scope.actorId;
}

final class RehearsalActionableAccountability
    extends RehearsalAccountabilityRow {
  const RehearsalActionableAccountability._(
    super.scope,
    super.evidence,
    super.groupId,
    super.staffReview,
  ) : super._();
}

final class RehearsalObservedAccountability extends RehearsalAccountabilityRow {
  const RehearsalObservedAccountability._(
    super.scope,
    super.evidence,
    super.groupId,
    super.staffReview,
  ) : super._();
}
