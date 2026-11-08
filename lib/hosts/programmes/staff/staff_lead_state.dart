import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:flutter/foundation.dart';

/// Where the lead's board is: reading access, showing it, or unable to.
enum StaffLeadStatus { loading, content, error }

/// The function lead's board as plain values: the function on now, the
/// next one, and the day's functions in order.
@immutable
class StaffLeadState {
  const StaffLeadState({
    required this.status,
    this.title = '',
    this.now,
    this.current,
    this.next,
    this.runOfShow = const <ProgramFunction>[],
  });

  const StaffLeadState.loading() : this(status: StaffLeadStatus.loading);

  const StaffLeadState.error() : this(status: StaffLeadStatus.error);

  /// Sorts the programme's functions around [now]: the one running, the
  /// next to start, and the run of show for the day of whichever leads.
  factory StaffLeadState.fromAccess(
    ProgramWorkAccess access, {
    required DateTime now,
  }) {
    final functions = [
      for (final function in access.functions)
        if (function.status != ProgramFunctionStatus.cancelled) function,
    ]..sort((a, b) => a.startsAt.compareTo(b.startsAt));
    final current = functions
        .where(
          (function) =>
              !function.startsAt.isAfter(now) && function.endsAt.isAfter(now),
        )
        .firstOrNull;
    final next = functions
        .where((function) => function.startsAt.isAfter(now))
        .firstOrNull;
    final day = (current ?? next)?.startsAt.toLocal();
    return StaffLeadState(
      status: StaffLeadStatus.content,
      title: access.title,
      now: now,
      current: current,
      next: next,
      runOfShow: day == null
          ? functions
          : [
              for (final function in functions)
                if (function.startsAt.toLocal() case final start
                    when start.year == day.year &&
                        start.month == day.month &&
                        start.day == day.day)
                  function,
            ],
    );
  }

  final StaffLeadStatus status;

  /// The programme's name.
  final String title;
  final DateTime? now;

  /// The function running now.
  final ProgramFunction? current;

  /// The next function to start.
  final ProgramFunction? next;

  /// The day's functions in start order.
  final List<ProgramFunction> runOfShow;
}
