import 'package:flutter/foundation.dart';

/// Where the court board is: still reading, no saved plan, no rotations
/// made yet, rotations running, or unable to read them.
enum HostFormatsCourtsStatus { loading, noPlan, noRotations, running, error }

/// One court this round and the two people on it.
@immutable
class HostFormatsCourt {
  const HostFormatsCourt({
    required this.index,
    required this.players,
    this.endsAt,
  });

  /// Zero-based: court 1 is index 0.
  final int index;
  final List<String> players;

  /// When this round's game on the court ends.
  final DateTime? endsAt;
}

/// What happens next round to someone sitting out this one.
enum HostFormatsSitOutNext { plays, outAgain }

/// Someone sitting out this round, with their morning so far.
@immutable
class HostFormatsSitter {
  const HostFormatsSitter({
    required this.name,
    required this.satOut,
    required this.played,
    required this.next,
  });

  final String name;
  final int satOut;
  final int played;
  final HostFormatsSitOutNext next;
}

/// Everything the court board shows, as plain values.
@immutable
class HostFormatsCourtsState {
  const HostFormatsCourtsState({
    required this.status,
    this.roundIndex = -1,
    this.rounds = 0,
    this.intervalMinutes = 15,
    this.courts = const <HostFormatsCourt>[],
    this.sitters = const <HostFormatsSitter>[],
    this.players = 0,
    this.newPartners = 0,
    this.repeatPartners = 0,
    this.mostSatOut = 0,
    this.comingOn = const <String>[],
    this.goingOff = const <String>[],
    this.nextReady = false,
    this.liveControlRevision = 0,
    this.error,
  });

  const HostFormatsCourtsState.loading()
    : this(status: HostFormatsCourtsStatus.loading);

  final HostFormatsCourtsStatus status;

  /// The round playing now; -1 before the first is sent to phones.
  final int roundIndex;
  final int rounds;

  /// Minutes a game before everyone rotates.
  final int intervalMinutes;
  final List<HostFormatsCourt> courts;
  final List<HostFormatsSitter> sitters;

  /// Everyone with a place in the rotations.
  final int players;

  /// Different partners each person has had so far, on average.
  final int newPartners;

  /// Times anyone has played the same partner again so far.
  final int repeatPartners;

  /// The most rounds anyone has sat out so far.
  final int mostSatOut;

  /// Who comes on and who goes off when the next round starts.
  final List<String> comingOn;
  final List<String> goingOff;

  /// The next round is made and can be sent to phones.
  final bool nextReady;

  /// The plan's fence for the rotate command.
  final int liveControlRevision;
  final Object? error;

  /// The round Rotate now sends.
  int get nextRoundIndex => roundIndex + 1;

  bool get lastRound => rounds > 0 && roundIndex >= rounds - 1;

  /// When the round playing now ends: the earliest court to finish.
  DateTime? get endsAt {
    DateTime? earliest;
    for (final court in courts) {
      final end = court.endsAt;
      if (end != null && (earliest == null || end.isBefore(earliest))) {
        earliest = end;
      }
    }
    return earliest;
  }
}
