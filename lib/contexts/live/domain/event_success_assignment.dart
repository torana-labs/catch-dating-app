import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:catch_dating_app/l10n/generated/structured_domain_copy.g.dart';

final class EventSuccessAssignment {
  const EventSuccessAssignment({
    required this.id,
    required this.eventId,
    required this.clubId,
    required this.uid,
    required this.moduleId,
    required this.label,
    required this.displayTitle,
    required this.peerUids,
    required this.source,
    required this.createdAt,
    required this.updatedAt,
    this.displaySubtitle,
    this.unitKind,
    this.unitIndex,
    this.unitLabel,
    this.whySummary,
    this.whyCodes = const [],
    this.rotationFairness,
    this.rotationSlots = const [],
    this.groupRotationSlots = const [],
    this.sitOutSlots = const [],
    this.layoutUnitId,
    this.confirmedLayoutUnitId,
  });

  factory EventSuccessAssignment.fromJson(Map<String, dynamic> json) {
    return EventSuccessAssignment(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      clubId: json['clubId'] as String,
      uid: json['uid'] as String,
      moduleId: json['moduleId'] as String,
      label: json['label'] as String,
      displayTitle: json['displayTitle'] as String,
      displaySubtitle: json['displaySubtitle'] as String?,
      peerUids: (json['peerUids'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(growable: false),
      unitKind: json['unitKind'] as String?,
      unitIndex: json['unitIndex'] as int?,
      unitLabel: json['unitLabel'] as String?,
      whySummary: json['whySummary'] as String?,
      whyCodes: (json['whyCodes'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(growable: false),
      rotationFairness: json['rotationFairness'] is Map
          ? EventSuccessRotationFairness.fromJson(
              Map<String, dynamic>.from(json['rotationFairness'] as Map),
            )
          : null,
      rotationSlots: (json['rotationSlots'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map(
            (slot) => EventSuccessRotationSlot.fromJson(
              Map<String, dynamic>.from(slot),
            ),
          )
          .toList(growable: false),
      groupRotationSlots:
          (json['groupRotationSlots'] as List<dynamic>? ?? const [])
              .whereType<Map>()
              .map(
                (slot) => EventSuccessGroupRotationSlot.fromJson(
                  Map<String, dynamic>.from(slot),
                ),
              )
              .toList(growable: false),
      sitOutSlots: (json['sitOutSlots'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map(
            (slot) => EventSuccessSitOutSlot.fromJson(
              Map<String, dynamic>.from(slot),
            ),
          )
          .toList(growable: false),
      layoutUnitId: json['layoutUnitId'] as String?,
      confirmedLayoutUnitId: json['confirmedLayoutUnitId'] as String?,
      source: json['source'] as String? ?? 'server',
      createdAt: dateTimeFromFirestoreValue(
        json['createdAt'],
        field: 'createdAt',
      ),
      updatedAt: dateTimeFromFirestoreValue(
        json['updatedAt'],
        field: 'updatedAt',
      ),
    );
  }

  final String id;
  final String eventId;
  final String clubId;
  final String uid;
  final String moduleId;
  final String label;
  final String displayTitle;
  final String? displaySubtitle;
  final List<String> peerUids;
  final String? unitKind;
  final int? unitIndex;
  final String? unitLabel;
  final String? whySummary;
  final List<String> whyCodes;
  final EventSuccessRotationFairness? rotationFairness;
  final List<EventSuccessRotationSlot> rotationSlots;
  final List<EventSuccessGroupRotationSlot> groupRotationSlots;
  final List<EventSuccessSitOutSlot> sitOutSlots;
  final String? layoutUnitId;
  final String? confirmedLayoutUnitId;
  final String source;
  final DateTime createdAt;
  final DateTime updatedAt;

  List<String> get allPeerUids {
    final uids = <String>{
      ...peerUids,
      for (final slot in rotationSlots) slot.peerUid,
      for (final slot in groupRotationSlots) ...slot.peerUids,
    }.toList()..sort();
    return uids;
  }

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'clubId': clubId,
    'uid': uid,
    'moduleId': moduleId,
    'label': label,
    'displayTitle': displayTitle,
    'displaySubtitle': displaySubtitle,
    'peerUids': peerUids,
    'unitKind': unitKind,
    'unitIndex': unitIndex,
    'unitLabel': unitLabel,
    'whySummary': whySummary,
    'whyCodes': whyCodes,
    'rotationFairness': rotationFairness?.toJson(),
    'rotationSlots': rotationSlots.map((slot) => slot.toJson()).toList(),
    'groupRotationSlots': groupRotationSlots
        .map((slot) => slot.toJson())
        .toList(),
    'sitOutSlots': sitOutSlots.map((slot) => slot.toJson()).toList(),
    'layoutUnitId': layoutUnitId,
    'confirmedLayoutUnitId': confirmedLayoutUnitId,
    'source': source,
    'createdAt': firestoreTimestampFromDateTime(createdAt),
    'updatedAt': firestoreTimestampFromDateTime(updatedAt),
  };
}

final class EventSuccessAssignmentDraft {
  const EventSuccessAssignmentDraft({
    required this.id,
    required this.eventId,
    required this.roundIndex,
    required this.baseAssignmentRevision,
    required this.assignment,
  });

  factory EventSuccessAssignmentDraft.fromJson(Map<String, dynamic> json) {
    final assignmentJson = Map<String, dynamic>.from(
      json['assignment'] as Map? ?? const <String, dynamic>{},
    );
    assignmentJson['id'] = json['id'];
    return EventSuccessAssignmentDraft(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      roundIndex: json['roundIndex'] as int,
      baseAssignmentRevision: json['baseAssignmentRevision'] as int,
      assignment: EventSuccessAssignment.fromJson(assignmentJson),
    );
  }

  final String id;
  final String eventId;
  final int roundIndex;
  final int baseAssignmentRevision;
  final EventSuccessAssignment assignment;
}

final class EventSuccessRotationFairness {
  const EventSuccessRotationFairness({
    required this.assignedRoundCount,
    required this.sitOutRoundCount,
    required this.uniquePeerCount,
    required this.repeatPeerCount,
  });

  factory EventSuccessRotationFairness.fromJson(Map<String, dynamic> json) {
    return EventSuccessRotationFairness(
      assignedRoundCount: json['assignedRoundCount'] as int? ?? 0,
      sitOutRoundCount: json['sitOutRoundCount'] as int? ?? 0,
      uniquePeerCount: json['uniquePeerCount'] as int? ?? 0,
      repeatPeerCount: json['repeatPeerCount'] as int? ?? 0,
    );
  }

  final int assignedRoundCount;
  final int sitOutRoundCount;
  final int uniquePeerCount;
  final int repeatPeerCount;

  Map<String, Object?> toJson() => {
    'assignedRoundCount': assignedRoundCount,
    'sitOutRoundCount': sitOutRoundCount,
    'uniquePeerCount': uniquePeerCount,
    'repeatPeerCount': repeatPeerCount,
  };
}

final class EventSuccessRotationSlot {
  const EventSuccessRotationSlot({
    required this.roundIndex,
    required this.label,
    required this.startsAt,
    required this.endsAt,
    required this.peerUid,
    required this.compatibility,
    this.slotId,
    this.unitKind,
    this.unitIndex,
    this.peerCount,
    this.whySummary,
    this.whyCodes = const [],
  });

  factory EventSuccessRotationSlot.fromJson(Map<String, dynamic> json) {
    return EventSuccessRotationSlot(
      slotId: json['slotId'] as String?,
      roundIndex: json['roundIndex'] as int? ?? 0,
      label:
          json['label'] as String? ??
          StructuredDomainCopy.eventSuccessAssignmentRound,
      startsAt: dateTimeFromFirestoreValue(json['startsAt'], field: 'startsAt'),
      endsAt: dateTimeFromFirestoreValue(json['endsAt'], field: 'endsAt'),
      peerUid: json['peerUid'] as String,
      unitKind: json['unitKind'] as String?,
      unitIndex: json['unitIndex'] as int?,
      peerCount: json['peerCount'] as int?,
      compatibility: json['compatibility'] as String? ?? 'social',
      whySummary: json['whySummary'] as String?,
      whyCodes: (json['whyCodes'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(growable: false),
    );
  }

  final String? slotId;
  final int roundIndex;
  final String label;
  final DateTime startsAt;
  final DateTime endsAt;
  final String peerUid;
  final String? unitKind;
  final int? unitIndex;
  final int? peerCount;
  final String compatibility;
  final String? whySummary;
  final List<String> whyCodes;

  Map<String, Object?> toJson() => {
    'slotId': slotId,
    'roundIndex': roundIndex,
    'label': label,
    'startsAt': firestoreTimestampFromDateTime(startsAt),
    'endsAt': firestoreTimestampFromDateTime(endsAt),
    'peerUid': peerUid,
    'unitKind': unitKind,
    'unitIndex': unitIndex,
    'peerCount': peerCount,
    'compatibility': compatibility,
    'whySummary': whySummary,
    'whyCodes': whyCodes,
  };
}

final class EventSuccessGroupRotationSlot {
  const EventSuccessGroupRotationSlot({
    required this.roundIndex,
    required this.label,
    required this.unitLabel,
    required this.startsAt,
    required this.endsAt,
    required this.peerUids,
    required this.compatibility,
    this.slotId,
    this.unitKind,
    this.unitIndex,
    this.peerCount,
    this.whySummary,
    this.whyCodes = const [],
  });

  factory EventSuccessGroupRotationSlot.fromJson(Map<String, dynamic> json) {
    return EventSuccessGroupRotationSlot(
      slotId: json['slotId'] as String?,
      roundIndex: json['roundIndex'] as int? ?? 0,
      label:
          json['label'] as String? ??
          StructuredDomainCopy.eventSuccessAssignmentRound,
      unitLabel: json['unitLabel'] as String? ?? 'Group',
      unitKind: json['unitKind'] as String?,
      unitIndex: json['unitIndex'] as int?,
      startsAt: dateTimeFromFirestoreValue(json['startsAt'], field: 'startsAt'),
      endsAt: dateTimeFromFirestoreValue(json['endsAt'], field: 'endsAt'),
      peerUids: (json['peerUids'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(growable: false),
      peerCount: json['peerCount'] as int?,
      compatibility: json['compatibility'] as String? ?? 'mixed',
      whySummary: json['whySummary'] as String?,
      whyCodes: (json['whyCodes'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(growable: false),
    );
  }

  final String? slotId;
  final int roundIndex;
  final String label;
  final String unitLabel;
  final String? unitKind;
  final int? unitIndex;
  final DateTime startsAt;
  final DateTime endsAt;
  final List<String> peerUids;
  final int? peerCount;
  final String compatibility;
  final String? whySummary;
  final List<String> whyCodes;

  Map<String, Object?> toJson() => {
    'slotId': slotId,
    'roundIndex': roundIndex,
    'label': label,
    'unitLabel': unitLabel,
    'unitKind': unitKind,
    'unitIndex': unitIndex,
    'startsAt': firestoreTimestampFromDateTime(startsAt),
    'endsAt': firestoreTimestampFromDateTime(endsAt),
    'peerUids': peerUids,
    'peerCount': peerCount,
    'compatibility': compatibility,
    'whySummary': whySummary,
    'whyCodes': whyCodes,
  };
}

final class EventSuccessSitOutSlot {
  const EventSuccessSitOutSlot({
    required this.roundIndex,
    required this.label,
    required this.startsAt,
    required this.endsAt,
    required this.whySummary,
    required this.whyCodes,
  });

  factory EventSuccessSitOutSlot.fromJson(Map<String, dynamic> json) {
    return EventSuccessSitOutSlot(
      roundIndex: json['roundIndex'] as int? ?? 0,
      label:
          json['label'] as String? ??
          StructuredDomainCopy.eventSuccessAssignmentRound,
      startsAt: dateTimeFromFirestoreValue(json['startsAt'], field: 'startsAt'),
      endsAt: dateTimeFromFirestoreValue(json['endsAt'], field: 'endsAt'),
      whySummary:
          json['whySummary'] as String? ??
          StructuredDomainCopy.eventSuccessPlannedBreak,
      whyCodes: (json['whyCodes'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(growable: false),
    );
  }

  final int roundIndex;
  final String label;
  final DateTime startsAt;
  final DateTime endsAt;
  final String whySummary;
  final List<String> whyCodes;

  Map<String, Object?> toJson() => {
    'roundIndex': roundIndex,
    'label': label,
    'startsAt': firestoreTimestampFromDateTime(startsAt),
    'endsAt': firestoreTimestampFromDateTime(endsAt),
    'whySummary': whySummary,
    'whyCodes': whyCodes,
  };
}

final class EventSuccessRotationOverrideRound {
  const EventSuccessRotationOverrideRound({
    required this.roundIndex,
    required this.pairings,
  });

  final int roundIndex;
  final List<EventSuccessRotationOverridePair> pairings;

  Map<String, Object?> toJson() => {
    'roundIndex': roundIndex,
    'pairings': pairings.map((pairing) => pairing.toJson()).toList(),
  };
}

final class EventSuccessRotationOverridePair {
  const EventSuccessRotationOverridePair({
    required this.uidA,
    required this.uidB,
  });

  final String uidA;
  final String uidB;

  Map<String, Object?> toJson() => {'uidA': uidA, 'uidB': uidB};
}

final class EventSuccessGroupOverrideRound {
  const EventSuccessGroupOverrideRound({
    required this.roundIndex,
    required this.groups,
  });

  final int roundIndex;
  final List<EventSuccessGroupOverrideUnit> groups;

  Map<String, Object?> toJson() => {
    'roundIndex': roundIndex,
    'groups': groups.map((group) => group.toJson()).toList(),
  };
}

final class EventSuccessGroupOverrideUnit {
  const EventSuccessGroupOverrideUnit({
    required this.label,
    required this.participantUids,
  });

  final String label;
  final List<String> participantUids;

  Map<String, Object?> toJson() => {
    'label': label,
    'participantUids': participantUids,
  };
}

String eventSuccessAssignmentId({
  required String eventId,
  required String moduleId,
  required String uid,
}) => '${eventId}_${moduleId}_$uid';
