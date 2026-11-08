import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:flutter/foundation.dart';

/// One programme read beside the programme itself.
@immutable
class HostProgrammeReport<T> {
  const HostProgrammeReport({required this.programme, this.value, this.error});

  final HostProgrammeState programme;
  final T? value;
  final Object? error;

  HostProgrammeStatus get status {
    if (programme.status != HostProgrammeStatus.ready) return programme.status;
    if (value == null && error != null) return HostProgrammeStatus.error;
    if (value == null) return HostProgrammeStatus.loading;
    return HostProgrammeStatus.ready;
  }

  /// A function name by id.
  String functionName(String functionId) =>
      programme.function(functionId)?.name ?? functionId;
}

/// The counts-only view a family viewer reads.
@immutable
class HostProgrammeShareState {
  const HostProgrammeShareState({this.access, this.counts, this.error});

  final ProgramWorkAccess? access;
  final ProgramStakeholderCounts? counts;
  final Object? error;

  HostProgrammeStatus get status {
    if (counts != null && access != null) return HostProgrammeStatus.ready;
    if (error != null) return HostProgrammeStatus.error;
    return HostProgrammeStatus.loading;
  }

  String functionName(String functionId) =>
      access?.functions
          .where((function) => function.functionId == functionId)
          .firstOrNull
          ?.name ??
      functionId;

  String hotelName(String hotelId) =>
      access?.hotels
          .where((hotel) => hotel.hotelId == hotelId)
          .firstOrNull
          ?.name ??
      hotelId;
}
