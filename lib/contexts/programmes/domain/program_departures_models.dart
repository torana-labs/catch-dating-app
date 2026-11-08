import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// Where a departing guest is at the hotel desk.
enum ProgramDepartureState { inRoom, checkedOut, left, carNotNeeded }

/// One outbound journey leaving from the hotel.
class ProgramDepartureRow {
  const ProgramDepartureRow({
    required this.legId,
    required this.guestDisplayName,
    required this.partyLabel,
    required this.passengers,
    required this.luggageUnits,
    required this.flightNumber,
    required this.flightAt,
    required this.leaveBy,
    required this.roomLabel,
    required this.state,
  });

  factory ProgramDepartureRow.fromMap(Map<Object?, Object?> map) =>
      ProgramDepartureRow(
        legId: requiredString(map, 'legId'),
        guestDisplayName: map['guestDisplayName'] as String? ?? '',
        partyLabel: map['partyLabel'] as String?,
        passengers: requiredInt(map, 'passengers'),
        luggageUnits: requiredInt(map, 'luggageUnits'),
        flightNumber: map['flightNumber'] as String?,
        flightAt: nullableDateTime(map['flightAtMillis']),
        leaveBy: nullableDateTime(map['leaveByMillis']),
        roomLabel: map['roomLabel'] as String?,
        state: nullableEnum(map['state'], ProgramDepartureState.values)!,
      );

  final String legId;
  final String guestDisplayName;
  final String? partyLabel;
  final int passengers;
  final int luggageUnits;
  final String? flightNumber;
  final DateTime? flightAt;
  final DateTime? leaveBy;
  final String? roomLabel;
  final ProgramDepartureState state;
}

/// `getProgramDeparturesRoster`: one hotel's departures, soonest first.
class ProgramDeparturesRoster {
  const ProgramDeparturesRoster({
    required this.programId,
    required this.hotelId,
    required this.hotelName,
    required this.generatedAt,
    required this.rows,
    required this.checkedOut,
    required this.leavingSoon,
    required this.lateCheckouts,
  });

  factory ProgramDeparturesRoster.fromCallableData(Object? value) {
    final map = requiredMap(value, 'departures roster');
    return ProgramDeparturesRoster(
      programId: requiredString(map, 'programId'),
      hotelId: requiredString(map, 'hotelId'),
      hotelName: map['hotelName'] as String? ?? '',
      generatedAt: requiredDateTime(map, 'generatedAtMillis'),
      rows: mapList(
        map['rows'],
        'rows',
      ).map(ProgramDepartureRow.fromMap).toList(growable: false),
      checkedOut: requiredInt(map, 'checkedOut'),
      leavingSoon: requiredInt(map, 'leavingSoon'),
      lateCheckouts: requiredInt(map, 'lateCheckouts'),
    );
  }

  final String programId;
  final String hotelId;
  final String hotelName;
  final DateTime generatedAt;
  final List<ProgramDepartureRow> rows;
  final int checkedOut;
  final int leavingSoon;
  final int lateCheckouts;

  /// Still at the hotel, soonest first.
  List<ProgramDepartureRow> get leaving => [
    for (final row in rows)
      if (row.state != ProgramDepartureState.left) row,
  ];
}
