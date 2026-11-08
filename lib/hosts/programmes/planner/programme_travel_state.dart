import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:flutter/foundation.dart';

/// One day of arrivals: the day and how many people land.
typedef HostProgrammeArrivalDay = ({DateTime day, int people});

/// Travel for the planner: the programme (pickup points and hotels), the
/// arrivals roster (`getProgramArrivalsRoster`), the suggested cars
/// (`getProgramTransportPlan`) and the trips so far (`listProgramTrips`),
/// all callables across every pickup point.
@immutable
class HostProgrammeTravelState {
  const HostProgrammeTravelState({
    required this.programme,
    this.roster,
    this.plan,
    this.trips,
    this.error,
  });

  final HostProgrammeState programme;

  /// Null while it loads or when it failed.
  final ProgramArrivalsRoster? roster;
  final ProgramTransportPlan? plan;
  final ProgramTripList? trips;

  /// The first travel read that failed.
  final Object? error;

  HostProgrammeStatus get status {
    if (programme.status != HostProgrammeStatus.ready) return programme.status;
    if (roster == null && error != null) return HostProgrammeStatus.error;
    if (roster == null) return HostProgrammeStatus.loading;
    return HostProgrammeStatus.ready;
  }

  List<ArrivalsRosterRow> get rows => roster?.rows ?? const [];

  int _people(Iterable<ArrivalsRosterRow> rows) =>
      rows.fold(0, (sum, row) => sum + row.passengers);

  /// Everyone on an inbound leg.
  int get flyingIn => _people(rows);

  /// People whose flight number is in.
  int get withFlight => _people(rows.where((row) => row.flightNumber != null));

  /// People with no flight or no landing time yet.
  int get missing => _people(
    rows.where(
      (row) =>
          row.flightNumber == null ||
          row.unavailableReason == TimingUnavailableReason.missingTiming,
    ),
  );

  /// Legs that were diverted, cancelled or are missing a time.
  List<ArrivalsRosterRow> get needsYou =>
      rows.where((row) => row.needsAttention).toList();

  /// People landing per day, in day order.
  List<HostProgrammeArrivalDay> get days {
    final byDay = <DateTime, int>{};
    for (final row in rows) {
      final at = row.curbAt;
      if (at == null) continue;
      final day = DateTime(at.year, at.month, at.day);
      byDay[day] = (byDay[day] ?? 0) + row.passengers;
    }
    final days = byDay.keys.toList()..sort();
    return [for (final day in days) (day: day, people: byDay[day]!)];
  }

  /// The day the most people land.
  HostProgrammeArrivalDay? get busiest {
    HostProgrammeArrivalDay? best;
    for (final day in days) {
      if (best == null || day.people > best.people) best = day;
    }
    return best;
  }

  /// People landing on [day] in six two-hour windows from 8 AM (earlier
  /// landings count in the first, later ones in the last), as (window
  /// start hour, people).
  List<(int, int)> windows(DateTime day) {
    final counts = <int, int>{
      for (var hour = 8; hour <= 18; hour += 2) hour: 0,
    };
    for (final row in rows) {
      final at = row.curbAt;
      if (at == null ||
          at.year != day.year ||
          at.month != day.month ||
          at.day != day.day) {
        continue;
      }
      final hour = (at.hour.clamp(8, 19) ~/ 2) * 2;
      counts[hour] = (counts[hour] ?? 0) + row.passengers;
    }
    return [for (final entry in counts.entries) (entry.key, entry.value)];
  }
}
