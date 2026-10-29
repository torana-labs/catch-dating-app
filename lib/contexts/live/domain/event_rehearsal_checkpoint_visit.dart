part of 'event_rehearsal_movement.dart';

/// One original departure member, distinct from a later visit by the same actor.
final class RehearsalCheckpointVisitReview {
  const RehearsalCheckpointVisitReview._(
    this.attendeeId,
    this.visitHash,
    this.sourceHash,
    this.revision,
    this.disposition,
    this.availability,
    this.canResolve,
  );
  final String attendeeId, visitHash, sourceHash;
  final int revision;
  final AssistanceVisitDisposition disposition;
  final AssistanceAccountabilityAvailability availability;
  final bool canResolve;

  static List<RehearsalCheckpointVisitReview> parseRoster(
    Object? raw,
    RehearsalDeparture departure,
    AssistanceCheckpointAvailability availability,
    EventRehearsalSession session,
    bool permitted,
  ) {
    final rows = _movementList(raw, 50);
    final members = departure.roster?.members ?? <RehearsalDepartureMember>[];
    if (rows.length != members.length) {
      throw const FormatException(
        'Checkpoint visit review lost an original member.',
      );
    }
    return List.unmodifiable([
      for (var i = 0; i < rows.length; i++)
        _parse(rows[i], members[i], availability, session, permitted),
    ]);
  }

  static RehearsalCheckpointVisitReview _parse(
    Object? raw,
    RehearsalDepartureMember member,
    AssistanceCheckpointAvailability roster,
    EventRehearsalSession session,
    bool permitted,
  ) {
    final m = assistanceObject(raw, {
      'attendeeId',
      'visitHash',
      'sourceHash',
      'revision',
      'disposition',
      'availability',
      'canResolve',
    });
    final visit = roster is AssistanceCheckpointRoster
        ? roster.members.singleWhere((m) => m.attendeeId == member.attendeeId)
        : null;
    final reason = roster is! AssistanceCheckpointRoster
        ? AssistanceAccountabilityUnavailableReason.setupChanged
        : visit!.visit is AssistanceCheckpointUnavailableVisit
        ? (visit.visit as AssistanceCheckpointUnavailableVisit).reason ==
                  AssistanceCheckpointVisitUnavailableReason.notCheckedIn
              ? AssistanceAccountabilityUnavailableReason.notCheckedIn
              : AssistanceAccountabilityUnavailableReason.visitChanged
        : null;
    final availability = AssistanceAccountabilityAvailability.fromJson(
      m['availability'],
    );
    final revision = assistanceInteger(m['revision']);
    final disposition = assistanceEnum(
      AssistanceVisitDisposition.values,
      m['disposition'],
    );
    final canResolve = assistanceBoolean(m['canResolve']);
    final allowed =
        reason == null &&
        permitted &&
        session.hasStarted &&
        session.actionCount < 500 &&
        session.runtimeRevision < 2147483647 &&
        revision < 9007199254740991;
    if (m['attendeeId'] != member.attendeeId ||
        m['visitHash'] != member.visitHash ||
        canResolve != allowed ||
        (reason == null
            ? availability is! AssistanceAccountabilityReady
            : availability is! AssistanceAccountabilityUnavailable ||
                  availability.reason != reason) ||
        reason != null &&
            disposition != AssistanceVisitDisposition.unresolved ||
        revision == 0 && disposition != AssistanceVisitDisposition.unresolved) {
      throw const FormatException(
        'Checkpoint visit identity or permission changed.',
      );
    }
    final proof = visit?.disposition;
    if (reason == null &&
        proof is AssistanceCheckpointResolvedDisposition &&
        (proof.revision != revision || proof.disposition != disposition)) {
      throw const FormatException(
        'Checkpoint visit contradicts recorded outcome.',
      );
    }
    return RehearsalCheckpointVisitReview._(
      member.attendeeId,
      member.visitHash,
      assistanceHash(m['sourceHash']),
      revision,
      disposition,
      availability,
      canResolve,
    );
  }
}
