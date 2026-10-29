import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// Client-side column mapping for `importProgramManifest`. Maps parsed
/// spreadsheet columns to manifest row fields, then serializes each row into
/// the callable's contract shape. Server-side validation stays authoritative;
/// this layer only shapes and lightly validates what was uploaded.

/// Header-name suggestions: normalized tokens each field recognizes.
Map<ProgramManifestField, int> suggestProgramManifestMapping(
  List<String> headers,
) {
  const aliases = {
    ProgramManifestField.displayName: [
      'name',
      'guest',
      'guestname',
      'fullname',
      'displayname',
    ],
    ProgramManifestField.phoneE164: [
      'phone',
      'phonenumber',
      'mobile',
      'e164',
      'phonee164',
    ],
    ProgramManifestField.email: ['email', 'emailaddress', 'mail'],
    ProgramManifestField.externalReference: [
      'externalreference',
      'externalref',
      'crmid',
      'externalid',
      'ref',
    ],
    ProgramManifestField.householdLabel: [
      'household',
      'householdlabel',
      'family',
      'side',
      'partyof',
    ],
    ProgramManifestField.groupLabels: [
      'groups',
      'grouplabels',
      'group',
      'delegation',
      'company',
      'relation',
      'tags',
    ],
    ProgramManifestField.partyLabel: [
      'travelparty',
      'partylabel',
      'party',
      'shuttleparty',
    ],
    ProgramManifestField.flightNumber: [
      'flight',
      'flightnumber',
      'flightno',
      'flt',
    ],
    ProgramManifestField.originIata: [
      'origin',
      'originiata',
      'from',
      'departure',
    ],
    ProgramManifestField.destinationIata: [
      'destinationiata',
      'destinationairport',
      'to',
      'arrivalairport',
    ],
    ProgramManifestField.scheduledArrivalAt: [
      'arrival',
      'arrives',
      'scheduledarrival',
      'arrivaltime',
      'eta',
    ],
    ProgramManifestField.passengers: [
      'passengers',
      'pax',
      'guests',
      'headcount',
    ],
    ProgramManifestField.luggageUnits: [
      'luggage',
      'bags',
      'luggageunits',
      'baggage',
    ],
    ProgramManifestField.pickupPointLabel: [
      'pickup',
      'pickuppoint',
      'pickuplocation',
      'pickuppointlabel',
      'terminal',
    ],
    ProgramManifestField.destinationHotelName: [
      'hotel',
      'destinationhotel',
      'hotelname',
      'destinationhotelname',
    ],
    ProgramManifestField.destinationLabel: [
      'destination',
      'destinationlabel',
      'dropoff',
      'dropofflocation',
    ],
  };
  String normalize(String header) =>
      header.toLowerCase().replaceAll(RegExp('[^a-z0-9]'), '');
  final mapping = <ProgramManifestField, int>{};
  final claimed = <int>{};
  for (final entry in aliases.entries) {
    for (var i = 0; i < headers.length; i++) {
      if (claimed.contains(i)) continue;
      if (entry.value.contains(normalize(headers[i]))) {
        mapping[entry.key] = i;
        claimed.add(i);
        break;
      }
    }
  }
  return mapping;
}

class ProgramManifestMappedRows {
  const ProgramManifestMappedRows({
    required this.rows,
    required this.rowIssues,
  });

  final List<Map<String, Object?>> rows;
  final List<({int index, String reason})> rowIssues;
}

/// Serializes spreadsheet rows into `importProgramManifest` row payloads.
/// Rows missing a display name are dropped and reported.
ProgramManifestMappedRows mapProgramManifestRows({
  required List<String> headers,
  required List<List<String>> rows,
  required Map<ProgramManifestField, int> mapping,
}) {
  final nameColumn = mapping[ProgramManifestField.displayName];
  final resultRows = <Map<String, Object?>>[];
  final issues = <({int index, String reason})>[];
  String? cell(List<String> row, ProgramManifestField field) {
    final index = mapping[field];
    if (index == null) return null;
    if (index >= row.length) return null;
    final value = row[index].trim();
    return value.isEmpty ? null : value;
  }

  int? parseCount(String? raw) =>
      raw == null ? null : int.tryParse(raw.replaceAll(RegExp('[^0-9-]'), ''));

  int? parseArrivalMillis(String? raw) {
    if (raw == null) return null;
    final asInt = int.tryParse(raw);
    if (asInt != null && asInt.abs() > 1000000000) return asInt;
    final parsed = DateTime.tryParse(raw);
    return parsed?.millisecondsSinceEpoch;
  }

  for (var i = 0; i < rows.length; i++) {
    final row = rows[i];
    final name = nameColumn == null
        ? null
        : (nameColumn < row.length ? row[nameColumn].trim() : null);
    if (name == null || name.isEmpty) {
      issues.add((index: i, reason: 'missingDisplayName'));
      continue;
    }
    final groupRaw = cell(row, ProgramManifestField.groupLabels);
    final groupLabels = groupRaw
        ?.split(RegExp('[,;|]'))
        .map((label) => label.trim())
        .where((label) => label.isNotEmpty)
        .toList(growable: false);
    resultRows.add({
      'displayName': name,
      if (cell(row, ProgramManifestField.externalReference) != null)
        'externalReference': cell(row, ProgramManifestField.externalReference),
      if (cell(row, ProgramManifestField.phoneE164) != null)
        'phoneE164': cell(row, ProgramManifestField.phoneE164),
      if (cell(row, ProgramManifestField.email) != null)
        'email': cell(row, ProgramManifestField.email),
      if (cell(row, ProgramManifestField.householdLabel) != null)
        'householdLabel': cell(row, ProgramManifestField.householdLabel),
      if (groupLabels != null && groupLabels.isNotEmpty)
        'groupLabels': groupLabels.join('; '),
      if (cell(row, ProgramManifestField.partyLabel) != null)
        'partyLabel': cell(row, ProgramManifestField.partyLabel),
      if (cell(row, ProgramManifestField.flightNumber) != null)
        'flightNumber': cell(row, ProgramManifestField.flightNumber),
      if (cell(row, ProgramManifestField.originIata) != null)
        'originIata': cell(row, ProgramManifestField.originIata),
      if (cell(row, ProgramManifestField.destinationIata) != null)
        'destinationIata': cell(row, ProgramManifestField.destinationIata),
      if (parseArrivalMillis(
            cell(row, ProgramManifestField.scheduledArrivalAt),
          ) !=
          null)
        'scheduledArrivalAtMillis': parseArrivalMillis(
          cell(row, ProgramManifestField.scheduledArrivalAt),
        ),
      if (parseCount(cell(row, ProgramManifestField.passengers)) != null)
        'passengers': parseCount(cell(row, ProgramManifestField.passengers)),
      if (parseCount(cell(row, ProgramManifestField.luggageUnits)) != null)
        'luggageUnits': parseCount(
          cell(row, ProgramManifestField.luggageUnits),
        ),
      if (cell(row, ProgramManifestField.pickupPointLabel) != null)
        'pickupPointLabel': cell(row, ProgramManifestField.pickupPointLabel),
      if (cell(row, ProgramManifestField.destinationHotelName) != null)
        'destinationHotelName': cell(
          row,
          ProgramManifestField.destinationHotelName,
        ),
      if (cell(row, ProgramManifestField.destinationLabel) != null)
        'destinationLabel': cell(row, ProgramManifestField.destinationLabel),
    });
  }
  return ProgramManifestMappedRows(rows: resultRows, rowIssues: issues);
}
