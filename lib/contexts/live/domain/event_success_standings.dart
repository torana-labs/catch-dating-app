import 'package:catch_dating_app/contexts/formats/formats.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';

final class EventSuccessOutcomeUnit {
  const EventSuccessOutcomeUnit({required this.id, required this.label});

  final String id;
  final String label;
}

final class EventSuccessStandings {
  const EventSuccessStandings({
    required this.id,
    required this.eventId,
    required this.clubId,
    required this.unitOutcome,
    required this.revision,
    required this.latestRoundIndex,
    required this.rounds,
    required this.entries,
    required this.createdAt,
    required this.updatedAt,
  });

  factory EventSuccessStandings.fromJson(Map<String, dynamic> json) {
    final outcomeName = json['unitOutcome'] as String?;
    final unitOutcome = switch (outcomeName) {
      'score' => EventSuccessUnitOutcome.score,
      'rank' => EventSuccessUnitOutcome.rank,
      _ => throw const FormatException('Invalid standings unit outcome.'),
    };
    return EventSuccessStandings(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      clubId: json['clubId'] as String,
      unitOutcome: unitOutcome,
      revision: json['revision'] as int,
      latestRoundIndex: json['latestRoundIndex'] as int,
      rounds: (json['rounds'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map(
            (round) => EventSuccessStandingRound.fromJson(
              Map<String, dynamic>.from(round),
            ),
          )
          .toList(growable: false),
      entries: _standingEntries(json['entries']),
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
  final EventSuccessUnitOutcome unitOutcome;
  final int revision;
  final int latestRoundIndex;
  final List<EventSuccessStandingRound> rounds;
  final List<EventSuccessStandingEntry> entries;
  final DateTime createdAt;
  final DateTime updatedAt;

  EventSuccessStandingRound? throughRound(int roundIndex) {
    EventSuccessStandingRound? result;
    for (final round in rounds) {
      if (round.roundIndex <= roundIndex &&
          (result == null || round.roundIndex > result.roundIndex)) {
        result = round;
      }
    }
    return result;
  }

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'clubId': clubId,
    'unitOutcome': unitOutcome.name,
    'revision': revision,
    'latestRoundIndex': latestRoundIndex,
    'rounds': rounds.map((round) => round.toJson()).toList(),
    'entries': entries.map((entry) => entry.toJson()).toList(),
    'createdAt': firestoreTimestampFromDateTime(createdAt),
    'updatedAt': firestoreTimestampFromDateTime(updatedAt),
  };
}

final class EventSuccessStandingRound {
  const EventSuccessStandingRound({
    required this.roundIndex,
    required this.entries,
  });

  factory EventSuccessStandingRound.fromJson(Map<String, dynamic> json) =>
      EventSuccessStandingRound(
        roundIndex: json['roundIndex'] as int,
        entries: _standingEntries(json['entries']),
      );

  final int roundIndex;
  final List<EventSuccessStandingEntry> entries;

  Map<String, Object?> toJson() => {
    'roundIndex': roundIndex,
    'entries': entries.map((entry) => entry.toJson()).toList(),
  };
}

final class EventSuccessStandingEntry {
  const EventSuccessStandingEntry({
    required this.unitId,
    required this.unitLabel,
    required this.position,
    required this.value,
    required this.roundsRecorded,
  });

  factory EventSuccessStandingEntry.fromJson(Map<String, dynamic> json) =>
      EventSuccessStandingEntry(
        unitId: json['unitId'] as String,
        unitLabel: json['unitLabel'] as String,
        position: json['position'] as int,
        value: json['value'] as num,
        roundsRecorded: json['roundsRecorded'] as int,
      );

  final String unitId;
  final String unitLabel;
  final int position;
  final num value;
  final int roundsRecorded;

  Map<String, Object?> toJson() => {
    'unitId': unitId,
    'unitLabel': unitLabel,
    'position': position,
    'value': value,
    'roundsRecorded': roundsRecorded,
  };
}

sealed class EventSuccessUnitOutcomeEntryInput {
  const EventSuccessUnitOutcomeEntryInput({
    required this.unitId,
    required this.unitLabel,
  });

  final String unitId;
  final String unitLabel;

  Map<String, Object?> toJson();
}

final class EventSuccessCompletionOutcomeInput
    extends EventSuccessUnitOutcomeEntryInput {
  const EventSuccessCompletionOutcomeInput({
    required super.unitId,
    required super.unitLabel,
    required this.completed,
  });

  final bool completed;

  @override
  Map<String, Object?> toJson() => {
    'unitId': unitId,
    'unitLabel': unitLabel,
    'completed': completed,
  };
}

final class EventSuccessScoreOutcomeInput
    extends EventSuccessUnitOutcomeEntryInput {
  const EventSuccessScoreOutcomeInput({
    required super.unitId,
    required super.unitLabel,
    required this.score,
  });

  final num score;

  @override
  Map<String, Object?> toJson() => {
    'unitId': unitId,
    'unitLabel': unitLabel,
    'score': score,
  };
}

final class EventSuccessRankOutcomeInput
    extends EventSuccessUnitOutcomeEntryInput {
  const EventSuccessRankOutcomeInput({
    required super.unitId,
    required super.unitLabel,
    required this.rank,
  });

  final int rank;

  @override
  Map<String, Object?> toJson() => {
    'unitId': unitId,
    'unitLabel': unitLabel,
    'rank': rank,
  };
}

List<EventSuccessStandingEntry> _standingEntries(Object? value) =>
    (value as List<dynamic>? ?? const [])
        .whereType<Map>()
        .map(
          (entry) => EventSuccessStandingEntry.fromJson(
            Map<String, dynamic>.from(entry),
          ),
        )
        .toList(growable: false);
