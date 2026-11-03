import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/organizers/organizers.dart';

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

  /// The organizer's current managers with their display names, as the
  /// server's projectCaseManagerOptions built them: authority from the
  /// owner, primary host and host ids (the fields rules check), names from
  /// the host profiles or, without any, the primary host's name. The actor
  /// must be one of them.
  factory AssistanceCaseManagerOptions.fromOrganizer({
    required Organizer organizer,
    required String actorUid,
  }) {
    final managerIds = <String>{
      for (final uid in [
        organizer.hostUserId,
        organizer.ownerUserId,
        ...organizer.hostUserIds,
      ])
        if (uid != null && uid.isNotEmpty) uid,
    };
    final primaryHostId = organizer.hostUserId;
    final primaryHostName = organizer.hostName;
    final profiles = organizer.hostProfiles.isNotEmpty
        ? [
            for (final profile in organizer.hostProfiles)
              (uid: profile.uid, displayName: profile.displayName),
          ]
        : primaryHostId != null &&
              primaryHostId.isNotEmpty &&
              primaryHostName != null &&
              primaryHostName.isNotEmpty
        ? [(uid: primaryHostId, displayName: primaryHostName)]
        : const <({String uid, String displayName})>[];
    return AssistanceCaseManagerOptions.fromJson({
      'actorUid': actorUid,
      'managers': [
        for (final uid in managerIds)
          {
            'uid': uid,
            'displayName': profiles
                .where((profile) => profile.uid == uid)
                .firstOrNull
                ?.displayName,
          },
      ],
    });
  }

  bool contains(String uid) => managers.any((m) => m.uid == uid);
}
