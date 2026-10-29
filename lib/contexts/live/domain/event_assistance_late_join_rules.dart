import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

enum LateJoinUnansweredRule { keepUnknownUntilCutoff, hostReviewAtDeadline }

sealed class LateJoinCutoff {
  const LateJoinCutoff();
  Map<String, Object?> toJson();
  factory LateJoinCutoff.fromJson(Object? value) {
    final map = assistanceObject(value);
    if (map['kind'] == 'eventEnd') {
      assistanceObject(map, {'kind'});
      return const LateJoinEventEnd();
    }
    if (map['kind'] == 'time') {
      assistanceObject(map, {'kind', 'at'});
      return LateJoinAtTime(assistanceInteger(map['at']));
    }
    throw const FormatException('Unknown late joining cutoff.');
  }
}

final class LateJoinEventEnd extends LateJoinCutoff {
  const LateJoinEventEnd();
  @override
  Map<String, Object?> toJson() => {'kind': 'eventEnd'};
}

final class LateJoinAtTime extends LateJoinCutoff {
  LateJoinAtTime(this.at) {
    assistanceInteger(at);
  }
  final int at;
  @override
  Map<String, Object?> toJson() => {'kind': 'time', 'at': at};
}

/// Reusable late-joining rules; these confer no execution or sender authority.
/// A confirmed-progress destination is resolved before runtime publication.
final class AssistanceLateJoinRules {
  AssistanceLateJoinRules({
    required LateJoinDestination destination,
    required LateJoinCutoff cutoff,
    required this.maxMessagesPerEpisode,
    required this.minimumMinutesBetweenMessages,
    required this.unanswered,
  }) : destination = LateJoinDestination.fromJson(destination.toJson()),
       cutoff = LateJoinCutoff.fromJson(cutoff.toJson()) {
    _bounded(maxMessagesPerEpisode, 100);
    _bounded(minimumMinutesBetweenMessages, 1440);
  }
  final LateJoinDestination destination;
  final LateJoinCutoff cutoff;
  final int maxMessagesPerEpisode;
  final int minimumMinutesBetweenMessages;
  final LateJoinUnansweredRule unanswered;
  AssistanceLateJoinRules copyWith({
    LateJoinDestination? destination,
    LateJoinCutoff? cutoff,
    int? maxMessagesPerEpisode,
    int? minimumMinutesBetweenMessages,
    LateJoinUnansweredRule? unanswered,
  }) => AssistanceLateJoinRules(
    destination: destination ?? this.destination,
    cutoff: cutoff ?? this.cutoff,
    maxMessagesPerEpisode: maxMessagesPerEpisode ?? this.maxMessagesPerEpisode,
    minimumMinutesBetweenMessages:
        minimumMinutesBetweenMessages ?? this.minimumMinutesBetweenMessages,
    unanswered: unanswered ?? this.unanswered,
  );

  factory AssistanceLateJoinRules.fromJson(Object? value) {
    final map = assistanceObject(value, {
      'destination',
      'cutoff',
      'maxMessagesPerEpisode',
      'minimumMinutesBetweenMessages',
      'updateOn',
      'unanswered',
    });
    if (map['updateOn'] != 'materialGuidanceChange') {
      throw const FormatException('Unsupported guidance update rule.');
    }
    return AssistanceLateJoinRules(
      destination: LateJoinDestination.fromJson(map['destination']),
      cutoff: LateJoinCutoff.fromJson(map['cutoff']),
      maxMessagesPerEpisode: _bounded(map['maxMessagesPerEpisode'], 100),
      minimumMinutesBetweenMessages: _bounded(
        map['minimumMinutesBetweenMessages'],
        1440,
      ),
      unanswered: assistanceEnum(
        LateJoinUnansweredRule.values,
        map['unanswered'],
      ),
    );
  }
  Map<String, Object?> toJson() => {
    'destination': destination.toJson(),
    'cutoff': cutoff.toJson(),
    'maxMessagesPerEpisode': maxMessagesPerEpisode,
    'minimumMinutesBetweenMessages': minimumMinutesBetweenMessages,
    'updateOn': 'materialGuidanceChange',
    'unanswered': unanswered.name,
  };
}

int _bounded(Object? value, int maximum) {
  final number = assistanceInteger(value);
  if (number > maximum) {
    throw const FormatException('Assistance limit exceeded.');
  }
  return number;
}
