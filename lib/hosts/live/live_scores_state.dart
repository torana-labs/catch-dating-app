import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:flutter/foundation.dart';

/// Where the scores screen is: still reading, entering the next round,
/// or unable to read the scoreboard.
enum HostLiveScoresStatus { loading, ready, error }

/// One team on tonight's scoreboard and its total so far.
@immutable
class HostLiveScoreUnit {
  const HostLiveScoreUnit({
    required this.id,
    required this.label,
    this.total = 0,
  });

  final String id;
  final String label;
  final num total;
}

/// Everything the scores screen shows, as plain values.
@immutable
class HostLiveScoresState {
  const HostLiveScoresState({
    required this.status,
    this.units = const <HostLiveScoreUnit>[],
    this.roundIndex = 0,
    this.standingsRevision = 0,
    this.liveControlRevision = 0,
    this.revealRoundIndex,
    this.countingDown = false,
    this.countdownSeconds = 0,
    this.standings = const <EventSuccessStandingEntry>[],
    this.error,
  });

  const HostLiveScoresState.loading()
    : this(status: HostLiveScoresStatus.loading);

  final HostLiveScoresStatus status;

  /// The teams in scoreboard order, first place first once a round counts.
  final List<HostLiveScoreUnit> units;

  /// The zero-based round the host enters next.
  final int roundIndex;

  /// The scoreboard's fence for recording a round.
  final int standingsRevision;

  /// The plan's fence for the reveal.
  final int liveControlRevision;

  /// The saved round guests have not seen yet; null when there is none.
  final int? revealRoundIndex;

  /// A reveal countdown is running on the guests' phones.
  final bool countingDown;

  /// How long the reveal counts down; zero reveals at once.
  final int countdownSeconds;

  /// The scoreboard after the last saved round.
  final List<EventSuccessStandingEntry> standings;
  final Object? error;
}
