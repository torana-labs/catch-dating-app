import 'package:catch_dating_app/contexts/programmes/domain/program_calendar.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('validates canonical IANA identifiers', () {
    expect(isProgramTimeZone('Asia/Kolkata'), isTrue);
    expect(isProgramTimeZone('America/Los_Angeles'), isTrue);
    expect(isProgramTimeZone('Not/A_Timezone'), isFalse);
  });

  test(
    'calendar dates resolve in the program timezone, not the device zone',
    () {
      final localCalendarDate = DateTime(2026, 10, 5);
      final utcCalendarDate = DateTime.utc(2026, 10, 5);

      for (final input in [localCalendarDate, utcCalendarDate]) {
        expect(
          programCalendarDateInstant(input, 'Asia/Kolkata').toUtc(),
          DateTime.utc(2026, 10, 4, 18, 30),
        );
        expect(
          programCalendarDateInstant(input, 'America/Los_Angeles').toUtc(),
          DateTime.utc(2026, 10, 5, 7),
        );
        expect(
          programCalendarDateInstant(input, 'Pacific/Kiritimati').toUtc(),
          DateTime.utc(2026, 10, 4, 10),
        );
      }
    },
  );

  test('inventory rows recover civil dates in the program timezone', () {
    final row = OrganizerProgramListRow.fromMap({
      'programId': 'program-1',
      'title': 'Wedding weekend',
      'kind': 'wedding',
      'status': 'draft',
      'timezone': 'Asia/Kolkata',
      'revision': 1,
      'startsAtMillis': DateTime.utc(
        2026,
        10,
        4,
        18,
        30,
      ).millisecondsSinceEpoch,
      'endsAtMillis': DateTime.utc(2026, 10, 7, 18, 30).millisecondsSinceEpoch,
    });

    expect(
      (row.startsAt!.year, row.startsAt!.month, row.startsAt!.day),
      (2026, 10, 5),
    );
    expect(
      (row.endsAt!.year, row.endsAt!.month, row.endsAt!.day),
      (2026, 10, 8),
    );
  });
}
