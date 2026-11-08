import 'package:meta/meta.dart';

/// A setup-time estimate of how court time is shared when more people come
/// than the courts hold.
///
/// It follows the assignment engine's capacity rule
/// (`docs/assignment_engine.md`, "Fair resource time"): a court runs only
/// full, everyone else sits on the bench for that round, and the engine
/// spreads the games so nobody is more than one game from anyone else. The
/// engine stays the source of truth once rotations are made; this only
/// previews the numbers before then.
@immutable
class EventSuccessCourtTimeEstimate {
  const EventSuccessCourtTimeEstimate({
    required this.players,
    required this.rounds,
    required this.minutesPerGame,
    required this.playingPerRound,
    required this.benchPerRound,
    required this.minMinutes,
    required this.maxMinutes,
    required this.fairShareMinutes,
  });

  final int players;
  final int rounds;
  final int minutesPerGame;

  /// People on court each round.
  final int playingPerRound;

  /// People sitting out each round.
  final int benchPerRound;

  /// The least court time anyone gets, in minutes.
  final int minMinutes;

  /// The most court time anyone gets, in minutes.
  final int maxMinutes;

  /// The average court time per person, in minutes.
  final double fairShareMinutes;

  /// The fair share rounded to whole minutes, for "about N min each".
  int get aboutMinutes => fairShareMinutes.round();

  bool get hasBench => benchPerRound > 0;
}

/// Estimates court time for [players] on [courts] courts of [seatsPerCourt]
/// seats, with games of [minutesPerGame] over [eventMinutes].
///
/// Returns null when nothing can be played: no players, no courts, a game
/// longer than the event, or fewer players than one full court.
EventSuccessCourtTimeEstimate? estimateEventSuccessCourtTime({
  required int players,
  required int courts,
  required int seatsPerCourt,
  required int minutesPerGame,
  required int eventMinutes,
}) {
  if (players <= 0 || courts <= 0 || seatsPerCourt <= 0) return null;
  if (minutesPerGame <= 0) return null;
  final rounds = eventMinutes ~/ minutesPerGame;
  if (rounds <= 0) return null;
  final fullCourts = players ~/ seatsPerCourt;
  final playing = (fullCourts < courts ? fullCourts : courts) * seatsPerCourt;
  if (playing <= 0) return null;
  final games = rounds * playing;
  final baseGames = games ~/ players;
  final extra = games % players;
  return EventSuccessCourtTimeEstimate(
    players: players,
    rounds: rounds,
    minutesPerGame: minutesPerGame,
    playingPerRound: playing,
    benchPerRound: players - playing,
    minMinutes: baseGames * minutesPerGame,
    maxMinutes: (baseGames + (extra > 0 ? 1 : 0)) * minutesPerGame,
    fairShareMinutes: games * minutesPerGame / players,
  );
}
