import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// Where one guest's ID for the hotel stands.
enum ProgramGuestIdStatus { missing, submitted, accepted, askedAgain }

/// The kind of ID a household sent.
enum ProgramGuestIdKind { aadhaar, passport, licence, voterId }

/// A guest relations decision on a submitted ID.
enum ProgramGuestIdDecision { accept, askAgain }

/// One front-desk look at an accepted ID through the hotel link.
class ProgramGuestIdView {
  const ProgramGuestIdView({
    required this.hotelId,
    required this.hotelName,
    required this.at,
  });

  factory ProgramGuestIdView.fromMap(Map<Object?, Object?> map) =>
      ProgramGuestIdView(
        hotelId: requiredString(map, 'hotelId'),
        hotelName: map['hotelName'] as String?,
        at: requiredDateTime(map, 'atMillis'),
      );

  final String hotelId;
  final String? hotelName;
  final DateTime at;
}

/// One staying guest in the ID tracker.
class ProgramIdTrackerRow {
  const ProgramIdTrackerRow({
    required this.guestId,
    required this.householdId,
    required this.displayName,
    required this.hotelId,
    required this.hotelName,
    required this.roomLabel,
    required this.status,
    required this.idKind,
    required this.numberLast4,
    required this.submittedAt,
    required this.decidedAt,
    required this.askAgainNote,
    required this.hotelViews,
    required this.frontUrl,
    required this.backUrl,
    required this.visaUrl,
    required this.revision,
  });

  factory ProgramIdTrackerRow.fromMap(Map<Object?, Object?> map) =>
      ProgramIdTrackerRow(
        guestId: requiredString(map, 'guestId'),
        householdId: map['householdId'] as String?,
        displayName: requiredString(map, 'displayName'),
        hotelId: map['hotelId'] as String?,
        hotelName: map['hotelName'] as String?,
        roomLabel: map['roomLabel'] as String?,
        status: nullableEnum(map['status'], ProgramGuestIdStatus.values)!,
        idKind: nullableEnum(map['idKind'], ProgramGuestIdKind.values),
        numberLast4: map['numberLast4'] as String?,
        submittedAt: nullableDateTime(map['submittedAtMillis']),
        decidedAt: nullableDateTime(map['decidedAtMillis']),
        askAgainNote: map['askAgainNote'] as String?,
        hotelViews: mapList(
          map['hotelViews'],
          'hotelViews',
        ).map(ProgramGuestIdView.fromMap).toList(growable: false),
        frontUrl: map['frontUrl'] as String?,
        backUrl: map['backUrl'] as String?,
        visaUrl: map['visaUrl'] as String?,
        revision: requiredInt(map, 'revision'),
      );

  final String guestId;
  final String? householdId;
  final String displayName;
  final String? hotelId;
  final String? hotelName;
  final String? roomLabel;
  final ProgramGuestIdStatus status;
  final ProgramGuestIdKind? idKind;

  /// Only the last four characters are ever stored.
  final String? numberLast4;
  final DateTime? submittedAt;
  final DateTime? decidedAt;
  final String? askAgainNote;
  final List<ProgramGuestIdView> hotelViews;

  /// Signed for a few minutes; null without an ID or without access.
  final String? frontUrl;
  final String? backUrl;
  final String? visaUrl;

  /// 0 while no ID has been sent.
  final int revision;

  bool get isPassport => idKind == ProgramGuestIdKind.passport;
}

/// One hotel's count in the tracker's hotel switcher.
class ProgramIdTrackerHotel {
  const ProgramIdTrackerHotel({
    required this.hotelId,
    required this.name,
    required this.staying,
  });

  factory ProgramIdTrackerHotel.fromMap(Map<Object?, Object?> map) =>
      ProgramIdTrackerHotel(
        hotelId: requiredString(map, 'hotelId'),
        name: requiredString(map, 'name'),
        staying: requiredInt(map, 'staying'),
      );

  final String hotelId;
  final String name;
  final int staying;
}

/// `listProgramIdTracker`: every staying guest's ID status.
class ProgramIdTracker {
  const ProgramIdTracker({
    required this.programId,
    required this.hotelId,
    required this.staying,
    required this.idsIn,
    required this.toCheck,
    required this.missing,
    required this.passports,
    required this.hotels,
    required this.rows,
  });

  factory ProgramIdTracker.fromCallableData(Object? value) {
    final map = requiredMap(value, 'ID tracker');
    final counts = requiredMap(map['counts'], 'ID tracker counts');
    return ProgramIdTracker(
      programId: requiredString(map, 'programId'),
      hotelId: map['hotelId'] as String?,
      staying: requiredInt(counts, 'staying'),
      idsIn: requiredInt(counts, 'idsIn'),
      toCheck: requiredInt(counts, 'toCheck'),
      missing: requiredInt(counts, 'missing'),
      passports: requiredInt(counts, 'passports'),
      hotels: mapList(
        map['hotels'],
        'hotels',
      ).map(ProgramIdTrackerHotel.fromMap).toList(growable: false),
      rows: mapList(
        map['rows'],
        'rows',
      ).map(ProgramIdTrackerRow.fromMap).toList(growable: false),
    );
  }

  final String programId;
  final String? hotelId;
  final int staying;
  final int idsIn;
  final int toCheck;
  final int missing;
  final int passports;
  final List<ProgramIdTrackerHotel> hotels;
  final List<ProgramIdTrackerRow> rows;
}

/// Where an ID stands after a decision.
class ProgramGuestIdResult {
  const ProgramGuestIdResult({required this.status, required this.revision});

  factory ProgramGuestIdResult.fromCallableData(Object? value) {
    final map = requiredMap(value, 'guest ID');
    return ProgramGuestIdResult(
      status: nullableEnum(map['status'], ProgramGuestIdStatus.values)!,
      revision: requiredInt(map, 'revision'),
    );
  }

  final ProgramGuestIdStatus status;
  final int revision;
}
