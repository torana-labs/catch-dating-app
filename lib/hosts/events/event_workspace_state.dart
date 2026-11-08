import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:flutter/foundation.dart';

/// Where the event workspace is: reading the event, showing it, the event
/// is gone, or it could not be read.
enum HostEventWorkspaceStatus { loading, ready, missing, error }

/// The workspace's four views, shared with the guests screen.
enum HostEventView { overview, guests, live, report }

/// Everything the event workspace shows, as plain values.
@immutable
class HostEventWorkspaceState {
  const HostEventWorkspaceState({
    required this.status,
    this.event,
    this.newFaces,
    this.people = const <String>[],
    this.planSteps,
    this.door = const <String>[],
    this.doorChecked = false,
    this.ticketSalesMinor,
    this.error,
  });

  const HostEventWorkspaceState.loading()
    : this(status: HostEventWorkspaceStatus.loading);

  final HostEventWorkspaceStatus status;
  final Event? event;

  /// Booked guests coming for the first time; null until the roster view
  /// has counted them.
  final int? newFaces;

  /// Names of the first guests coming, for the poster.
  final List<String> people;

  /// Steps in tonight's plan; null while the plan is read or when the
  /// event has none yet.
  final int? planSteps;

  /// Names of the team members with access to the door tonight.
  final List<String> door;

  /// The team read has answered, so an empty [door] means nobody yet.
  final bool doorChecked;

  /// Ticket sales from the cached host report, in minor units; null when
  /// the report has not counted them.
  final num? ticketSalesMinor;
  final Object? error;

  bool get planSet => (planSteps ?? 0) > 0;

  /// How many of the ready-for-tonight items are done.
  int get readyDone => (planSet ? 1 : 0) + (door.isNotEmpty ? 1 : 0);

  /// The ready-for-tonight items: the plan, the door and the practice run.
  static const int readyTotal = 3;
}
