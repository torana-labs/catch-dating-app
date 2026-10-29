import 'dart:convert';
import 'dart:typed_data';

import 'package:archive/archive.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/bookings/bookings.dart';
import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:crypto/crypto.dart';
import 'package:xml/xml.dart';

/// Produces a retry-safe key for one normalized Host roster upload.
String hostRosterImportKey({
  required EventAttendeeImportFormat format,
  required List<EventAttendeeImportRow> rows,
  String? fileName,
}) {
  final canonical = jsonEncode({
    'format': format.name,
    'fileName': fileName,
    'rows': [
      for (final row in rows)
        {
          'rowId': row.rowId,
          'displayName': row.displayName,
          'phone': row.phone,
          'email': row.email,
          'cityMarketId': row.cityMarketId,
          'externalReference': row.externalReference,
          'arrivalGroup': row.arrivalGroup,
          'ticketType': row.ticketType,
          'revenueAmountMinor': row.revenueAmountMinor,
          'revenueCurrency': row.revenueCurrency,
          'revenueSource': row.revenueSource?.name,
          'status': row.status.name,
        },
    ],
  });
  return 'host-${sha256.convert(utf8.encode(canonical))}';
}

const maxHostRosterFileBytes = 5 * 1024 * 1024;
const maxHostRosterExpandedBytes = 25 * 1024 * 1024;

String hostRosterFileFingerprint(Uint8List bytes) =>
    sha256.convert(bytes).toString();

/// Parses a bounded CSV or XLSX upload into the framework-free roster model.
HostRosterTable parseHostRosterFile({
  required String fileName,
  required Uint8List bytes,
  ExternalBookingProvider? providerHint,
}) {
  if (bytes.lengthInBytes > maxHostRosterFileBytes) {
    throw const HostRosterImportException(HostRosterImportIssue.fileTooLarge);
  }
  final extension = fileName.split('.').last.toLowerCase();
  final format = switch (extension) {
    'csv' => EventAttendeeImportFormat.csv,
    'xlsx' => EventAttendeeImportFormat.xlsx,
    _ => throw const HostRosterImportException(
      HostRosterImportIssue.unsupportedFile,
    ),
  };
  var usedLegacyEncoding = false;
  late final List<List<String>> matrix;
  var worksheetCount = 1;
  if (format == EventAttendeeImportFormat.csv) {
    String source;
    try {
      source = utf8.decode(bytes, allowMalformed: false);
    } on FormatException {
      source = latin1.decode(bytes);
      usedLegacyEncoding = true;
    }
    matrix = _parseCsv(source);
  } else {
    final workbook = _parseXlsx(bytes);
    matrix = workbook.rows;
    worksheetCount = workbook.worksheetCount;
  }
  final nonEmptyRows = matrix
      .map((row) => row.map((value) => value.trim()).toList(growable: false))
      .where((row) => row.any((value) => value.isNotEmpty))
      .toList(growable: false);
  if (nonEmptyRows.length < 2) {
    throw const HostRosterImportException(HostRosterImportIssue.missingRows);
  }
  var headers = uniqueHostRosterHeaders(nonEmptyRows.first);
  if (headers.length > 40) {
    throw const HostRosterImportException(HostRosterImportIssue.tooManyColumns);
  }
  var rows = nonEmptyRows.skip(1).toList(growable: false);
  final adapter = detectHostRosterAdapter(headers, providerHint: providerHint);
  if (adapter.adapterId == HostRosterAdapterId.eventbriteV1) {
    final normalized = _addCompositeGuestName(headers: headers, rows: rows);
    headers = normalized.headers;
    rows = normalized.rows;
  }
  return HostRosterTable(
    fileName: fileName,
    format: format,
    headers: headers,
    rows: rows,
    suggestedMapping: suggestHostRosterMapping(
      headers,
      adapterId: adapter.adapterId,
    ),
    adapter: adapter,
    fileFingerprint: hostRosterFileFingerprint(bytes),
    usedLegacyEncoding: usedLegacyEncoding,
    worksheetCount: worksheetCount,
  );
}

HostRosterAdapterDetection detectHostRosterAdapter(
  List<String> headers, {
  ExternalBookingProvider? providerHint,
}) {
  final detected = _detectHostRosterAdapterFromHeaders(headers);
  final hinted = _adapterForProvider(providerHint);
  if (hinted == null || hinted.adapterId == HostRosterAdapterId.genericV1) {
    return detected;
  }
  if (hinted.adapterId == HostRosterAdapterId.sampleRequired &&
      detected.support != HostRosterAdapterSupport.verified) {
    return HostRosterAdapterDetection(
      adapterId: hinted.adapterId,
      support: hinted.support,
      confidence: detected.confidence,
      hintedAdapterId: hinted.adapterId,
    );
  }
  return HostRosterAdapterDetection(
    adapterId: detected.adapterId,
    support: detected.support,
    confidence: detected.confidence,
    hintedAdapterId: hinted.adapterId,
    providerMismatch: detected.adapterId != hinted.adapterId,
  );
}

HostRosterAdapterDetection _detectHostRosterAdapterFromHeaders(
  List<String> headers,
) {
  final normalized = headers.map(_normalizedHeader).toSet();

  double score(Set<String> signatures) =>
      signatures.where(normalized.contains).length / signatures.length;

  final eventbriteScore = score({
    'firstname',
    'lastname',
    'orderid',
    'tickettype',
    'attendeestatus',
  });
  final lumaScore = score({
    'name',
    'approvalstatus',
    'registrationdate',
    'tickettype',
    'guestkey',
  });
  final partifulScore = score({'name', 'rsvpstatus', 'phonenumber', 'email'});
  final poshScore = score({'name', 'orderid', 'tickettype', 'phonenumber'});
  final candidates = <(HostRosterAdapterId, double)>[
    (HostRosterAdapterId.eventbriteV1, eventbriteScore),
    (HostRosterAdapterId.lumaV1, lumaScore),
    (HostRosterAdapterId.partifulV1, partifulScore),
    (HostRosterAdapterId.poshV1, poshScore),
  ]..sort((left, right) => right.$2.compareTo(left.$2));
  final best = candidates.first;
  if (best.$2 >= 0.6) {
    return HostRosterAdapterDetection(
      adapterId: best.$1,
      support: HostRosterAdapterSupport.verified,
      confidence: best.$2,
    );
  }
  return const HostRosterAdapterDetection(
    adapterId: HostRosterAdapterId.genericV1,
    support: HostRosterAdapterSupport.generic,
    confidence: 0,
  );
}

HostRosterAdapterDetection? _adapterForProvider(
  ExternalBookingProvider? provider,
) => switch (provider) {
  null || ExternalBookingProvider.catchPlatform => null,
  ExternalBookingProvider.generic => const HostRosterAdapterDetection(
    adapterId: HostRosterAdapterId.genericV1,
    support: HostRosterAdapterSupport.generic,
    confidence: 1,
  ),
  ExternalBookingProvider.luma => const HostRosterAdapterDetection(
    adapterId: HostRosterAdapterId.lumaV1,
    support: HostRosterAdapterSupport.verified,
    confidence: 1,
  ),
  ExternalBookingProvider.eventbrite => const HostRosterAdapterDetection(
    adapterId: HostRosterAdapterId.eventbriteV1,
    support: HostRosterAdapterSupport.verified,
    confidence: 1,
  ),
  ExternalBookingProvider.partiful => const HostRosterAdapterDetection(
    adapterId: HostRosterAdapterId.partifulV1,
    support: HostRosterAdapterSupport.verified,
    confidence: 1,
  ),
  ExternalBookingProvider.posh => const HostRosterAdapterDetection(
    adapterId: HostRosterAdapterId.poshV1,
    support: HostRosterAdapterSupport.verified,
    confidence: 1,
  ),
  ExternalBookingProvider.bookmyshow ||
  ExternalBookingProvider.district ||
  ExternalBookingProvider.sortmyscene ||
  ExternalBookingProvider.airbnb => const HostRosterAdapterDetection(
    adapterId: HostRosterAdapterId.sampleRequired,
    support: HostRosterAdapterSupport.sampleRequired,
    confidence: 1,
  ),
};

({List<String> headers, List<List<String>> rows}) _addCompositeGuestName({
  required List<String> headers,
  required List<List<String>> rows,
}) {
  if (suggestHostRosterMapping(
        headers,
        adapterId: HostRosterAdapterId.eventbriteV1,
      )[HostRosterField.displayName] !=
      null) {
    return (headers: headers, rows: rows);
  }
  final firstNameIndex = headers.indexWhere(
    (header) => _normalizedHeader(header) == 'firstname',
  );
  final lastNameIndex = headers.indexWhere(
    (header) => _normalizedHeader(header) == 'lastname',
  );
  if (firstNameIndex < 0 && lastNameIndex < 0) {
    return (headers: headers, rows: rows);
  }
  String valueAt(List<String> row, int index) =>
      index >= 0 && index < row.length ? row[index].trim() : '';
  return (
    headers: [...headers, 'Guest name'],
    rows: [
      for (final row in rows)
        [
          ...row,
          [
            valueAt(row, firstNameIndex),
            valueAt(row, lastNameIndex),
          ].where((value) => value.isNotEmpty).join(' '),
        ],
    ],
  );
}

String _normalizedHeader(String value) =>
    value.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');

List<List<String>> _parseCsv(String source) {
  final text = source.startsWith('\ufeff') ? source.substring(1) : source;
  final rows = <List<String>>[];
  var row = <String>[];
  var field = StringBuffer();
  var quoted = false;
  for (var index = 0; index < text.length; index += 1) {
    final character = text[index];
    if (quoted) {
      if (character == '"') {
        if (index + 1 < text.length && text[index + 1] == '"') {
          field.write('"');
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field.write(character);
      }
      continue;
    }
    if (character == '"') {
      quoted = true;
    } else if (character == ',') {
      row.add(field.toString());
      field = StringBuffer();
    } else if (character == '\n' || character == '\r') {
      if (character == '\r' &&
          index + 1 < text.length &&
          text[index + 1] == '\n') {
        index += 1;
      }
      row.add(field.toString());
      rows.add(row);
      row = <String>[];
      field = StringBuffer();
    } else {
      field.write(character);
    }
  }
  if (quoted) {
    throw const HostRosterImportException(HostRosterImportIssue.malformedCsv);
  }
  if (field.isNotEmpty || row.isNotEmpty) {
    row.add(field.toString());
    rows.add(row);
  }
  return rows;
}

({List<List<String>> rows, int worksheetCount}) _parseXlsx(Uint8List bytes) {
  Archive archive;
  try {
    archive = ZipDecoder().decodeBytes(bytes, verify: true);
  } on Object catch (error) {
    throw HostRosterImportException(
      HostRosterImportIssue.unreadableXlsx,
      cause: error,
    );
  }
  final expandedBytes = archive.files.fold<int>(
    0,
    (total, file) => total + file.size,
  );
  if (expandedBytes > maxHostRosterExpandedBytes) {
    throw const HostRosterImportException(
      HostRosterImportIssue.expandedFileTooLarge,
    );
  }
  final files = {for (final file in archive.files) file.name: file};
  final sharedStrings = _xlsxSharedStrings(files['xl/sharedStrings.xml']);
  final worksheetFiles =
      files.entries
          .where(
            (entry) =>
                entry.key.startsWith('xl/worksheets/sheet') &&
                entry.key.endsWith('.xml'),
          )
          .toList()
        ..sort((left, right) => left.key.compareTo(right.key));
  if (worksheetFiles.isEmpty) {
    throw const HostRosterImportException(
      HostRosterImportIssue.missingWorksheet,
    );
  }
  final candidates = worksheetFiles
      .map((entry) => _xlsxRows(entry.value, sharedStrings))
      .where((rows) => rows.isNotEmpty)
      .toList(growable: false);
  if (candidates.isEmpty) {
    throw const HostRosterImportException(
      HostRosterImportIssue.missingWorksheet,
    );
  }
  candidates.sort((left, right) {
    final leftHasName =
        left.isNotEmpty &&
        suggestHostRosterMapping(
              uniqueHostRosterHeaders(left.first),
            )[HostRosterField.displayName] !=
            null;
    final rightHasName =
        right.isNotEmpty &&
        suggestHostRosterMapping(
              uniqueHostRosterHeaders(right.first),
            )[HostRosterField.displayName] !=
            null;
    if (leftHasName != rightHasName) return leftHasName ? -1 : 1;
    return right.length.compareTo(left.length);
  });
  return (rows: candidates.first, worksheetCount: worksheetFiles.length);
}

List<List<String>> _xlsxRows(
  ArchiveFile worksheet,
  List<String> sharedStrings,
) {
  final document = _parseXmlFile(worksheet);
  final rows = <List<String>>[];
  for (final rowElement in _elementsNamed(document, 'row')) {
    final values = <int, String>{};
    for (final cell in rowElement.childElements.where(
      (element) => element.name.local == 'c',
    )) {
      final reference = cell.getAttribute('r') ?? '';
      final columnIndex = _xlsxColumnIndex(reference);
      if (columnIndex == null || columnIndex >= 40) continue;
      values[columnIndex] = _xlsxCellValue(cell, sharedStrings);
    }
    if (values.isEmpty) continue;
    final width = values.keys.reduce(
      (left, right) => left > right ? left : right,
    );
    rows.add([
      for (var index = 0; index <= width; index += 1) values[index] ?? '',
    ]);
  }
  return rows;
}

List<String> _xlsxSharedStrings(ArchiveFile? file) {
  if (file == null) return const [];
  final document = _parseXmlFile(file);
  return _elementsNamed(document, 'si')
      .map(
        (element) =>
            _elementsNamed(element, 't').map((text) => text.innerText).join(),
      )
      .toList(growable: false);
}

String _xlsxCellValue(XmlElement cell, List<String> sharedStrings) {
  final type = cell.getAttribute('t');
  if (type == 'inlineStr') {
    return _elementsNamed(cell, 't').map((text) => text.innerText).join();
  }
  final value = _elementsNamed(cell, 'v').firstOrNull?.innerText ?? '';
  if (type == 's') {
    final index = int.tryParse(value);
    return index != null && index >= 0 && index < sharedStrings.length
        ? sharedStrings[index]
        : '';
  }
  if (type == 'b') return value == '1' ? 'true' : 'false';
  return value;
}

XmlDocument _parseXmlFile(ArchiveFile file) {
  try {
    return XmlDocument.parse(utf8.decode(file.content));
  } on Object catch (error) {
    throw HostRosterImportException(
      HostRosterImportIssue.unreadableXlsx,
      cause: error,
    );
  }
}

Iterable<XmlElement> _elementsNamed(XmlNode node, String localName) => node
    .descendants
    .whereType<XmlElement>()
    .where((element) => element.name.local == localName);

int? _xlsxColumnIndex(String reference) {
  final letters = RegExp(r'^[A-Za-z]+').stringMatch(reference);
  if (letters == null) return null;
  var value = 0;
  for (final codeUnit in letters.toUpperCase().codeUnits) {
    value = value * 26 + codeUnit - 64;
  }
  return value - 1;
}
