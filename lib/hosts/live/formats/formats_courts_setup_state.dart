import 'package:catch_dating_app/contexts/formats/domain/event_success_court_time_estimate.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:flutter/foundation.dart';

/// Where the court setup is: still reading, no saved plan, ready to edit,
/// or unable to read the plan.
enum HostFormatsCourtsSetupStatus { loading, noPlan, ready, error }

/// What matters most when the rotations are made: new partners every
/// round, or games between people of a similar level.
enum HostFormatsCourtsAim { meetMany, closeGames }

/// The court setup the host edits before saving: courts, minutes a game
/// and the aim. Rounds follow from the event's length.
@immutable
class HostFormatsCourtsDraft {
  const HostFormatsCourtsDraft({
    required this.courts,
    required this.minutes,
    required this.aim,
  });

  final int courts;
  final int minutes;
  final HostFormatsCourtsAim aim;

  HostFormatsCourtsDraft copyWith({
    int? courts,
    int? minutes,
    HostFormatsCourtsAim? aim,
  }) => HostFormatsCourtsDraft(
    courts: courts ?? this.courts,
    minutes: minutes ?? this.minutes,
    aim: aim ?? this.aim,
  );

  @override
  bool operator ==(Object other) =>
      other is HostFormatsCourtsDraft &&
      other.courts == courts &&
      other.minutes == minutes &&
      other.aim == aim;

  @override
  int get hashCode => Object.hash(courts, minutes, aim);
}

/// Everything the court setup shows, as plain values.
@immutable
class HostFormatsCourtsSetupState {
  const HostFormatsCourtsSetupState({
    required this.status,
    this.plan,
    this.saved = const HostFormatsCourtsDraft(
      courts: 1,
      minutes: 15,
      aim: HostFormatsCourtsAim.meetMany,
    ),
    this.eventMinutes = 0,
    this.players = 0,
    this.seatsPerCourt = 2,
    this.previewed = false,
    this.newPartners = 0,
    this.roundsPlayed = 0,
    this.repeatPartners = 0,
    this.editable = true,
    this.error,
  });

  const HostFormatsCourtsSetupState.loading()
    : this(status: HostFormatsCourtsSetupStatus.loading);

  final HostFormatsCourtsSetupStatus status;

  /// The saved plan the setup writes back to.
  final EventSuccessPlan? plan;

  /// The setup as saved on the plan.
  final HostFormatsCourtsDraft saved;

  /// How long the event runs, for the rounds that fit.
  final int eventMinutes;

  /// Everyone booked.
  final int players;

  /// People on one court: two for singles, four for doubles.
  final int seatsPerCourt;

  /// Rotations have been made, so the preview reads from them.
  final bool previewed;
  final int newPartners;
  final int roundsPlayed;
  final int repeatPartners;

  /// The night has not finished, so the setup can still change.
  final bool editable;
  final Object? error;

  /// The rounds that fit the event at [minutes] a game.
  int roundsFor(int minutes) => minutes <= 0 ? 0 : eventMinutes ~/ minutes;

  /// People playing each round on [courts] courts. A court runs only
  /// full, as the assignment engine plans it.
  int playingFor(int courts) {
    final full = players ~/ seatsPerCourt;
    return (full < courts ? full : courts) * seatsPerCourt;
  }

  /// How court time is shared with [draft], before rotations are made.
  EventSuccessCourtTimeEstimate? courtTimeFor(HostFormatsCourtsDraft draft) =>
      estimateEventSuccessCourtTime(
        players: players,
        courts: draft.courts,
        seatsPerCourt: seatsPerCourt,
        minutesPerGame: draft.minutes,
        eventMinutes: eventMinutes,
      );
}
