import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_departures_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// "Leaving soon" looks this far ahead, as the departures callable did.
const programDeparturesSoonWindow = Duration(hours: 3);

/// The arrivals roster the transport desks read, built from the
/// `programArrivalViews` rows the account's routes reach. The view holds the
/// claimant's account id where the callable returned `claimedByMe`, so the
/// phone decides it here. Rows are ordered by leg id, as the callable did.
ProgramArrivalsRoster programArrivalsRosterFromViews({
  required String programId,
  required String? pickupPointId,
  required String uid,
  required List<Map<Object?, Object?>> rows,
  required ProgramAccessView access,
  required DateTime now,
}) {
  final parsed = [
    for (final row in rows)
      ArrivalsRosterRow.fromMap({
        ...row,
        'claimedByMe': row['claimedByUid'] == uid,
      }),
  ]..sort((a, b) => a.legId.compareTo(b.legId));
  return ProgramArrivalsRoster(
    programId: programId,
    accessExpiresAt: access.expiresAt,
    pickupPointId: pickupPointId,
    generatedAt: now,
    rows: parsed,
    // The vehicle classes ride on the work summary, which the dispatch screen
    // already reads through the work access.
    vehicleClasses: const [],
  );
}

/// One hotel's departures from `programDepartureViews`, soonest leave-by
/// first. The desk counts are computed here from the rows and [now].
ProgramDeparturesRoster programDeparturesRosterFromViews({
  required String programId,
  required String hotelId,
  required String hotelName,
  required List<Map<Object?, Object?>> rows,
  required DateTime now,
}) {
  final parsed = [for (final row in rows) ProgramDepartureRow.fromMap(row)]
    ..sort(_byLeaveBy);
  final here = [
    for (final row in parsed)
      if (row.state != ProgramDepartureState.left) row,
  ];
  final soonEnds = now.add(programDeparturesSoonWindow);
  return ProgramDeparturesRoster(
    programId: programId,
    hotelId: hotelId,
    hotelName: hotelName,
    generatedAt: now,
    rows: parsed,
    checkedOut: parsed
        .where((row) => row.state == ProgramDepartureState.checkedOut)
        .length,
    leavingSoon: here.where((row) {
      final leaveBy = row.leaveBy;
      return leaveBy != null &&
          !leaveBy.isBefore(now) &&
          !leaveBy.isAfter(soonEnds);
    }).length,
    lateCheckouts: here.where((row) {
      final leaveBy = row.leaveBy;
      return row.state == ProgramDepartureState.inRoom &&
          leaveBy != null &&
          leaveBy.isBefore(now);
    }).length,
  );
}

int _byLeaveBy(ProgramDepartureRow a, ProgramDepartureRow b) {
  final left = a.leaveBy?.millisecondsSinceEpoch ?? 1 << 62;
  final right = b.leaveBy?.millisecondsSinceEpoch ?? 1 << 62;
  return left != right ? left.compareTo(right) : a.legId.compareTo(b.legId);
}

/// The next instant after [now] at which [roster]'s counts change by time
/// alone: a leave-by entering the soon window or passing.
DateTime? nextDeparturesCountChange(
  ProgramDeparturesRoster roster,
  DateTime now,
) {
  DateTime? next;
  void consider(DateTime at) {
    if (at.isAfter(now) && (next == null || at.isBefore(next!))) next = at;
  }

  for (final row in roster.rows) {
    final leaveBy = row.leaveBy;
    if (leaveBy == null || row.state == ProgramDepartureState.left) continue;
    consider(leaveBy.subtract(programDeparturesSoonWindow));
    // Late once strictly past: the instant after the leave-by.
    consider(leaveBy.add(const Duration(milliseconds: 1)));
  }
  return next;
}

/// The trip ledger from `programTripViews`: newest departure first, ties by
/// descending id, as the callable ordered it.
ProgramTripList programTripListFromViews({
  required String programId,
  required List<Map<Object?, Object?>> rows,
  required ProgramAccessView access,
}) {
  final trips = [for (final row in rows) ProgramTripSummary.fromTripMap(row)]
    ..sort(_newestFirst);
  return ProgramTripList(
    programId: programId,
    accessExpiresAt: access.expiresAt,
    trips: trips,
    nextCursor: null,
  );
}

int _newestFirst(ProgramTripSummary a, ProgramTripSummary b) {
  final byTime = b.departedAt.compareTo(a.departedAt);
  return byTime != 0 ? byTime : b.tripId.compareTo(a.tripId);
}

/// The hotel desk's inbound board from the en-route `programTripViews` of
/// one hotel and its `programHotelInboundViews`, soonest curb time first.
ProgramHotelInbound programHotelInboundFromViews({
  required String programId,
  required String hotelId,
  required String hotelName,
  required List<Map<Object?, Object?>> trips,
  required List<Map<Object?, Object?>> expected,
  required ProgramAccessView access,
  required DateTime now,
}) {
  final legs = [for (final row in expected) HotelExpectedLeg.fromMap(row)]
    ..sort((a, b) {
      final left = a.curbAt?.millisecondsSinceEpoch ?? 1 << 62;
      final right = b.curbAt?.millisecondsSinceEpoch ?? 1 << 62;
      return left != right ? left.compareTo(right) : a.legId.compareTo(b.legId);
    });
  return ProgramHotelInbound(
    programId: programId,
    accessExpiresAt: access.expiresAt,
    hotelId: hotelId,
    hotelName: hotelName,
    generatedAt: now,
    trips: ([for (final row in trips) ProgramTripSummary.fromTripMap(row)]
      ..sort(_newestFirst)),
    expectedLegs: legs,
    nextTripCursor: null,
    nextExpectedCursor: null,
  );
}

/// The vendors bound to the programme from `programVendorViews`, by name.
List<ProgramVendorOption> programVendorsFromViews(
  List<Map<Object?, Object?>> rows,
) =>
    [
      for (final row in rows)
        ProgramVendorOption(
          vendorId: requiredString(row, 'vendorId'),
          name: requiredString(row, 'name'),
          active: row['active'] == true,
          // A vendor view exists only for a programme the vendor is bound to.
          boundToProgram: true,
        ),
    ]..sort((a, b) {
      final byName = a.name.compareTo(b.name);
      return byName != 0 ? byName : a.vendorId.compareTo(b.vendorId);
    });
