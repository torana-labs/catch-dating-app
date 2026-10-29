import 'dart:convert';
import 'dart:typed_data';

import 'package:archive/archive.dart';
import 'package:catch_dating_app/contexts/audience/data/host_roster_file_parser.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('CSV parser maps common columns and quoted values', () {
    final table = parseHostRosterFile(
      fileName: 'guests.csv',
      bytes: Uint8List.fromList(
        utf8.encode(
          'Full Name,Mobile,Email,Ticket Type,Status\r\n'
          '"Shah, Asha",9876543210,asha@example.com,General,Confirmed\r\n'
          'Ravi Rao,+919812345678,ravi@example.com,VIP,Waitlisted',
        ),
      ),
    );

    expect(table.suggestedMapping[HostRosterField.displayName], 0);
    expect(table.suggestedMapping[HostRosterField.phone], 1);
    expect(table.adapter.adapterId, HostRosterAdapterId.genericV1);
    final mapped = table.mapRows(table.suggestedMapping);
    expect(mapped.issues, isEmpty);
    expect(mapped.rows, hasLength(2));
    expect(mapped.rows.first.displayName, 'Shah, Asha');
    expect(mapped.rows.last.status, EventAttendeeStatus.waitlisted);
  });

  test('roster city preview maps known aliases and flags unknown cities', () {
    final table = parseHostRosterFile(
      fileName: 'guests.csv',
      bytes: Uint8List.fromList(
        utf8.encode(
          'Name,Phone,Guest City,Status\n'
          'Asha Shah,+919876543210,Bangalore,Confirmed\n'
          'Ravi Rao,+919812345678,Atlantis,Confirmed',
        ),
      ),
    );
    expect(table.suggestedMapping[HostRosterField.city], 2);
    final mapped = table.mapRows(table.suggestedMapping);
    expect(mapped.rows, hasLength(1));
    expect(mapped.rows.single.cityMarketId, 'in-ka-bengaluru');
    expect(mapped.rows.single.toJson()['cityMarketId'], 'in-ka-bengaluru');
    expect(mapped.issues.single.type, HostRosterRowIssueType.invalidCity);
    expect(mapped.issues.single.rowNumber, 3);
  });

  test('Luma export is detected and maps provider-specific fields', () {
    final table = parseHostRosterFile(
      fileName: 'luma-guests.csv',
      bytes: Uint8List.fromList(
        utf8.encode(
          'Name,Email,Phone Number,Approval Status,Ticket Type,Guest Key,Registration Date\n'
          'Asha Shah,asha@example.com,+919876543210,Approved,General,guest_1,2026-08-11',
        ),
      ),
    );

    expect(table.adapter.adapterId, HostRosterAdapterId.lumaV1);
    expect(table.suggestedMapping[HostRosterField.externalReference], 5);
    expect(
      table.mapRows(table.suggestedMapping).rows.single.displayName,
      'Asha Shah',
    );
  });

  test('Eventbrite adapter combines first and last name columns', () {
    final table = parseHostRosterFile(
      fileName: 'eventbrite-attendees.csv',
      bytes: Uint8List.fromList(
        utf8.encode(
          'First Name,Last Name,Email,Order ID,Ticket Type,Attendee Status\n'
          'Asha,Shah,asha@example.com,12345,General,Attending',
        ),
      ),
    );

    expect(table.adapter.adapterId, HostRosterAdapterId.eventbriteV1);
    expect(table.headers.last, 'Guest name');
    expect(
      table.mapRows(table.suggestedMapping).rows.single.displayName,
      'Asha Shah',
    );
  });

  test('Eventbrite group tickets keep guest ids and shared arrival group', () {
    final table = parseHostRosterFile(
      fileName: 'eventbrite-group-tickets.csv',
      bytes: Uint8List.fromList(
        utf8.encode(
          'First Name,Last Name,Email,Order ID,Attendee ID,Ticket Type,Attendee Status\n'
          'Asha,Shah,buyer@example.com,order-7,attendee-7a,General,Attending\n'
          'Ravi,Rao,buyer@example.com,order-7,attendee-7b,General,Attending',
        ),
      ),
    );

    final rows = table.mapRows(table.suggestedMapping).rows;
    expect(rows, hasLength(2));
    expect(rows.map((row) => row.externalReference), [
      'attendee-7a',
      'attendee-7b',
    ]);
    expect(rows.map((row) => row.arrivalGroup), ['order-7', 'order-7']);
  });

  test('shared phone across attendee references requires review', () {
    final table = parseHostRosterFile(
      fileName: 'tickets.csv',
      bytes: Uint8List.fromList(
        utf8.encode(
          'Name,Phone,Email,Attendee ID\n'
          'Asha,+919876543210,buyer@example.com,ticket-a\n'
          'Ravi,+919876543210,buyer@example.com,ticket-b',
        ),
      ),
    );
    final mapped = table.mapRows(table.suggestedMapping);
    expect(mapped.rows, isEmpty);
    expect(mapped.needsReviewCount, 2);
    expect(mapped.issues.map((issue) => issue.type), [
      HostRosterRowIssueType.duplicateIdentity,
      HostRosterRowIssueType.duplicateIdentity,
    ]);
    final plan = HostRosterImportPlan.fromMappedRows(
      table: table,
      mapped: mapped,
      mapping: table.suggestedMapping,
    );
    expect(plan.intakeRows, hasLength(2));
    expect(plan.intakeRows.first['issues'], ['duplicate-identity']);
    expect(plan.intakeRows.first['rawCells'], contains('ticket-a'));
    expect(
      (plan.intakeRows.first['fields'] as Map<String, Object?>).containsKey(
        'externalReference',
      ),
      isTrue,
    );
  });

  test('unverified provider hint keeps manual mapping available', () {
    final table = parseHostRosterFile(
      fileName: 'bookmyshow.csv',
      providerHint: ExternalBookingProvider.bookmyshow,
      bytes: Uint8List.fromList(
        utf8.encode('Customer Name,Mobile Number\nAsha Shah,9876543210'),
      ),
    );

    expect(table.adapter.adapterId, HostRosterAdapterId.sampleRequired);
    expect(table.adapter.support, HostRosterAdapterSupport.sampleRequired);
    expect(
      table.mapRows(table.suggestedMapping).rows.single.displayName,
      'Asha Shah',
    );
  });

  test('mapping requires an explicit guest-name column', () {
    final table = parseHostRosterFile(
      fileName: 'guests.csv',
      bytes: Uint8List.fromList(utf8.encode('Phone\n9876543210')),
    );

    final mapped = table.mapRows(table.suggestedMapping);
    expect(mapped.rows, isEmpty);
    expect(mapped.issues.single.type, HostRosterRowIssueType.missingNameColumn);
  });

  test('file import keys are content-stable and change with mapped data', () {
    const first = EventAttendeeImportRow(
      rowId: '2',
      displayName: 'Asha Shah',
      status: EventAttendeeStatus.registered,
    );
    final original = hostRosterImportKey(
      format: EventAttendeeImportFormat.csv,
      rows: const [first],
    );
    expect(
      hostRosterImportKey(
        format: EventAttendeeImportFormat.csv,
        rows: const [first],
      ),
      original,
    );
    expect(
      hostRosterImportKey(
        format: EventAttendeeImportFormat.csv,
        rows: const [
          EventAttendeeImportRow(
            rowId: '2',
            displayName: 'Asha Shah updated',
            status: EventAttendeeStatus.registered,
          ),
        ],
      ),
      isNot(original),
    );
    expect(
      hostRosterImportKey(
        format: EventAttendeeImportFormat.csv,
        rows: const [
          EventAttendeeImportRow(
            rowId: '2',
            displayName: 'Asha Shah',
            cityMarketId: 'in-ka-bengaluru',
            status: EventAttendeeStatus.registered,
          ),
        ],
      ),
      isNot(original),
    );
    expect(
      hostRosterImportKey(
        format: EventAttendeeImportFormat.csv,
        rows: const [first],
        fileName: 'renamed.csv',
      ),
      isNot(original),
    );
    expect(
      hostRosterImportKey(
        format: EventAttendeeImportFormat.csv,
        rows: const [
          EventAttendeeImportRow(
            rowId: '2',
            displayName: 'Asha Shah',
            revenueAmountMinor: 125000,
            revenueCurrency: 'INR',
            revenueSource: EventAttendeeRevenueSource.hostEstimate,
            status: EventAttendeeStatus.registered,
          ),
        ],
      ),
      isNot(original),
    );
    expect(
      hostRosterImportKey(
        format: EventAttendeeImportFormat.csv,
        rows: const [
          EventAttendeeImportRow(
            rowId: '2',
            displayName: 'Asha Shah',
            arrivalGroup: 'order-7',
            status: EventAttendeeStatus.registered,
          ),
        ],
      ),
      isNot(original),
    );
  });

  test('maps imported revenue and applies an explicit per-guest fallback', () {
    final table = parseHostRosterFile(
      fileName: 'revenue.csv',
      bytes: Uint8List.fromList(
        utf8.encode(
          'Name,Email,Amount Paid,Currency\n'
          'Asha,asha@example.com,"1,250.50",INR\n'
          'Mira,mira@example.com,50.00,\n'
          'Neha,neha@example.com,,INR\n'
          'Ravi,ravi@example.com,,',
        ),
      ),
    );

    final mapped = table.mapRows(
      table.suggestedMapping,
      fallbackRevenueAmountMinor: 90000,
      fallbackRevenueCurrency: 'INR',
    );

    expect(mapped.issues, isEmpty);
    expect(mapped.rows.first.revenueAmountMinor, 125050);
    expect(
      mapped.rows.first.revenueSource,
      EventAttendeeRevenueSource.hostImport,
    );
    expect(mapped.rows[1].revenueAmountMinor, 5000);
    expect(mapped.rows[1].revenueCurrency, 'INR');
    expect(mapped.rows[2].revenueAmountMinor, 90000);
    expect(mapped.rows[2].revenueCurrency, 'INR');
    expect(mapped.rows.last.revenueAmountMinor, 90000);
    expect(
      mapped.rows.last.revenueSource,
      EventAttendeeRevenueSource.hostEstimate,
    );
    final plan = HostRosterImportPlan.fromMappedRows(
      table: table,
      mapped: mapped,
      mapping: table.suggestedMapping,
    );
    final importedFields = Map<String, Object?>.from(
      plan.intakeRows.first['fields']! as Map,
    );
    expect(importedFields, contains('revenueCurrency'));
    final amountWithFallbackCurrency = Map<String, Object?>.from(
      plan.intakeRows[1]['fields']! as Map,
    );
    expect(
      Map<String, Object?>.from(
        amountWithFallbackCurrency['revenueAmountMinor']! as Map,
      ),
      containsPair('origin', 'upload'),
    );
    expect(
      Map<String, Object?>.from(
        amountWithFallbackCurrency['revenueCurrency']! as Map,
      ),
      containsPair('origin', 'hostCorrection'),
    );
    expect(
      Map<String, Object?>.from(
        amountWithFallbackCurrency['revenueSource']! as Map,
      ),
      containsPair('origin', 'upload'),
    );
    final fallbackAmountWithUploadedCurrency = Map<String, Object?>.from(
      plan.intakeRows[2]['fields']! as Map,
    );
    expect(
      Map<String, Object?>.from(
        fallbackAmountWithUploadedCurrency['revenueAmountMinor']! as Map,
      ),
      containsPair('origin', 'hostCorrection'),
    );
    expect(
      Map<String, Object?>.from(
        fallbackAmountWithUploadedCurrency['revenueCurrency']! as Map,
      ),
      containsPair('origin', 'upload'),
    );
    expect(
      Map<String, Object?>.from(
        fallbackAmountWithUploadedCurrency['revenueSource']! as Map,
      ),
      containsPair('origin', 'hostCorrection'),
    );
    final fallbackFields = Map<String, Object?>.from(
      plan.intakeRows.last['fields']! as Map,
    );
    for (final field in const [
      'revenueAmountMinor',
      'revenueCurrency',
      'revenueSource',
    ]) {
      expect(
        Map<String, Object?>.from(fallbackFields[field]! as Map),
        containsPair('origin', 'hostCorrection'),
      );
    }
    expect(parseHostRosterRevenueAmountMinor('₹2,500'), 250000);
    expect(parseHostRosterRevenueAmountMinor('-5'), isNull);
  });

  test('verified headers override a conflicting provider hint', () {
    final table = parseHostRosterFile(
      fileName: 'eventbrite.csv',
      providerHint: ExternalBookingProvider.luma,
      bytes: Uint8List.fromList(
        utf8.encode(
          'First Name,Last Name,Email,Order ID,Ticket Type,Attendee Status\n'
          'Asha,Shah,asha@example.com,12345,General,Attending',
        ),
      ),
    );

    expect(table.adapter.adapterId, HostRosterAdapterId.eventbriteV1);
    expect(table.adapter.hintedAdapterId, HostRosterAdapterId.lumaV1);
    expect(table.adapter.providerMismatch, isTrue);
  });

  test('unknown and cancelled statuses are never silently registered', () {
    final table = parseHostRosterFile(
      fileName: 'guests.csv',
      bytes: Uint8List.fromList(
        utf8.encode(
          'Name,Email,Status\n'
          'Ready Guest,ready@example.com,Confirmed\n'
          'Mystery Guest,mystery@example.com,Maybe\n'
          'Cancelled Guest,cancelled@example.com,Refunded',
        ),
      ),
    );

    final mapped = table.mapRows(table.suggestedMapping);
    expect(mapped.readyCount, 1);
    expect(mapped.needsReviewCount, 1);
    expect(mapped.excludedCount, 1);
    expect(
      mapped.issues.map((issue) => issue.type),
      containsAll([
        HostRosterRowIssueType.unknownStatus,
        HostRosterRowIssueType.excludedStatus,
      ]),
    );
  });

  test('spreadsheet rows require stable identity and reject duplicates', () {
    final table = parseHostRosterFile(
      fileName: 'guests.csv',
      bytes: Uint8List.fromList(
        utf8.encode(
          'Name,Email\n'
          'No Identity,\n'
          'First,duplicate@example.com\n'
          'Second,duplicate@example.com',
        ),
      ),
    );

    final mapped = table.mapRows(table.suggestedMapping);
    expect(mapped.readyCount, 1);
    expect(mapped.needsReviewCount, 2);
    expect(
      mapped.issues.map((issue) => issue.type),
      containsAll([
        HostRosterRowIssueType.missingStableIdentity,
        HostRosterRowIssueType.duplicateIdentity,
      ]),
    );
  });

  test('a 251-row upload retains an explicit overflow count', () {
    final csv = StringBuffer('Name,Phone\n');
    for (var i = 0; i < 251; i++) {
      csv.writeln('Guest $i,+919000${i.toString().padLeft(6, '0')}');
    }
    final table = parseHostRosterFile(
      fileName: 'large-roster.csv',
      bytes: Uint8List.fromList(utf8.encode(csv.toString())),
    );
    final mapped = table.mapRows(table.suggestedMapping);
    expect(mapped.readyCount, 250);
    expect(mapped.truncatedCount, 1);
  });

  test('file size guard rejects oversized uploads before parsing', () {
    expect(
      () => parseHostRosterFile(
        fileName: 'large.csv',
        bytes: Uint8List(maxHostRosterFileBytes + 1),
      ),
      throwsA(
        isA<HostRosterImportException>().having(
          (error) => error.issue,
          'issue',
          HostRosterImportIssue.fileTooLarge,
        ),
      ),
    );
  });

  test('XLSX parser selects the best-matching guest worksheet', () {
    final archive = Archive()
      ..addFile(
        ArchiveFile.string(
          'xl/sharedStrings.xml',
          '<?xml version="1.0"?>'
              '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
              '<si><t>Instructions</t></si><si><t>Export generated</t></si>'
              '<si><t>Guest Name</t></si><si><t>Phone</t></si>'
              '<si><t>Asha Shah</t></si><si><t>9876543210</t></si>'
              '</sst>',
        ),
      )
      ..addFile(
        ArchiveFile.string(
          'xl/worksheets/sheet1.xml',
          '<?xml version="1.0"?>'
              '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
              '<sheetData>'
              '<row r="1"><c r="A1" t="s"><v>0</v></c>'
              '<c r="B1" t="s"><v>1</v></c></row>'
              '</sheetData></worksheet>',
        ),
      )
      ..addFile(
        ArchiveFile.string(
          'xl/worksheets/sheet2.xml',
          '<?xml version="1.0"?>'
              '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
              '<sheetData>'
              '<row r="1"><c r="A1" t="s"><v>2</v></c>'
              '<c r="B1" t="s"><v>3</v></c></row>'
              '<row r="2"><c r="A2" t="s"><v>4</v></c>'
              '<c r="B2" t="s"><v>5</v></c></row>'
              '</sheetData></worksheet>',
        ),
      );
    final bytes = ZipEncoder().encode(archive);

    final table = parseHostRosterFile(
      fileName: 'guests.xlsx',
      bytes: Uint8List.fromList(bytes),
    );
    final mapped = table.mapRows(table.suggestedMapping);

    expect(table.worksheetCount, 2);
    expect(mapped.issues, isEmpty);
    expect(mapped.rows.single.displayName, 'Asha Shah');
    expect(mapped.rows.single.phone, '9876543210');
  });
}
