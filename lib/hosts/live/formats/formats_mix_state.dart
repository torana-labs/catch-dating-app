import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:flutter/foundation.dart';

/// Where team mixing is: still reading, no saved plan, running, or unable
/// to read the plan.
enum HostFormatsMixStatus { loading, noPlan, running, error }

/// One new table and who sits at it.
@immutable
class HostFormatsTable {
  const HostFormatsTable({required this.label, required this.people});

  final String label;
  final List<String> people;
}

/// Everything team mixing shows, as plain values.
@immutable
class HostFormatsMixState {
  const HostFormatsMixState({
    required this.status,
    this.plan,
    this.stepIndex = 0,
    this.steps = 0,
    this.stepStartsAt,
    this.tables = const <HostFormatsTable>[],
    this.revealRoundIndex = 0,
    this.countingDown = false,
    this.revealed = false,
    this.countdownSeconds = 10,
    this.openers = true,
    this.error,
  });

  const HostFormatsMixState.loading()
    : this(status: HostFormatsMixStatus.loading);

  final HostFormatsMixStatus status;

  /// The saved plan: the reveal fence and the first-hello switch write
  /// back to it.
  final EventSuccessPlan? plan;

  /// Where tonight is in the run of show.
  final int stepIndex;
  final int steps;
  final DateTime? stepStartsAt;
  final List<HostFormatsTable> tables;

  /// The round the reveal shows next.
  final int revealRoundIndex;

  /// Phones are counting down to the new tables now.
  final bool countingDown;

  /// The new tables are already on every phone.
  final bool revealed;
  final int countdownSeconds;

  /// A first hello shows on every phone.
  final bool openers;
  final Object? error;

  /// Everyone with a seat at a new table.
  int get seated => tables.fold(0, (sum, table) => sum + table.people.length);
}
