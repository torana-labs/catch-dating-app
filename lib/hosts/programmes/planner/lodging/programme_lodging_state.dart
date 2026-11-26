import 'package:catch_dating_app/contexts/programmes/data/program_lodging_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_review.dart';
import 'package:flutter/foundation.dart';

/// The stay planner at one moment: the private lodging setup read through
/// `manageProgramLodging` (`readSetup`), the current room proposal
/// (`preview`) once a setup exists, and the one decision still in doubt.
///
/// [retryAction] and [retryHotelId] name a decision whose result is
/// unknown. Only that exact decision may run again, with the same
/// operation id, so the server can recognise a repeat.
@immutable
class HostProgrammeLodgingState {
  const HostProgrammeLodgingState({
    required this.setup,
    this.review,
    this.busy = false,
    this.error,
    this.retryAction,
    this.retryHotelId,
  });

  final ProgramLodgingSetup setup;

  /// Null until the programme has a saved lodging setup.
  final ProgramLodgingReview? review;

  /// A call to `manageProgramLodging` is on its way.
  final bool busy;
  final Object? error;
  final ProgramLodgingAction? retryAction;
  final String? retryHotelId;

  /// A call is on its way or a decision waits for its retry.
  bool get locked => busy || retryAction != null;

  HostProgrammeLodgingState pending() => HostProgrammeLodgingState(
    setup: setup,
    review: review,
    busy: true,
    retryAction: retryAction,
    retryHotelId: retryHotelId,
  );
}
