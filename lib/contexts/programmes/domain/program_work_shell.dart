import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// Builds what `getProgramWorkAccess` used to return from the three
/// listener-backed sources: the account's access view, the programme's work
/// summary and the resource labels its work lists reach. Each source holds
/// exactly the fields the callable returned, so the shell and every policy
/// on [ProgramWorkAccess] behave as before.
ProgramWorkAccess programWorkAccessFromViews({
  required ProgramAccessView access,
  required Map<Object?, Object?> summary,
  required List<Map<Object?, Object?>> pickupPoints,
  required List<Map<Object?, Object?>> hotels,
  required List<Map<Object?, Object?>> functions,
}) {
  final stations = [
    for (final view in pickupPoints)
      if (view['active'] == true)
        ProgramStation(
          pickupPointId: requiredString(view, 'resourceId'),
          label: requiredString(view, 'label'),
          kind: requiredString(view, 'pickupKind'),
          iataCode: view['iataCode'] as String?,
          terminal: view['terminal'] as String?,
        ),
  ]..sort((a, b) => a.pickupPointId.compareTo(b.pickupPointId));
  final destinations = [
    for (final view in hotels)
      if (view['active'] == true)
        ProgramHotel(
          hotelId: requiredString(view, 'resourceId'),
          name: requiredString(view, 'label'),
        ),
  ]..sort((a, b) => a.hotelId.compareTo(b.hotelId));
  final programFunctions = [
    for (final view in functions)
      ProgramFunction(
        functionId: requiredString(view, 'resourceId'),
        name: requiredString(view, 'label'),
        venueName: view['venueName'] as String?,
        startsAt: requiredDateTime(view, 'startsAtMillis'),
        endsAt: requiredDateTime(view, 'endsAtMillis'),
        checkInEnabled: view['checkInEnabled'] != false,
        status: ProgramFunctionStatus.values.byName(
          requiredString(view, 'status'),
        ),
        expectedCount: requiredInt(view, 'expectedCount'),
        checkedInCount: requiredInt(view, 'checkedInCount'),
      ),
  ]..sort((a, b) => a.startsAt.compareTo(b.startsAt));
  return ProgramWorkAccess(
    programId: access.programId,
    organizerId: requiredString(summary, 'organizerId'),
    title: requiredString(summary, 'title'),
    kind: ProgramKind.values.byName(requiredString(summary, 'kind')),
    timezone: requiredString(summary, 'timezone'),
    status: ProgramStatus.values.byName(requiredString(summary, 'status')),
    actorRole: access.role,
    // The owner's callable answer listed no duties.
    duties: access.isManager ? const [] : access.assignments,
    grantExpiresAt: access.isManager ? null : access.grantExpiresAt,
    capabilities: stringList(summary['capabilities']).toSet(),
    pickupPoints: stations,
    hotels: destinations,
    functions: programFunctions,
    vehicleClasses: mapList(
      summary['vehicleClasses'],
      'vehicleClasses',
    ).map(ProgramVehicleClass.fromMap).toList(growable: false),
  );
}
