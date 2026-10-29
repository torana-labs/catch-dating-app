part of 'event_assistance_checkpoint.dart';

final class AssistanceCheckpointReporterCandidate {
  const AssistanceCheckpointReporterCandidate._(
    this.operatorId,
    this.displayName,
    this.validUntil,
  );
  final String operatorId;
  final String? displayName;
  final int validUntil;
}

/// A bounded, expiring choice list for the reviewed original request. Its actor,
/// assignment hash and duty deadlines remain distinct from arrival evidence.
final class AssistanceCheckpointReporterOptions {
  const AssistanceCheckpointReporterOptions._(
    this.actorUid,
    this.sourceHash,
    this.validUntil,
    this.reporters,
  );
  final String actorUid, sourceHash;
  final int validUntil;
  final List<AssistanceCheckpointReporterCandidate> reporters;
  factory AssistanceCheckpointReporterOptions.fromJson(
    Object? raw, {
    required int serverTime,
    required int dueAt,
    required String assignmentHash,
  }) {
    final map = assistanceObject(raw, {
      'actorUid',
      'sourceHash',
      'validUntil',
      'reporters',
    });
    final until = assistanceInteger(map['validUntil']);
    final hash = assistanceHash(map['sourceHash']);
    final values = map['reporters'];
    if (hash != assignmentHash ||
        until <= serverTime ||
        until - serverTime > 1800000 ||
        values is! List ||
        values.length > 92) {
      throw const FormatException(
        'Review current checkpoint reporter choices.',
      );
    }
    final ids = <String>{};
    final reporters = <AssistanceCheckpointReporterCandidate>[];
    for (final raw in values) {
      final row = assistanceObject(raw, {
        'operatorId',
        'displayName',
        'validUntil',
      });
      final id = _checkpointOperator(row['operatorId']);
      final deadline = assistanceInteger(row['validUntil']);
      if (!ids.add(id) || deadline <= serverTime || deadline <= dueAt) {
        throw const FormatException(
          'Reporter access must cover the original deadline.',
        );
      }
      reporters.add(
        AssistanceCheckpointReporterCandidate._(
          id,
          row['displayName'] == null
              ? null
              : assistanceText(row['displayName'], 120),
          deadline,
        ),
      );
    }
    return AssistanceCheckpointReporterOptions._(
      _checkpointOperator(map['actorUid']),
      hash,
      until,
      List.unmodifiable(reporters),
    );
  }
  bool contains(String operatorId) =>
      reporters.any((r) => r.operatorId == operatorId);
}
