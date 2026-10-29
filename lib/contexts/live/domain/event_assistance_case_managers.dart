import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

final class AssistanceCaseManager {
  const AssistanceCaseManager._(this.uid, this.displayName);
  final String uid;
  final String? displayName;
}

/// A manager snapshot; the server rechecks access for every assignment.
final class AssistanceCaseManagerOptions {
  const AssistanceCaseManagerOptions._(this.actorUid, this.managers);
  final String actorUid;
  final List<AssistanceCaseManager> managers;
  factory AssistanceCaseManagerOptions.fromJson(Object? raw) {
    final m = assistanceObject(raw, {'actorUid', 'managers'});
    final rows = m['managers'];
    if (rows is! List || rows.length > 42) {
      throw const FormatException('Review current guest-help managers.');
    }
    final managers = rows.map((r) {
      final row = assistanceObject(r, {'uid', 'displayName'});
      return AssistanceCaseManager._(
        assistanceId(row['uid']),
        row['displayName'] == null
            ? null
            : assistanceText(row['displayName'], 120),
      );
    }).toList();
    final actorUid = assistanceId(m['actorUid']);
    if (managers.map((r) => r.uid).toSet().length != managers.length ||
        !managers.any((r) => r.uid == actorUid)) {
      throw const FormatException('Guest-help manager identities changed.');
    }
    return AssistanceCaseManagerOptions._(
      actorUid,
      List.unmodifiable(managers),
    );
  }
  bool contains(String uid) => managers.any((m) => m.uid == uid);
}
